#!/usr/bin/env node
// Headless smoke test — boots the game with URL flags and asserts no runtime errors.
// Run via: node tests/smoke.test.js (after `npm run dev` is live on :8000),
// or via: npm run test:smoke (which starts the server for you).

const { chromium } = require("playwright");

const BASE = process.env.SMOKE_BASE || "http://localhost:8000";
const URL_FLAGS = "?seed=42&skipSetup=1&ghost=Spirit&autoStart=1&debug=1";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const errors = [];
  const warnings = [];
  page.on("pageerror", (err) => errors.push("pageerror: " + err.message));
  page.on("console", (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (t === "error") errors.push("console.error: " + text);
    else if (t === "warning") warnings.push("console.warn: " + text);
  });

  console.log("[smoke] navigating to", BASE + "/" + URL_FLAGS);
  await page.goto(BASE + "/" + URL_FLAGS, { waitUntil: "domcontentloaded", timeout: 15000 });

  // Give the script time to initialize, boot URL_FLAGS, and enter gameplay.
  await page.waitForTimeout(3000);

  // Probe the exposed debug API — exercise every documented hook so any latent crash surfaces.
  const probe = await page.evaluate(() => {
    const dbg = window.__debug;
    if (!dbg) return { hasDebug: false };
    const result = {
      hasDebug: true,
      gameRunning: !!window.gameRunning,
      urlFlags: window.URL_FLAGS || null,
      api: {},
      errors: [],
    };
    const safely = (label, fn) => {
      try { const v = fn(); result.api[label] = v === undefined ? "ok" : v; }
      catch (e) { result.errors.push(label + ": " + e.message); }
    };
    safely("ghostInfo", () => { const g = dbg.ghostInfo(); return g ? g.name : null; });
    safely("grantLighter", () => dbg.grantLighter());
    safely("giveMatches", () => dbg.giveMatches(5));
    safely("giveIncense", () => dbg.giveItem("Incense"));
    safely("testIgnition", () => {
      const chk = dbg.testIgnition("Incense");
      return chk && chk.ok ? "ok" : (chk && chk.reason) || "unknown";
    });
    safely("setSanity50", () => dbg.setSanity(50));
    safely("advanceTime", () => dbg.advanceTime(10));
    safely("toast", () => dbg.toast("smoke test", 1));
    safely("hideState_initial", () => dbg.hideState());
    safely("hideSpotsCount", () => dbg.hideState().hideSpotsOnMap);
    safely("enterHideSpot", () => { const s = dbg.enterHideSpot(0); return s ? s.label : null; });
    safely("hideState_hidden", () => dbg.hideState());
    safely("exitHideSpot", () => dbg.exitHideSpot());
    safely("hideState_exited", () => dbg.hideState());
    safely("dump", () => {
      const d = dbg.dump();
      return d ? { keys: Object.keys(d).slice(0, 10), ghost: d.currentGhost } : null;
    });
    return result;
  });

  console.log("[smoke] probe:", JSON.stringify(probe, null, 2));

  // Take a screenshot for eyeball verification.
  await page.screenshot({ path: "tests/smoke-screenshot.png", fullPage: false });
  console.log("[smoke] screenshot saved to tests/smoke-screenshot.png");

  await browser.close();

  // Assertions
  const fail = (msg) => { console.error("[smoke] FAIL:", msg); process.exitCode = 1; };

  if (errors.length) {
    console.error("[smoke] page errors:\n  " + errors.join("\n  "));
    fail(`${errors.length} runtime error(s) detected`);
  } else {
    console.log("[smoke] no runtime errors ✓");
  }

  if (warnings.length) {
    console.warn("[smoke] " + warnings.length + " console warnings (non-fatal):");
    warnings.slice(0, 10).forEach((w) => console.warn("  " + w));
  }

  if (!probe.hasDebug) fail("window.__debug is not exposed");
  if (!probe.urlFlags) fail("URL_FLAGS not exposed on window");
  if (!probe.gameRunning) fail("gameRunning is false after autoStart — round never started");
  if (probe.api && probe.api.ghostInfo == null) fail("ghostInfo() returned null — pickGhost did not run");
  if (probe.errors && probe.errors.length) {
    probe.errors.forEach((e) => console.error("[smoke] debug API error: " + e));
    fail(probe.errors.length + " debug API call(s) threw");
  }

  if (process.exitCode) {
    console.error("[smoke] FAILED");
  } else {
    console.log("[smoke] PASS");
  }
}

run().catch((err) => {
  console.error("[smoke] uncaught:", err);
  process.exit(2);
});

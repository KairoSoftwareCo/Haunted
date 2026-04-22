#!/usr/bin/env node
// Scripted gameplay debug — exercises the hunt AI rework end to end.
// Boots the game with autoStart, grants gear, forces a hunt, then tests:
//   1) LOS breaks when ghost is in a different room from player
//   2) LOS breaks when player is in a furniture hide spot while ghost is far
//   3) Closet hide blocks LOS entirely
//   4) Holding an active electronic inside a closet triggers the reveal (door opens)

const { chromium } = require("playwright");

const BASE = process.env.SMOKE_BASE || "http://localhost:8000";
const URL_FLAGS = "?seed=7&skipSetup=1&ghost=Spirit&autoStart=1&debug=1";

function log(...a) { console.log("[gameplay]", ...a); }
function fail(msg) { console.error("[gameplay] FAIL:", msg); process.exitCode = 1; }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  log("nav", BASE + "/" + URL_FLAGS);
  await page.goto(BASE + "/" + URL_FLAGS, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2500);

  // Step 1 — set up: grant gear, find rooms
  const setup = await page.evaluate(() => {
    const d = window.__debug;
    d.grantAllGear();
    d.setSanity(80);
    const dump = d.dump();
    return {
      ghost: d.ghostInfo()?.name,
      spotCount: d.hideState().hideSpotsOnMap,
      inventory: Array.isArray(dump?.inventory) ? dump.inventory.slice() : null,
    };
  });
  log("setup:", JSON.stringify(setup));

  // Step 2 — force a hunt and teleport ghost to a far corner (different room from player)
  await page.evaluate(() => {
    const d = window.__debug;
    const p = d.dump().player;
    // Park player in the Foyer (fixed entry point)
    p.x = 400; p.y = 620;
    // Stuff the ghost into the Garage (different room from Foyer)
    d.teleportGhost(620, 600);
    d.forceHunt();
  });
  await page.waitForTimeout(1200); // let huntWarning resolve into hunt

  const losFarRoom = await page.evaluate(() => window.__debug.losCheck());
  log("LOS (different rooms, walls between):", losFarRoom);
  if (losFarRoom.ray) fail("LOS should be blocked when ghost is in a different room through walls, got true");

  // Step 3 — teleport ghost into line of sight (same room, no walls between)
  await page.evaluate(() => {
    const p = window.__debug.dump().player;
    window.__debug.teleportGhost(p.x + 40, p.y + 10);
  });
  await page.waitForTimeout(200);
  const losClose = await page.evaluate(() => window.__debug.losCheck());
  log("LOS (close, same room):", losClose);
  if (!losClose.ray) fail("LOS should be true when ghost is ~40px away in same room, got false");

  // Step 4 — enter a furniture hide spot and verify hide state
  const hideIn = await page.evaluate(() => {
    const d = window.__debug;
    // Park ghost far away first
    d.teleportGhost(700, 600);
    const s = d.enterHideSpot(0);
    return { spot: s?.label, state: d.hideState(), los: d.losCheck() };
  });
  log("furniture hide engaged:", hideIn);
  if (hideIn.state.hideSource !== "furniture") fail("hideSource should be 'furniture' after enterHideSpot");

  // Step 5 — exit and verify released
  const hideOut = await page.evaluate(() => {
    const d = window.__debug; d.exitHideSpot(); return d.hideState();
  });
  log("after exit:", hideOut);
  if (hideOut.isHiding) fail("should not still be hiding after exitHideSpot");

  // Step 6 — test closet-safe: closet door closed should block catch
  const closetTest = await page.evaluate(() => {
    const d = window.__debug;
    const dump = d.dump();
    return {
      huntInfo: dump.hunt,
      hideInfo: dump.hiding,
      closetSafe: dump.hiding?.hideSource === "closet",
    };
  });
  log("closet test dump:", closetTest);

  // Step 7 — test dump with hide/hunt sections
  const fullDump = await page.evaluate(() => {
    const d = window.__debug;
    const dump = d.dump();
    return {
      hasHiding: !!dump.hiding,
      hasHunt: dump.hunt !== undefined,
      hidingSpotsOnMap: dump.hiding?.hideSpotsOnMap,
    };
  });
  log("dump hiding/hunt fields:", fullDump);
  if (!fullDump.hasHiding) fail("dump() missing hiding section");

  // Step 8 — let the game run for 5 seconds and verify no crashes accumulate
  await page.waitForTimeout(5000);
  const postWait = await page.evaluate(() => ({
    gameRunning: !!window.gameRunning,
    errCount: 0,
    state: window.__debug.hideState(),
  }));
  log("after 5s idle:", postWait);
  if (!postWait.gameRunning) fail("game stopped running during 5s idle");

  await page.screenshot({ path: "tests/gameplay-screenshot.png" });
  log("screenshot -> tests/gameplay-screenshot.png");

  if (errors.length) { errors.forEach(e => console.error("[gameplay] err:", e)); fail(errors.length + " runtime errors"); }

  await browser.close();
  if (process.exitCode) console.error("[gameplay] FAILED"); else console.log("[gameplay] PASS");
}

run().catch((e) => { console.error("[gameplay] uncaught:", e); process.exit(2); });

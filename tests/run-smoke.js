#!/usr/bin/env node
// Wrapper that boots a static server, runs the smoke test, then tears the server down.
const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = 8765;
const BASE = "http://localhost:" + PORT;

function waitForServer(url, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  const http = require("http");
  return new Promise((resolve, reject) => {
    (function tick() {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error("server never came up: " + url));
        else setTimeout(tick, 100);
      });
      req.setTimeout(500, () => req.destroy());
    })();
  });
}

async function main() {
  console.log("[run-smoke] starting static server on :" + PORT);
  const server = spawn("python3", ["-m", "http.server", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", () => {}); // swallow noise
  server.stderr.on("data", () => {});

  const killServer = () => {
    if (!server.killed) { try { server.kill("SIGTERM"); } catch {} }
  };
  process.on("exit", killServer);
  process.on("SIGINT", () => { killServer(); process.exit(130); });

  try {
    await waitForServer(BASE + "/index.html", 5000);
    console.log("[run-smoke] server up");

    const tests = ["smoke.test.js", "gameplay-debug.test.js"];
    let exitCode = 0;
    for (const t of tests) {
      console.log("\n[run-smoke] >>>", t);
      const child = spawn("node", [path.join(__dirname, t)], {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...process.env, SMOKE_BASE: BASE },
      });
      const code = await new Promise((resolve) => child.on("exit", resolve));
      if (code) exitCode = code;
    }
    process.exitCode = exitCode;
  } catch (err) {
    console.error("[run-smoke] failed:", err.message);
    process.exitCode = 1;
  } finally {
    killServer();
  }
}

main();

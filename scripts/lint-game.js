#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "index.html");
const OUT = path.join(ROOT, ".lint-tmp", "game.js");

const html = fs.readFileSync(SRC, "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) {
  console.error("Could not find <script> block in index.html");
  process.exit(2);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const preamble = "// extracted from index.html by scripts/lint-game.js\n";
fs.writeFileSync(OUT, preamble + match[1]);

const res = spawnSync(
  "npx",
  ["eslint", "--no-warn-ignored", ".lint-tmp/game.js"],
  { cwd: ROOT, stdio: "inherit" }
);
process.exit(res.status ?? 1);

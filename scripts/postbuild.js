#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const rootDir = path.resolve(__dirname, "..");
const extensionDir = path.resolve(rootDir, "apps", "extension");
const outDir = path.resolve(extensionDir, "out");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(
  path.resolve(extensionDir, "background", "out", "index.js"),
  path.resolve(outDir, "background.js")
);
fs.copyFileSync(
  path.resolve(extensionDir, "index", "index.html"),
  path.resolve(outDir, "index.html")
);
for (const file of ["index.css", "index.js"])
  fs.copyFileSync(
    path.resolve(extensionDir, "index", "out", file),
    path.resolve(outDir, file)
  );
fs.copyFileSync(
  path.resolve(extensionDir, "content", "out", "index.js"),
  path.resolve(outDir, "content.js")
);
for (const size of [16, 32, 48, 128])
  fs.copyFileSync(
    path.resolve(rootDir, "assets", `icon${size}.png`),
    path.resolve(outDir, `icon${size}.png`)
  );
const manifestJson = require(path.resolve(extensionDir, "manifest.json"));
manifestJson.version = process.env.APP_VERSION || "1.0.0";
fs.writeFileSync(
  path.resolve(outDir, "manifest.json"),
  JSON.stringify(manifestJson)
);

// Emulates GitHub Pages locally: serves `dist/` under `/<repo>/` from a plain static server that
// sends NO COOP/COEP headers, so cross-origin isolation can only come from coi-serviceworker.
// Build first with the same base: `LAWBREAKERS_BASE=/lawbreakers/ npm run build` (or
// `npm run build:pages`). Usage: `node scripts/pages-preview.mjs [--port 4174] [--base /lawbreakers/]`.

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "4174" },
    base: { type: "string", default: "/lawbreakers/" },
    dir: { type: "string", default: "dist" },
  },
});
const { base } = values;
const root = resolve(values.dir);
const port = Number(values.port);

const index = join(root, "index.html");
if (!existsSync(index)) throw new Error(`${index} missing: build first`);
if (!readFileSync(index, "utf8").includes(`${base}coi-serviceworker.js`)) {
  throw new Error(
    `${index} was not built with base ${base}: run LAWBREAKERS_BASE=${base} npm run build`,
  );
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  if (path === base.slice(0, -1)) {
    res.writeHead(301, { Location: base }).end();
    return;
  }
  if (!path.startsWith(base)) {
    res.writeHead(404).end("not found");
    return;
  }
  let file = normalize(join(root, path.slice(base.length)));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404).end("not found");
    return;
  }
  // Like Pages: content type and a short cache, nothing about isolation.
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "max-age=600",
  });
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`Pages emulation: http://localhost:${port}${base} (no COOP/COEP headers)`);
});

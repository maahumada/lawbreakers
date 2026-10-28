/// <reference types="vitest/config" />
import { createReadStream, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Public base path. `/` for dev and local preview; the Pages workflow sets `/<repo>/`.
// Must be absolute (the verify worker resolves `<base>z3/` against the origin).
const base = process.env.LAWBREAKERS_BASE ?? "/";
if (!base.startsWith("/") || !base.endsWith("/")) {
  throw new Error(`LAWBREAKERS_BASE must start and end with "/" (got "${base}")`);
}

// z3-solver needs SharedArrayBuffer, which requires cross-origin isolation.
// GitHub Pages cannot set these headers; production builds add coi-serviceworker instead.
const crossOriginIsolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

/**
 * Serves z3-solver's Emscripten glue and wasm at `<base>z3/` (dev) and emits them into
 * `dist/z3/` (build). The verify worker loads them from there; Z3's pthread workers load the same
 * script. See docs/ARCHITECTURE.md "Z3 in the browser".
 */
function z3Assets(): Plugin {
  const dir = dirname(createRequire(import.meta.url).resolve("z3-solver/build/z3-built.js"));
  const files: Record<string, string> = {
    "z3-built.js": "text/javascript",
    "z3-built.wasm": "application/wasm",
  };
  return {
    name: "lawbreakers:z3-assets",
    configureServer(server) {
      const prefix = `${server.config.base}z3/`;
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        const name = path.startsWith(prefix) ? path.slice(prefix.length) : "";
        const type = files[name];
        if (!type) return next();
        res.setHeader("Content-Type", type);
        for (const [k, v] of Object.entries(crossOriginIsolation)) res.setHeader(k, v);
        createReadStream(join(dir, name)).pipe(res);
      });
    },
    generateBundle() {
      for (const name of Object.keys(files)) {
        this.emitFile({
          type: "asset",
          fileName: `z3/${name}`,
          source: readFileSync(join(dir, name)),
        });
      }
    },
  };
}

/**
 * Runs before coi-serviceworker in the page head (production builds only). Configures it and
 * marks `<html data-coi>` so `main.tsx` knows whether to wait for its one-time reload:
 * - `pending`: not isolated yet and the service worker can fix it (first visit, hard reload);
 *   `main.tsx` shows a boot message instead of mounting the app.
 * - `unavailable`: isolation cannot come from the worker (no SW support, insecure context, page
 *   already controlled but still not isolated, or the reload budget is spent); mount anyway.
 * - absent: already isolated (COOP/COEP from the server, or the worker did its job).
 * The reload budget in sessionStorage is what rules out an infinite reload loop.
 */
const COI_BOOT = `(() => {
  const KEY = "lawbreakers:coi-reloads";
  const MAX_RELOADS = 2;
  const sw = navigator.serviceWorker;
  let reloads = MAX_RELOADS;
  try {
    reloads = Number(sessionStorage.getItem(KEY)) || 0;
    if (window.crossOriginIsolated) sessionStorage.removeItem(KEY);
  } catch {}
  if (window.crossOriginIsolated) return;
  const canFix =
    window.crossOriginIsolated === false &&
    window.isSecureContext &&
    !!sw &&
    !sw.controller &&
    reloads < MAX_RELOADS;
  document.documentElement.dataset.coi = canFix ? "pending" : "unavailable";
  let reloading = false;
  window.coi = {
    shouldRegister: () => canFix,
    coepCredentialless: () => false,
    quiet: true,
    doReload: () => {
      if (reloading) return;
      reloading = true;
      try {
        sessionStorage.setItem(KEY, String(reloads + 1));
      } catch {
        return;
      }
      sw.ready.then(() => window.location.reload());
    },
  };
})();`;

/**
 * GitHub Pages cannot send COOP/COEP, so production builds ship coi-serviceworker
 * (node_modules/coi-serviceworker, MIT): a service worker that re-serves every same-scope response
 * with those headers. It is emitted at `<base>coi-serviceworker.js` (its scope is therefore the
 * whole app, including the verify worker, Z3's pthread workers and `z3/`), with its license next
 * to it, and loaded from `<head>` right after the COI_BOOT config (both classic scripts, so they run
 * before the deferred app module). Dev does not use it.
 */
function coiServiceWorker(): Plugin {
  const dir = dirname(createRequire(import.meta.url).resolve("coi-serviceworker/package.json"));
  let base = "/";
  return {
    name: "lawbreakers:coi-serviceworker",
    apply: "build",
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml() {
      return [
        { tag: "script", children: COI_BOOT, injectTo: "head" },
        { tag: "script", attrs: { src: `${base}coi-serviceworker.js` }, injectTo: "head" },
      ];
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "coi-serviceworker.js",
        source: readFileSync(join(dir, "coi-serviceworker.js")),
      });
      this.emitFile({
        type: "asset",
        fileName: "coi-serviceworker.LICENSE.txt",
        source: readFileSync(join(dir, "LICENSE")),
      });
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), z3Assets(), coiServiceWorker()],
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  // Discovered only through the worker import; pre-bundle up front to avoid a dev reload.
  optimizeDeps: { include: ["z3-solver", "zod"] },
  worker: { format: "es" },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});

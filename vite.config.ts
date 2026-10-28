/// <reference types="vitest/config" />
import { createReadStream, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// z3-solver needs SharedArrayBuffer, which requires cross-origin isolation.
// GitHub Pages cannot set these headers; production uses coi-serviceworker instead (M2-T6).
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

export default defineConfig({
  plugins: [react(), z3Assets()],
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

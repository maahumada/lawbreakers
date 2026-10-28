// Runs the verification pipeline off the main thread. All Z3 calls in the app go through here.
//
// Z3 loading (see docs/ARCHITECTURE.md "Z3 in the browser"): z3-solver's browser entry expects a
// global `initZ3` defined by the Emscripten glue `z3-built.js`. That file is a classic script
// served at `<base>z3/` (copied there by the `z3Assets` plugin in vite.config.ts). This is a
// module worker, so `importScripts` is unavailable; we fetch the script and run it with an
// indirect eval, which defines `initZ3` on the worker's global scope just like a classic load.
// Emscripten cannot infer its own URL in that case, so `locateFile` points it at the `.wasm` and
// `mainScriptUrlOrBlob` at the script its pthread workers must load.

import { loadBundledLevels } from "../engine/level.ts";
import { initZ3 } from "../engine/smt.ts";
import { verify } from "../engine/verify.ts";
import type { WorkerRequest, WorkerResponse } from "./protocol.ts";

interface WorkerScope {
  postMessage(message: WorkerResponse): void;
  addEventListener(type: "message", listener: (ev: MessageEvent<WorkerRequest>) => void): void;
}

const scope = self as unknown as WorkerScope & { global?: unknown; initZ3?: unknown };

const levels = new Map(loadBundledLevels().map((l) => [l.id, l]));

// BASE_URL is absolute ("/" in dev, "/<repo>/" on Pages); the worker's own URL is under assets/.
const z3Dir = new URL(`${import.meta.env.BASE_URL}z3/`, self.location.origin).href;

let ready: Promise<number> | null = null;

/** Load the Emscripten glue and initialize Z3 once. Resolves to the init time in ms. */
function boot(): Promise<number> {
  ready ??= (async () => {
    const start = performance.now();
    // z3-solver's browser.js reads `global.initZ3` (a CommonJS-ism).
    scope.global = self;
    if (scope.initZ3 === undefined) {
      const res = await fetch(`${z3Dir}z3-built.js`);
      if (!res.ok) throw new Error(`could not load ${z3Dir}z3-built.js (HTTP ${res.status})`);
      const source = await res.text();
      // Indirect eval: runs in global scope, so the script's top-level `var initZ3` becomes global.
      (0, eval)(`${source}\n//# sourceURL=${z3Dir}z3-built.js`);
    }
    await initZ3({
      locateFile: (path: string) => z3Dir + path,
      mainScriptUrlOrBlob: `${z3Dir}z3-built.js`,
    });
    return performance.now() - start;
  })().catch((err: unknown) => {
    ready = null; // let the next request retry instead of failing forever
    throw err;
  });
  return ready;
}

async function handle(req: WorkerRequest): Promise<WorkerResponse> {
  try {
    switch (req.type) {
      case "warmUp":
        return { id: req.id, ok: true, result: { initMs: await boot() } };
      case "verify": {
        const level = levels.get(req.levelId);
        if (!level) throw new Error(`unknown level '${req.levelId}'`);
        await boot();
        return { id: req.id, ok: true, result: await verify(level, req.law) };
      }
    }
  } catch (err) {
    return { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

scope.addEventListener("message", (ev) => {
  void handle(ev.data).then((res) => scope.postMessage(res));
});

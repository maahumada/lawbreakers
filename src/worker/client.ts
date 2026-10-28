// Typed promise API over `verify.worker.ts`. The worker is created lazily on first use and lives as
// long as the page. Each request carries an id; the matching response settles its promise.

import type { BoolExpr } from "../engine/expr.ts";
import type { Verdict } from "../engine/types.ts";
import type { WorkerRequest, WorkerResponse } from "./protocol.ts";

type Pending = { resolve: (value: unknown) => void; reject: (err: Error) => void };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function failAll(err: Error): void {
  for (const p of pending.values()) p.reject(err);
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL("./verify.worker.ts", import.meta.url), {
    type: "module",
    name: "lawbreakers-verify",
  });
  w.addEventListener("message", (ev: MessageEvent<WorkerResponse>) => {
    const res = ev.data;
    const p = pending.get(res.id);
    if (!p) return;
    pending.delete(res.id);
    if (res.ok) p.resolve(res.result);
    else p.reject(new Error(`verifier: ${res.error}`));
  });
  // A crash or a script that fails to load leaves nobody to answer; reject everything in flight
  // and start a fresh worker on the next request.
  w.addEventListener("error", (ev) => {
    ev.preventDefault();
    failAll(new Error(`verifier worker crashed: ${ev.message || "failed to load"}`));
    w.terminate();
    if (worker === w) worker = null;
  });
  worker = w;
  return w;
}

/** A request before `send` assigns its id. */
type Request = WorkerRequest extends infer R ? (R extends unknown ? Omit<R, "id"> : never) : never;

function send<T>(req: Request): Promise<T> {
  const id = nextId++;
  const w = getWorker();
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
    w.postMessage({ ...req, id } satisfies WorkerRequest);
  });
}

/** Start the worker and initialize Z3 now, so the first ENGAGE is fast. Resolves to init ms. */
export function warmUp(): Promise<{ initMs: number }> {
  return send({ type: "warmUp" });
}

/** Verify `law` against the bundled level `levelId`. Rejects on engine or worker errors. */
export function verifyLaw(levelId: string, law: BoolExpr): Promise<Verdict> {
  return send({ type: "verify", levelId, law });
}

// Messages between the main thread (`client.ts`) and `verify.worker.ts`. Everything here must be
// structured-cloneable (plain data only).

import type { BoolExpr } from "../engine/expr.ts";
import type { Verdict } from "../engine/types.ts";

export type WorkerRequest =
  { id: number; type: "warmUp" } | { id: number; type: "verify"; levelId: string; law: BoolExpr };

export type WorkerResponse =
  | { id: number; ok: true; result: { initMs: number } | Verdict }
  | { id: number; ok: false; error: string };

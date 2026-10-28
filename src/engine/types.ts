import type { State } from "./expr.ts";

export type Verdict =
  | { kind: "init_failure"; state: State }
  | { kind: "live_breach"; trace: { control: string; state: State }[] } // starts at init
  | { kind: "lab_breach"; before: State; control: string; after: State }
  | { kind: "insufficient"; state: State } // satisfies Law, is meltdown
  | { kind: "holds" };

export type VerdictKind = Verdict["kind"];

export const VERDICT_KINDS = [
  "init_failure",
  "live_breach",
  "lab_breach",
  "insufficient",
  "holds",
] as const satisfies readonly VerdictKind[];

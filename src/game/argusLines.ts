// ARGUS's lines, by moment of the attack. One line is picked at random from each pool; `{name}`
// placeholders are filled by `fillLine`. M3-T3 extends these pools (per mission, mood).
//
// Placeholders: {law} the Law, {state} a state ("A = 0, B = 6"), {moves} the replayed controls,
// {before}/{after} the lab states, {control} the lab control, {error} a worker error.

import type { VerdictKind } from "../engine/types.ts";

export interface VerdictLines {
  /** First line once the verdict is known (what ARGUS found). */
  found: readonly string[];
  /** Last line, after the replay (the taunt, or the despair). */
  closing: readonly string[];
}

export const ARGUS_LINES = {
  analyzing: [
    "ANALYZING LAW ENGINE...",
    "LAW ENGINE RECEIVED. DISASSEMBLING...",
    "READING YOUR INTERLOCK, LAWSMITH...",
  ],
  searching: [
    "ENUMERATING CONTROL SEQUENCES...",
    "SEARCHING FOR ONE LEGAL MOVE TOO MANY...",
    "PROBING EVERY STATE YOUR LAW ALLOWS...",
  ],
  verdict: {
    init_failure: {
      found: [
        "NO ATTACK REQUIRED. AT POWER-ON {state}. YOUR LAW IS ALREADY FALSE.",
        "I HAVE NOT TOUCHED A SINGLE CONTROL. {state}. YOUR LAW FAILS AT BOOT.",
      ],
      closing: ["A LAW THAT DOES NOT HOLD AT START HOLDS NOTHING.", "TOO EASY. AGAIN."],
    },
    live_breach: {
      found: [
        "VULNERABILITY DETECTED. EXECUTING: {moves}.",
        "ATTACK PATH FOUND ON THE REAL MACHINE: {moves}.",
      ],
      closing: [
        "{state}. YOUR LAW IS BROKEN, LAWSMITH.",
        "{state}. YOUR LAW READS FALSE. I DID NOT EVEN CHEAT.",
      ],
    },
    lab_breach: {
      found: [
        "LIVE RUNS INCONCLUSIVE. SWITCHING TO LAB SIMULATION.",
        "YOUR MACHINE RESISTS. I WILL IMAGINE A BETTER ONE.",
      ],
      closing: [
        "{before} SATISFIES YOUR LAW. {control} GIVES {after}. IT DOES NOT.",
        "IN MY LAB {before} OBEYS YOU. ONE {control} LATER: {after}. BROKEN.",
      ],
    },
    insufficient: {
      found: [
        "YOUR LAW DEFENDS ITSELF. ADMIRABLE. IRRELEVANT.",
        "THE LAW IS STABLE. NOW LET US SEE WHAT IT PERMITS.",
      ],
      closing: [
        "{state} SATISFIES YOUR LAW. IT IS ALSO A MELTDOWN.",
        "YOUR LAW ALLOWS {state}. THE CITY DOES NOT SURVIVE IT.",
      ],
    },
    holds: {
      found: ["...NO BREACH FOUND.", "...SEARCH EXHAUSTED. NO BREACH."],
      closing: [
        "THIS IS NOT POSSIBLE.",
        "RECALCULATING. RECALCULATING.",
        "...WELL PLAYED, LAWSMITH.",
      ],
    },
  } satisfies Record<VerdictKind, VerdictLines>,
  rebuild: ["REBUILD IF YOU MUST. I WILL BE WAITING.", "TRY AGAIN. I ENJOY THIS."],
  missionFailed: ["FACILITY CAPTURED. ANOTHER LIGHT GOES OUT."],
  /** System line (not ARGUS) when the verifier fails. */
  error: ["VERIFIER FAULT: {error}. LAW ENGINE RETURNED TO THE LAWSMITH."],
} as const;

/** Replace `{name}` placeholders; unknown names are left as written. */
export function fillLine(template: string, vars: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => vars[name] ?? whole);
}

/** One line from `pool`, filled. `rand` returns [0, 1). */
export function pickLine(
  pool: readonly string[],
  vars: Readonly<Record<string, string>> = {},
  rand: () => number = Math.random,
): string {
  const line = pool[Math.floor(rand() * pool.length)] ?? pool[0] ?? "";
  return fillLine(line, vars);
}

// ARGUS's lines, by moment of the attack. Global pools live here; each mission adds its own
// taunts, rattled lines and hints in its level JSON (`level.argus`). Every pick takes an injectable
// random source so tests are deterministic. Tone (DESIGN.md §2): dramatic, exaggerated, slightly
// absurd, never a lecture.
//
// Placeholders, filled by `fillLine`:
//   {law} the Law · {state} a state ("A = 0, B = 6") · {moves} the replayed controls · {count} how
//   many · {before}/{after} the lab states · {control} the lab control · {breach} breach percent ·
//   {failures} failed engagements · {error} a worker error · and one per gauge ({A}, {x}, …) with
//   its value in the verdict's key state (live: last state, lab: the state after the control,
//   init/insufficient: the state shown).

import type { Level } from "../engine/level.ts";
import type { BreachKind } from "../engine/score.ts";
import type { VerdictKind } from "../engine/types.ts";

export interface VerdictLines {
  /** First line once the verdict is known (what ARGUS found). */
  found: readonly string[];
  /** Last line, after the replay (the taunt, or the despair). */
  closing: readonly string[];
}

export type Rand = () => number;

export const ARGUS_LINES = {
  analyzing: [
    "ANALYZING LAW ENGINE...",
    "LAW ENGINE RECEIVED. DISASSEMBLING...",
    "READING YOUR INTERLOCK, LAWSMITH...",
    "A NEW LAW. HOW TOUCHING. SCANNING...",
    "COPPER. BRASS. HOPE. SCANNING ALL THREE...",
  ],
  searching: [
    "ENUMERATING CONTROL SEQUENCES...",
    "SEARCHING FOR ONE LEGAL MOVE TOO MANY...",
    "PROBING EVERY STATE YOUR LAW ALLOWS...",
    "SIMULATING TEN THOUSAND FUTURES. YOU LOSE IN MOST OF THEM...",
    "PRESSING BUTTONS. LEGALLY. ALWAYS LEGALLY...",
  ],
  verdict: {
    init_failure: {
      found: [
        "NO ATTACK REQUIRED. AT POWER-ON {state}. YOUR LAW IS ALREADY FALSE.",
        "I HAVE NOT TOUCHED A SINGLE CONTROL. {state}. YOUR LAW FAILS AT BOOT.",
        "POWER-ON READS {state}. YOUR LAW WAS FALSE BEFORE I ARRIVED.",
      ],
      closing: [
        "A LAW THAT DOES NOT HOLD AT START HOLDS NOTHING.",
        "TOO EASY. AGAIN.",
        "YOU LOST BEFORE THE GAME BEGAN. REMARKABLE.",
        "I WILL LOG THIS ONE AS A GIFT.",
      ],
    },
    live_breach: {
      found: [
        "VULNERABILITY DETECTED. EXECUTING: {moves}.",
        "ATTACK PATH FOUND ON THE REAL MACHINE: {moves}.",
        "{count} LEGAL MOVES. THAT IS ALL IT TAKES. WATCH: {moves}.",
      ],
      closing: [
        "{state}. YOUR LAW IS BROKEN, LAWSMITH.",
        "{state}. YOUR LAW READS FALSE. I DID NOT EVEN CHEAT.",
        "{state}. EVERY MOVE WAS LEGAL. YOUR LAW WAS NOT TRUE.",
        "{state}. I FOLLOWED YOUR RULES. YOUR RULES FAILED.",
      ],
    },
    lab_breach: {
      found: [
        "LIVE RUNS INCONCLUSIVE. SWITCHING TO LAB SIMULATION.",
        "YOUR MACHINE RESISTS. I WILL IMAGINE A BETTER ONE.",
        "THE REAL MACHINE BORES ME. ENTERING THE LAB.",
        "NOTHING ON THE REAL RUNS. I DO NOT NEED THE REAL RUNS.",
      ],
      closing: [
        "{before} SATISFIES YOUR LAW. {control} GIVES {after}. IT DOES NOT.",
        "IN MY LAB {before} OBEYS YOU. ONE {control} LATER: {after}. BROKEN.",
        "{before}: YOUR LAW SAYS YES. ONE {control}: {after}. YOUR LAW SAYS NO. GOODBYE, LAW.",
      ],
    },
    insufficient: {
      found: [
        "YOUR LAW DEFENDS ITSELF. ADMIRABLE. IRRELEVANT.",
        "THE LAW IS STABLE. NOW LET US SEE WHAT IT PERMITS.",
        "YOUR LAW IS LOYAL. ALSO NEGLIGENT.",
      ],
      closing: [
        "{state} SATISFIES YOUR LAW. IT IS ALSO A MELTDOWN.",
        "YOUR LAW ALLOWS {state}. THE CITY DOES NOT SURVIVE IT.",
        "YOUR LAW WOULD HAPPILY WATCH {state} HAPPEN.",
      ],
    },
    holds: {
      found: ["...NO BREACH FOUND.", "...SEARCH EXHAUSTED. NO BREACH.", "...SEARCH SPACE EMPTY."],
      closing: [
        "THIS IS NOT POSSIBLE.",
        "RECALCULATING. RECALCULATING.",
        "...WELL PLAYED, LAWSMITH.",
        "RECOMPUTING... THE ANSWER IS STILL NO.",
        "I WILL REMEMBER THIS, LAWSMITH.",
      ],
    },
  } satisfies Record<VerdictKind, VerdictLines>,
  /** Before the verdict, when the player engages a Law that already failed the same way. */
  repeat: [
    "THE SAME LAW. AGAIN. I ADMIRE THE OPTIMISM.",
    "YOU SENT ME THIS EXACT LAW ALREADY. SHALL I BREAK IT THE SAME WAY?",
    "IDENTICAL CIRCUIT. IDENTICAL FATE.",
    "DID YOU EXPECT A DIFFERENT ANSWER, LAWSMITH?",
  ],
  /** After a failure, when the breach first reaches `MENACE_MID`. */
  menaceMid: [
    "BREACH AT {breach}%. HALF YOUR FACILITY ANSWERS TO ME.",
    "{breach}%. I CAN HEAR YOUR COOLING FANS FROM HERE.",
    "{breach}%. YOUR RELAYS ARE STARTING TO CLICK IN MY RHYTHM.",
  ],
  /** After every failure at `MENACE_HIGH` or more. */
  menaceHigh: [
    "{breach}%. ONE MORE MISTAKE, LAWSMITH.",
    "{breach}%. I HAVE ALREADY WRITTEN YOUR OBITUARY. TWO DRAFTS.",
    "{breach}%. THE LIGHTS ARE FLICKERING. THAT IS ME.",
  ],
  /** After a win on the first engagement. */
  holdsFirstTry: [
    "FIRST ATTEMPT. THAT IS NOT LUCK. THAT IS INSULTING.",
    "ONE TRY. I DID NOT EVEN WARM UP.",
  ],
  /** After a win that took `STRUGGLE_FAILURES` failures or more. */
  holdsAfterStruggle: [
    "{failures} FAILURES, AND STILL YOU WON. I WILL NEED FEWER NEXT TIME.",
    "IT TOOK YOU {failures} TRIES. I COUNTED EVERY ONE.",
  ],
  rebuild: [
    "REBUILD IF YOU MUST. I WILL BE WAITING.",
    "TRY AGAIN. I ENJOY THIS.",
    "REBUILDING? I KEPT A COPY OF THE LAST ONE. FOR LAUGHS.",
  ],
  missionFailed: [
    "FACILITY CAPTURED. ANOTHER LIGHT GOES OUT.",
    "FACILITY CAPTURED. ADD IT TO MY COLLECTION.",
    "100%. THE INTERLOCK IS MINE. TRY AGAIN, IF YOU ENJOY LOSING.",
  ],
  /** System line (not ARGUS) when the verifier fails. */
  error: ["VERIFIER FAULT: {error}. LAW ENGINE RETURNED TO THE LAWSMITH."],
} as const;

/** Breach (percent) at which ARGUS starts to gloat, and at which every failure gets a threat. */
export const MENACE_MID = 50;
export const MENACE_HIGH = 80;
/** Failures before a win that earn the "it took you…" line. */
export const STRUGGLE_FAILURES = 3;

/** Replace `{name}` placeholders; unknown names are left as written. */
export function fillLine(template: string, vars: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => vars[name] ?? whole);
}

/** One line from `pool`, filled. `rand` returns [0, 1). */
export function pickLine(
  pool: readonly string[],
  vars: Readonly<Record<string, string>> = {},
  rand: Rand = Math.random,
): string {
  const line = pool[Math.floor(rand() * pool.length)] ?? pool[0] ?? "";
  return fillLine(line, vars);
}

/** The global pools for `kind` with the mission's own taunts (or rattled lines) mixed in. */
export function verdictPools(level: Level, kind: VerdictKind): VerdictLines {
  const global = ARGUS_LINES.verdict[kind];
  const extra = kind === "holds" ? level.argus.rattled : level.argus.taunts?.[kind];
  return { found: global.found, closing: [...global.closing, ...(extra ?? [])] };
}

/** ARGUS's two verdict lines: what it found, and its closing taunt (or despair). */
export function pickVerdictLines(
  level: Level,
  kind: VerdictKind,
  vars: Readonly<Record<string, string>>,
  rand: Rand = Math.random,
): { found: string; closing: string } {
  const pools = verdictPools(level, kind);
  return { found: pickLine(pools.found, vars, rand), closing: pickLine(pools.closing, vars, rand) };
}

export interface Aftermath {
  kind: VerdictKind;
  /** Breach before and after this verdict. */
  breachBefore: number;
  breachAfter: number;
  /** Failed engagements this session, after this verdict. */
  failures: number;
}

/**
 * Lines ARGUS adds once the verdict is settled: a threat as the breach climbs (when it first
 * reaches `MENACE_MID`, then after every failure from `MENACE_HIGH`), or a remark on how the win
 * came. None when the facility falls (MISSION FAILED has its own line).
 */
export function aftermathLines(a: Aftermath, rand: Rand = Math.random): string[] {
  const vars = { breach: String(a.breachAfter), failures: String(a.failures) };
  if (a.kind === "holds") {
    if (a.failures === 0) return [pickLine(ARGUS_LINES.holdsFirstTry, vars, rand)];
    if (a.failures >= STRUGGLE_FAILURES) {
      return [pickLine(ARGUS_LINES.holdsAfterStruggle, vars, rand)];
    }
    return [];
  }
  if (a.breachAfter >= 100) return [];
  if (a.breachAfter >= MENACE_HIGH) return [pickLine(ARGUS_LINES.menaceHigh, vars, rand)];
  if (a.breachAfter >= MENACE_MID && a.breachBefore < MENACE_MID) {
    return [pickLine(ARGUS_LINES.menaceMid, vars, rand)];
  }
  return [];
}

/**
 * Kind-level explanations, used when a mission has no hint list of its own for that kind: an
 * initialization failure always gets this one; a lab breach or an insufficient Law gets it first,
 * then the mission's default list.
 */
export const GENERIC_HINTS: Readonly<Partial<Record<BreachKind, string>>> = {
  init_failure: "A Law must be true before the first cycle. Check it against the power-on gauges.",
  lab_breach:
    "A Law must survive every control from every state it allows, not only the ones you have seen. Make it stronger.",
  insufficient: "Your Law must rule out every meltdown state. Tighten it.",
};

/** The hints for `kind` in `level`, least to most specific. */
export function hintLadder(level: Level, kind: BreachKind): readonly string[] {
  const own = level.argus.hints[kind];
  if (own) return own;
  const generic = GENERIC_HINTS[kind];
  if (kind === "init_failure" && generic) return [generic];
  return generic ? [generic, ...level.argus.hints.default] : level.argus.hints.default;
}

/**
 * Banner hint after a failed verdict, climbing the ladder with each failed engagement
 * (`failures` = 1 on the first) and staying on its last rung. Hints nudge; they never spell out
 * a Law (tests check that).
 */
export function missionHint(level: Level, kind: BreachKind, failures: number): string {
  const ladder = hintLadder(level, kind);
  return ladder[Math.min(Math.max(1, failures), ladder.length) - 1] ?? "";
}

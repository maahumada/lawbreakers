// The ENGAGE sequence: lock the rack and the machine, send the Law to the verifier while ARGUS
// talks, then play the verdict on the machine through store actions and settle the session
// (breach, attempts, score). Every await re-checks a run token, so REBUILD, RETRY or leaving the
// mission cancels a sequence in flight.

import type { Level } from "../../engine/level.ts";
import { initialState } from "../../engine/level.ts";
import { BREACH_MAX, scoreMission } from "../../engine/score.ts";
import type { Verdict } from "../../engine/types.ts";
import { ARGUS_LINES, pickLine } from "../../game/argusLines.ts";
import { saveBest } from "../../game/bestScores.ts";
import type { LineTone } from "../../game/engageStore.ts";
import { useEngage } from "../../game/engageStore.ts";
import { useMission } from "../../game/missionStore.ts";
import { useRack } from "../../game/rackStore.ts";
import { verifyLaw } from "../../worker/client.ts";
import { formatExpr } from "../machine/format.ts";
import { prefersReducedMotion, revealElement } from "../motion.ts";
import { controlLabel, formatMoves, formatState } from "./verdictText.ts";

/** Typing speed of ARGUS's terminal (also used by `TypedLine`). */
export const TYPE_MS_PER_CHAR = 18;

interface Pace {
  /** Per character while a line types. */
  char: number;
  /** Pause after a line. */
  beat: number;
  /** Between replayed controls. */
  step: number;
}

const pace = (): Pace =>
  prefersReducedMotion()
    ? { char: 0, beat: 250, step: 450 }
    : { char: TYPE_MS_PER_CHAR, beat: 450, step: 950 };

class Cancelled extends Error {}

let run = 0;

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Stop any sequence in flight (its next await throws `Cancelled`). */
export function cancelEngage(): void {
  run++;
}

async function play(level: Level): Promise<void> {
  const law = useRack.getState().law;
  if (!law || useEngage.getState().phase !== "idle") return;
  const id = ++run;
  const p = pace();
  const alive = () => {
    if (id !== run) throw new Cancelled();
  };
  const wait = async (ms: number) => {
    await sleep(ms);
    alive();
  };
  const say = async (text: string, tone: LineTone = "argus") => {
    alive();
    useEngage.getState().say(text, tone);
    await wait(text.length * p.char + p.beat);
  };

  useRack.getState().setLocked(true);
  useMission.getState().lock();
  useEngage.getState().begin(law);

  useEngage.getState().say(`LAW ENGAGED: ${formatExpr(law)}`, "system");
  const pending = verifyLaw(level.id, law);
  pending.catch(() => undefined); // handled below; avoid an unhandled rejection while ARGUS types

  await say(pickLine(ARGUS_LINES.analyzing));
  await say(pickLine(ARGUS_LINES.searching));

  let verdict: Verdict;
  try {
    verdict = await pending;
  } catch (err) {
    alive();
    const error = err instanceof Error ? err.message : String(err);
    useEngage.getState().say(pickLine(ARGUS_LINES.error, { error: error.toUpperCase() }), "error");
    useMission.getState().release();
    useRack.getState().setLocked(false);
    useEngage.getState().idle();
    return;
  }
  alive();

  useEngage.getState().setVerdict(verdict, 0);
  useEngage.getState().setPhase("replaying");
  revealElement(document.querySelector("[data-replay-target]"), "start");
  await present(level, verdict, { say, wait, step: p.step });

  const mission = useMission.getState();
  const before = mission.breach;
  mission.recordVerdict(verdict.kind);
  const after = useMission.getState();
  useEngage.getState().setVerdict(verdict, after.breach - before);

  if (verdict.kind === "holds") {
    const cost = useRack.getState().cost;
    const elapsedMs = Date.now() - after.startedAt;
    const score = scoreMission({
      verdict: "holds",
      budget: level.hand.budget,
      cost,
      breach: after.breach,
      failedAttempts: after.failures,
      elapsedMs,
    });
    if (!score) return;
    const { best, newBest } = saveBest(level.id, score.total);
    useEngage.getState().setResult({
      score,
      best,
      newBest,
      cost,
      budget: level.hand.budget,
      attempts: after.attempts,
      breach: after.breach,
      elapsedMs,
    });
    useEngage.getState().setPhase("verdict");
    await wait(p.step);
    useEngage.getState().setPhase("results");
  } else if (after.breach >= BREACH_MAX) {
    useEngage.getState().setPhase("verdict");
    await say(pickLine(ARGUS_LINES.missionFailed));
    useEngage.getState().setPhase("failed");
  } else {
    useEngage.getState().setPhase("verdict");
  }
}

interface Beats {
  say: (text: string) => Promise<void>;
  wait: (ms: number) => Promise<void>;
  step: number;
}

/** Show the verdict on the machine, with ARGUS narrating. */
async function present(level: Level, v: Verdict, { say, wait, step }: Beats): Promise<void> {
  const m = useMission.getState();
  const lines = ARGUS_LINES.verdict[v.kind];
  switch (v.kind) {
    case "init_failure": {
      const vars = { state: formatState(level, v.state) };
      m.show(v.state, "init");
      await say(pickLine(lines.found, vars));
      await say(pickLine(lines.closing, vars));
      return;
    }
    case "live_breach": {
      const [start, ...moves] = v.trace;
      if (!start) return;
      m.show(start.state, "live");
      await say(pickLine(lines.found, { moves: formatMoves(level, v) }));
      for (const t of moves) {
        await wait(step);
        m.replayFire(t.control);
      }
      await wait(step / 2);
      await say(
        pickLine(lines.closing, { state: formatState(level, v.trace.at(-1)?.state ?? {}) }),
      );
      return;
    }
    case "lab_breach": {
      const vars = {
        before: formatState(level, v.before),
        after: formatState(level, v.after),
        control: controlLabel(level, v.control),
      };
      await say(pickLine(lines.found, vars));
      m.show(v.before, "lab");
      await wait(step * 1.5);
      m.replayFire(v.control);
      await wait(step / 2);
      await say(pickLine(lines.closing, vars));
      return;
    }
    case "insufficient": {
      const vars = { state: formatState(level, v.state) };
      await say(pickLine(lines.found, vars));
      m.show(v.state, "meltdown");
      await wait(step / 2);
      await say(pickLine(lines.closing, vars));
      return;
    }
    case "holds":
      m.show(initialState(level), "holds");
      await say(pickLine(lines.found));
      await say(pickLine(lines.closing));
      return;
  }
}

/** ENGAGE: run the attack on the rack's current Law. */
export function engage(level: Level): void {
  play(level).catch((err: unknown) => {
    if (!(err instanceof Cancelled)) throw err;
  });
}

/** REBUILD: back to power-on, rack unlocked with the player's circuit intact. */
export function rebuild(): void {
  cancelEngage();
  const failed = useEngage.getState().verdict?.kind !== "holds";
  useMission.getState().release();
  useRack.getState().setLocked(false);
  useEngage.getState().idle();
  if (failed) useEngage.getState().say(pickLine(ARGUS_LINES.rebuild));
}

/** RETRY: the whole mission from scratch (breach, attempts, clock, rack, terminal). */
export function retry(level: Level): void {
  cancelEngage();
  useMission.getState().restart();
  useRack.getState().reset(level);
  useEngage.getState().reset(level);
}

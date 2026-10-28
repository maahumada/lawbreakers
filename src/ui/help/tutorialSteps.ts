// Coach marks for a first-time player (shown on Mission 01, replayable from the "?" panel on any
// mission). The voice is COMMAND, the human side: short, plain, sentence case, never ARGUS's
// capitals. No step may name a module combination that solves a mission (tested).

export interface TutorialStep {
  id: string;
  /** CSS selectors tried in order; the first visible match is spotlighted. */
  targets: readonly string[];
  /** Parts of the screen the step talks about besides its target: the card must not cover them. */
  avoid?: readonly string[];
  title: string;
  body: string;
}

export const TUTORIAL_STEPS = [
  {
    id: "machine",
    targets: [".machine__brief"],
    avoid: [".machine__gauges"],
    title: "This is the facility",
    body: "Gauges show its state. The red box is the meltdown condition: if it ever comes true, we lose the facility.",
  },
  {
    id: "controls",
    targets: [".machine__controls", ".machine__gauges"],
    avoid: [".machine__gauges", ".machine__telemetry"],
    title: "Work the controls",
    body: "Press a control and watch the gauges. Telemetry logs every state. Look for something that never changes.",
  },
  {
    id: "hand",
    targets: [".hand"],
    title: "Your hand",
    body: "Sensors read gauges. Cards are operators, limited. Round plugs carry numbers, square plugs carry signals. A plug only fits its own socket shape.",
  },
  {
    id: "rack",
    targets: ["[data-testid='rack-board']"],
    avoid: [".hand"],
    title: "Wire a Law",
    body: "Pick a module, then a lit socket. Whatever signal reaches the SHIELD is your Law: a rule the machine must always obey.",
  },
  {
    id: "engage",
    targets: ["[data-testid='engage']", "[data-slot='engage']"],
    title: "Engage",
    body: "When the circuit closes, engage the interlock. ARGUS then attacks your Law with every legal move it has.",
  },
  {
    id: "verdict",
    targets: [".argus"],
    title: "Read the verdict",
    body: "Your Law must hold at power-on, survive every control and rule out meltdown. Miss one and ARGUS shows you how it won. Hit all three: THE LAW HOLDS.",
  },
] as const satisfies readonly TutorialStep[];

/** Step `i`, clamped to the script. */
export function tutorialStep(i: number): TutorialStep {
  const last = TUTORIAL_STEPS.length - 1;
  return TUTORIAL_STEPS[Math.min(Math.max(0, i), last)] ?? TUTORIAL_STEPS[0];
}

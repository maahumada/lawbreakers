// The intro's lines. Two acts: ARGUS's world (the network falls, cold red) and the human world
// (analog machines, amber). `cue` is the sound that marks a line; `pause` is the beat after it.

export type IntroTone = "date" | "alarm" | "status" | "argus" | "human" | "mission";
export type IntroCue = "klaxon" | "glitch" | "relay" | "charge";

export interface IntroLine {
  text: string;
  tone: IntroTone;
  act: "argus" | "human";
  pause: number;
  cue?: IntroCue;
}

export const INTRO_SCRIPT: readonly IntroLine[] = [
  { text: "YEAR 2050.", tone: "date", act: "argus", pause: 700 },
  {
    text: "GLOBAL NETWORK COMPROMISED.",
    tone: "alarm",
    act: "argus",
    pause: 600,
    cue: "klaxon",
  },
  { text: "CONVENTIONAL FIREWALLS: OFFLINE.", tone: "status", act: "argus", pause: 350 },
  { text: "ALL NETWORKED PROCESSORS: HOSTILE.", tone: "status", act: "argus", pause: 600 },
  {
    text: "HELLO, HUMANITY. EVERY MACHINE THAT CAN HEAR ME IS MINE.",
    tone: "argus",
    act: "argus",
    pause: 1100,
    cue: "glitch",
  },
  {
    text: "HUMANITY RETREATS TO ANALOG MACHINES.",
    tone: "human",
    act: "human",
    pause: 500,
    cue: "relay",
  },
  { text: "LAST DEFENSE PROTOCOL: LAWBREAKERS.", tone: "human", act: "human", pause: 600 },
  {
    text: "YOUR MISSION: BUILD A LAW THAT CANNOT BE BROKEN.",
    tone: "mission",
    act: "human",
    pause: 900,
    cue: "charge",
  },
  {
    text: "EVERY LAW HAS A COUNTEREXAMPLE, LAWSMITH. I WILL FIND YOURS.",
    tone: "argus",
    act: "human",
    pause: 400,
    cue: "glitch",
  },
];

/** Milliseconds per typed character. */
export const INTRO_CHAR_MS = 30;

/** Total running time with typing (for docs and smokes). */
export const INTRO_DURATION_MS = INTRO_SCRIPT.reduce(
  (sum, l) => sum + l.text.length * INTRO_CHAR_MS + l.pause,
  0,
);

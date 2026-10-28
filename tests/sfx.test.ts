import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A minimal WebAudio stand-in: every node accepts the calls sfx.ts makes and counts starts.
let started = 0;

class Param {
  value = 0;
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}

class Node {
  connect = vi.fn();
  disconnect = vi.fn();
}

class Source extends Node {
  frequency = new Param();
  type = "sine";
  buffer: unknown = null;
  start = vi.fn(() => {
    started++;
  });
  stop = vi.fn();
}

class FakeContext {
  state: AudioContextState = "running";
  currentTime = 0;
  sampleRate = 8000;
  destination = new Node();
  resume = vi.fn(() => Promise.resolve());
  addEventListener = vi.fn();
  createOscillator = () => new Source();
  createBufferSource = () => new Source();
  createGain = () => Object.assign(new Node(), { gain: new Param() });
  createBiquadFilter = () =>
    Object.assign(new Node(), { type: "lowpass", frequency: new Param(), Q: new Param() });
  createBuffer = (_channels: number, length: number) => ({
    getChannelData: () => new Float32Array(length),
  });
}

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

type Sound = typeof import("../src/audio/sound.ts");
type Sfx = typeof import("../src/audio/sfx.ts");

async function load(): Promise<{ sound: Sound; sfx: Sfx }> {
  vi.resetModules();
  const sound = await import("../src/audio/sound.ts");
  const sfx = await import("../src/audio/sfx.ts");
  return { sound, sfx };
}

const ALL = (sfx: Sfx) => [
  sfx.clack,
  sfx.unplug,
  sfx.notch,
  sfx.uiClick,
  sfx.tick,
  () => sfx.typeTicks(500),
  sfx.charge,
  sfx.scanBeep,
  () => sfx.klaxon(),
  sfx.shimmer,
  () => sfx.successChord(3),
  sfx.glitch,
];

beforeEach(() => {
  started = 0;
  vi.stubGlobal("window", { localStorage: fakeStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sfx", () => {
  it("is silent and does not throw before any gesture or without WebAudio", async () => {
    const { sfx } = await load();
    for (const play of ALL(sfx)) expect(play).not.toThrow();
    expect(started).toBe(0);
  });

  it("plays every sound once unlocked", async () => {
    vi.stubGlobal("AudioContext", FakeContext);
    const { sound, sfx } = await load();
    sound.unlockAudio();
    expect(sound.output()).not.toBeNull();
    for (const play of ALL(sfx)) {
      const before = started;
      expect(play).not.toThrow();
      expect(started).toBeGreaterThan(before);
    }
  });

  it("rate-limits typing ticks", async () => {
    vi.stubGlobal("AudioContext", FakeContext);
    const { sound, sfx } = await load();
    sound.unlockAudio();
    sfx.tick();
    const once = started;
    sfx.tick();
    sfx.tick();
    expect(started).toBe(once);
  });

  it("hum follows the circuit and the mute switch", async () => {
    vi.stubGlobal("AudioContext", FakeContext);
    const { sound, sfx } = await load();
    sfx.setHum(true);
    expect(sfx.isHumming()).toBe(false); // no gesture yet: remembered, not playing
    sound.unlockAudio();
    expect(sfx.isHumming()).toBe(true);
    sound.useSound.getState().setMuted(true);
    expect(sfx.isHumming()).toBe(false);
    sound.useSound.getState().setMuted(false);
    expect(sfx.isHumming()).toBe(true);
    sfx.setHum(false);
    expect(sfx.isHumming()).toBe(false);
  });

  it("a broken context never throws out of a sound", async () => {
    class Broken extends FakeContext {
      override createOscillator = (): Source => {
        throw new Error("closed");
      };
    }
    vi.stubGlobal("AudioContext", Broken);
    const { sound, sfx } = await load();
    sound.unlockAudio();
    for (const play of ALL(sfx)) expect(play).not.toThrow();
  });
});

describe("mute", () => {
  it("defaults to sound on", async () => {
    const { sound } = await load();
    expect(sound.useSound.getState().muted).toBe(false);
  });

  it("persists across reloads and silences every sound", async () => {
    vi.stubGlobal("AudioContext", FakeContext);
    const first = await load();
    first.sound.unlockAudio();
    first.sound.useSound.getState().toggle();
    expect(window.localStorage.getItem(first.sound.MUTE_KEY)).toBe("1");

    const second = await load();
    expect(second.sound.useSound.getState().muted).toBe(true);
    second.sound.unlockAudio();
    expect(second.sound.output()).toBeNull();
    for (const play of ALL(second.sfx)) play();
    expect(started).toBe(0);

    second.sound.useSound.getState().toggle();
    expect(window.localStorage.getItem(second.sound.MUTE_KEY)).toBeNull();
    expect(second.sound.output()).not.toBeNull();
  });

  it("works without storage", async () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
    });
    const { sound } = await load();
    expect(sound.useSound.getState().muted).toBe(false);
    expect(() => sound.useSound.getState().toggle()).not.toThrow();
    expect(sound.useSound.getState().muted).toBe(true);
  });
});

describe("intro seen flag", () => {
  it("is unset on a fresh profile, set after the intro, and survives missing storage", async () => {
    const { introSeen, markIntroSeen } = await import("../src/game/introSeen.ts");
    expect(introSeen()).toBe(false);
    markIntroSeen();
    expect(introSeen()).toBe(true);
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
    });
    expect(introSeen()).toBe(false);
    expect(() => markIntroSeen()).not.toThrow();
  });
});

describe("intro script", () => {
  it("carries the brief's lines in order and fits in about 20 s", async () => {
    const { INTRO_SCRIPT, INTRO_DURATION_MS } = await import("../src/ui/screens/introScript.ts");
    const texts = INTRO_SCRIPT.map((l) => l.text);
    const brief = [
      "YEAR 2050.",
      "GLOBAL NETWORK COMPROMISED.",
      "CONVENTIONAL FIREWALLS: OFFLINE.",
      "ALL NETWORKED PROCESSORS: HOSTILE.",
      "HUMANITY RETREATS TO ANALOG MACHINES.",
      "LAST DEFENSE PROTOCOL: LAWBREAKERS.",
      "YOUR MISSION: BUILD A LAW THAT CANNOT BE BROKEN.",
    ];
    expect(texts.filter((t) => brief.includes(t))).toEqual(brief);
    expect(INTRO_SCRIPT.some((l) => l.tone === "argus")).toBe(true);
    expect(INTRO_DURATION_MS).toBeLessThan(20_000);
  });
});

describe("success relay count", () => {
  it("is the rack's column count", async () => {
    const { rackColumns } = await import("../src/audio/bindings.ts");
    expect(rackColumns(null)).toBe(0);
    const leaf = { id: 1, mod: { kind: "sensor" as const, name: "A" }, inputs: [] };
    const eq = { id: 2, mod: { kind: "card" as const, card: "eq" as const }, inputs: [leaf, null] };
    expect(rackColumns(leaf)).toBe(1);
    expect(rackColumns(eq)).toBe(2);
  });
});

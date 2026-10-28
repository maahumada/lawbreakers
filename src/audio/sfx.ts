// Synthesized sound effects (WebAudio, no asset files). Every function is safe to call at any time:
// before the first gesture, while muted, or without WebAudio it does nothing. Volumes are relative
// to the master bus in `sound.ts`.

import type { Output } from "./sound.ts";
import { onAudioChange, output } from "./sound.ts";

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  /** Glide to this frequency by the end. */
  to?: number;
  /** Seconds from now. */
  at?: number;
  dur: number;
  gain: number;
  attack?: number;
  /** Lowpass cutoff, if any. */
  lowpass?: number;
}

function tone(o: Output, t: ToneOpts): void {
  const { ctx, out } = o;
  const start = ctx.currentTime + (t.at ?? 0);
  const end = start + t.dur;
  const osc = ctx.createOscillator();
  osc.type = t.type ?? "sine";
  osc.frequency.setValueAtTime(t.freq, start);
  if (t.to !== undefined) osc.frequency.exponentialRampToValueAtTime(t.to, end);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(t.gain, start + (t.attack ?? 0.005));
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  let head: AudioNode = osc;
  if (t.lowpass !== undefined) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = t.lowpass;
    osc.connect(lp);
    head = lp;
  }
  head.connect(env);
  env.connect(out);
  osc.start(start);
  osc.stop(end + 0.02);
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}

interface NoiseOpts {
  at?: number;
  dur: number;
  gain: number;
  filter: BiquadFilterType;
  freq: number;
  q?: number;
}

function noise(o: Output, n: NoiseOpts): void {
  const { ctx, out } = o;
  const start = ctx.currentTime + (n.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = n.filter;
  f.frequency.value = n.freq;
  f.Q.value = n.q ?? 1;
  const env = ctx.createGain();
  env.gain.setValueAtTime(n.gain, start);
  env.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
  src.connect(f);
  f.connect(env);
  env.connect(out);
  src.start(start);
  src.stop(start + n.dur + 0.02);
}

/** Run `fn` with the output if sound can play. Swallows WebAudio errors: sound is never fatal. */
function play(fn: (o: Output) => void): void {
  const o = output();
  if (!o) return;
  try {
    fn(o);
  } catch {
    // A broken or closed context: stay silent.
  }
}

/** One relay contact closing (used by plug-in, replay steps and the success sequence). */
function relay(o: Output, at = 0, gain = 0.5): void {
  noise(o, { at, dur: 0.025, gain, filter: "bandpass", freq: 2600, q: 2.5 });
  tone(o, { at, type: "square", freq: 190, to: 90, dur: 0.035, gain: gain * 0.25, lowpass: 1400 });
  noise(o, { at: at + 0.045, dur: 0.018, gain: gain * 0.45, filter: "bandpass", freq: 3400, q: 3 });
}

/** A module plugs into a socket: a heavy double clack. */
export function clack(): void {
  play((o) => relay(o));
}

/** A module comes out: a scrape and a falling blip. */
export function unplug(): void {
  play((o) => {
    noise(o, { dur: 0.06, gain: 0.25, filter: "highpass", freq: 1800 });
    tone(o, { type: "triangle", freq: 520, to: 160, dur: 0.11, gain: 0.12 });
  });
}

/** A dial notch or a module moved within the rack. */
export function notch(): void {
  play((o) => noise(o, { dur: 0.015, gain: 0.18, filter: "bandpass", freq: 4200, q: 4 }));
}

/** Soft UI click (buttons, links, toggles). */
export function uiClick(): void {
  play((o) => tone(o, { type: "sine", freq: 1100, to: 700, dur: 0.035, gain: 0.07 }));
}

let lastTick = 0;
/** Minimum spacing between typing ticks, so long lines never become a buzz. */
export const TICK_MIN_MS = 45;

/** One terminal typing tick. Rate limited. */
export function tick(): void {
  const now = Date.now();
  if (now - lastTick < TICK_MIN_MS) return;
  lastTick = now;
  play((o) =>
    tone(o, { type: "square", freq: 1900 + Math.random() * 500, dur: 0.008, gain: 0.025 }),
  );
}

/** Ticks for a line that types over `ms` milliseconds (scheduled ahead, at most one per 60 ms). */
export function typeTicks(ms: number): void {
  play((o) => {
    const count = Math.min(40, Math.floor(ms / 60));
    for (let i = 0; i < count; i++) {
      tone(o, {
        at: (i * 60 + Math.random() * 15) / 1000,
        type: "square",
        freq: 1900 + Math.random() * 500,
        dur: 0.008,
        gain: 0.02,
      });
    }
  });
}

/** ENGAGE: a capacitor charging, then the contact. */
export function charge(): void {
  play((o) => {
    tone(o, {
      type: "sawtooth",
      freq: 90,
      to: 760,
      dur: 0.55,
      gain: 0.09,
      attack: 0.3,
      lowpass: 1800,
    });
    tone(o, { type: "sine", freq: 180, to: 1500, dur: 0.55, gain: 0.05, attack: 0.3 });
    relay(o, 0.55, 0.6);
  });
}

/** One scanning beep (ARGUS probing). */
export function scanBeep(): void {
  play((o) => {
    const freq = [1320, 1760, 1980, 2640][Math.floor(Math.random() * 4)] ?? 1760;
    tone(o, { type: "sine", freq, dur: 0.06, gain: 0.05 });
  });
}

/** Breach klaxon: a two-tone alarm, `cycles` times. */
export function klaxon(cycles = 3): void {
  play((o) => {
    for (let i = 0; i < cycles * 2; i++) {
      tone(o, {
        at: i * 0.22,
        type: "sawtooth",
        freq: i % 2 === 0 ? 466 : 349,
        dur: 0.21,
        gain: 0.1,
        attack: 0.02,
        lowpass: 1600,
      });
    }
    noise(o, { dur: 0.25, gain: 0.25, filter: "lowpass", freq: 600 });
  });
}

/** Lab simulation: a cold hologram shimmer. */
export function shimmer(): void {
  play((o) => {
    const notes = [1046.5, 1318.5, 1568, 1864.7, 2093, 2637];
    notes.forEach((freq, i) => {
      tone(o, { at: i * 0.06, type: "sine", freq, dur: 0.9, gain: 0.035, attack: 0.04 });
      tone(o, {
        at: i * 0.06,
        type: "sine",
        freq: freq * 1.006,
        dur: 0.9,
        gain: 0.02,
        attack: 0.04,
      });
    });
  });
}

/** Spacing of the success relay sequence, shared with the rack's CSS (`--relay-step`). */
export const RELAY_STEP_S = 0.14;

/** THE LAW HOLDS: `relays` contacts close in sequence, then a rising major chord. */
export function successChord(relays = 0): void {
  play((o) => {
    for (let i = 0; i < relays; i++) relay(o, i * RELAY_STEP_S, 0.45);
    const at = relays * RELAY_STEP_S + 0.05;
    [261.63, 329.63, 392, 523.25].forEach((freq, i) => {
      tone(o, { at: at + i * 0.08, type: "triangle", freq, dur: 1.6, gain: 0.08, attack: 0.03 });
    });
    tone(o, { at: at + 0.32, type: "sine", freq: 1046.5, dur: 1.4, gain: 0.03, attack: 0.05 });
  });
}

/** ARGUS breaking in: bursts of digital noise. */
export function glitch(): void {
  play((o) => {
    for (let i = 0; i < 5; i++) {
      noise(o, {
        at: i * 0.05 + Math.random() * 0.03,
        dur: 0.03,
        gain: 0.18,
        filter: "bandpass",
        freq: 800 + Math.random() * 4000,
        q: 6,
      });
    }
    tone(o, { type: "square", freq: 80, to: 40, dur: 0.25, gain: 0.05, lowpass: 400 });
  });
}

// --- Hum: a continuous mains hum while the circuit is complete ---------------------------------

interface HumNodes {
  oscs: OscillatorNode[];
  env: GainNode;
  ctx: AudioContext;
}

let humWanted = false;
let hum: HumNodes | null = null;
let humWatch: (() => void) | null = null;

function startHum(): void {
  if (hum) return;
  const o = output();
  if (!o) return;
  try {
    const { ctx, out } = o;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 260;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.5);
    const oscs = [
      { type: "sawtooth" as const, freq: 50 },
      { type: "sine" as const, freq: 100 },
    ].map(({ type, freq }) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(lp);
      osc.start();
      return osc;
    });
    lp.connect(env);
    env.connect(out);
    hum = { oscs, env, ctx };
  } catch {
    hum = null;
  }
}

function stopHum(): void {
  if (!hum) return;
  const { oscs, env, ctx } = hum;
  hum = null;
  try {
    const now = ctx.currentTime;
    env.gain.cancelScheduledValues(now);
    env.gain.setTargetAtTime(0.0001, now, 0.08);
    oscs.forEach((osc) => osc.stop(now + 0.5));
  } catch {
    // Already gone.
  }
}

function syncHum(): void {
  if (humWanted && output()) startHum();
  else stopHum();
}

/** Hum on or off. Remembers the wish, so it starts once sound becomes available. */
export function setHum(on: boolean): void {
  humWanted = on;
  humWatch ??= onAudioChange(syncHum);
  syncHum();
}

export function isHumming(): boolean {
  return hum !== null;
}

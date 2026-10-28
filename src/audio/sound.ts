// The audio context and the mute switch. Browsers only let a page start audio after a user gesture,
// so the context is created (or resumed) by `unlockAudio`, which `installAudioUnlock` calls on the
// first pointer or key press. Until then every sound is a silent no-op. Mute is persisted in
// localStorage (default: sound on); storage can be missing or throw, so every access is wrapped.

import { create } from "zustand";

export const MUTE_KEY = "lawbreakers:muted";

/** Master volume: modest, the game is mostly read in silence. */
export const MASTER_VOLUME = 0.32;

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  try {
    if (muted) window.localStorage.setItem(MUTE_KEY, "1");
    else window.localStorage.removeItem(MUTE_KEY);
  } catch {
    // Not persisted: the setting lives for this session only.
  }
}

interface SoundStore {
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggle: () => void;
}

export const useSound = create<SoundStore>()((set, get) => ({
  muted: readMuted(),
  setMuted: (muted) => {
    writeMuted(muted);
    set({ muted });
  },
  toggle: () => get().setMuted(!get().muted),
}));

/** Re-read the persisted setting (tests, other tabs). */
export function reloadMuted(): void {
  useSound.setState({ muted: readMuted() });
}

type AudioCtor = new () => AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const listeners = new Set<() => void>();

function audioCtor(): AudioCtor | undefined {
  const g = globalThis as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return g.AudioContext ?? g.webkitAudioContext;
}

function applyVolume(): void {
  if (!ctx || !master) return;
  const target = useSound.getState().muted ? 0 : MASTER_VOLUME;
  master.gain.setTargetAtTime(target, ctx.currentTime, 0.02);
}

useSound.subscribe((s, prev) => {
  if (s.muted === prev.muted) return;
  applyVolume();
  listeners.forEach((l) => l());
});

/** Create or resume the audio context. Call it from a user gesture. Never throws. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor = audioCtor();
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = useSound.getState().muted ? 0 : MASTER_VOLUME;
      master.connect(ctx.destination);
      ctx.addEventListener?.("statechange", () => listeners.forEach((l) => l()));
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    listeners.forEach((l) => l());
  } catch {
    ctx = null;
    master = null;
  }
}

/** Unlock on the first gestures (kept installed: a context can be suspended again later). */
export function installAudioUnlock(): () => void {
  const opts = { capture: true, passive: true } as const;
  document.addEventListener("pointerdown", unlockAudio, opts);
  document.addEventListener("keydown", unlockAudio, opts);
  return () => {
    document.removeEventListener("pointerdown", unlockAudio, opts);
    document.removeEventListener("keydown", unlockAudio, opts);
  };
}

export interface Output {
  ctx: AudioContext;
  out: AudioNode;
}

/** The running context and the master bus, or `null` when sound cannot or should not play. */
export function output(): Output | null {
  if (!ctx || !master || ctx.state !== "running" || useSound.getState().muted) return null;
  return { ctx, out: master };
}

/** Called when sound becomes (un)available: unlock, mute toggle, context state change. */
export function onAudioChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tests only: forget the context. */
export function resetAudioForTests(): void {
  ctx = null;
  master = null;
}

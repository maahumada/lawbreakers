// Wires the sound effects to the game by subscribing to the stores, so game logic never calls
// audio. `installGlobalSfx` (whole app): unlock on the first gesture, UI clicks.
// `installMissionSfx` (while a mission screen is mounted): rack, ENGAGE, replay and verdict sounds.

import { useEngage } from "../game/engageStore.ts";
import type { EngagePhase } from "../game/engageStore.ts";
import { useMission } from "../game/missionStore.ts";
import type { Rack } from "../game/rack.ts";
import { useRack } from "../game/rackStore.ts";
import {
  charge,
  clack,
  klaxon,
  notch,
  scanBeep,
  setHum,
  shimmer,
  successChord,
  typeTicks,
  uiClick,
  unplug,
} from "./sfx.ts";
import { installAudioUnlock } from "./sound.ts";

/** Controls that click, except where a richer sound already answers (rack, ENGAGE, intro). */
const CLICKABLE = "button, a[href], input[type=checkbox]";
const OWN_SOUND = ".rack__body, .engage, [data-sfx='off']";

export function installGlobalSfx(): () => void {
  const offUnlock = installAudioUnlock();
  const onClick = (e: MouseEvent) => {
    const el = e.target instanceof Element ? e.target.closest(CLICKABLE) : null;
    if (!el || el.closest(OWN_SOUND) || (el as HTMLButtonElement).disabled) return;
    uiClick();
  };
  document.addEventListener("click", onClick, true);
  return () => {
    offUnlock();
    document.removeEventListener("click", onClick, true);
  };
}

/** Columns of the rack (deepest chain of modules): the success relay sequence closes one each. */
export function rackColumns(rack: Rack): number {
  if (!rack) return 0;
  return 1 + Math.max(0, ...rack.inputs.map(rackColumns));
}

const SCAN_MS = 240;

export interface MissionSfxOptions {
  /** ms per typed character in ARGUS's terminal, or 0 when lines appear at once. */
  typeMsPerChar: () => number;
}

export function installMissionSfx({ typeMsPerChar }: MissionSfxOptions): () => void {
  let scan: number | null = null;
  const stopScan = () => {
    if (scan !== null) window.clearInterval(scan);
    scan = null;
  };

  const humNow = () =>
    setHum(useRack.getState().law !== null && useEngage.getState().phase === "idle");

  const offRack = useRack.subscribe((r, p) => {
    if (r.level === p.level && r.rack !== p.rack) {
      if (r.cost > p.cost) clack();
      else if (r.cost < p.cost) unplug();
      else notch();
    }
    humNow();
  });

  const onPhase = (phase: EngagePhase, prev: EngagePhase) => {
    const kind = useEngage.getState().verdict?.kind;
    if (prev === "attacking") stopScan();
    if (phase === "attacking") {
      charge();
      scan = window.setInterval(scanBeep, SCAN_MS);
    } else if (phase === "replaying" && kind === "lab_breach") {
      shimmer();
    } else if (phase === "verdict" && prev === "replaying") {
      if (kind === "holds") successChord(rackColumns(useRack.getState().rack) + 1);
      else klaxon();
    } else if (phase === "failed") {
      klaxon(5);
    }
  };

  const offEngage = useEngage.subscribe((e, p) => {
    if (e.phase !== p.phase) onPhase(e.phase, p.phase);
    const line = e.lines.at(-1);
    if (line && line !== p.lines.at(-1) && e.phase !== "idle") {
      const ms = typeMsPerChar() * line.text.length;
      if (ms > 0) typeTicks(ms);
    }
    humNow();
  });

  // A replayed control fires: its relay clacks.
  const offMission = useMission.subscribe((m, p) => {
    if (m.display && m.display.pulse !== p.display?.pulse && m.display.firing) clack();
  });

  humNow();
  return () => {
    offRack();
    offEngage();
    offMission();
    stopScan();
    setHum(false);
  };
}

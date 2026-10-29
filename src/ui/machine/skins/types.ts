import type { DisplayPanel, PanelOf, SkinId } from "../../../engine/display.ts";
import type { State } from "../../../engine/expr.ts";
import type { VarDecl } from "../../../engine/level.ts";
import type { DisplayMode } from "../../../game/missionStore.ts";

/** What every skin receives. Skins paint only with `--human-*` tokens, so lab/meltdown is CSS. */
export interface SkinProps<P extends DisplayPanel = DisplayPanel> {
  /** The panel's variables, in panel order. */
  vars: VarDecl[];
  /** Current state, same order as `vars`. */
  values: number[];
  /** Shared full scale (`gaugeScale`); skins with their own range (jug, dial) ignore it. */
  scale: number;
  /** Verdict replay mode, `null` in free play. */
  mode: DisplayMode | null;
  /** Shown state before the last replayed fire (lab ghost step), `null` otherwise. */
  from: number[] | null;
  /** Counts fires (free play and replays), to restart one-shot feedback such as the rotor spin. */
  tick: number;
  /** Telemetry states (real runs only, never lab states), oldest first. */
  history: State[];
  panel: P;
}

export type SkinOf<S extends SkinId> = SkinProps<PanelOf<S>>;

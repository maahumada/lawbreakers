import type { DisplayPanel } from "../../../engine/display.ts";
import type { State } from "../../../engine/expr.ts";
import type { VarDecl } from "../../../engine/level.ts";
import type { DisplayMode } from "../../../game/missionStore.ts";
import { Gauge } from "../Gauge.tsx";
import { DeckSkin } from "./DeckSkin.tsx";
import { DialSkin } from "./DialSkin.tsx";
import { HoistSkin } from "./HoistSkin.tsx";
import { PistonSkin } from "./PistonSkin.tsx";
import { RotorSkin } from "./RotorSkin.tsx";
import { ScopeSkin } from "./ScopeSkin.tsx";
import { SelectorSkin } from "./SelectorSkin.tsx";
import { JugSkin, TankSkin } from "./TankSkin.tsx";
import { TokensSkin } from "./TokensSkin.tsx";
import type { SkinProps } from "./types.ts";

export interface GaugePanelProps {
  panel: DisplayPanel;
  /** Every variable of the level (the panel picks its own). */
  decls: readonly VarDecl[];
  state: State;
  scale: number;
  mode: DisplayMode | null;
  from: State | null;
  tick: number;
  history: State[];
}

function Skin(props: SkinProps) {
  const { panel } = props;
  switch (panel.skin) {
    case "nixie":
      return null; // drawn by GaugePanel itself (unchanged markup)
    case "tank":
      return <TankSkin {...props} panel={panel} />;
    case "jug":
      return <JugSkin {...props} panel={panel} />;
    case "dial":
      return <DialSkin {...props} panel={panel} />;
    case "piston":
      return <PistonSkin {...props} panel={panel} />;
    case "tokens":
      return <TokensSkin {...props} panel={panel} />;
    case "selector":
      return <SelectorSkin {...props} panel={panel} />;
    case "scope":
      return <ScopeSkin {...props} panel={panel} />;
    case "deck":
      return <DeckSkin {...props} panel={panel} />;
    case "hoist":
      return <HoistSkin {...props} panel={panel} />;
    case "rotor":
      return <RotorSkin {...props} panel={panel} />;
  }
}

/**
 * One display panel. A `nixie` panel is the original `Gauge` (same markup, so a level without
 * `display` looks exactly as before); any other skin is wrapped in `.skin[data-skin]`.
 */
export function GaugePanel({
  panel,
  decls,
  state,
  scale,
  mode,
  from,
  tick,
  history,
}: GaugePanelProps) {
  const vars = panel.vars.flatMap((n) => decls.filter((d) => d.name === n));
  const values = vars.map((d) => state[d.name] ?? 0);
  if (panel.skin === "nixie") {
    const decl = vars[0];
    return decl ? <Gauge decl={decl} value={values[0] ?? 0} scale={scale} /> : null;
  }
  return (
    <div className="skin" data-skin={panel.skin} data-testid={`skin-${panel.skin}`}>
      <Skin
        panel={panel}
        vars={vars}
        values={values}
        scale={scale}
        mode={mode}
        from={from ? vars.map((d) => from[d.name] ?? 0) : null}
        tick={tick}
        history={history}
      />
    </div>
  );
}

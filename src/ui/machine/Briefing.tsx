import type { Level } from "../../engine/level.ts";
import { formatExpr } from "./format.ts";

/** `lit`: the shown state is a meltdown (the placard alarms). */
export function Briefing({ level, lit = false }: { level: Level; lit?: boolean }) {
  return (
    <div className="briefing">
      <p className="briefing__text">{level.briefing}</p>
      <div className="meltdown" data-testid="meltdown" data-lit={lit || undefined}>
        <span className="meltdown__tag">MELTDOWN IF</span>
        <code className="meltdown__expr">{formatExpr(level.meltdown)}</code>
      </div>
    </div>
  );
}

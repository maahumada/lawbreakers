import type { Level } from "../../engine/level.ts";
import { formatExpr } from "./format.ts";

export function Briefing({ level }: { level: Level }) {
  return (
    <div className="briefing">
      <p className="briefing__text">{level.briefing}</p>
      <div className="meltdown" data-testid="meltdown">
        <span className="meltdown__tag">MELTDOWN IF</span>
        <code className="meltdown__expr">{formatExpr(level.meltdown)}</code>
      </div>
    </div>
  );
}

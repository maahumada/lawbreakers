import { loadBundledLevels } from "../engine/level.ts";
import { DevVerifyPanel } from "./dev/DevVerifyPanel.tsx";
import { MissionScreen } from "./screens/MissionScreen.tsx";

const LEVELS = loadBundledLevels();

/** `?mission=03` opens another mission until mission select exists (M3). */
function pickLevel(params: URLSearchParams) {
  const wanted = params.get("mission");
  return (
    LEVELS.find((l) => wanted !== null && l.id.startsWith(wanted.padStart(2, "0"))) ?? LEVELS[0]
  );
}

export function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("dev")) return <DevVerifyPanel />;
  const level = pickLevel(params);
  if (!level) throw new Error("no bundled levels");
  return <MissionScreen level={level} />;
}

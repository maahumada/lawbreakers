import { useEffect } from "react";
import { loadBundledLevels } from "../engine/level.ts";
import { DevVerifyPanel } from "./dev/DevVerifyPanel.tsx";
import { MissionScreen } from "./screens/MissionScreen.tsx";
import { MissionSelectScreen } from "./screens/MissionSelectScreen.tsx";
import { TitleScreen } from "./screens/TitleScreen.tsx";
import { interceptLinks, parseRoute, useSearch } from "./router.ts";

const LEVELS = loadBundledLevels();

export function App() {
  const route = parseRoute(useSearch());
  useEffect(interceptLinks, []);

  switch (route.screen) {
    case "dev":
      return <DevVerifyPanel />;
    case "title":
      return <TitleScreen levels={LEVELS} />;
    case "missions":
      return <MissionSelectScreen levels={LEVELS} />;
    case "mission": {
      const index = LEVELS.findIndex((l) => l.id.startsWith(route.number));
      const level = LEVELS[index];
      // An unknown number (e.g. ?mission=09) falls back to mission select.
      if (!level) return <MissionSelectScreen levels={LEVELS} />;
      return <MissionScreen key={level.id} level={level} index={index} levels={LEVELS} />;
    }
  }
}

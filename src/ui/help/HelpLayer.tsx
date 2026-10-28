import { useEffect } from "react";
import { tutorialSeen } from "../../game/tutorialSeen.ts";
import { useHelp } from "./helpStore.ts";
import { HowToPlay } from "./HowToPlay.tsx";
import { Tutorial } from "./Tutorial.tsx";

interface Props {
  /** The tutorial can run on this screen (mission screens). */
  tutorial?: boolean;
  /** Start the tutorial on mount unless the player has already seen it (Mission 01). */
  autoStart?: boolean;
}

/** Help surfaces of one screen. Both close when the screen goes away. */
export function HelpLayer({ tutorial = false, autoStart = false }: Props) {
  const panel = useHelp((s) => s.panel);
  const step = useHelp((s) => s.step);

  useEffect(() => {
    if (autoStart && !tutorialSeen()) useHelp.getState().startTutorial();
    return () => useHelp.setState({ panel: false, step: null });
  }, [autoStart]);

  return (
    <>
      {panel && <HowToPlay canReplay={tutorial} />}
      {tutorial && step !== null && <Tutorial />}
    </>
  );
}

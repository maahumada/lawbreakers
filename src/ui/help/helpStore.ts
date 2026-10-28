// Which help surface is open: the "How to play" panel or the tutorial (coach marks). One at a
// time: replaying the tutorial from the panel closes the panel.

import { create } from "zustand";
import { markTutorialSeen } from "../../game/tutorialSeen.ts";

interface HelpStore {
  panel: boolean;
  /** Current tutorial step, or `null` when the tutorial is not running. */
  step: number | null;
  openPanel: () => void;
  closePanel: () => void;
  startTutorial: () => void;
  goTo: (step: number) => void;
  /** Finished or skipped: either way it counts as seen. */
  endTutorial: () => void;
}

export const useHelp = create<HelpStore>()((set) => ({
  panel: false,
  step: null,
  openPanel: () => set({ panel: true, step: null }),
  closePanel: () => set({ panel: false }),
  startTutorial: () => set({ panel: false, step: 0 }),
  goTo: (step) => set({ step }),
  endTutorial: () => {
    markTutorialSeen();
    set({ step: null });
  },
}));

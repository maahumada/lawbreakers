import { useCampaign } from "../../game/campaign.ts";
import "../machine/machine.css";

/** Training mode switch (title and mission select). Applies to missions opened afterwards. */
export function TrainingToggle() {
  const training = useCampaign((c) => c.training);
  const setTraining = useCampaign((c) => c.setTraining);
  return (
    <div className="training-toggle" data-on={training || undefined}>
      <label className="toggle">
        <input
          type="checkbox"
          checked={training}
          onChange={(e) => setTraining(e.target.checked)}
          aria-describedby="training-help"
          data-testid="training-toggle"
        />
        <span className="toggle__switch" aria-hidden />
        Training mode
      </label>
      <p className="training-toggle__help" id="training-help">
        No breach meter and no score. Wins still unlock the next mission.
      </p>
    </div>
  );
}

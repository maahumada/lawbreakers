import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App.tsx";
import { BootScreen } from "./ui/screens/BootScreen.tsx";
import "./styles/tokens.css";
import "./styles/effects.css";
import "./styles/global.css";

// If the production build's COI boot script (vite.config.ts) expects coi-serviceworker to reload
// the page into cross-origin isolation, show a boot message instead of starting the app (and Z3)
// in a page that is about to go away. If the reload never comes, start anyway: the verifier then
// reports its own fault instead of the page hanging. If no registration exists after a few seconds
// (registration refused, e.g. service workers disabled), start right away.
const COI_REGISTRATION_CHECK_MS = 3_000;
const COI_RELOAD_TIMEOUT_MS = 15_000;

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");
const reactRoot = createRoot(root);

let mounted = false;
const mount = () => {
  if (mounted) return;
  mounted = true;
  reactRoot.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

if (document.documentElement.dataset.coi === "pending") {
  reactRoot.render(<BootScreen />);
  window.setTimeout(() => {
    void navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg) mount();
      })
      .catch(mount);
  }, COI_REGISTRATION_CHECK_MS);
  window.setTimeout(mount, COI_RELOAD_TIMEOUT_MS);
} else {
  mount();
}

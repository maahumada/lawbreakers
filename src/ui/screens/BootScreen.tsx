import "./boot.css";

/** Shown for the moment coi-serviceworker needs to install and reload the page (first visit). */
export function BootScreen() {
  return (
    <main className="boot-screen fx-crt" data-testid="boot-screen">
      <p className="boot-screen__line" role="status">
        BOOTING LAW ENGINE
        <span className="fx-cursor" aria-hidden="true" />
      </p>
    </main>
  );
}

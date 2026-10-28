// DEV-only page (`?dev`): proves the verify worker runs Z3 off the main thread (M1-T8).
// The frame counter is driven by requestAnimationFrame, so it stops if the main thread blocks.

import { useEffect, useState } from "react";
import { parseBool } from "../../engine/parse.ts";
import { verifyLaw, warmUp } from "../../worker/client.ts";

const LEVEL_ID = "01-last-reactor";
const LAWS = [
  { label: "reference", src: "A + B = 6" },
  { label: "wrong", src: "A >= 1" },
] as const;

interface Row {
  law: string;
  text: string;
}

function useFrameCounter(): number {
  const [frames, setFrames] = useState(0);
  useEffect(() => {
    let handle = requestAnimationFrame(function tick() {
      setFrames((n) => n + 1);
      handle = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(handle);
  }, []);
  return frames;
}

export function DevVerifyPanel() {
  const frames = useFrameCounter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("idle");
  const [rows, setRows] = useState<Row[]>([]);

  async function run() {
    setBusy(true);
    setRows([]);
    try {
      setStatus("booting Z3…");
      const { initMs } = await warmUp();
      setStatus(`Z3 ready (${Math.round(initMs)} ms); verifying…`);
      for (const { label, src } of LAWS) {
        const t0 = performance.now();
        const verdict = await verifyLaw(LEVEL_ID, parseBool(src));
        const ms = Math.round(performance.now() - t0);
        setRows((r) => [
          ...r,
          {
            law: `${label}: ${src}`,
            text: `${verdict.kind} (${ms} ms) ${JSON.stringify(verdict)}`,
          },
        ]);
      }
      // Error propagation: an unknown level must reject, not hang.
      const rejected = await verifyLaw("99-missing", parseBool("true")).then(
        () => "NOT REJECTED",
        (err: unknown) => (err instanceof Error ? err.message : String(err)),
      );
      setRows((r) => [...r, { law: "unknown level", text: `rejected: ${rejected}` }]);
      setStatus(`done (Z3 init ${Math.round(initMs)} ms)`);
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dev-panel">
      <h1>DEV: verify Mission 01</h1>
      <p>
        crossOriginIsolated: <span data-testid="coi">{String(window.crossOriginIsolated)}</span> ·
        frames: <span data-testid="frames">{frames}</span>{" "}
        <span className={busy ? "dev-spinner dev-spinner--on" : "dev-spinner"} aria-hidden />
      </p>
      <button type="button" onClick={() => void run()} disabled={busy} data-testid="verify">
        VERIFY
      </button>
      <p data-testid="status">{status}</p>
      <ul>
        {rows.map((r) => (
          <li key={r.law} data-testid="verdict">
            <strong>{r.law}</strong> → {r.text}
          </li>
        ))}
      </ul>
    </main>
  );
}

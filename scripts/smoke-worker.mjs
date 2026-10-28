// Headless browser smoke test for the verify worker (M1-T8). Not part of `npm test`.
// Usage: start a server first (`npm run build && npx vite preview --port 4173`, or `npx vite --port
// 5173`), then `node scripts/smoke-worker.mjs [url]`. Needs the `playwright` devDependency and its
// chromium (`npx playwright install chromium`).

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4173/?dev";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(url);
  const coi = await page.getByTestId("coi").textContent();
  console.log(`crossOriginIsolated: ${coi}`);

  await page.getByTestId("verify").click();
  // While Z3 boots and solves in the worker, the rAF frame counter must keep advancing.
  const frames = async () => Number(await page.getByTestId("frames").textContent());
  const f0 = await frames();
  await page.waitForTimeout(500);
  const f1 = await frames();
  console.log(`frames advanced during verification: ${f1 - f0}`);

  await page.waitForFunction(
    () => {
      const s = document.querySelector('[data-testid="status"]')?.textContent ?? "";
      return s.startsWith("done") || s.startsWith("error");
    },
    undefined,
    { timeout: 60_000 },
  );
  const status = await page.getByTestId("status").textContent();
  const verdicts = await page.getByTestId("verdict").allTextContents();
  console.log(`status: ${status}`);
  for (const v of verdicts) console.log(`  ${v}`);

  const ok =
    coi === "true" &&
    f1 > f0 &&
    status?.startsWith("done") &&
    verdicts.length === 3 &&
    verdicts[0]?.includes("→ holds") &&
    verdicts[1]?.includes("→ live_breach") &&
    verdicts[2]?.includes("rejected: verifier: unknown level '99-missing'");
  if (!ok) {
    console.log(logs.join("\n"));
    throw new Error("smoke test FAILED");
  }
  console.log("smoke test OK");
} finally {
  await browser.close();
}

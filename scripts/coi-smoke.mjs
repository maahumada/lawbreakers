// First-visit check for the GitHub Pages setup (coi-serviceworker). Run it against a server that
// sends NO COOP/COEP headers (`npm run pages-preview`): in a fresh browser context the page must
// show the boot screen, reload exactly once into cross-origin isolation, then verify with Z3; later
// visits must not reload again. Also checks that a browser without service workers still gets the
// app (not isolated, verifier fault) instead of a reload loop. Not part of `npm test`.
// Usage: `node scripts/coi-smoke.mjs [url]` (url = the app root, e.g. http://localhost:4174/lawbreakers/).

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4174/lawbreakers/";

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

const isolated = (page) => page.evaluate(() => window.crossOriginIsolated);

const browser = await chromium.launch();
try {
  // 1. Fresh context: boot screen → one reload → isolated app.
  const context = await browser.newContext();
  const page = await context.newPage();
  let navigations = 0;
  page.on("framenavigated", (f) => f === page.mainFrame() && navigations++);
  // Remember across the reload every `<html data-coi>` the boot script set and whether the boot
  // screen got rendered (locally the reload often wins the race against the app module).
  await context.addInitScript(() => {
    let recorded = false;
    new MutationObserver(() => {
      const coi = document.documentElement?.dataset.coi;
      if (coi && !recorded) {
        recorded = true;
        sessionStorage.setItem("smoke:coi", `${sessionStorage.getItem("smoke:coi") ?? ""}${coi},`);
      }
      if (document.querySelector('[data-testid="boot-screen"]')) {
        sessionStorage.setItem("smoke:saw-boot", "1");
      }
    }).observe(document, { childList: true, subtree: true, attributes: true });
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const t0 = Date.now();
  await page.goto(`${url}?dev`);
  await page.getByTestId("coi").waitFor({ timeout: 20_000 });
  console.log(`first visit ready in ${Date.now() - t0} ms`);
  const loads = await page.evaluate(() => sessionStorage.getItem("smoke:coi"));
  const sawBoot = await page.evaluate(() => sessionStorage.getItem("smoke:saw-boot") === "1");
  console.log(`data-coi per load: ${loads} boot screen rendered: ${sawBoot}`);
  check(
    loads === "pending,",
    "only the first load waits for the service worker (data-coi=pending)",
  );
  check(navigations === 2, `first visit reloads exactly once (navigations: ${navigations})`);
  check(await isolated(page), "crossOriginIsolated after the reload");
  check(
    await page.evaluate(() => navigator.serviceWorker.controller !== null),
    "page is controlled by coi-serviceworker",
  );
  check(
    (await page.evaluate(() => sessionStorage.getItem("lawbreakers:coi-reloads"))) === null,
    "reload budget reset once isolated",
  );

  await page.getByTestId("verify").click();
  await page.waitForFunction(
    () => /^(done|error)/.test(document.querySelector('[data-testid="status"]')?.textContent ?? ""),
    undefined,
    { timeout: 60_000 },
  );
  const verdicts = await page.getByTestId("verdict").allTextContents();
  for (const v of verdicts) console.log(`  ${v}`);
  check(
    verdicts[0]?.includes("→ holds") && verdicts[1]?.includes("→ live_breach"),
    "Z3 verdicts in the worker (holds, live_breach)",
  );

  // 2. Second visit (same context): no boot screen, no reload.
  navigations = 0;
  await page.goto(url);
  await page.getByTestId("rack").waitFor();
  await page.waitForTimeout(1000);
  check(navigations === 1, `second visit does not reload (navigations: ${navigations})`);
  check(await isolated(page), "second visit isolated");

  // 3. Mission 01 end to end on the isolated page: A + B = 6 holds.
  const put = async (item, key, value) => {
    await page.getByTestId(`hand-${item}`).click();
    await page.getByTestId(`slot-${key}`).click();
    if (value !== undefined) {
      await page.getByTestId(`dial-${key}`).focus();
      for (let i = 0; i < value; i++) await page.keyboard.press("ArrowUp");
    }
  };
  await put("card-eq", "root");
  await put("card-add", "0");
  await put("sensor-A", "0-0");
  await put("sensor-B", "0-1");
  await put("const", "1", 6);
  await page.getByTestId("engage").click();
  const verdict = page.getByTestId("verdict");
  await verdict.waitFor({ timeout: 45_000 });
  check((await verdict.getAttribute("data-kind")) === "holds", "Mission 01 A + B = 6 → holds");
  check(errors.length === 0, `no page errors (${errors.join(" | ")})`);
  await context.close();

  // 4. No service workers (like some private windows): the app still starts, never loops.
  const blocked = await browser.newContext({ serviceWorkers: "block" });
  const page2 = await blocked.newPage();
  let nav2 = 0;
  page2.on("framenavigated", (f) => f === page2.mainFrame() && nav2++);
  const t1 = Date.now();
  await page2.goto(url);
  await page2.getByTestId("rack").waitFor({ timeout: 30_000 });
  console.log(`without service workers: app mounted after ${Date.now() - t1} ms`);
  await page2.waitForTimeout(1000);
  check(nav2 === 1, `without service workers: no reload (navigations: ${nav2})`);
  check(!(await isolated(page2)), "without service workers: not isolated (expected)");
  await blocked.close();
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.log(`\ncoi smoke FAILED (${failures.length})`);
  process.exit(1);
}
console.log("\ncoi smoke OK");

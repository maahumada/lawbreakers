// Campaign in a real browser (real worker + Z3): title → mission select on a fresh profile, win
// Mission 01, Mission 02 unlocks, in-app navigation (no reloads) with Back support, progress
// survives a reload, CONTINUE, off-campaign deep link, training mode (a failed engage does not
// move the breach meter; a win unlocks but records no score), reset progress. Writes
// docs/screenshots/m3-t1-*.png and m3-t4-*.png. Not part of `npm test`.
// Usage: start a server (`npx vite preview --port 4173`), then
// `node scripts/campaign-smoke.mjs [url] [outDir]`.

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4173/";
const dir = process.argv[3] ?? "docs/screenshots";

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

const VERDICT_TIMEOUT = 45_000;

async function put(page, item, key, value) {
  await page.getByTestId(`hand-${item}`).click();
  await page.getByTestId(`slot-${key}`).click();
  if (value !== undefined) {
    await page.getByTestId(`dial-${key}`).focus();
    for (let i = 0; i < value; i++) await page.keyboard.press("ArrowUp");
  }
}

const search = (page) => page.evaluate(() => window.location.search);
const status = async (page, n) => (await page.getByTestId(`status-${n}`).textContent()).trim();
const statuses = async (page) => {
  const out = [];
  for (const n of ["01", "02", "03", "04", "05", "06", "07", "08", "09"])
    out.push(await status(page, n));
  return out.join(",");
};
const breach = async (page) =>
  Number(await page.getByTestId("breach-meter").getAttribute("data-value"));
// A marker on window survives in-app navigation and dies on a real page load.
const mark = (page) => page.evaluate(() => (window.__noReload = true));
const marked = (page) => page.evaluate(() => window.__noReload === true);

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  // Mission 01 opens with the first-time tutorial (M4-T3); this smoke is about other things.
  await context.addInitScript(() => localStorage.setItem("lawbreakers:tutorial-seen", "1"));
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // --- Fresh profile: title → mission select ------------------------------------------------
  await page.goto(url);
  await page.getByTestId("title-screen").waitFor();
  await page.evaluate(() => document.fonts.ready);
  check((await page.getByTestId("title-continue").count()) === 0, "fresh: no CONTINUE");
  await page.screenshot({ path: `${dir}/m3-t1-title.png` });
  await mark(page);
  await page.getByTestId("title-start").click();
  // First START plays the intro (M4-T1); skipping it lands on mission select.
  await page.getByTestId("intro").waitFor();
  await page.getByTestId("intro-skip").click();
  await page.getByTestId("mission-select").waitFor();
  check((await search(page)) === "?missions", "START → intro → skip → ?missions");
  const fresh = await statuses(page);
  check(
    fresh === "Ready,Locked,Locked,Locked,Locked,Locked,Locked,Locked,Locked",
    `fresh: only 01 available (${fresh})`,
  );
  check((await page.getByTestId("open-02").count()) === 0, "fresh: locked 02 is not a link");

  // --- Win Mission 01 -----------------------------------------------------------------------
  await page.getByTestId("open-01").click();
  await page.getByTestId("rack").waitFor();
  check((await search(page)) === "?mission=01", "select → ?mission=01");
  check((await page.getByTestId("off-campaign").count()) === 0, "01 is on campaign");
  check((await page.getByTestId("training-badge").count()) === 0, "no training badge");
  await put(page, "card-eq", "root");
  await put(page, "card-add", "0");
  await put(page, "sensor-A", "0-0");
  await put(page, "sensor-B", "0-1");
  await put(page, "const", "1", 6);
  await page.getByTestId("engage").click();
  await page.getByTestId("results").waitFor({ timeout: VERDICT_TIMEOUT });
  const best01 = await page.evaluate(() =>
    localStorage.getItem("lawbreakers:best:01-last-reactor"),
  );
  check(Number(best01) > 0, `01 won, best saved (${best01})`);
  await page.getByTestId("next-mission").click();
  await page.getByTestId("rack").waitFor();
  check((await search(page)) === "?mission=02", "Next mission → ?mission=02");
  check(
    (await page.locator(".mission__name").textContent()) === "COOLANT VALVE",
    "Mission 02 on screen",
  );
  check((await page.getByTestId("off-campaign").count()) === 0, "02 unlocked: on campaign");
  check((await page.getByTestId("results").count()) === 0, "results closed after navigating");
  await page.goBack();
  await page.getByTestId("rack").waitFor();
  check(
    (await search(page)) === "?mission=01" &&
      (await page.locator(".mission__name").textContent()) === "THE LAST REACTOR",
    "Back → Mission 01",
  );
  await page.getByTestId("back-to-missions").click();
  await page.getByTestId("mission-select").waitFor();
  const after01 = await statuses(page);
  check(after01.startsWith("Secured,Ready,Locked"), `after 01: ${after01}`);
  check(
    (await page.getByTestId("station-01").textContent()).includes(`Best ${best01}`),
    "select shows the best score",
  );
  check(await marked(page), "all of the above without a page load");

  // --- Reload: progress persisted -----------------------------------------------------------
  await page.reload();
  await page.getByTestId("mission-select").waitFor();
  const reloaded = await statuses(page);
  check(reloaded.startsWith("Secured,Ready,Locked"), `after reload: ${reloaded}`);
  await page.screenshot({ path: `${dir}/m3-t1-missions.png`, fullPage: true });
  await page.goto(url);
  await page.getByTestId("title-continue").click();
  await page.getByTestId("rack").waitFor();
  check((await search(page)) === "?mission=02", "CONTINUE → first unsecured mission (02)");

  // --- Deep link to a locked mission: playable, flagged off-campaign --------------------------
  await page.goto(`${url}?mission=05`);
  await page.getByTestId("rack").waitFor();
  check((await page.getByTestId("off-campaign").count()) === 1, "deep link 05: off-campaign");

  // --- Training mode --------------------------------------------------------------------------
  await page.goto(`${url}?missions`);
  await page.getByTestId("training-toggle").check({ force: true });
  await page.getByTestId("open-02").click();
  await page.getByTestId("rack").waitFor();
  check((await page.getByTestId("training-badge").count()) === 1, "training badge in mission");
  await put(page, "card-ne", "root");
  await put(page, "sensor-x", "0");
  await put(page, "const", "1", 11);
  await page.getByTestId("engage").click();
  await page.getByTestId("verdict").waitFor({ timeout: VERDICT_TIMEOUT });
  check(
    (await page.getByTestId("verdict").getAttribute("data-kind")) === "lab_breach",
    "training: x ≠ 11 still breached",
  );
  check((await breach(page)) === 0, "training: failed engage does not move breach");
  await page.getByTestId("explainer").waitFor({ timeout: 5_000 });
  check(
    (await page.getByTestId("explainer").getAttribute("data-kind")) === "lab_breach",
    "training: first lab breach shows the explainer card",
  );
  check((await page.getByTestId("verdict-breach").count()) === 0, "training: no breach line");
  await page.screenshot({ path: `${dir}/m3-t4-training.png`, fullPage: true });
  await page.getByTestId("rebuild").click();
  await page.getByTestId("rack-clear").click();
  await put(page, "card-le", "root");
  await put(page, "sensor-x", "0");
  await put(page, "const", "1", 10);
  await page.getByTestId("engage").click();
  await page.getByTestId("results").waitFor({ timeout: VERDICT_TIMEOUT });
  check(!(await page.locator(".results__score").isVisible()), "training results: score hidden");
  await page.screenshot({ path: `${dir}/m3-t4-training-results.png` });
  const best02 = await page.evaluate(() =>
    localStorage.getItem("lawbreakers:best:02-coolant-valve"),
  );
  check(best02 === null, `training win: no best score saved (${best02})`);
  await page.goto(`${url}?missions`);
  const trained = await statuses(page);
  check(trained.startsWith("Secured,Secured,Ready"), `training win unlocks 03 (${trained})`);
  await page.getByTestId("training-toggle").uncheck({ force: true });

  // --- Reset progress -------------------------------------------------------------------------
  await page.getByTestId("reset-progress").click();
  await page.getByTestId("reset-confirm").click();
  const reset = await statuses(page);
  check(
    reset === "Ready,Locked,Locked,Locked,Locked,Locked,Locked,Locked,Locked",
    `reset progress (${reset})`,
  );
  check(
    (await page.evaluate(() => localStorage.getItem("lawbreakers:best:01-last-reactor"))) === null,
    "reset clears best scores",
  );

  // --- End of the main campaign: FINAL BREACH opens the bonus chapter ------------------------
  await page.evaluate(() =>
    localStorage.setItem(
      "lawbreakers:progress",
      JSON.stringify({
        secured: [
          "01-last-reactor",
          "02-coolant-valve",
          "03-mirror-pistons",
          "04-parity-lock",
          "05-counterweight",
        ],
      }),
    ),
  );
  await page.goto(`${url}?missions`);
  await page.getByTestId("mission-select").waitFor();
  check(
    ((await page.getByTestId("chapter-07").textContent()) ?? "").includes("ARGUS Strikes Back"),
    "mission select: bonus chapter heading before 07",
  );
  check((await status(page, "07")) === "Locked", "07 locked until 06 is secured");
  await page.getByTestId("open-06").click();
  await page.getByTestId("rack").waitFor();
  await put(page, "card-and", "root");
  await put(page, "card-eq", "0");
  await put(page, "card-add", "0-0");
  await put(page, "sensor-A", "0-0-0");
  await put(page, "sensor-B", "0-0-1");
  await put(page, "const", "0-1", 6);
  await put(page, "card-eq", "1");
  await put(page, "card-mod2", "1-0");
  await put(page, "sensor-A", "1-0-0");
  await put(page, "const", "1-1", 0);
  await page.getByTestId("engage").click();
  await page.getByTestId("results").waitFor({ timeout: VERDICT_TIMEOUT });
  const end06 = (await page.getByTestId("results-end").textContent()) ?? "";
  check(end06.includes("Main campaign complete"), `06 results: chapter end line (${end06})`);
  check(
    (await page.getByTestId("next-mission").getAttribute("href")) === "?mission=07",
    "06 results: Next mission → 07",
  );
  await page.screenshot({ path: `${dir}/stretch-06-results.png` });
  await page.getByTestId("next-mission").click();
  await page.getByTestId("rack").waitFor();
  check((await page.getByTestId("off-campaign").count()) === 0, "07 unlocked: on campaign");
  await page.goto(`${url}?missions`);
  await page.getByTestId("mission-select").waitFor();
  const bonus = await statuses(page);
  check(bonus.endsWith("Secured,Ready,Locked,Locked"), `after 06: ${bonus}`);
  await page.screenshot({ path: `${dir}/stretch-missions.png`, fullPage: true });

  check(errors.length === 0, `no page errors ${errors.join("; ")}`);
  await context.close();

  // --- Phone: title and mission select fit ---------------------------------------------------
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // Mission 01 opens with the first-time tutorial (M4-T3); this smoke is about other things.
  await phone.addInitScript(() => localStorage.setItem("lawbreakers:tutorial-seen", "1"));
  await phone.goto(url);
  await phone.getByTestId("title-screen").waitFor();
  await phone.evaluate(() => document.fonts.ready);
  await phone.screenshot({ path: `${dir}/m3-t1-title-mobile.png`, fullPage: true });
  await phone.getByTestId("title-start").click();
  await phone.getByTestId("intro").waitFor();
  await phone.keyboard.press("Escape");
  await phone.getByTestId("mission-select").waitFor();
  await phone.screenshot({ path: `${dir}/m3-t1-missions-mobile.png`, fullPage: true });
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(overflow <= 0, `phone: no horizontal scroll (${overflow}px)`);
  await phone.close();
} finally {
  await browser.close();
}
if (failures.length > 0) throw new Error(`${failures.length} check(s) failed`);
console.log("campaign OK");

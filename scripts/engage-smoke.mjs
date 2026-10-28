// ENGAGE end to end in a real browser (real worker + Z3): builds Laws by click-to-place, engages
// them and checks every verdict presentation, the breach meter, REBUILD, the results screen and
// MISSION FAILED. Writes docs/screenshots/m2-t4-*.png and m2-t5-*.png. Not part of `npm test`.
// Usage: start a server (`npx vite --port 5173`), then
// `node scripts/engage-smoke.mjs [url] [outDir]`.

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/";
const dir = process.argv[3] ?? "docs/screenshots";

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

const VERDICT_TIMEOUT = 45_000;

/** Click-to-place: pick the hand item, then the socket; then turn the dial to `value`. */
async function put(page, item, key, value) {
  await page.getByTestId(`hand-${item}`).click();
  await page.getByTestId(`slot-${key}`).click();
  if (value !== undefined) {
    const dial = page.getByTestId(`dial-${key}`);
    await dial.focus();
    for (let i = 0; i < Math.abs(value); i++) {
      await page.keyboard.press(value > 0 ? "ArrowUp" : "ArrowDown");
    }
  }
}

/** `S op c` with a sensor, a comparator card and the dial. */
async function compare(page, card, sensor, value) {
  await put(page, `card-${card}`, "root");
  await put(page, `sensor-${sensor}`, "0");
  await put(page, "const", "1", value);
}

/** `A + B = c` (Mission 01). */
async function sumEquals(page, value) {
  await put(page, "card-eq", "root");
  await put(page, "card-add", "0");
  await put(page, "sensor-A", "0-0");
  await put(page, "sensor-B", "0-1");
  await put(page, "const", "1", value);
}

const readout = async (page) => (await page.getByTestId("rack-readout").textContent()).trim();
const gauge = async (page, name) =>
  Number(await page.getByTestId(`gauge-${name}`).getAttribute("data-value"));
const breach = async (page) =>
  Number(await page.getByTestId("breach-meter").getAttribute("data-value"));

async function engageAndWait(page) {
  await page.getByTestId("engage").click();
  const verdict = page.getByTestId("verdict");
  await verdict.waitFor({ timeout: VERDICT_TIMEOUT });
  return verdict.getAttribute("data-kind");
}

async function open(
  browser,
  { viewport, query = "", reducedMotion = "no-preference", blockZ3 = false },
) {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  // context.route (not page.route) also sees the requests coi-serviceworker makes on Pages.
  if (blockZ3) await context.route("**/z3/z3-built.js", (r) => r.abort());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${url}${query}`);
  await page.getByTestId("rack").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => localStorage.clear());
  return { page, errors, close: () => context.close() };
}

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

const browser = await chromium.launch();
try {
  // --- Mission 01, desktop: live breach → rebuild → holds → results ---------------------------
  {
    const { page, errors, close } = await open(browser, { viewport: desktop });
    await compare(page, "ge", "A", 1);
    check((await readout(page)) === "A ≥ 1", `01: built "${await readout(page)}"`);
    await page.getByTestId("engage").click();
    await page.getByTestId("engage-status").waitFor();
    check(
      (await page.getByTestId("rack").getAttribute("data-locked")) !== null,
      "01: rack locked while ARGUS attacks",
    );
    check(await page.getByTestId("control-a2b").isDisabled(), "01: controls locked");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${dir}/m2-t4-attacking.png` });

    const verdict = page.getByTestId("verdict");
    await verdict.waitFor({ timeout: VERDICT_TIMEOUT });
    check((await verdict.getAttribute("data-kind")) === "live_breach", "01 A ≥ 1: live breach");
    check(
      (await gauge(page, "A")) === 0 && (await gauge(page, "B")) === 6,
      "01: replay ends at A = 0, B = 6",
    );
    check(
      (await page.getByTestId("probe-law").getAttribute("data-ok")) === null,
      "01: probe shows the Law false",
    );
    check((await breach(page)) === 20, `01: breach meter at ${await breach(page)}%`);
    check(
      (await page.getByTestId("shield-state").textContent()) === "Breached",
      "01: SHIELD breached",
    );
    const rows = await page.getByTestId("telemetry").locator("li").count();
    check(rows === 3, `01: telemetry shows the 2-move attack (${rows} rows)`);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${dir}/m2-t4-live-desktop.png`, fullPage: true });

    await page.getByTestId("rebuild").click();
    check((await readout(page)) === "A ≥ 1", "01: REBUILD keeps the circuit");
    check(
      (await gauge(page, "A")) === 2 && (await gauge(page, "B")) === 4,
      "01: REBUILD returns to power-on",
    );
    check(!(await page.getByTestId("control-a2b").isDisabled()), "01: controls unlocked");

    await page.getByTestId("rack-clear").click();
    await sumEquals(page, 6);
    check((await readout(page)) === "A + B = 6", "01: rebuilt A + B = 6");
    await page.getByTestId("engage").click();
    await page.getByTestId("results").waitFor({ timeout: VERDICT_TIMEOUT });
    check(
      (await page.getByTestId("verdict").getAttribute("data-kind")) === "holds",
      "01 A + B = 6: holds",
    );
    await page.waitForTimeout(1800); // count-up
    const total = Number(await page.getByTestId("results-total").textContent());
    check(total > 0, `01: results score ${total}`);
    const stored = await page.evaluate(() =>
      localStorage.getItem("lawbreakers:best:01-last-reactor"),
    );
    check(Number(stored) === total, `01: best score saved (${stored})`);
    await page.screenshot({ path: `${dir}/m2-t5-results.png` });
    check(
      (await page.getByTestId("next-mission").getAttribute("href")) === "?mission=02",
      "01: next mission link",
    );
    await page.getByTestId("retry").click();
    check((await breach(page)) === 0, "01: retry resets breach");
    check((await readout(page)) === "?", "01: retry empties the rack");
    check(errors.length === 0, `01 desktop: no page errors ${errors.join("; ")}`);
    await close();
  }

  // --- Mission 01, mobile: live breach and results ------------------------------------------
  {
    const { page, errors, close } = await open(browser, { viewport: mobile });
    await compare(page, "ge", "A", 1);
    await page.getByTestId("engage").click();
    await page.waitForTimeout(3600);
    const box = await page.getByTestId("machine-gauges").boundingBox();
    check(box && box.y < 844 && box.y + 60 > 0, "mobile: gauges scrolled into view during replay");
    await page.screenshot({ path: `${dir}/m2-t4-live-mobile-replay.png` });
    await page.getByTestId("verdict").waitFor({ timeout: VERDICT_TIMEOUT });
    await page.waitForTimeout(900);
    const vb = await page.getByTestId("verdict").boundingBox();
    check(vb && vb.y >= 0 && vb.y < 844, "mobile: verdict banner in view");
    await page.screenshot({ path: `${dir}/m2-t4-live-mobile.png` });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(overflow <= 0, `mobile: no horizontal scroll (${overflow}px)`);
    await page.getByTestId("rebuild").click();
    await page.getByTestId("rack-clear").click();
    await sumEquals(page, 6);
    await page.getByTestId("engage").click();
    await page.getByTestId("results").waitFor({ timeout: VERDICT_TIMEOUT });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${dir}/m2-t5-results-mobile.png` });
    check(errors.length === 0, `01 mobile: no page errors ${errors.join("; ")}`);
    await close();
  }

  // --- Insufficient and init failure (Mission 01) -------------------------------------------
  {
    const { page, errors, close } = await open(browser, { viewport: desktop });
    await compare(page, "ge", "A", 0);
    check((await engageAndWait(page)) === "insufficient", "01 A ≥ 0: insufficient");
    check(
      (await gauge(page, "A")) === 0 && (await gauge(page, "B")) === 0,
      "01: shows the meltdown A = 0, B = 0",
    );
    check(
      (await page.getByTestId("meltdown").getAttribute("data-lit")) !== null,
      "01: meltdown placard lit",
    );
    check((await breach(page)) === 15, "01: insufficient adds 15%");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${dir}/m2-t4-insufficient.png`, fullPage: true });

    await page.getByTestId("rebuild").click();
    await page.getByTestId("rack-clear").click();
    await sumEquals(page, 7);
    check((await engageAndWait(page)) === "init_failure", "01 A + B = 7: init failure");
    check((await breach(page)) === 25, "01: init failure adds 10%");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${dir}/m2-t4-init.png`, fullPage: true });
    check(errors.length === 0, `01 insufficient/init: no page errors ${errors.join("; ")}`);
    await close();
  }

  // --- Lab breaches: Mission 02 x ≠ 11, Mission 05 x ≥ 0 -------------------------------------
  for (const [mission, card, value, shot] of [
    ["02", "ne", 11, "m2-t4-lab-m02"],
    ["05", "ge", 0, "m2-t4-lab-m05"],
  ]) {
    const { page, errors, close } = await open(browser, {
      viewport: desktop,
      query: `?mission=${mission}`,
    });
    await compare(page, card, "x", value);
    check((await engageAndWait(page)) === "lab_breach", `${mission}: lab breach`);
    check(
      (await page.locator(".machine").getAttribute("data-mode")) === "lab",
      `${mission}: machine in SIMULATION mode`,
    );
    check(await page.locator(".holo-mark").isVisible(), `${mission}: SIMULATION watermark`);
    check((await breach(page)) === 15, `${mission}: lab adds 15%`);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${dir}/${shot}.png`, fullPage: true });
    check(errors.length === 0, `${mission}: no page errors ${errors.join("; ")}`);
    await close();
  }

  // --- Verifier failure: Z3 cannot load → terminal fault line, rack unlocked, no breach ----------
  {
    const { page, close } = await open(browser, {
      viewport: desktop,
      reducedMotion: "reduce",
      blockZ3: true,
    });
    await compare(page, "ge", "A", 1);
    await page.getByTestId("engage").click();
    await page.locator(".terminal__line--error").waitFor({ timeout: VERDICT_TIMEOUT });
    await page.getByTestId("engage").waitFor();
    check(
      (await page.getByTestId("rack").getAttribute("data-locked")) === null,
      "verifier fault: rack unlocked",
    );
    check((await breach(page)) === 0, "verifier fault: no breach");
    check(!(await page.getByTestId("control-a2b").isDisabled()), "verifier fault: controls back");
    await close();
  }

  // --- MISSION FAILED at 100% (reduced motion: same information, shorter) ---------------------
  {
    const { page, errors, close } = await open(browser, {
      viewport: desktop,
      reducedMotion: "reduce",
    });
    await compare(page, "ge", "A", 1);
    for (let i = 1; i <= 5; i++) {
      check((await engageAndWait(page)) === "live_breach", `failure run ${i}: live breach`);
      if (i < 5) await page.getByTestId("rebuild").click();
    }
    await page.getByTestId("mission-failed").waitFor({ timeout: VERDICT_TIMEOUT });
    check((await breach(page)) === 100, "breach reached 100%");
    await page.screenshot({ path: `${dir}/m2-t5-mission-failed.png` });
    await page.getByTestId("failed-retry").click();
    check((await breach(page)) === 0, "retry after failure resets breach");
    check((await readout(page)) === "?", "retry after failure empties the rack");
    check(errors.length === 0, `failure: no page errors ${errors.join("; ")}`);
    await close();
  }
} finally {
  await browser.close();
}
if (failures.length > 0) throw new Error(`${failures.length} check(s) failed`);
console.log("engage OK");

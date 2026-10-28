// Intro, sound switch, mission select threat board and the juice moments (flowing current, breach,
// THE LAW HOLDS) in a real browser with full motion. Writes docs/screenshots/m4-t1-*.png and
// m3-t5-*.png. Not part of `npm test`.
// Usage: start a server (`npx vite preview --port 4173`), then
// `node scripts/juice-smoke.mjs [url] [outDir]`.

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4173/";
const dir = process.argv[3] ?? "docs/screenshots";

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

const VERDICT_TIMEOUT = 45_000;
const search = (page) => page.evaluate(() => window.location.search);

async function put(page, item, key, value) {
  await page.getByTestId(`hand-${item}`).click();
  await page.getByTestId(`slot-${key}`).click();
  if (value !== undefined) {
    await page.getByTestId(`dial-${key}`).focus();
    for (let i = 0; i < value; i++) await page.keyboard.press("ArrowUp");
  }
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // --- Intro on the first START --------------------------------------------------------------
  await page.goto(url);
  await page.getByTestId("title-screen").waitFor();
  await page.evaluate(() => document.fonts.ready);
  check((await page.getByTestId("title-replay-intro").count()) === 0, "fresh: no replay button");
  check((await page.getByTestId("sound-toggle").count()) === 1, "title: sound switch");
  await page.getByTestId("title-start").click();
  const intro = page.getByTestId("intro");
  await intro.waitFor();
  check((await search(page)) === "", "intro plays on the title URL");
  await page.waitForTimeout(1700);
  await page.screenshot({ path: `${dir}/m4-t1-intro-1.png` });
  await page.waitForTimeout(5200);
  await page.screenshot({ path: `${dir}/m4-t1-intro-2.png` });
  await page.waitForTimeout(4200);
  await page.screenshot({ path: `${dir}/m4-t1-intro-3.png` });
  await page.getByTestId("intro-continue").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/m4-t1-intro-end.png` });
  await page.getByTestId("intro-continue").click();
  await page.getByTestId("mission-select").waitFor();
  check((await search(page)) === "?missions", "intro → ?missions");
  check(
    (await page.evaluate(() => localStorage.getItem("lawbreakers:intro-seen"))) === "1",
    "intro marked seen",
  );
  check(await page.getByTestId("threat-board").isVisible(), "desktop: threat board visible");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/m4-t1-missions.png` });

  // --- Seen: START skips it; the title replays it; Esc and click skip ------------------------
  await page.goto(url);
  await page.getByTestId("title-screen").waitFor();
  await page.screenshot({ path: `${dir}/m4-t1-title.png` });
  await page.getByTestId("title-start").click();
  await page.getByTestId("mission-select").waitFor();
  check(true, "seen: START goes straight to mission select");
  await page.goto(url);
  await page.getByTestId("title-replay-intro").click();
  await intro.waitFor();
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.getByTestId("mission-select").waitFor();
  check(true, "replay → Esc skips to mission select");
  await page.goto(url);
  await page.getByTestId("title-replay-intro").click();
  await intro.waitFor();
  await page.getByTestId("sound-toggle").click();
  check((await intro.count()) === 1, "sound switch does not skip the intro");
  await page.mouse.click(700, 500);
  await page.getByTestId("mission-select").waitFor();
  check(true, "click skips the intro");

  // --- Mute persists -------------------------------------------------------------------------
  check(
    (await page.evaluate(() => localStorage.getItem("lawbreakers:muted"))) === "1",
    "mute stored",
  );
  await page.reload();
  check(
    (await page.getByTestId("sound-toggle").getAttribute("aria-pressed")) === "false",
    "mute survives a reload",
  );
  await page.getByTestId("sound-toggle").click();
  check(
    (await page.evaluate(() => localStorage.getItem("lawbreakers:muted"))) === null,
    "unmute clears the key",
  );

  // --- Rack: current flows, breach, holds ----------------------------------------------------
  await page.goto(`${url}?mission=01`);
  await page.getByTestId("rack").waitFor();
  await page.evaluate(() => document.fonts.ready);
  check((await page.getByTestId("sound-toggle").count()) === 1, "mission: sound switch");
  await put(page, "card-ge", "root");
  await put(page, "sensor-A", "0");
  await put(page, "const", "1", 1);
  await page.waitForTimeout(400);
  check((await page.locator(".wire__current").count()) >= 3, "complete circuit: current flows");
  await page.getByTestId("rack").screenshot({ path: `${dir}/m3-t5-rack-live.png` });

  await page.getByTestId("engage").click();
  await page.getByTestId("verdict").waitFor({ timeout: VERDICT_TIMEOUT });
  await page.waitForTimeout(150);
  check((await page.locator(".placed .sparks").count()) === 1, "breach: the root module sparks");
  await page.screenshot({ path: `${dir}/m3-t5-breach.png` });
  check(
    (await page.getByTestId("breach-meter").getAttribute("data-value")) === "20",
    "breach meter at 20%",
  );

  await page.getByTestId("rebuild").click();
  await page.getByTestId("rack-clear").click();
  await put(page, "card-eq", "root");
  await put(page, "card-add", "0");
  await put(page, "sensor-A", "0-0");
  await put(page, "sensor-B", "0-1");
  await put(page, "const", "1", 6);
  await page.getByTestId("engage").click();
  await page
    .getByTestId("shield-state")
    .filter({ hasText: "Sealed" })
    .waitFor({ timeout: VERDICT_TIMEOUT });
  await page.waitForTimeout(650);
  await page.getByTestId("rack-board").screenshot({ path: `${dir}/m3-t5-holds.png` });
  await page.getByTestId("results").waitFor({ timeout: 10_000 });

  check(errors.length === 0, `no page errors ${errors.join("; ")}`);
  await context.close();

  // --- Phone: intro and mission select stay clean --------------------------------------------
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(url);
  await phone.getByTestId("title-start").click();
  await phone.getByTestId("intro").waitFor();
  await phone.waitForTimeout(7000);
  await phone.screenshot({ path: `${dir}/m4-t1-intro-mobile.png` });
  await phone.keyboard.press("Enter");
  await phone.getByTestId("mission-select").waitFor();
  check(!(await phone.getByTestId("threat-board").isVisible()), "phone: no threat board");
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(overflow <= 0, `phone: no horizontal scroll (${overflow}px)`);
  await phone.close();
} finally {
  await browser.close();
}
if (failures.length > 0) throw new Error(`${failures.length} check(s) failed`);
console.log("juice OK");

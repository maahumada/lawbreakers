// Screenshots of the mission screen at desktop and mobile widths, plus an interaction check
// (a control card moves the gauges, auto-run grows the telemetry log). Not part of `npm test`.
// Usage: start a server (`npx vite --port 5173`), then
// `node scripts/screenshot-mission.mjs [url] [outPrefix]`.

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/";
const missionUrl = `${url}?mission=01`;
const out = process.argv[3] ?? "docs/screenshots/m2-t2";
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

const browser = await chromium.launch();
try {
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    // Mission 01 opens with the first-time tutorial (M4-T3); this smoke is about other things.
    await page.addInitScript(() => localStorage.setItem("lawbreakers:tutorial-seen", "1"));
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(missionUrl);
    await page.getByTestId("gauge-A").waitFor();
    await page.evaluate(() => document.fonts.ready);
    check(
      await page.evaluate(() => document.fonts.check("700 16px Oswald")),
      `${vp.name}: Oswald loaded`,
    );

    await page.screenshot({ path: `${out}-${vp.name}.png`, fullPage: vp.name === "mobile" });

    const gaugeA = page.getByTestId("gauge-A");
    const before = Number(await gaugeA.getAttribute("data-value"));
    await page.getByTestId("control-a2b").click();
    const after = Number(await gaugeA.getAttribute("data-value"));
    check(after === before - 1, `${vp.name}: TRANSFER A→B moves A ${before} → ${after}`);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(overflow <= 0, `${vp.name}: no horizontal scroll (overflow ${overflow}px)`);

    if (vp.name === "desktop") {
      await page.getByTestId("autorun").check({ force: true });
      await page.waitForTimeout(2600);
      const rows = await page.getByTestId("telemetry").locator("li").count();
      check(rows >= 4, `auto-run grew the telemetry log to ${rows} rows`);
      await page.getByTestId("autorun").uncheck({ force: true });
      await page.screenshot({ path: `${out}-${vp.name}-running.png` });
      await page.getByTestId("reset").click();
      check(
        (await page.getByTestId("telemetry").locator("li").count()) === 1,
        "reset clears the log",
      );
    }
    check(errors.length === 0, `${vp.name}: no page errors ${errors.join("; ")}`);
    await page.close();
  }
} finally {
  await browser.close();
}
if (failures.length > 0) throw new Error(`${failures.length} check(s) failed`);
console.log("mission screen OK");

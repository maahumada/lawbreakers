// Gauge skins in a real browser (docs/GAUGES-PROPOSAL.md). Not part of `npm test`.
// For every mission: the panel uses the skin its level JSON asks for, every variable keeps its
// accessible readout (`gauge-<name>`, role img, "LABEL reads N", data-value = power-on value), the
// readouts follow the controls, and the page never scrolls sideways at 360, 390 and 1440 px.
// With reduced motion, nothing in the gauges animates for long after a fire.
// Writes docs/screenshots/gauges-live-NN.png (1440 px) and gauges-live-NN-mobile.png (390 px).
// Usage: start a server (`npx vite preview --port 4173`), then
// `node scripts/gauges-smoke.mjs [url] [outDir]`.

import { readdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4173/";
const dir = process.argv[3] ?? "docs/screenshots";

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

const LEVELS = readdirSync("src/levels")
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(`src/levels/${f}`, "utf8")));

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, shot: "" },
  { name: "mobile", width: 390, height: 844, shot: "-mobile" },
  { name: "narrow", width: 360, height: 780, shot: null },
];

const overflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const readouts = (page, level) =>
  Promise.all(
    level.vars.map(async (x) => {
      const g = page.getByTestId(`gauge-${x.name}`);
      return {
        name: x.name,
        count: await g.count(),
        role: await g.getAttribute("role"),
        label: await g.getAttribute("aria-label"),
        value: Number(await g.getAttribute("data-value")),
      };
    }),
  );

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    for (const reducedMotion of vp.name === "desktop"
      ? ["no-preference", "reduce"]
      : ["no-preference"]) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion,
      });
      await context.addInitScript(() => {
        localStorage.setItem("lawbreakers:tutorial-seen", "1");
        localStorage.setItem("lawbreakers:intro-seen", "1");
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));

      for (const level of LEVELS) {
        const n = level.id.slice(0, 2);
        const tag = `${n} ${vp.name}${reducedMotion === "reduce" ? " (reduce)" : ""}`;
        await page.goto(`${url}?mission=${n}`);
        await page.getByTestId("machine-gauges").waitFor();
        await page.evaluate(() => document.fonts.ready);

        const skins = new Set((level.display?.panels ?? []).map((p) => p.skin));
        skins.delete("nixie");
        for (const skin of skins) {
          const count = await page.getByTestId(`skin-${skin}`).count();
          check(count >= 1, `${tag}: ${skin} skin is drawn`);
        }

        const before = await readouts(page, level);
        for (const r of before) {
          const decl = level.vars.find((x) => x.name === r.name);
          check(
            r.count === 1 &&
              r.role === "img" &&
              r.label?.startsWith(`${decl.label} reads ${decl.init}`),
            `${tag}: ${r.name} readout "${r.label}"`,
          );
          check(r.value === decl.init, `${tag}: ${r.name} starts at ${decl.init} (${r.value})`);
        }

        // Fire up to three armed controls: the readouts follow the telemetry's last state.
        for (let k = 0; k < 3; k++) {
          const cards = page.locator(".control-card[data-armed]");
          const armed = await cards.count();
          if (armed === 0) break;
          await cards.nth(k % armed).click();
        }
        await page.waitForTimeout(reducedMotion === "reduce" ? 50 : 450);
        const after = await readouts(page, level);
        const last = await page
          .locator(".telemetry__row")
          .last()
          .locator(".telemetry__state b")
          .allTextContents();
        check(
          after.every((r, i) => String(r.value) === last[i]),
          `${tag}: readouts match telemetry (${after.map((r) => r.value).join(", ")} vs ${last.join(", ")})`,
        );
        check(
          after.every((r) => r.label?.includes(` reads ${r.value}`)),
          `${tag}: labels follow the values`,
        );

        if (reducedMotion === "reduce") {
          const long = await page.evaluate(
            () =>
              document
                .querySelector("[data-testid='machine-gauges']")
                .getAnimations({ subtree: true })
                .filter((a) => Number(a.effect?.getComputedTiming().duration) > 50).length,
          );
          check(long === 0, `${tag}: no gauge animation under reduced motion (${long})`);
        }

        const ov = await overflow(page);
        check(ov <= 0, `${tag}: no horizontal scroll (${ov}px)`);
        if (vp.shot !== null && reducedMotion === "no-preference") {
          await page
            .locator(".machine")
            .screenshot({ path: `${dir}/gauges-live-${n}${vp.shot}.png` });
        }
      }
      check(errors.length === 0, `${vp.name}: no page errors ${errors.join("; ")}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\ngauges smoke passed");

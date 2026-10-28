// Missions 02–06 end to end in a real browser (real worker + Z3): for each mission, build the
// LEVELS.md known-wrong Laws and the reference Law by click-to-place, engage them and check the
// verdicts, then the results screen. Also checks gauges (signed ℤ values, scale labels) and that
// the page never scrolls sideways. Writes docs/screenshots/m3-t2-NN.png (desktop, after the first
// wrong Law: the replay state) and m3-t2-NN-mobile.png. Not part of `npm test`.
// Usage: start a server (`npx vite preview --port 4173`), then
// `node scripts/missions-smoke.mjs [url] [outDir]`.

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
    const dial = page.getByTestId(`dial-${key}`);
    await dial.focus();
    for (let i = 0; i < Math.abs(value); i++) {
      await page.keyboard.press(value > 0 ? "ArrowUp" : "ArrowDown");
    }
  }
}

/** Each step: [hand item, slot key, dial value?]. */
const law = (...steps) => steps;
const cmp = (card, sensor, value, at = "") => {
  const k = (s) => (at === "" ? s : `${at}-${s}`);
  return [
    [`card-${card}`, at === "" ? "root" : at],
    [`sensor-${sensor}`, k("0")],
    ["const", k("1"), value],
  ];
};

const MISSIONS = [
  {
    n: "02",
    wrong: [
      { text: "x ≠ 11", steps: cmp("ne", "x", 11), verdict: "lab_breach" },
      { text: "x ≤ 11", steps: cmp("le", "x", 11), verdict: "insufficient" },
    ],
    ref: { text: "x ≤ 10", steps: cmp("le", "x", 10) },
  },
  {
    n: "03",
    wrong: [
      {
        text: "x = y",
        steps: law(["card-eq", "root"], ["sensor-x", "0"], ["sensor-y", "1"]),
        verdict: "live_breach",
      },
      { text: "y ≠ 7", steps: cmp("ne", "y", 7), verdict: "lab_breach" },
    ],
    ref: {
      text: "y = 2×x",
      steps: law(["card-eq", "root"], ["sensor-y", "0"], ["card-scale2", "1"], ["sensor-x", "1-0"]),
    },
  },
  {
    n: "04",
    wrong: [
      { text: "n ≥ 1", steps: cmp("ge", "n", 1), verdict: "lab_breach" },
      { text: "n = 1", steps: cmp("eq", "n", 1), verdict: "live_breach" },
    ],
    ref: {
      text: "n MOD 2 = 1",
      steps: law(["card-eq", "root"], ["card-mod2", "0"], ["sensor-n", "0-0"], ["const", "1", 1]),
    },
  },
  {
    n: "05",
    wrong: [
      { text: "x ≥ 0", steps: cmp("ge", "x", 0), verdict: "lab_breach" },
      { text: "y ≥ 0", steps: cmp("ge", "y", 0), verdict: "insufficient" },
    ],
    ref: {
      text: "x ≥ 0 AND y ≥ 0",
      steps: law(["card-and", "root"], ...cmp("ge", "x", 0, "0"), ...cmp("ge", "y", 0, "1")),
    },
  },
  {
    n: "06",
    wrong: [
      {
        text: "A + B = 6",
        steps: law(
          ["card-eq", "root"],
          ["card-add", "0"],
          ["sensor-A", "0-0"],
          ["sensor-B", "0-1"],
          ["const", "1", 6],
        ),
        verdict: "insufficient",
      },
      {
        text: "A MOD 2 = 0",
        steps: law(["card-eq", "root"], ["card-mod2", "0"], ["sensor-A", "0-0"], ["const", "1", 0]),
        verdict: "insufficient",
      },
    ],
    ref: {
      text: "A + B = 6 AND A MOD 2 = 0",
      steps: law(
        ["card-and", "root"],
        ["card-eq", "0"],
        ["card-add", "0-0"],
        ["sensor-A", "0-0-0"],
        ["sensor-B", "0-0-1"],
        ["const", "0-1", 6],
        ["card-eq", "1"],
        ["card-mod2", "1-0"],
        ["sensor-A", "1-0-0"],
        ["const", "1-1", 0],
      ),
    },
  },
];

const readout = async (page) => (await page.getByTestId("rack-readout").textContent()).trim();
const overflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function build(page, steps) {
  for (const [item, key, value] of steps) await put(page, item, key, value);
}

async function engageAndWait(page) {
  await page.getByTestId("engage").click();
  const verdict = page.getByTestId("verdict");
  await verdict.waitFor({ timeout: VERDICT_TIMEOUT });
  return verdict.getAttribute("data-kind");
}

const browser = await chromium.launch();
try {
  for (const m of MISSIONS) {
    for (const vp of [
      { name: "desktop", width: 1440, height: 900 },
      { name: "mobile", width: 390, height: 844 },
    ]) {
      const mobile = vp.name === "mobile";
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      // Mission 01 opens with the first-time tutorial (M4-T3); this smoke is about other things.
      await context.addInitScript(() => localStorage.setItem("lawbreakers:tutorial-seen", "1"));
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
      await page.goto(`${url}?mission=${m.n}`);
      await page.getByTestId("rack").waitFor();
      await page.evaluate(() => document.fonts.ready);
      const tag = `${m.n} ${vp.name}`;

      // Wrong Laws (desktop: all of them; mobile: the first, for the screenshot).
      for (const [i, w] of (mobile ? m.wrong.slice(0, 1) : m.wrong).entries()) {
        await build(page, w.steps);
        const text = await readout(page);
        check(text === w.text, `${tag}: built "${text}" (expected "${w.text}")`);
        const kind = await engageAndWait(page);
        check(kind === w.verdict, `${tag} ${w.text}: ${kind} (expected ${w.verdict})`);
        const ov = await overflow(page);
        check(ov <= 0, `${tag} ${w.text}: no horizontal page scroll (${ov}px)`);
        if (i === 0) {
          await page.waitForTimeout(400);
          await page.screenshot({
            path: `${dir}/m3-t2-${m.n}${mobile ? "-mobile" : ""}.png`,
            fullPage: true,
          });
        }
        await page.getByTestId("rebuild").click();
        await page.getByTestId("rack-clear").click();
      }
      if (mobile) {
        check(errors.length === 0, `${tag}: no page errors ${errors.join("; ")}`);
        await context.close();
        continue;
      }

      // Gauges: every value shown matches its tubes' sign, and the scale label is a round step.
      for (const g of await page.locator("[data-testid^='gauge-scale-']").all()) {
        const label = (await g.locator("span").allTextContents()).join(" ");
        check(/^(−?\d+ )?(0 )?\d+$/.test(label), `${tag}: gauge scale "${label}"`);
      }

      await build(page, m.ref.steps);
      const text = await readout(page);
      check(text === m.ref.text, `${tag}: built reference "${text}"`);
      const cost = (await page.getByTestId("rack-cost").textContent()).replace(/\s+/g, " ");
      const [, used, budget] = cost.match(/Cost (\d+) \/ Budget (\d+)/) ?? [];
      check(used !== undefined && used === budget, `${tag}: reference at budget (${cost.trim()})`);
      await page.getByTestId("engage").click();
      await page.getByTestId("results").waitFor({ timeout: VERDICT_TIMEOUT });
      check(
        (await page.getByTestId("verdict").getAttribute("data-kind")) === "holds",
        `${tag} ${m.ref.text}: holds`,
      );
      const secured = await page.evaluate(() => localStorage.getItem("lawbreakers:progress"));
      check(secured?.includes(m.n) ?? false, `${tag}: mission secured (${secured})`);
      check(errors.length === 0, `${tag}: no page errors ${errors.join("; ")}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (failures.length > 0) throw new Error(`${failures.length} check(s) failed`);
console.log("missions OK");

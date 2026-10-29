// Missions 02–15 end to end in a real browser (real worker + Z3): for each mission, build the
// LEVELS.md known-wrong Laws and the reference Law by click-to-place, engage them and check the
// verdicts, then the results screen. Also checks gauges (signed ℤ values, scale labels) and that
// the page never scrolls sideways. Writes docs/screenshots/m3-t2-NN.png (desktop, after the first
// wrong Law: the replay state) and m3-t2-NN-mobile.png; the bonus chapter (07–09) writes
// stretch-NN.png, stretch-NN-mobile.png and stretch-NN-reference.png (the largest Law, built),
// and The Deep Grid (10–15) the same as chapter3-NN*.png.
// Then the one-time explainer cards on Mission 05 (post-playtest-explainer-*.png, desktop and
// mobile) and Mission 05 at rest (post-playtest-05.png). Not part of `npm test`.
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
      {
        text: "x ≥ 0 AND y ≥ 0",
        steps: law(["card-and", "root"], ...cmp("ge", "x", 0, "0"), ...cmp("ge", "y", 0, "1")),
        verdict: "lab_breach",
      },
      {
        text: "x = y",
        steps: law(["card-eq", "root"], ["sensor-x", "0"], ["sensor-y", "1"]),
        verdict: "insufficient",
      },
      { text: "x ≥ 0", steps: cmp("ge", "x", 0), verdict: "lab_breach" },
    ],
    ref: {
      text: "x = y AND y ≥ 0",
      steps: law(
        ["card-and", "root"],
        ["card-eq", "0"],
        ["sensor-x", "0-0"],
        ["sensor-y", "0-1"],
        ...cmp("ge", "y", 0, "1"),
      ),
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
  {
    n: "07",
    shot: "stretch-07",
    wrong: [
      {
        text: "L − R ≤ 2",
        steps: law(
          ["card-le", "root"],
          ["card-sub", "0"],
          ["sensor-L", "0-0"],
          ["sensor-R", "0-1"],
          ["const", "1", 2],
        ),
        verdict: "lab_breach",
      },
      {
        text: "L ≤ R",
        steps: law(["card-le", "root"], ["sensor-L", "0"], ["sensor-R", "1"]),
        verdict: "live_breach",
      },
    ],
    ref: {
      text: "L − R ≤ 2 AND R − L ≤ 2",
      steps: law(
        ["card-and", "root"],
        ["card-le", "0"],
        ["card-sub", "0-0"],
        ["sensor-L", "0-0-0"],
        ["sensor-R", "0-0-1"],
        ["const", "0-1", 2],
        ["card-le", "1"],
        ["card-sub", "1-0"],
        ["sensor-R", "1-0-0"],
        ["sensor-L", "1-0-1"],
        ["const", "1-1", 2],
      ),
    },
  },
  {
    n: "08",
    shot: "stretch-08",
    wrong: [
      {
        text: "p = 0 AND a = 4",
        steps: law(["card-and", "root"], ...cmp("eq", "p", 0, "0"), ...cmp("eq", "a", 4, "1")),
        verdict: "live_breach",
      },
      {
        text: "p = 0 OR p = 1",
        steps: law(["card-or", "root"], ...cmp("eq", "p", 0, "0"), ...cmp("eq", "p", 1, "1")),
        verdict: "insufficient",
      },
    ],
    ref: {
      text: "(p = 0 AND a = 4) OR (p = 1 AND a = 0)",
      steps: law(
        ["card-or", "root"],
        ["card-and", "0"],
        ...cmp("eq", "p", 0, "0-0"),
        ...cmp("eq", "a", 4, "0-1"),
        ["card-and", "1"],
        ...cmp("eq", "p", 1, "1-0"),
        ...cmp("eq", "a", 0, "1-1"),
      ),
    },
  },
  {
    n: "09",
    shot: "stretch-09",
    wrong: [
      { text: "F ≤ 6", steps: cmp("le", "F", 6), verdict: "lab_breach" },
      {
        text: "H + F = 3",
        steps: law(
          ["card-eq", "root"],
          ["card-add", "0"],
          ["sensor-H", "0-0"],
          ["sensor-F", "0-1"],
          ["const", "1", 3],
        ),
        verdict: "live_breach",
      },
    ],
    ref: {
      text: "2×H + F = 6",
      steps: law(
        ["card-eq", "root"],
        ["card-add", "0"],
        ["card-scale2", "0-0"],
        ["sensor-H", "0-0-0"],
        ["sensor-F", "0-1"],
        ["const", "1", 6],
      ),
    },
  },
  {
    n: "10",
    shot: "chapter3-10",
    wrong: [
      {
        text: "R + W + S = 3",
        steps: law(
          ["card-eq", "root"],
          ["card-add", "0"],
          ["card-add", "0-0"],
          ["sensor-R", "0-0-0"],
          ["sensor-W", "0-0-1"],
          ["sensor-S", "0-1"],
          ["const", "1", 3],
        ),
        verdict: "live_breach",
      },
      { text: "W ≤ 1", steps: cmp("le", "W", 1), verdict: "lab_breach" },
    ],
    ref: {
      text: "R + 3×W + S = 3",
      steps: law(
        ["card-eq", "root"],
        ["card-add", "0"],
        ["card-add", "0-0"],
        ["sensor-R", "0-0-0"],
        ["card-scale3", "0-0-1"],
        ["sensor-W", "0-0-1-0"],
        ["sensor-S", "0-1"],
        ["const", "1", 3],
      ),
    },
  },
  {
    n: "11",
    shot: "chapter3-11",
    wrong: [
      { text: "y ≤ 4", steps: cmp("le", "y", 4), verdict: "lab_breach" },
      {
        text: "2×(x + y) + m ≤ 12",
        steps: law(
          ["card-le", "root"],
          ["card-add", "0"],
          ["card-scale2", "0-0"],
          ["card-add", "0-0-0"],
          ["sensor-x", "0-0-0-0"],
          ["sensor-y", "0-0-0-1"],
          ["sensor-m", "0-1"],
          ["const", "1", 12],
        ),
        verdict: "insufficient",
      },
    ],
    ref: {
      text: "2×x + 3×y + m ≤ 12",
      steps: law(
        ["card-le", "root"],
        ["card-add", "0"],
        ["card-add", "0-0"],
        ["card-scale2", "0-0-0"],
        ["sensor-x", "0-0-0-0"],
        ["card-scale3", "0-0-1"],
        ["sensor-y", "0-0-1-0"],
        ["sensor-m", "0-1"],
        ["const", "1", 12],
      ),
    },
  },
  {
    n: "12",
    shot: "chapter3-12",
    wrong: [
      {
        text: "a ≤ 4 AND b ≤ 2",
        steps: law(["card-and", "root"], ...cmp("le", "a", 4, "0"), ...cmp("le", "b", 2, "1")),
        verdict: "lab_breach",
      },
      {
        text: "a + c = 4",
        steps: law(
          ["card-eq", "root"],
          ["card-add", "0"],
          ["sensor-a", "0-0"],
          ["sensor-c", "0-1"],
          ["const", "1", 4],
        ),
        verdict: "insufficient",
      },
    ],
    ref: {
      text: "a + c = 4 AND a = 2×b",
      steps: law(
        ["card-and", "root"],
        ["card-eq", "0"],
        ["card-add", "0-0"],
        ["sensor-a", "0-0-0"],
        ["sensor-c", "0-0-1"],
        ["const", "0-1", 4],
        ["card-eq", "1"],
        ["sensor-a", "1-0"],
        ["card-scale2", "1-1"],
        ["sensor-b", "1-1-0"],
      ),
    },
  },
  {
    n: "13",
    shot: "chapter3-13",
    wrong: [
      { text: "a ≠ 4", steps: cmp("ne", "a", 4), verdict: "lab_breach" },
      { text: "a ≤ 6", steps: cmp("le", "a", 6), verdict: "live_breach" },
      {
        text: "a ≤ 9 AND b ≤ 6",
        steps: law(["card-and", "root"], ...cmp("le", "a", 9, "0"), ...cmp("le", "b", 6, "1")),
        verdict: "insufficient",
      },
    ],
    ref: {
      text: "a MOD 3 = 0 AND b MOD 3 = 0",
      steps: law(
        ["card-and", "root"],
        ["card-eq", "0"],
        ["card-mod3", "0-0"],
        ["sensor-a", "0-0-0"],
        ["const", "0-1", 0],
        ["card-eq", "1"],
        ["card-mod3", "1-0"],
        ["sensor-b", "1-0-0"],
        ["const", "1-1", 0],
      ),
    },
  },
  {
    n: "14",
    shot: "chapter3-14",
    wrong: [
      {
        text: "r ≠ g",
        steps: law(["card-ne", "root"], ["sensor-r", "0"], ["sensor-g", "1"]),
        verdict: "lab_breach",
      },
      {
        text: "(r − g) MOD 3 = 2",
        steps: law(
          ["card-eq", "root"],
          ["card-mod3", "0"],
          ["card-sub", "0-0"],
          ["sensor-r", "0-0-0"],
          ["sensor-g", "0-0-1"],
          ["const", "1", 2],
        ),
        verdict: "insufficient",
      },
    ],
    ref: {
      text: "(r − g) MOD 3 = 2 AND (r − b) MOD 3 = 1",
      steps: law(
        ["card-and", "root"],
        ["card-eq", "0"],
        ["card-mod3", "0-0"],
        ["card-sub", "0-0-0"],
        ["sensor-r", "0-0-0-0"],
        ["sensor-g", "0-0-0-1"],
        ["const", "0-1", 2],
        ["card-eq", "1"],
        ["card-mod3", "1-0"],
        ["card-sub", "1-0-0"],
        ["sensor-r", "1-0-0-0"],
        ["sensor-b", "1-0-0-1"],
        ["const", "1-1", 1],
      ),
    },
  },
  {
    n: "15",
    shot: "chapter3-15",
    wrong: [
      {
        text: "x ≤ y",
        steps: law(["card-le", "root"], ["sensor-x", "0"], ["sensor-y", "1"]),
        verdict: "live_breach",
      },
      {
        text: "(x + y) MOD 3 = 0",
        steps: law(
          ["card-eq", "root"],
          ["card-mod3", "0"],
          ["card-add", "0-0"],
          ["sensor-x", "0-0-0"],
          ["sensor-y", "0-0-1"],
          ["const", "1", 0],
        ),
        verdict: "insufficient",
      },
    ],
    ref: {
      text: "(x + y) MOD 3 = 0 AND x ≤ 2×y AND y ≤ 2×x",
      steps: law(
        ["card-and", "root"],
        ["card-and", "0"],
        ["card-eq", "0-0"],
        ["card-mod3", "0-0-0"],
        ["card-add", "0-0-0-0"],
        ["sensor-x", "0-0-0-0-0"],
        ["sensor-y", "0-0-0-0-1"],
        ["const", "0-0-1", 0],
        ["card-le", "0-1"],
        ["sensor-x", "0-1-0"],
        ["card-scale2", "0-1-1"],
        ["sensor-y", "0-1-1-0"],
        ["card-le", "1"],
        ["sensor-y", "1-0"],
        ["card-scale2", "1-1"],
        ["sensor-x", "1-1-0"],
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
            path: `${dir}/${m.shot ?? `m3-t2-${m.n}`}${mobile ? "-mobile" : ""}.png`,
            fullPage: true,
          });
        }
        await page.getByTestId("rebuild").click();
        await page.getByTestId("rack-clear").click();
      }
      if (mobile) {
        if (m.shot) {
          // The largest Law on a phone: the rack must still build it and show it.
          await build(page, m.ref.steps);
          const built = await readout(page);
          check(built === m.ref.text, `${tag}: built reference "${built}"`);
          await page.getByTestId("rack").scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          await page.screenshot({ path: `${dir}/${m.shot}-mobile-reference.png`, fullPage: true });
        }
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
      if (m.shot) {
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${dir}/${m.shot}-reference.png`, fullPage: true });
      }
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

  // --- One-time explainer cards (post-playtest): first lab breach, first insufficient ---------
  for (const vp of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const mobile = vp.name === "mobile";
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.addInitScript(() => localStorage.setItem("lawbreakers:tutorial-seen", "1"));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
    await page.goto(`${url}?mission=05`);
    await page.getByTestId("rack").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const tag = `explainer ${vp.name}`;
    if (!mobile) await page.screenshot({ path: `${dir}/post-playtest-05.png`, fullPage: true });
    const focused = () =>
      page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null);

    for (const [kind, steps, title, key, shot] of [
      [
        "lab_breach",
        law(["card-and", "root"], ...cmp("ge", "x", 0, "0"), ...cmp("ge", "y", 0, "1")),
        "Why does ARGUS use a state that never happens?",
        "Escape",
        "post-playtest-explainer-lab",
      ],
      [
        "insufficient",
        law(["card-eq", "root"], ["sensor-x", "0"], ["sensor-y", "1"]),
        "Never happening ≠ proven impossible",
        "Enter",
        "post-playtest-explainer-insufficient",
      ],
    ]) {
      await build(page, steps);
      check((await engageAndWait(page)) === kind, `${tag}: ${kind}`);
      const card = page.getByTestId("explainer");
      await card.waitFor({ timeout: 5_000 });
      check((await card.getAttribute("data-kind")) === kind, `${tag}: ${kind} card`);
      check(
        ((await card.locator("h3").textContent()) ?? "") === title,
        `${tag}: ${kind} card title`,
      );
      check((await card.locator("li").count()) <= 3, `${tag}: ${kind} card has ≤ 3 lines`);
      check((await focused()) === "explainer-dismiss", `${tag}: ${kind} card takes focus`);
      check((await overflow(page)) <= 0, `${tag}: ${kind} card, no horizontal scroll`);
      check(
        (await page.evaluate(
          (k) => localStorage.getItem(`lawbreakers:explainer-seen:${k}`),
          kind,
        )) === "1",
        `${tag}: ${kind} card marked seen`,
      );
      await page.waitForTimeout(400);
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${dir}/${shot}${mobile ? "-mobile" : ""}.png`,
        fullPage: !mobile,
      });
      await page.keyboard.press(key);
      check((await card.count()) === 0, `${tag}: ${key} dismisses the ${kind} card`);
      check((await focused()) === "rebuild", `${tag}: focus back on Rebuild after ${key}`);
      await page.getByTestId("rebuild").click();
      await page.getByTestId("rack-clear").click();
    }

    // Seen once: the next lab breach comes without a card.
    await build(page, cmp("ge", "x", 0));
    check((await engageAndWait(page)) === "lab_breach", `${tag}: x ≥ 0 lab breach again`);
    await page.waitForTimeout(1_200);
    check((await page.getByTestId("explainer").count()) === 0, `${tag}: no second lab card`);
    check(errors.length === 0, `${tag}: no page errors ${errors.join("; ")}`);
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length > 0) throw new Error(`${failures.length} check(s) failed`);
console.log("missions OK");

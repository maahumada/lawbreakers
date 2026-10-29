// Accessibility and layout check in a real browser (M4-T5). Not part of `npm test`.
// 1. Keyboard only: skip the tutorial with Esc, build Mission 01's Law with Tab/Enter, unplug with
//    Delete, set the dial with arrows, ENGAGE, open the results. Run twice: normal motion and
//    `reducedMotion: "reduce"` (where nothing may animate for long or block the flow).
// 2. No horizontal page overflow at 390×844, 768×1024 and 1440×900 on every screen: title, intro,
//    mission select, How to play, tutorial, each verdict (init, live, lab, insufficient, holds),
//    results, proof panel.
// 3. axe-core scan (serious/critical rules fail the run) on the main screens.
// Writes docs/screenshots/m4-t3-*.png (tutorial, help) and m4-t5-*.png.
// Usage: `npm run build && npx vite preview`, then `node scripts/a11y-smoke.mjs [url] [dir]`.
// `ONLY=mobile|tablet|desktop` runs just that viewport's layout pass (no keyboard runs).

import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4173/";
const dir = process.argv[3] ?? "docs/screenshots";
const VERDICT_TIMEOUT = 60_000;

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

async function open(browser, { viewport, query = "?mission=01", reducedMotion, seen = {} }) {
  const context = await browser.newContext({ viewport, reducedMotion });
  await context.addInitScript((flags) => {
    for (const [k, v] of Object.entries(flags)) localStorage.setItem(k, v);
  }, seen);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}${query}`);
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, close: () => context.close() };
}

const SEEN = { "lawbreakers:intro-seen": "1", "lawbreakers:tutorial-seen": "1" };

/**
 * Horizontal overflow: the page scrolls sideways, or an element pokes past the viewport without
 * an ancestor that scrolls or clips it (body hides overflow-x, so scrollWidth alone would miss it).
 */
const overflow = (page) =>
  page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push("document scrolls sideways");
    const clipped = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o !== "visible") return true;
      }
      return false;
    };
    for (const el of document.body.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      if (s.position === "fixed" && el.getBoundingClientRect().width >= vw) continue;
      if (s.visibility === "hidden" || s.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if ((r.right > vw + 1 || r.left < -1) && !clipped(el)) {
        out.push(
          `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${Math.round(r.left)}…${Math.round(r.right)}`,
        );
      }
    }
    return out.slice(0, 5);
  });

async function noOverflow(page, what) {
  const bad = await overflow(page);
  check(
    bad.length === 0,
    `${what}: no horizontal overflow${bad.length ? ` (${bad.join("; ")})` : ""}`,
  );
}

/** Press Tab until the element with `testId` has focus (proves it is reachable by keyboard). */
async function tabTo(page, testId, max = 250) {
  for (let i = 0; i < max; i++) {
    const at = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    if (at === testId) return true;
    await page.keyboard.press("Tab");
  }
  return false;
}

const focusRing = (page) =>
  page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2 ? s.outlineColor : null;
  });

/** Keyboard placement: Tab to the hand item, Enter, Tab to the socket, Enter. */
async function keyPut(page, item, slot, what) {
  check(await tabTo(page, `hand-${item}`), `${what}: Tab reaches hand ${item}`);
  await page.keyboard.press("Enter");
  check(await tabTo(page, `slot-${slot}`), `${what}: Tab reaches socket ${slot}`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(50);
  check(
    (await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) ===
      `module-${slot}`,
    `${what}: the placed module ${slot} takes focus`,
  );
}

async function keyboardWin(browser, reducedMotion) {
  const what = `keyboard (${reducedMotion})`;
  const { page, errors, close } = await open(browser, {
    viewport: { width: 1440, height: 900 },
    reducedMotion,
    seen: { "lawbreakers:intro-seen": "1" },
  });
  const tutorial = page.getByTestId("tutorial");
  await tutorial.waitFor();
  check(
    (await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) ===
      "tutorial-next",
    `${what}: tutorial opens with Next focused`,
  );
  await page.keyboard.press("Enter");
  check((await tutorial.getAttribute("data-step")) === "controls", `${what}: Enter goes to step 2`);
  await page.keyboard.press("Escape");
  check((await tutorial.count()) === 0, `${what}: Esc skips the tutorial`);
  check(
    (await page.evaluate(() => localStorage.getItem("lawbreakers:tutorial-seen"))) === "1",
    `${what}: tutorial marked seen`,
  );

  await keyPut(page, "card-eq", "root", what);
  await page.waitForTimeout(150);
  const ring = await focusRing(page);
  check(ring === "rgb(255, 176, 0)", `${what}: focused module shows an amber focus ring (${ring})`);
  await keyPut(page, "card-add", "0", what);
  await keyPut(page, "sensor-A", "0-0", what);

  // Delete unplugs the focused module and leaves focus on the empty socket.
  await page.keyboard.press("Delete");
  await page.waitForTimeout(50);
  check(
    (await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) === "slot-0-0",
    `${what}: Delete unplugs, focus on the empty socket`,
  );
  await keyPut(page, "sensor-A", "0-0", what);
  await keyPut(page, "sensor-B", "0-1", what);
  await keyPut(page, "const", "1", what);
  check(await tabTo(page, "dial-1"), `${what}: Tab reaches the dial`);
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowUp");
  const law = (await page.getByTestId("rack-readout").textContent()).trim();
  check(law.includes("A + B = 6"), `${what}: built ${law}`);

  check(await tabTo(page, "engage"), `${what}: Tab reaches ENGAGE`);
  const t0 = Date.now();
  await page.keyboard.press("Enter");
  const verdict = page.getByTestId("verdict");
  await verdict.waitFor({ timeout: VERDICT_TIMEOUT });
  check((await verdict.getAttribute("data-kind")) === "holds", `${what}: THE LAW HOLDS`);
  const live = await page.getByTestId("verdict-live").textContent();
  check(/The Law holds/i.test(live), `${what}: live region announces "${live.slice(0, 40)}…"`);
  // The results open by themselves after the success sequence, with focus inside the dialog.
  await page.getByTestId("results").waitFor();
  check(true, `${what}: results opened ${Date.now() - t0} ms after ENGAGE`);
  await page.waitForTimeout(100);
  check(
    await page.evaluate(() => !!document.activeElement?.closest("[data-testid='results']")),
    `${what}: focus moves into the results dialog`,
  );
  await page.keyboard.press("Escape");
  await page.getByTestId("results").waitFor({ state: "detached" });
  check(await tabTo(page, "show-results"), `${what}: Esc closes results, View results reachable`);
  await page.keyboard.press("Enter");
  await page.getByTestId("results").waitFor();

  if (reducedMotion === "reduce") {
    const long = await page.evaluate(
      () =>
        document.getAnimations().filter((a) => {
          const t = a.effect?.getComputedTiming();
          return t && (t.iterations === Infinity || Number(t.duration) > 600);
        }).length,
    );
    check(long === 0, `${what}: no long or endless animations running (${long})`);
  }
  check(errors.length === 0, `${what}: no page errors ${errors.join(" | ")}`);
  await close();
}

/** Mouse placement, the fast way to reach each verdict for the layout checks. */
async function put(page, item, slot, value) {
  await page.getByTestId(`hand-${item}`).click();
  await page.getByTestId(`slot-${slot}`).click();
  if (value !== undefined) {
    await page.getByTestId(`dial-${slot}`).focus();
    for (let i = 0; i < Math.abs(value); i++)
      await page.keyboard.press(value > 0 ? "ArrowUp" : "ArrowDown");
  }
}

async function engageAndWait(page) {
  await page.getByTestId("engage").click();
  const verdict = page.getByTestId("verdict");
  await verdict.waitFor({ timeout: VERDICT_TIMEOUT });
  await page.waitForTimeout(700); // let the breach shake settle before measuring
  return verdict.getAttribute("data-kind");
}

async function rebuildClear(page) {
  await page.getByTestId("rebuild").click();
  await page.getByTestId("rack-clear").click();
}

/** `cmp(sensor, k)` Laws and `A + B = k` on Mission 01. */
async function cmpLaw(page, card, sensor, k) {
  await put(page, `card-${card}`, "root");
  await put(page, `sensor-${sensor}`, "0");
  await put(page, "const", "1", k);
}

async function sumLaw(page, k) {
  await put(page, "card-eq", "root");
  await put(page, "card-add", "0");
  await put(page, "sensor-A", "0-0");
  await put(page, "sensor-B", "0-1");
  await put(page, "const", "1", k);
}

/**
 * Wait until every finite CSS/Web animation has finished (endless ones, like the hologram flicker,
 * are ignored). axe computes contrast from the live colours, so a dialog caught mid fade-in reads
 * as low contrast although it never is once shown.
 */
async function settle(page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

async function axe(page, what) {
  await settle(page);
  const result = await new AxeBuilder({ page }).analyze();
  const bad = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  for (const v of result.violations)
    console.log(
      `     axe ${v.impact}: ${v.id} (${v.nodes.length}) ${what}: ${v.nodes
        .slice(0, 3)
        .map((x) => x.target.join(" "))
        .join(", ")}`,
    );
  check(bad.length === 0, `${what}: axe has no serious/critical violations`);
}

async function layoutPass(browser, vp) {
  const n = vp.name;
  const shot = (page, name) => page.screenshot({ path: `${dir}/${name}.png` });

  // Title, How to play from the title, intro (fresh profile), mission select.
  {
    const { page, close } = await open(browser, { viewport: vp, query: "" });
    await page.getByTestId("title-screen").waitFor();
    await noOverflow(page, `${n} title`);
    if (n === "desktop") await axe(page, `${n} title`);
    await page.getByTestId("help").click();
    await page.getByTestId("howto").waitFor();
    check(
      (await page.getByTestId("howto-replay-tutorial").count()) === 0,
      `${n}: title help has no tutorial replay`,
    );
    await noOverflow(page, `${n} title help`);
    if (n === "desktop") await axe(page, `${n} help panel`);
    if (n !== "tablet") await shot(page, `m4-t3-help-title-${n}`);
    await page.keyboard.press("Escape");
    check((await page.getByTestId("howto").count()) === 0, `${n}: Esc closes How to play`);
    check(
      (await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) === "help",
      `${n}: focus returns to the ? button`,
    );
    await page.getByTestId("title-start").click();
    await page.getByTestId("intro").waitFor();
    await page.waitForTimeout(1500);
    await noOverflow(page, `${n} intro`);
    await page.keyboard.press("Escape");
    await page.getByTestId("reset-progress").waitFor();
    await noOverflow(page, `${n} mission select`);
    if (n === "desktop") await axe(page, `${n} mission select`);
    await close();
  }

  // Mission 01 with the tutorial, every step.
  {
    const { page, errors, close } = await open(browser, {
      viewport: vp,
      seen: { "lawbreakers:intro-seen": "1" },
    });
    const tutorial = page.getByTestId("tutorial");
    await tutorial.waitFor();
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(500);
      await noOverflow(page, `${n} tutorial step ${i + 1}`);
      if (n !== "tablet" && [0, 2, 3, 5].includes(i))
        await shot(page, `m4-t3-tutorial-${i + 1}-${n}`);
      if (i < 5) await page.getByTestId("tutorial-next").click();
    }
    await page.getByTestId("tutorial-back").click();
    check((await tutorial.getAttribute("data-step")) === "engage", `${n}: Back goes one step back`);
    await page.getByTestId("tutorial-skip").click();
    check((await tutorial.count()) === 0, `${n}: Skip closes the tutorial`);
    await page.reload();
    await page.getByTestId("rack").waitFor();
    await page.waitForTimeout(300);
    check((await tutorial.count()) === 0, `${n}: tutorial does not come back after skipping`);
    await page.getByTestId("help").click();
    await page.getByTestId("howto").waitFor();
    await noOverflow(page, `${n} mission help`);
    if (n !== "tablet") await shot(page, `m4-t3-help-mission-${n}`);
    await page.getByTestId("howto-replay-tutorial").click();
    await tutorial.waitFor();
    check(
      (await tutorial.getAttribute("data-step")) === "machine",
      `${n}: help replays the tutorial`,
    );
    await page.keyboard.press("Escape");
    check(errors.length === 0, `${n} tutorial: no page errors ${errors.join(" | ")}`);
    await close();
  }

  // Mission 01 through every verdict it has, then results and the proof.
  {
    const { page, errors, close } = await open(browser, { viewport: vp, seen: SEEN });
    await page.getByTestId("rack").waitFor();
    await noOverflow(page, `${n} mission idle`);

    await sumLaw(page, 7);
    check((await engageAndWait(page)) === "init_failure", `${n}: A + B = 7 init failure`);
    await noOverflow(page, `${n} verdict init`);
    await rebuildClear(page);

    await cmpLaw(page, "ge", "A", 1);
    check((await engageAndWait(page)) === "live_breach", `${n}: A ≥ 1 live breach`);
    await noOverflow(page, `${n} verdict live`);
    await rebuildClear(page);

    await cmpLaw(page, "ge", "A", 0);
    check((await engageAndWait(page)) === "insufficient", `${n}: A ≥ 0 insufficient`);
    await noOverflow(page, `${n} verdict insufficient`);
    await rebuildClear(page);

    await sumLaw(page, 6);
    if (n === "mobile") {
      // The board scrolls itself so the closed circuit's SHIELD is visible on a phone.
      const vis = await page.evaluate(() => {
        const b = document.querySelector("[data-testid='rack-board']").getBoundingClientRect();
        const s = document.querySelector("[data-testid='shield']").getBoundingClientRect();
        return s.left >= b.left - 1 && s.right <= b.right + 1;
      });
      check(vis, `${n}: SHIELD in view once the Law is complete`);
      await page.getByTestId("rack").screenshot({ path: `${dir}/m4-t5-rack-shield-mobile.png` });
    }
    const kind = await engageAndWait(page);
    check(kind === "holds", `${n}: A + B = 6 holds (${kind})`);
    await noOverflow(page, `${n} verdict holds`);
    // The results open by themselves 950 ms after the banner: scan once they are up and still.
    await page.getByTestId("results").waitFor();
    await page.waitForTimeout(1200);
    if (n === "desktop") await axe(page, `${n} mission (verdict)`);
    await noOverflow(page, `${n} results`);
    await page.getByTestId("show-proof").click();
    await page.getByTestId("proof").waitFor();
    await noOverflow(page, `${n} proof`);
    check(errors.length === 0, `${n} mission: no page errors ${errors.join(" | ")}`);
    await close();
  }

  // Mission 02: the lab breach (cyan simulation).
  {
    const { page, close } = await open(browser, { viewport: vp, query: "?mission=02", seen: SEEN });
    await page.getByTestId("rack").waitFor();
    await cmpLaw(page, "ne", "x", 11);
    check((await engageAndWait(page)) === "lab_breach", `${n}: 02 x ≠ 11 lab breach`);
    await noOverflow(page, `${n} verdict lab`);
    if (n === "mobile") await shot(page, `m4-t5-lab-mobile`);
    await close();
  }
}

/** On a phone, a deep Law keeps the latest placement in view (Mission 06's reference Law). */
async function deepRack(browser) {
  const { page, close } = await open(browser, {
    viewport: { width: 390, height: 844 },
    query: "?mission=06",
    seen: SEEN,
  });
  await page.getByTestId("rack").waitFor();
  const inView = (key) =>
    page.evaluate((k) => {
      const b = document.querySelector("[data-testid='rack-board']").getBoundingClientRect();
      const m = document.querySelector(`[data-testid='module-${k}']`).getBoundingClientRect();
      return m.left >= b.left - 1 && m.right <= b.right + 1;
    }, key);
  const steps = [
    ["card-and", "root"],
    ["card-eq", "0"],
    ["card-add", "0-0"],
    ["sensor-A", "0-0-0"],
    ["sensor-B", "0-0-1"],
  ];
  for (const [item, slot] of steps) {
    await put(page, item, slot);
    check(await inView(slot), `mobile 06: module ${slot} in view after placing it`);
  }
  await page.getByTestId("rack").screenshot({ path: `${dir}/m4-t5-rack-deep-mobile.png` });
  await close();
}

const browser = await chromium.launch();
try {
  if (!process.env.ONLY) await keyboardWin(browser, "no-preference");
  if (!process.env.ONLY) await keyboardWin(browser, "reduce");
  for (const vp of VIEWPORTS)
    if (!process.env.ONLY || vp.name === process.env.ONLY) await layoutPass(browser, vp);
  await deepRack(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\na11y smoke passed");

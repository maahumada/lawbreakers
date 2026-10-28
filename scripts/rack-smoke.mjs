// Rack editor check in a real browser: builds Mission 01's `A + B = 6` by click-to-place (plus one
// drag & drop), checks typed-socket rejection, unplugging, the readout and cost, then builds
// Mission 06's reference Law. Writes docs/screenshots/m2-t3-*.png. Not part of `npm test`.
// Usage: start a server (`npx vite --port 5173`), then
// `node scripts/rack-smoke.mjs [url] [outPrefix]`.

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/";
const out = process.argv[3] ?? "docs/screenshots/m2-t3";

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

const slot = (page, key) => page.getByTestId(`slot-${key}`);
const hand = (page, key) => page.getByTestId(`hand-${key}`);
const readout = async (page) => (await page.getByTestId("rack-readout").textContent()).trim();

/** Click-to-place: pick the hand item, then the socket. */
async function put(page, item, key, value) {
  await hand(page, item).click();
  await slot(page, key).click();
  if (value !== undefined) {
    const dial = page.getByTestId(`dial-${key}`);
    await dial.focus();
    for (let i = 0; i < Math.abs(value); i++) {
      await page.keyboard.press(value > 0 ? "ArrowUp" : "ArrowDown");
    }
  }
}

/** Mouse drag with intermediate moves (dnd-kit needs to see movement past its threshold). */
async function drag(page, from, to) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

async function open(browser, viewport, query = "") {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}${query}`);
  await page.getByTestId("rack").waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { page, errors };
}

const overflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const browser = await chromium.launch();
try {
  for (const vp of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const { page, errors } = await open(browser, vp);
    const n = vp.name;

    check((await readout(page)) === "?", `${n}: empty rack reads ?`);

    // Typed sockets: a sensor (round plug) never fits the SHIELD (square socket).
    await hand(page, "sensor-A").click();
    check(
      (await slot(page, "root").getAttribute("data-accept")) === "no",
      `${n}: SHIELD rejects a number`,
    );
    await slot(page, "root").click({ force: true });
    check((await readout(page)) === "?", `${n}: clicking the rejected socket places nothing`);
    await page.keyboard.press("Escape");

    if (n === "desktop") {
      // Drag a number over the SHIELD: rejected (disabled drop target), nothing placed.
      await drag(page, hand(page, "sensor-A"), slot(page, "root"));
      check((await readout(page)) === "?", "drag: number dropped on SHIELD is rejected");
      await drag(page, hand(page, "card-eq"), slot(page, "root"));
      check((await readout(page)) === "? = ?", "drag: = card plugs into the SHIELD");
    } else {
      await put(page, "card-eq", "root");
    }
    await hand(page, "card-add").click();
    if (n === "desktop") await page.screenshot({ path: `${out}-desktop-selecting.png` });
    await slot(page, "0").click();
    await put(page, "sensor-A", "0-0");
    await put(page, "sensor-B", "0-1");
    check(
      (await page.getByTestId("engage").getAttribute("data-ready")) === null,
      `${n}: ENGAGE not armed while incomplete`,
    );
    await put(page, "const", "1", 6);

    check((await readout(page)) === "A + B = 6", `${n}: readout is "${await readout(page)}"`);
    const cost = (await page.getByTestId("rack-cost").textContent()).replace(/\s+/g, " ").trim();
    check(cost === "Cost 5 / Budget 5", `${n}: cost "${cost}"`);
    check(await hand(page, "card-add").isDisabled(), `${n}: ADD card exhausted`);
    check(
      (await page.getByTestId("engage").getAttribute("data-ready")) !== null,
      `${n}: ENGAGE armed when complete`,
    );

    await page.getByTestId("rack").evaluate((el) => el.scrollIntoView({ block: "end" }));
    await page.screenshot({ path: `${out}-${n}.png`, fullPage: n === "mobile" });
    const ov = await overflow(page);
    check(ov <= 0, `${n}: no horizontal page scroll (overflow ${ov}px)`);

    // Unplug ADD with its sensors, then put it back.
    await page.getByTestId("remove-0").click();
    check((await readout(page)) === "? = 6", `${n}: unplugging ADD leaves "? = 6"`);
    check(!(await hand(page, "card-add").isDisabled()), `${n}: ADD back in the hand`);

    check(errors.length === 0, `${n}: no page errors ${errors.join("; ")}`);
    await page.close();
  }

  // Mission 06, full reference Law (10 modules).
  for (const vp of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const { page, errors } = await open(browser, vp, "?mission=06");
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
    const text = await readout(page);
    check(text === "A + B = 6 AND A MOD 2 = 0", `06 ${vp.name}: readout "${text}"`);
    const cost = (await page.getByTestId("rack-cost").textContent()).replace(/\s+/g, " ").trim();
    check(cost === "Cost 10 / Budget 10", `06 ${vp.name}: cost "${cost}"`);
    await page.getByTestId("rack").scrollIntoViewIfNeeded();
    if (vp.name === "desktop") {
      await page.getByTestId("rack").screenshot({ path: `${out}-m06-desktop.png` });
    } else {
      await page.getByTestId("rack").screenshot({ path: `${out}-m06-mobile.png` });
    }
    const ov = await overflow(page);
    check(ov <= 0, `06 ${vp.name}: no horizontal page scroll (overflow ${ov}px)`);
    check(errors.length === 0, `06 ${vp.name}: no page errors ${errors.join("; ")}`);
    await page.close();
  }
} finally {
  await browser.close();
}
if (failures.length > 0) throw new Error(`${failures.length} check(s) failed`);
console.log("rack editor OK");

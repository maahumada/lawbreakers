// Show the Proof in a real browser: win Mission 01 with `A + B = 6`, open the proof panel, check
// the code, copy and close. Writes docs/screenshots/m3-t6-proof*.png. Not part of `npm test`.
// Usage: start a server (`npx vite --port 5173`), then
// `node scripts/proof-smoke.mjs [url] [outDir]`.

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/";
const dir = process.argv[3] ?? "docs/screenshots";

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

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
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?mission=01`);
    await page.getByTestId("rack").waitFor();
    await page.evaluate(() => document.fonts.ready);

    await put(page, "card-eq", "root");
    await put(page, "card-add", "0");
    await put(page, "sensor-A", "0-0");
    await put(page, "sensor-B", "0-1");
    await put(page, "const", "1", 6);
    await page.getByTestId("engage").click();
    await page.getByTestId("results").waitFor({ timeout: 45_000 });

    await page.getByTestId("show-proof").click();
    const code = page.getByTestId("proof-code");
    await code.waitFor();
    const text = await code.textContent();
    check(text.includes("invariant A + B == 6  // YOUR LAW"), `${name}: Law is the invariant`);
    check(text.includes("assert !(A == 0 && B == 0);"), `${name}: meltdown is the assertion`);
    check(text.includes("A, B := A - 1, B + 1;"), `${name}: simultaneous assignment`);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(overflow <= 0, `${name}: no page-level horizontal scroll (${overflow}px)`);
    if (name === "mobile") {
      const scrolls = await code.evaluate((el) => el.scrollWidth > el.clientWidth);
      check(scrolls, "mobile: code block scrolls horizontally inside itself");
    }
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `${dir}/m3-t6-proof${name === "mobile" ? "-mobile" : ""}.png`,
    });

    await page.getByTestId("proof-copy").click();
    await page.getByRole("button", { name: "Copied", exact: true }).waitFor();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    check(
      clip.startsWith("// LAWBREAKERS · Mission 01"),
      `${name}: copy puts the program on the clipboard`,
    );

    await page.keyboard.press("Escape");
    check((await page.getByTestId("proof").count()) === 0, `${name}: Escape closes the proof`);
    check(await page.getByTestId("results").isVisible(), `${name}: results stay open`);
    check(errors.length === 0, `${name}: no page errors ${errors.join("; ")}`);
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length > 0) throw new Error(`${failures.length} check(s) failed`);
console.log("show the proof OK");

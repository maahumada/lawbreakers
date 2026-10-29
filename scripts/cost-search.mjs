// M3-T7 cost balance report: for every mission, the cheapest Laws that hold among every Law the
// hand can build up to a cost bound (default: the reference cost + 2), with dial values −2…12.
// Verdicts come from the real engine (`verify`). Not part of `npm test` (slow on Mission 06).
// Usage: `npm run cost-search [-- --slack N] [-- --only 06]`

import { createServer } from "vite";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const slack = Number(arg("--slack", "2"));
const only = arg("--only", undefined);
const CONSTS = Array.from({ length: 15 }, (_, i) => i - 2);

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const { loadBundledLevels, lawCost } = await vite.ssrLoadModule("/src/engine/level.ts");
  const { pretty } = await vite.ssrLoadModule("/src/engine/expr.ts");
  const { searchHolding } = await vite.ssrLoadModule("/tests/fixtures/lawSearch.ts");
  const { shutdownZ3 } = await vite.ssrLoadModule("/src/engine/smt.ts");

  for (const level of loadBundledLevels()) {
    if (only && !level.id.startsWith(only)) continue;
    const ref = level.solutions[0];
    const refCost = lawCost(ref);
    const t0 = Date.now();
    const { searched, holding } = await searchHolding(level, refCost + slack, CONSTS);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `\n${level.id}  reference ${pretty(ref)} = ${refCost}, budget ${level.hand.budget}; ` +
        `${searched} candidate Laws ≤ ${refCost + slack} (survivors of sample pruning) checked in ${secs} s, ` +
        `${holding.length} hold`,
    );
    const cheapest = holding[0]?.cost;
    console.log(`  cheapest holding cost: ${cheapest ?? "none"}`);
    for (const h of holding.slice(0, Number(arg("--show", "12"))))
      console.log(`  ${String(h.cost).padStart(3)}  ${pretty(h.law)}`);
    if (holding.length > Number(arg("--show", "12")))
      console.log(`  … ${holding.length - Number(arg("--show", "12"))} more`);
  }
  await shutdownZ3();
} finally {
  await vite.close();
}

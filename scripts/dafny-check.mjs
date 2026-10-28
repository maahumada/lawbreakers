// Show the Proof check: export every level's reference solutions and known-wrong Laws to Dafny and
// run the real verifier. Every solution must verify; every known-wrong Law must fail.
// Not part of `npm test` (needs a local Dafny). Usage: `npm run dafny-check`
// (DAFNY=/path/to/dafny to override; default `dafny` on PATH, then ~/.local/bin/dafny).
// `npm run dafny-check -- --keep` leaves the generated .dfy files in the temp dir.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

function findDafny() {
  if (process.env.DAFNY) return process.env.DAFNY;
  const local = join(homedir(), ".local/bin/dafny");
  const onPath = spawnSync("dafny", ["--version"], { encoding: "utf8" });
  if (onPath.status === 0) return "dafny";
  if (existsSync(local)) return local;
  throw new Error("Dafny not found: install it or set DAFNY=/path/to/dafny");
}

// Boogie's default interval analysis infers loop invariants of its own (e.g. `0 <= x <= 10` in
// Mission 02), which lets wrong Laws such as `x != 11` verify. `/infer:t` (trivial domain) turns
// that off so the player's Law is the only thing the proof can lean on.
const DAFNY_ARGS = ["--boogie", "/infer:t"];
const keep = process.argv.includes("--keep");
const dafny = findDafny();
console.log(`dafny ${execFileSync(dafny, ["--version"], { encoding: "utf8" }).trim()}`);

// Load the TypeScript engine through Vite (handles .ts and JSON imports).
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});
const dir = mkdtempSync(join(tmpdir(), "lawbreakers-dafny-"));
const failures = [];
let verified = 0;
let rejected = 0;

try {
  const { loadBundledLevels } = await vite.ssrLoadModule("/src/engine/level.ts");
  const { toDafny } = await vite.ssrLoadModule("/src/engine/dafny.ts");
  const { pretty } = await vite.ssrLoadModule("/src/engine/expr.ts");

  for (const level of loadBundledLevels()) {
    const cases = [
      ...level.solutions.map((law) => ({ law, expect: "verifies", tag: "solution" })),
      ...level.knownWrong.map((w) => ({ law: w.law, expect: "fails", tag: w.verdict })),
    ];
    for (const [i, { law, expect, tag }] of cases.entries()) {
      const file = join(dir, `${level.id}-${i}.dfy`);
      writeFileSync(file, toDafny(level, law));
      const run = spawnSync(dafny, ["verify", ...DAFNY_ARGS, file], { encoding: "utf8" });
      const out = `${run.stdout}${run.stderr}`;
      const ok = run.status === 0;
      // A failure must be a verification failure, not a parse/resolution error in our output.
      const malformed =
        !ok && !/Dafny program verifier finished with \d+ verified, [1-9]/.test(out);
      const summary = ok
        ? "verified"
        : malformed
          ? "MALFORMED"
          : out
              .split("\n")
              .filter((l) => /Error:/.test(l))
              .map((l) => l.replace(/^.*?Error: /, ""))
              .join("; ");
      const pass = !malformed && ok === (expect === "verifies");
      if (ok) verified++;
      else if (!malformed) rejected++;
      console.log(
        `${pass ? "ok  " : "FAIL"} ${level.id.padEnd(18)} ${tag.padEnd(12)} ${pretty(law).padEnd(28)} ${summary}`,
      );
      if (!pass) failures.push(`${level.id}: ${pretty(law)} (expected ${expect})\n${out}`);
    }
  }
} finally {
  await vite.close();
  if (keep) console.log(`generated programs kept in ${dir}`);
  else rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${verified} verified, ${rejected} correctly rejected, ${failures.length} wrong`);
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

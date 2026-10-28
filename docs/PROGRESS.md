# Progress

Living status of the project. Read this first to know where things stand.
`ROADMAP.md` holds the task list (checkboxes); this file holds the current state, decisions taken
along the way, and a log of each work session.

## Current state

- **Milestone:** M2 — Vertical slice: Mission 01 playable
- **Next task:** M2-T3 Rack editor
- **Blockers:** none
- **Deployed URL:** not yet

## Decisions log

Decisions that deviate from or refine the docs. Newest first.

| Date | Decision | Why |
|---|---|---|
| 2026-10-28 | Fonts self-hosted with `@fontsource` (Oswald, JetBrains Mono, VT323) instead of Google Fonts | the page is COEP `require-corp`; same-origin fonts avoid CORP/CORS surprises on Pages and work offline |
| 2026-10-28 | Theme tokens are namespaced `--human-*` / `--argus-*` (plus type/space/shape); `--color-*` kept only as aliases for the dev page | the two worlds stay visibly separate in CSS; effects live in `effects.css` as `fx-*` classes |
| 2026-10-28 | Mission screen reads `?mission=NN` to open another mission until mission select exists | lets every level be checked in the machine view now |
| 2026-10-28 | Auto-run uses the engine's `prng` (now exported from `simulate.ts`), 750 ms per cycle, uniform among enabled controls | same choices as `randomRun` for the same seed (tested) |
| 2026-10-28 | Gauge bars share one full scale (max of 10 and every value seen in the log); `int` gauges are centred on zero with a sign tube | gauges compare at a glance (conservation in Mission 01); negative values readable |
| 2026-10-28 | Z3 assets served/emitted at `<base>z3/` by a Vite plugin; the module worker fetches `z3-built.js` and runs it with indirect `eval`, passing `locateFile`/`mainScriptUrlOrBlob` to `initZ3` | works unchanged in `vite dev`, `vite preview` and under a GitHub Pages `base`; no 35 MB copy in `public/`; pthread workers find the script |
| 2026-10-28 | Vite `base` must be absolute (`/` or `/<repo>/`) | the worker resolves `BASE_URL` against the origin to find `z3/` |
| 2026-10-28 | UI talks to Z3 only through `src/worker/client.ts` (`warmUp`, `verifyLaw`) | keeps Z3 out of the main bundle and the main thread |
| 2026-10-28 | Mission 03: `y ≥ 0` is a LAB BREACH; the INSUFFICIENT example is `y ≥ 2·x` (test-only, not buildable with the hand) | engine disagreed with the hand-worked doc; every LEVELS.md row is now a JSON entry under test |
| 2026-10-28 | `playwright@1.57.0` devDependency (matches the locally cached chromium-1200) for `npm run smoke` | real-browser check of the worker; not part of `npm test` |
| 2026-10-28 | Traces start with the init state under `control: TRACE_START` (`""`) | matches `Verdict.live_breach.trace` ("starts at init") with no extra type |
| 2026-10-28 | Lab query builds `I(s')` / `D(s')` by substituting `update_t` into the Law (`substBool`), not with primed Z3 constants | keeps `findModel` on plain `BoolExpr`s over one state; `numToZ3`/`boolToZ3` still take a variable map |
| 2026-10-28 | `verify` re-checks every Z3 model with the evaluator and throws on disagreement | a Z3/evaluator mismatch is an engine bug, never a verdict |
| 2026-10-28 | A control that leaves the `nat` domain during simulation throws `SimulationError` | levels must guard it; M1-T7 checks domain preservation with Z3 |
| 2026-10-28 | TypeScript pinned to `~6.0` (not 7) | `typescript-eslint` 8.x supports TS `<6.1` only |
| 2026-10-28 | Module count: one per AST node; `×k` and `MOD k` include their constant; comparators, constants, sensors, `true`/`false` count 1 | matches the budgets in `LEVELS.md` (01: 5, 02: 3, 03: 4, 04: 4, 05: 7, 06: 10) |
| 2026-10-28 | Card ids: `add sub scale2 scale3 mod2 mod3 eq ne lt le gt ge and or not` (fixed `CARD_IDS` list in `level.ts`) | typed hand in level JSON; add `scaleK`/`modK` ids when a mission needs them |
| 2026-10-28 | `Verdict` lives in `src/engine/types.ts` | shared by verify, worker and UI without importing `verify.ts` |
| 2026-10-28 | Parser: unary minus folds into a negative constant on literals, else `scale(-1, e)`; comparisons do not chain; `!` binds looser than comparisons (`!A = 0` is `!(A = 0)`) | keeps `parse(pretty(e)) ≡ e` exact and level strings unambiguous |
| 2026-10-28 | Sensors and constants unlimited; operators dealt as a hand of cards; every module costs 1 until M3-T7 | keeps budgets simple until playtesting |
| 2026-10-28 | Rack editor (typed sockets) instead of free node wiring | fewer UI bugs, fits the deadline |
| 2026-10-28 | Z3 WASM in the browser + BFS fast path | real verification, no backend |

## Session log

Newest first. One entry per completed task: what was done, files touched, anything surprising,
follow-ups.

### 2026-10-28 — M2-T1 Theme + M2-T2 Machine view
- Theme: `src/styles/tokens.css` (both DESIGN §8 palettes as `--human-*`/`--argus-*`, type scale,
  4px spacing, radii, motion; `@fontsource` Oswald / JetBrains Mono / VT323), `src/styles/effects.css`
  (`fx-crt` scanlines + vignette + flicker, `fx-glow`, `fx-hexgrid` via CSS mask, `fx-raster`,
  `fx-glitch` with `data-text` chromatic bursts, `fx-cursor`; all off under
  `prefers-reduced-motion`), `global.css` rewritten (dev page styles kept).
- Layout: `src/ui/screens/MissionScreen.tsx` + `mission.css`: header (nixie mission number + title),
  human console left, ARGUS panel right (hazard-striped seam), stacked under 960px. Reserved slots
  via `ui/layout/Slot.tsx`: `data-slot="rack"`, `"engage"` (disabled ENGAGE INTERLOCK button),
  `"breach-meter"` (empty 20-cell meter), `"argus-terminal"` (shows `argus.intro` statically).
- Machine view: `src/ui/machine/` `MachineView`, `Briefing` (text + MELTDOWN IF placard),
  `Gauge` (nixie tubes + bar), `ControlCard` (label, guard, effect, lamp, ARMED/LOCKED; disabled
  when the guard is false), `Telemetry` (log, newest last, auto-scroll), `useAutoRun`, `format.ts`
  (`IF A ≥ 1: A −1, B +1`). State in `src/game/missionStore.ts` (Zustand: `load`, `fire`, `reset`,
  `setAutoRun`, `autoStep`; log capped at 300). `App.tsx` routes `?dev` → dev panel, else mission
  (`?mission=NN`, default 01). Engine: `prng` exported from `simulate.ts`.
- Tests: `tests/format.test.ts`, `tests/missionStore.test.ts` (auto-run = `randomRun` for the same
  seed). `scripts/screenshot-mission.mjs` (`npm run screenshots`, needs a running server) writes
  `docs/screenshots/m2-t2-desktop.png`, `-desktop-running.png`, `-mobile.png` and checks: fonts
  loaded, clicking TRANSFER A→B moves A 2 → 1, no horizontal scroll at 1440 and 390 px, auto-run
  grows the log, reset clears it. `npm run smoke` on `?dev` still passes.
- **Surprises:** Oswald has no `→` glyph, so control labels fall back to a system font for the arrow
  (acceptable; could swap the arrow for a custom glyph later).
- **Follow-ups:** M2-T3 fills `data-slot="rack"`; M2-T4 replaces the static terminal lines and
  enables ENGAGE, and should drive the gauges from the store when replaying traces (add a
  `showState`/replay action rather than bypassing `step`); M2-T5 fills the breach meter. Disabled
  card styling only checked by CSS (Mission 01 never disables a control at power-on).

### 2026-10-28 — M1-T8 Verification worker
- `src/worker/verify.worker.ts` (module worker; loads Z3, answers `warmUp` / `verify` by request id),
  `src/worker/protocol.ts` (message types), `src/worker/client.ts` (`warmUp()`,
  `verifyLaw(levelId, law)`; rejects with the worker's error message; a worker crash rejects every
  pending request and the next call restarts it).
- `src/engine/smt.ts`: `initZ3(overrides?)` forwards Emscripten overrides; a failed init is no longer
  memoized. `vite.config.ts`: `lawbreakers:z3-assets` plugin (dev middleware + build emit of
  `z3-built.js/.wasm` at `<base>z3/`), `optimizeDeps.include` for `z3-solver`/`zod`,
  `worker.format: "es"`. Approach documented in ARCHITECTURE "Z3 in the browser".
- Dev page: `?dev` → `src/ui/dev/DevVerifyPanel.tsx` (verifies Mission 01 `A + B = 6` → holds and
  `A >= 1` → live_breach, an unknown level → rejected; spinner + rAF frame counter). Styles in
  `global.css` (throwaway).
- **Browser-verified:** `scripts/smoke-worker.mjs` (`npm run smoke`, headless Chromium 143 via
  `playwright@1.57.0`) passes on `vite dev`, `vite preview`, and both with `--base /lawbreakers/`:
  `crossOriginIsolated` true, frames advance during verification, Z3 init ~160 ms, reference Law
  ~130 ms.
- **Surprises:** in a worker Emscripten's `_scriptName` is undefined (it only reads
  `document.currentScript`), so without `mainScriptUrlOrBlob` the pthread pool would call
  `new Worker(undefined)`; `browser.js` reads `global.initZ3`, so the worker sets `self.global`.
- **Follow-ups:** M2-T6 must make `coi-serviceworker` also cover the worker and the `z3/` files on
  Pages, and set Vite `base` to an absolute `/<repo>/`. The 35 MB wasm will dominate first load;
  warm up during the briefing (M2-T4). Firefox not smoke-tested (Playwright's firefox build not
  installed for 1.57).

### 2026-10-28 — M1-T7 Level conformance
- `tests/conformance.test.ts`: per mission, `Safe(s0)`; nat-domain preservation per control (Z3:
  `D(s) ∧ guard ∧ ¬D(s')` unsat); every solution → `holds`; every solution buildable (cards with
  multiplicity via `cardOf`, sensors/constants free, `size ≤ budget`); every knownWrong → its
  verdict. Plus a unit test of the card counter.
- Engine vs `LEVELS.md`: every row agreed except Mission 03 `y ≥ 0` (engine: `lab_breach`,
  `(1, 0)` → `PULL` → `(0, −2)`). Fixed doc + JSON: `y ≥ 0` is now a LAB BREACH row, and a new
  INSUFFICIENT row `y ≥ 2·x` (inductive, allows `(−10, 7)`; not buildable, test-only). Mission 04
  `n ≠ 0` *Why* now also mentions the engine's counterexample (`n = −2`, INSERT PAIR). Removed the
  "M1-T7 must confirm" caveat. All LEVELS.md table rows are in the JSON.
- Side finding: Mission 03 `y mod 2 = 0` also holds (not buildable with the hand; no `MOD 2` card).

### 2026-10-28 — M1-T4..T6 Simulation, SMT, Verify
- `src/engine/simulate.ts`: `enabled`, `step` (simultaneous update; throws `SimulationError` on
  unknown/disabled control or nat underflow), `applyUpdate`, `randomRun` (mulberry32 PRNG, stops
  when nothing is enabled), `bfsAttack(level, law, {depth=12, maxStates=5000})` → shortest
  `TraceStep[]` from init (`control: TRACE_START`) or `null`.
- `src/engine/smt.ts`: `initZ3()` (memoized), `shutdownZ3()` (terminates Emscripten pthreads, for
  Node), `numToZ3`/`boolToZ3`/`intEnv`, `findModel(constraints, vars, bound?) → State | null`
  (releases solver/model; throws on `unknown`).
- `src/engine/verify.ts`: `verify(level, law, {bfs?}) → Promise<Verdict>`, `MODEL_BOUNDS = [10, 100,
  unbounded]`, `domainConstraints`. `src/engine/expr.ts`: `substNum`/`substBool`.
- Tests: `tests/simulate.test.ts`, `tests/smt.test.ts` (every operator vs `evalNum`/`evalBool`,
  negative `mod`), `tests/verify.test.ts` (each verdict kind, BFS-misses-but-lab-catches, bound
  escalation to unbounded, D(s), Mission 01 solutions + knownWrong), `tests/fixtures/levels.ts`.
  Whole suite ~1.2 s; Z3 init ~0.1 s in Node and the process exits cleanly even without
  `shutdownZ3` (z3-solver 5.3.2).
- **Confirmed for M1-T7:** a one-off run over all six missions matches every solution and
  knownWrong except Mission 03 `y >= 0`: engine says `lab_breach` (`x=1,y=0`, `pull` → `y=-2`), not
  `insufficient`. Not fixed here (T7 scope).
- **Follow-up for M1-T8:** the UI does not import the engine's Z3 path yet, so `npm run build`
  does not bundle z3. `z3-solver`'s `browser` entry needs `global.initZ3` from `z3-built.js` loaded
  in the worker (e.g. `importScripts`) plus the `.wasm` served next to it; `killThreads` is not
  exported in the browser build (hence `shutdownZ3` calls `em.PThread` directly).

### 2026-10-28 — M1-T3 Levels
- `src/engine/level.ts`: zod 4 strict schema, `CARD_IDS`/`CardId`, `cardOf`, `loadLevel` (parses
  every expression, collects all issues into one `LevelError`: unknown vars, updates to undeclared
  vars, parse/type errors with caret, duplicate vars/controls, nat init < 0), `initialState`,
  `loadBundledLevels` (static JSON imports, works in Vite and Vitest).
- `src/levels/01-…06-*.json` from `LEVELS.md`, with solutions, knownWrong, briefings, ARGUS intros.
- `tests/level.test.ts`, `tests/fixtures/malformed-level.json`. Also checks reference Law size =
  budget and `Safe(s0)` for every mission.
- **Surprise (for M1-T7):** Mission 03 `y >= 0` is listed as INSUFFICIENT but by hand it is a
  LAB BREACH (`x = 1, y = 0`, `PULL` → `y = -2`; lab runs before safety). JSON kept as in the doc;
  the conformance test should confirm, then fix doc + JSON (and maybe pick another INSUFFICIENT
  example, e.g. `y - 2 * x >= 0` — not buildable with the hand, which is fine for knownWrong).

### 2026-10-28 — M1-T2 Expressions
- `src/engine/expr.ts`: AST types per ARCHITECTURE, constructors with integer/divisor checks,
  `typeOf`, `freeVars`, `evalNum`/`evalBool` (Euclidean `mod`), `pretty` (minimal parens),
  `size` (module count). `src/engine/parse.ts`: tokenizer + recursive-descent parser, `ParseError`
  with reason, 0-based `pos` and a caret message; `parseExpr`/`parseNum`/`parseBool`.
- `tests/expr.test.ts`, `tests/parse.test.ts` (incl. 2 000 seeded random round trips).

### 2026-10-28 — M1-T1 Scaffold
- Vite 8 + React 18.3 + TS 6.0 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`),
  ESLint 10 flat config (typescript-eslint strict, react-hooks, engine-purity
  `no-restricted-imports`), Prettier 3 (`lint` runs both), Vitest 5. COOP/COEP headers for dev and
  preview in `vite.config.ts`. `z3-solver` and `zod` added as dependencies (z3 unused yet).
- Placeholder page `src/ui/App.tsx`; minimal `src/styles/tokens.css` / `global.css`.
- Prettier ignores `docs/` and `*.md` so it never rewrites hand-written docs.

### 2026-10-28 — M0-T1 Docs
- Wrote `DESIGN.md`, `LEVELS.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CLAUDE.md`, `README.md`.
- Level verdicts were computed by hand; M1-T7 must confirm them with the engine.
- Tools available locally: Node 24, npm 11, Dafny (`~/.local/bin/dafny`), Docker.

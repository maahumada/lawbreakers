# Architecture

A static single-page web app. No backend for the MVP: everything, including the SMT solver, runs in
the browser. Deployed to GitHub Pages.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + TypeScript (strict) | fast, static output for Pages |
| UI | React 18 | component model fits racks/cards/panels |
| State | Zustand | small, no boilerplate |
| Drag & drop | `@dnd-kit/core` | accessible, works with touch |
| Animation | `motion` (Framer Motion) | attack replays, card movement |
| Solver | `z3-solver` (official Z3 WASM build) | real verification in the browser and in Node tests |
| Validation | `zod` | level JSON schema |
| Tests | Vitest | same toolchain as Vite; engine tests run Z3 in Node |
| Audio | WebAudio API, synthesized | no asset licensing |
| Deploy | GitHub Actions → GitHub Pages | free, matches the deliverable |

## Layout

```
lawbreakers/
├── docs/                    design, levels, architecture, roadmap
├── public/
│   └── coi-serviceworker.js enables cross-origin isolation on GitHub Pages (Z3 needs SharedArrayBuffer)
├── src/
│   ├── engine/              PURE TypeScript. No React, no DOM. Fully unit-tested.
│   │   ├── types.ts         Verdict / VerdictKind (shared by verify, worker, UI)
│   │   ├── expr.ts          Expr AST, type checker, evaluator, pretty-printer
│   │   ├── parse.ts         infix text → Expr (used by level files, tests, dev console)
│   │   ├── level.ts         level schema (zod), loader, static validation
│   │   ├── simulate.ts      step, enabled transitions, random telemetry, BFS live attack
│   │   ├── smt.ts           Expr → Z3 terms
│   │   ├── verify.ts        init / live / lab / safety pipeline → Verdict
│   │   ├── score.ts         breach deltas (`addBreach`) and the score formula (`scoreMission`)
│   │   └── dafny.ts         level + Law → Dafny program text
│   ├── worker/
│   │   ├── verify.worker.ts runs verify.ts off the main thread (loads Z3, see "Z3 in the browser")
│   │   ├── protocol.ts      request/response message types
│   │   └── client.ts        typed promise API for the UI: warmUp(), verifyLaw(levelId, law)
│   ├── levels/              01-last-reactor.json … 06-final-breach.json
│   ├── game/                missionStore.ts (machine state, telemetry, auto-run, replay display, breach/attempts/clock); rack.ts (pure partial-tree model); rackStore.ts (+ lock); engageStore.ts (ENGAGE phase, terminal lines, verdict, result); argusLines.ts (line pools); bestScores.ts (localStorage); introSeen.ts / tutorialSeen.ts (seen flags); campaign.ts (secured missions, unlock rule, training flag; localStorage)
│   ├── ui/
│   │   ├── router.ts        query-string routes (`?` title, `?missions`, `?mission=NN`, `?dev`), pushState navigation, `?…` link interception
│   │   ├── screens/         BootScreen (coi reload), Title, MissionSelect, TrainingToggle, Mission, ResultsOverlay, MissionFailedOverlay, VerdictAnnouncer (screen-reader live region), IntroScreen (+ introScript), ThreatBoard (mission select radar)
│   │   ├── rack/            RackEditor (dnd-kit context), Hand, RackBoard (sockets, modules, SVG wires, SHIELD), Dial, Readout, layout.ts (pure)
│   │   ├── layout/          Slot (reserved areas for later features, `data-slot`)
│   │   ├── machine/         MachineView, Briefing, Gauge, ControlCard, Telemetry, ReplayStrip (shown state + Law/meltdown probe), format.ts (guard/effect text), replay.css (verdict modes)
│   │   ├── argus/           ArgusPanel, Terminal (typed lines), BreachMeter, EngageConsole + VerdictBanner (engage slot), engage.ts (the ENGAGE sequence), verdictText.ts
│   │   ├── proof/           ShowTheProof
│   │   ├── help/            HowToPlay + HelpButton ("?"), Tutorial (coach marks) + tutorialSteps.ts, helpStore.ts, HelpLayer (per screen)
│   │   └── fx/              ImpactFx (breach shake + flash), SoundToggle (global mute switch)
│   ├── audio/               sound.ts (AudioContext unlocked on first gesture, mute store), sfx.ts (synthesized sounds), bindings.ts (store subscriptions → sounds)
│   └── styles/              tokens.css (palettes, type, space; self-hosted @fontsource fonts), effects.css (fx-* utilities), global.css
├── scripts/
│   ├── smoke-worker.mjs     headless Chromium check of the worker on the `?dev` page (not in npm test)
│   ├── screenshot-mission.mjs  mission screen screenshots (1440×900, 390×844) + interaction checks (`npm run screenshots`)
│   ├── rack-smoke.mjs       rack editor in Chromium: builds Missions 01 and 06, screenshots (`npm run rack-smoke`)
│   ├── engage-smoke.mjs     ENGAGE end to end with real Z3: every verdict, breach, results, mission failed (`npm run engage-smoke`)
│   ├── missions-smoke.mjs   Missions 02–06: wrong Laws + reference Law, results, screenshots m3-t2-* (`npm run missions-smoke`)
│   ├── campaign-smoke.mjs   title → select → unlocks, persistence, Back, CONTINUE, off-campaign, training, reset (`npm run campaign-smoke`)
│   ├── pages-preview.mjs    GitHub Pages emulation: `dist/` under `/lawbreakers/`, no COOP/COEP (`npm run pages-preview`)
│   ├── juice-smoke.mjs      intro, mute, threat board, current/breach/holds effects; screenshots m4-t1-*, m3-t5-* (`npm run juice-smoke`)
│   ├── a11y-smoke.mjs       keyboard-only win, reduced motion, no horizontal overflow at 3 viewports, tutorial/help, axe; screenshots m4-t3-*, m4-t5-* (`npm run a11y-smoke`)
│   └── coi-smoke.mjs        first visit through coi-serviceworker: one reload, isolated, Z3 works (`npm run coi-smoke`)
└── tests/                   engine tests, level conformance (+ a few component smoke tests)
```

**Hard rule: `src/engine` never imports from `src/ui`, `src/game` or React.** The UI depends on the
engine, never the reverse. This is what lets agents build and test the engine in isolation.

## Core types (engine)

```ts
type NumExpr =
  | { k: "var"; name: string }
  | { k: "const"; value: number }
  | { k: "add" | "sub"; l: NumExpr; r: NumExpr }
  | { k: "scale"; factor: number; e: NumExpr }       // constant × expr (keeps it linear)
  | { k: "mod"; divisor: number; e: NumExpr };       // divisor > 0, constant

type BoolExpr =
  | { k: "bool"; value: boolean }
  | { k: "cmp"; op: "=" | "!=" | "<" | "<=" | ">" | ">="; l: NumExpr; r: NumExpr }
  | { k: "and" | "or"; l: BoolExpr; r: BoolExpr }
  | { k: "not"; e: BoolExpr };

type State = Record<string, number>;

type Verdict =
  | { kind: "init_failure"; state: State }
  | { kind: "live_breach"; trace: { control: string; state: State }[] }   // starts at init
  | { kind: "lab_breach"; before: State; control: string; after: State }
  | { kind: "insufficient"; state: State }                                // satisfies Law, is meltdown
  | { kind: "holds" };
```

The rack in the UI is a *partial* tree (empty sockets allowed). It converts to an `Expr` only when
complete; an incomplete rack cannot be engaged.

```ts
// src/game/rack.ts
type RackModule = { kind: "sensor"; name: string } | { kind: "const"; value: number } | { kind: "card"; card: CardId };
interface RackNode { id: number; mod: RackModule; inputs: (RackNode | null)[] }  // null = empty socket
type Rack = RackNode | null;      // content of the SHIELD socket
type SlotPath = readonly number[]; // [] = SHIELD, [i] = input i of its module, …
```

Pure functions: `canPlace` / `placeAt` / `removeAt` / `moveTo` / `setConstAt`, `rackToLaw` (→
`BoolExpr | null`), `rackCost` (= `size` once complete), `cardsUsed` / `cardsLeft`, `rackText`
(`pretty` syntax with `?` holes). `rackStore.ts` (Zustand) holds the rack, the click-to-place
selection and the derived `law` / `cost`; `MissionScreen` resets it whenever the mission changes.

### ENGAGE flow (UI)

`ui/argus/engage.ts` runs the sequence: lock the rack (`rackStore.setLocked`) and the machine
(`missionStore.lock`), call `verifyLaw` while ARGUS's lines type, then present the verdict on the
machine only through store actions: `show(state, mode)` and `replayFire(control)` (which goes
through the engine's `step`; `live` mode restarts and extends the telemetry log, `lab` leaves it).
`mode` (`live | lab | meltdown | init | holds`) drives `.machine[data-mode]` styling and the
`ReplayStrip`, which evaluates the engaged Law and the meltdown on the shown state. Then
`recordVerdict` adds the breach, and the banner (or the results / MISSION FAILED overlay) shows.
Every await checks a run token, so REBUILD / RETRY / unmount cancel a sequence in flight. Timings
shrink under `prefers-reduced-motion` (same information).

## Level file format

```json
{
  "id": "01-last-reactor",
  "title": "THE LAST REACTOR",
  "concept": "conservation",
  "briefing": "The last fusion reactor stores energy in two cells...",
  "vars": [
    { "name": "A", "label": "CELL A", "domain": "nat", "init": 2 },
    { "name": "B", "label": "CELL B", "domain": "nat", "init": 4 }
  ],
  "controls": [
    { "id": "a2b", "label": "TRANSFER A→B", "guard": "A >= 1", "update": { "A": "A - 1", "B": "B + 1" } },
    { "id": "b2a", "label": "TRANSFER B→A", "guard": "B >= 1", "update": { "A": "A + 1", "B": "B - 1" } }
  ],
  "meltdown": "A = 0 && B = 0",
  "hand": { "cards": { "add": 1, "eq": 1, "ge": 1 }, "budget": 7 },
  "solutions": ["A + B = 6", "A + B >= 1"],
  "knownWrong": [
    { "law": "A >= 1",     "verdict": "live_breach" },
    { "law": "A >= 0",     "verdict": "insufficient" },
    { "law": "A + B = 7",  "verdict": "init_failure" }
  ],
  "argus": {
    "intro": ["REACTOR LOCATED. BEGINNING ANALYSIS."],
    "taunts": { "live_breach": ["CELL A HOLDS {A}. CELL B HOLDS {B}. YOUR LAW HOLDS NOTHING."] },
    "rattled": ["ENERGY CONSERVED. MY PLANS ARE NOT."],
    "hints": { "default": ["Watch the total of both cells while they move.", "…"] }
  }
}
```

`argus`: `intro` lines open the terminal; `taunts` (per failed verdict kind) and `rattled` (on
THE LAW HOLDS) are mixed into the global pools of `game/argusLines.ts`, with the same placeholders
(`{state}`, `{moves}`, `{count}`, `{before}`, `{after}`, `{control}`, `{law}`, and one per gauge);
`hints` are the banner hints, least to most specific, climbed one rung per failed engagement
(`default`, or a per-kind list such as `lab_breach`). Hints must never spell out a Law (tested).

Expressions in level files are infix strings parsed by `parse.ts`
(`+ - * mod = != < <= > >= && || ! ( ) true false`, `*` only with a constant operand).
Safe is `!meltdown`.

Precedence, loosest to tightest: `||` < `&&` < `!` < comparisons (non-chaining) < `+ -` <
`* mod` < unary `-`. Binary operators are left-associative. `e mod k` needs a positive integer
literal `k`. A unary minus on a literal is a negative constant; on anything else it is `-1 * e`.

`hand.cards` keys are card ids (`CARD_IDS` in `level.ts`): `add sub scale2 scale3 mod2 mod3 eq ne
lt le gt ge and or not`. `scaleK` is the `×k` card, `modK` the `MOD k` card. Sensors and constants
have no card (unlimited). Cost (`lawCost` / `MODULE_COST` in `level.ts`, same table as the
rack's `rackCost`): sensor and constant 1, `ADD`/`SUB` 2, `×k` 2, comparators 2, `NOT` 2, `MOD k` 3,
`AND`/`OR` 3; `×k` and `MOD k` include their constant, so `y = 2 * x` costs 6. `size` in `expr.ts`
still counts modules (one per AST node). A mission's budget is the cost of its reference Law.

## Verification pipeline (`verify.ts`)

Let `D(s)` be the domain constraints (`x ≥ 0` for every `nat` variable), `I` the Law, `Safe = ¬meltdown`.
Run in order and return the first failure:

1. **Init.** Evaluate `I(s0)` directly. False → `init_failure`.
2. **Live attack.** BFS from `s0` over enabled controls, depth ≤ 12, at most 5 000 states. First state
   with `¬I` → `live_breach` with the shortest trace. (Cheap, and gives the most dramatic replay.)
3. **Lab simulation.** For each control `t`, ask Z3:
   `D(s) ∧ I(s) ∧ guard_t(s) ∧ s' = update_t(s) ∧ D(s') ∧ ¬I(s')`.
   SAT → `lab_breach` from the model. To keep counterexamples readable, first solve with the extra
   bound `|v| ≤ 10` on every variable, then `≤ 100`, then unbounded.
4. **Safety.** Ask Z3: `D(s) ∧ I(s) ∧ ¬Safe(s)`. SAT → `insufficient` (same small-model trick).
5. Otherwise → `holds`.

Implementation notes: `I(s')` and `D(s')` are built by substituting `update_t` into the
expressions (`substBool`), so every query is a list of `BoolExpr` over one state passed to
`findModel(constraints, vars, bound?)` in `smt.ts`. `before` comes from the model and `after` from
`applyUpdate`; both are re-checked with the evaluator (a disagreement throws). Traces
(`bfsAttack`, `randomRun`, `live_breach.trace`) start with the init state under
`control: TRACE_START` (`""`).

Note that step 2 is only a fast path: soundness comes from steps 3–4, and step 3 also catches every
live breach the BFS bound misses.

### Z3 in the browser

`z3-solver`'s `browser` entry does not bundle Z3: it reads a global `initZ3` that the Emscripten
glue `z3-built.js` defines, and that glue fetches `z3-built.wasm` (35 MB, ~8 MB gzipped) and spawns
its own pthread Web Workers by re-loading `z3-built.js`. How LAWBREAKERS wires it:

- **Assets.** The `lawbreakers:z3-assets` plugin in `vite.config.ts` serves both files from
  `node_modules/z3-solver/build/` at `<base>z3/` in `vite dev` (with the COOP/COEP headers), and emits
  them to `dist/z3/` in `vite build`. Nothing is copied into `public/` or committed.
- **Loading.** `verify.worker.ts` is a module worker (`importScripts` is not available there), so on
  warm-up it fetches `<base>z3/z3-built.js` and runs it with an indirect `eval`, which defines
  `initZ3` globally exactly like a classic script. It also sets `self.global = self` (browser.js reads
  `global.initZ3`).
- **Paths.** Run that way, Emscripten cannot infer its own URL, so `initZ3(overrides)` in `smt.ts`
  passes `locateFile` (→ `<base>z3/z3-built.wasm`) and `mainScriptUrlOrBlob` (→ the script URL the
  nested pthread workers load). `<base>` is `import.meta.env.BASE_URL` resolved against the origin,
  so `base` must be absolute (`/` or `/<repo>/`), which GitHub Pages needs anyway.
- **Isolation.** `SharedArrayBuffer` needs a cross-origin-isolated page *and* workers: COOP/COEP in
  `vite dev`/`vite preview`, `coi-serviceworker` on Pages (see "Deploy"). All Z3 files are same-origin.
- **Protocol.** Requests carry an `id`; the worker answers `{ id, ok: true, result }` or
  `{ id, ok: false, error }`, and `client.ts` settles the matching promise. A worker crash rejects
  every pending request and the next call starts a fresh worker. A failed Z3 init can be retried.
- **Checked** with `scripts/smoke-worker.mjs` (headless Chromium via Playwright) on `vite dev`,
  `vite preview`, and both again with `--base /lawbreakers/`. Locally, Z3 init takes ~0.16 s (the
  35 MB wasm comes from localhost; a real network adds the ~8 MB gzipped download) and Mission 01's
  reference Law verifies in ~0.13 s while the page's animation frames keep advancing.

### Gotchas

- **Modulo semantics.** Z3 `mod` is Euclidean (result in `[0, k)` for `k > 0`). JavaScript `%` is not
  (`-3 % 2 === -1`). The evaluator must use `((a % k) + k) % k`. A test must cover negative operands.
- **Cross-origin isolation.** `z3-solver` needs `SharedArrayBuffer`, so the page must be
  cross-origin isolated. Vite dev server: set COOP/COEP headers in `vite.config.ts`. GitHub Pages:
  cannot set headers, so ship `coi-serviceworker.js`.
- **Z3 init is slow** (~1–3 s, large WASM). Initialize it in the worker during the intro/briefing so
  the first ENGAGE feels instant; show ARGUS "BOOTING" text if not ready yet.
- **Worker.** All Z3 calls go through `verify.worker.ts`; the main thread never blocks. The UI only
  imports `src/worker/client.ts`, never `smt.ts`/`verify.ts` directly (that would pull Z3 into the
  main bundle).
- **Level validation at test time:** `Safe(s0)` holds; every control keeps `nat` variables in domain
  (Z3 check); every `solutions` entry yields `holds`; every `knownWrong` entry yields its verdict;
  every solution is buildable within the hand and budget.

## Dafny export (`dafny.ts`)

`toDafny(level, law)` returns one method per facility (`method TheLastReactor() decreases *`), shown
by `ui/proof/ShowTheProof.tsx` after a win (button on the results screen):

- Header comment mapping game terms to verification terms (Law = loop invariant, meltdown =
  assertion, ARGUS = verifier).
- Variables: `var A: nat := 2;` / `var x: int := 0;`. The `nat` domain is Dafny's `nat` type, so
  every update is checked against it and no extra invariant is needed: **the player's Law is the only
  `invariant`**.
- `while true invariant <Law> decreases *` (the facility runs forever). Body: `assert !(<meltdown>);`
  then an alternative `if` with one `case <guard> =>` per control and a simultaneous assignment
  (`A, B := A - 1, B + 1;`). Dafny requires an alternative `if` to be total, so unless some control is
  unconditional a final `case !(g1 || g2 || …) =>` idles.
- `dafnyExpr` prints Dafny syntax: `==`, `%` (Euclidean on `int` in Dafny, same as the engine's
  `mod`, checked with real Dafny), `&&`/`||` never mixed without parentheses (Dafny rejects
  `a && b || c`), `!(…)` always (Dafny's `!` binds tighter than comparisons and `!!` is an operator),
  negatives parenthesized after an operator (`x - (-3)`). Keywords / leading `_` are renamed by
  `dafnyName`.
- Highlighting: `ui/proof/highlight.ts` is a line tokenizer for exactly this output (no dependency).

**Check:** `npm run dafny-check` (needs Dafny; `DAFNY=` to override, `-- --keep` keeps the `.dfy`
files) exports every level's `solutions` (must verify) and `knownWrong` (must fail verification, not
parsing) and runs `dafny verify --boogie /infer:t`. The flag matters: Boogie's default interval
analysis infers loop invariants of its own (`0 <= x <= 10` in Mission 02), which made `x != 11`,
`x <= 11` (02) and `x >= 0`, `y >= 0` (05) verify. With inference off only the Law carries the proof.
Plain `dafny verify` still verifies every correct Law, which is all the panel ever shows.
`npm run proof-smoke` drives the panel in Chromium (Mission 01 win → proof → copy → Escape).

## Deploy

Live at https://maahumada.github.io/lawbreakers/ once `main` is pushed.

- **Workflow.** `.github/workflows/deploy.yml`, on push to `main` and `workflow_dispatch`: `npm ci →
  lint → typecheck → test → build` (Node from `.nvmrc`, `LAWBREAKERS_BASE=/lawbreakers/`), then
  `configure-pages → upload-pages-artifact (dist) → deploy-pages`. Playwright is a devDependency but
  downloads no browsers on install; the smoke scripts are not part of CI.
- **Base.** `vite.config.ts` reads `LAWBREAKERS_BASE` (default `/`; must start and end with `/`).
  Fonts, CSS, the verify worker, `z3/` and `coi-serviceworker.js` all resolve under it.
  `npm run build:pages` builds with `/lawbreakers/` locally.
- **Isolation on Pages.** Pages cannot send COOP/COEP, so the build-only `lawbreakers:coi-serviceworker`
  plugin emits `coi-serviceworker.js` (npm `coi-serviceworker`, MIT; license shipped next to it) at
  `<base>`, so its scope covers the page, the verify worker, Z3's pthread workers and `z3/*`. It
  re-serves every same-origin response with `COOP: same-origin`, `COEP: require-corp`, `CORP:
  cross-origin`. Two classic scripts in `<head>` run before the app module: `COI_BOOT` (configures
  `window.coi` and sets `<html data-coi>`), then `coi-serviceworker.js` (registers the worker and
  reloads once it is active). First visit: `data-coi="pending"` → `main.tsx` renders the BOOTING
  LAW ENGINE screen → one reload → isolated, controlled page. Later visits are controlled from the
  start (no reload). Loop guards: at most 2 reloads per tab session (`sessionStorage`, cleared once
  isolated); no service worker / insecure context / already controlled → `data-coi="unavailable"`
  and the app mounts (Z3 then reports a verifier fault); `main.tsx` also mounts if no registration
  exists after 3 s or the reload has not happened after 15 s. Under `vite dev`/`preview` the page is
  already isolated and the script does nothing.
- **Local emulation.** `npm run build:pages && npm run pages-preview` serves `dist/` at
  `http://localhost:4174/lawbreakers/` with no COOP/COEP (like Pages). `npm run coi-smoke` checks the
  first visit (one reload, isolated, Z3 verdicts, Mission 01), the second visit and a browser with
  service workers blocked. `smoke`, `rack-smoke` and `engage-smoke` take the same URL as argument.

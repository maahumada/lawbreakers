# Progress

Living status of the project. Read this first to know where things stand.
`ROADMAP.md` holds the task list (checkboxes); this file holds the current state, decisions taken
along the way, and a log of each work session.

## Current state

- **Milestone:** M3 — Content and depth
- **Next task:** M3-T3 ARGUS personality
- **Blockers:** none
- **Deployed URL:** https://maahumada.github.io/lawbreakers/ (live since 2026-10-28, auto-deploys on
  push to `main`; verified in Chromium, Firefox still unchecked)

## Decisions log

Decisions that deviate from or refine the docs. Newest first.

| Date | Decision | Why |
|---|---|---|
| 2026-10-28 | Routing by query string: no query = title, `?missions` = mission select, `?mission=NN` = mission, `?dev` kept. In-app moves use `history.pushState` + a custom event (`ui/router.ts`, `useSyncExternalStore`), Back/Forward via `popstate`; a document click handler turns same-page `<a href="?…">` links (e.g. the results' "Next mission") into in-app navigations. Unknown `?mission=` numbers show mission select | no router dependency, static-hosting friendly, deep links work on Pages |
| 2026-10-28 | Deep links to a locked mission are allowed and flagged OFF-CAMPAIGN in the header; winning it secures it (and unlocks its successor) without touching the missions before it | the jury may open any mission directly; no redirect surprises |
| 2026-10-28 | Progress = list of secured mission ids in `localStorage` `lawbreakers:progress` (`{"secured": [...]}`); mission N+1 is available when N is secured, 01 always. Training flag in `lawbreakers:training`. "Reset progress" (with a confirm step) clears secured missions and best scores, keeps the training setting | small, robust to storage failures (every access in try/catch) |
| 2026-10-28 | START → mission select (M4-T1 intro hooks in `TitleScreen.start`); CONTINUE (only with progress) → first available, unsecured mission | returning players get back in with one click |
| 2026-10-28 | Training mode (DESIGN §6 updated): breach never moves (no MISSION FAILED), attempts still counted, a win secures the mission (unlocks the next) but saves no best score; the results dialog hides score and breakdown via CSS and says why. Read once when the mission opens; toggled on title / mission select only | practice must still let a player progress; scores stay comparable |
| 2026-10-28 | Gauge full scale rounds up to 10, 20, 50, 100, … (`gaugeScale`) and is printed under each bar (`−S 0 S` for ℤ, `0 S` for ℕ) | runaway ℤ gauges (Mission 05) do not rescale every cycle and the bar stays readable |
| 2026-10-28 | Dafny export: `nat` gauges use Dafny's `nat` type; the Law is the only loop `invariant`; meltdown is `assert !(…)` at the loop head; controls are an alternative `if` with an explicit idle case (Dafny requires totality) | the player's Law alone must make the proof work; no hidden domain invariants |
| 2026-10-28 | `npm run dafny-check` runs `dafny verify --boogie /infer:t` | Boogie's default interval inference proved 4 known-wrong Laws (02, 05) on its own |
| 2026-10-28 | Vite `base` comes from `LAWBREAKERS_BASE` (default `/`); the Pages workflow sets `/lawbreakers/` (`npm run build:pages` locally) | dev/preview unchanged; one switch for every asset path |
| 2026-10-28 | Cross-origin isolation on Pages via `coi-serviceworker@0.1.7` (npm devDependency, MIT) emitted to `<base>coi-serviceworker.js` by a build-only Vite plugin, with `coepCredentialless: false` (`require-corp`) | Pages cannot send COOP/COEP; all assets are same-origin so `require-corp` works in Chrome and Firefox |
| 2026-10-28 | First-visit reload guarded by an inline boot script: `<html data-coi="pending">` → BOOTING LAW ENGINE screen; at most 2 reloads per session (`sessionStorage`), mount anyway after 3 s without a registration or 15 s overall | no reload loop when service workers are blocked or isolation fails; the verifier then reports its own fault |
| 2026-10-28 | Score: over budget gives a negative efficiency term (`50 × (budget − cost)`), total clamped at 0; failed attempts = this mission's non-holds engagements; clock starts at mission load / retry; time bonus decays linearly over 5 min (DESIGN §6 updated) | never block an idea, but make padding and overspending cost; no negative scores on the results screen |
| 2026-10-28 | Breach is added when the replay ends (not when the verifier answers); MISSION FAILED at ≥ 100% restarts breach, attempts, clock, rack and machine | the meter moves at the dramatic moment; retry = "from the briefing" |
| 2026-10-28 | Verdict replays go through `missionStore.show` / `replayFire` (engine `step`); a live replay restarts the telemetry log from power-on, a lab replay never touches it | the log only ever contains real runs; hypothetical lab states stay out of it |
| 2026-10-28 | Machine view shows a probe during verdicts: the engaged Law and the meltdown evaluated on the shown state (TRUE/FALSE, YES/NO) | makes every verdict readable without the terminal (phones) |
| 2026-10-28 | Lab simulation = recolouring the gauges/controls panels via `--human-*` overrides to hologram cyan + dashed border + "SIMULATION" watermark; verdict banner is cyan dashed too | same components, unmistakably different world |
| 2026-10-28 | Verdict banner lives in the ENGAGE slot under the rack (with REBUILD / View results); during the attack that slot mirrors ARGUS's latest line | on phones ARGUS's panel is below the fold |
| 2026-10-28 | REBUILD keeps the player's circuit and the session; RETRY (results / mission failed) wipes everything. Best score in `localStorage` key `lawbreakers:best:<levelId>` | editing after a breach is the main loop; retry is a clean slate |
| 2026-10-28 | Over-budget Laws are allowed in the rack; the cost counter turns red (`--meltdown`). Scoring (M2-T5) decides the penalty | never block a player from testing an idea; budget is a score target, not a typing rule |
| 2026-10-28 | Constant dial range `−20…20` (DESIGN §4 updated), starts at 0, set after plugging (−/+ buttons, arrow keys, PgUp/PgDn ±5, Home/End) | keyboard accessible; negatives allowed for `sub`-free Laws |
| 2026-10-28 | Rack layout flows left → right into the SHIELD (columns = depth, leaves one row each); computed in pure `ui/rack/layout.ts`, wires are SVG Béziers from those coordinates (no DOM measuring) | deterministic, testable, no resize observers; horizontal scroll inside the board on phones |
| 2026-10-28 | Two ways to place: click-to-place (pick a hand item, click a lit socket; Esc cancels) and dnd-kit drag (mouse: 6 px threshold; touch: 180 ms press). Incompatible sockets are disabled droppables (hatched red while dragging/selecting) | touch and keyboard users get a first-class path; illegal drops are impossible, not just refused |
| 2026-10-28 | Unplug = the × tab on a module or dragging it back onto the hand; dragging a placed module onto another empty compatible socket moves its subtree | cards return automatically because the hand count is derived from the rack |
| 2026-10-28 | ENGAGE stays `disabled` in M2-T3 but gets `data-ready` (lit) when `law !== null` | M2-T4 only needs to add the click handler |
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

### 2026-10-28 — M3-T1 Campaign, M3-T2 Missions 02–06, M3-T4 Training mode
- Game: `src/game/campaign.ts` (`missionStatus`, `nextMission`, `loadSecured`, Zustand `useCampaign`:
  `secured`, `training`, `secure`, `setTraining`, `resetProgress`); `bestScores.clearBest`;
  `missionStore` gains `training` (set by `load(level, seed, training)`, kept by `restart`;
  `recordVerdict` adds no breach in training). `ui/argus/engage.ts`: a win calls `secure`; in
  training it does not call `saveBest`.
- UI: `ui/router.ts` (routes, `navigate`, `useSearch`, `interceptLinks`); `App.tsx` routes title /
  missions / mission / dev. New `screens/TitleScreen.tsx` (LAWBREAKERS + nixie 2050, START,
  CONTINUE, training toggle, ARGUS panel), `MissionSelectScreen.tsx` (six stations on a power bus
  lit through secured missions; status Ready / Secured + best / Locked + "Secure NN first"; reset
  with confirm), `TrainingToggle.tsx`, `campaign.css`. `MissionScreen` takes `index`/`levels`,
  header gets "Mission select" link, TRAINING and OFF-CAMPAIGN flags, `data-training` (CSS hides
  the results score in training). `BreachMeter` shows "(training: off)" and dims. Gauges: rounded
  shared scale + scale labels (`format.gaugeScale`).
- M3-T2 findings: all five missions play end to end with their reference Law and LEVELS.md
  wrong Laws (02 `x ≠ 11` lab, `x ≤ 11` insufficient; 03 `x = y` live, `y ≠ 7` lab; 04 `n ≥ 1`
  lab, `n = 1` live; 05 `x ≥ 0` lab, `y ≥ 0` insufficient; 06 `A + B = 6`, `A mod 2 = 0`
  insufficient); references cost = budget; no horizontal scroll at 1440 / 390 px. Signed nixies,
  Mission 05's single control and Mission 06's rack/hand already rendered fine; the only
  mission-specific fix was the gauge scale (Mission 02 lab at `x = 12`, Mission 05 runaway
  momentum). No level JSON changes.
- Fix: the mission title's tall line box covered the header row, so the header links were not
  clickable; `.mission__protocol` now sits above it.
- Tests: `tests/campaign.test.ts` (unlock rule, off-campaign win, continue target, store without
  storage, training session, route parsing), `gaugeScale` in `tests/format.test.ts`. 231 tests.
- Browser: `scripts/missions-smoke.mjs` (`npm run missions-smoke`) and `scripts/campaign-smoke.mjs`
  (`npm run campaign-smoke`: fresh profile → title → select (only 01) → win 01 → Next mission
  in-app → Back → 02 unlocked → reload keeps progress → CONTINUE → off-campaign deep link →
  training: failed engage leaves breach at 0, win unlocks 03 with no best saved → reset). Both
  pass on `vite preview`, as do `smoke`, `rack-smoke`, `engage-smoke`, `screenshots` (entry URLs
  now `?mission=01`; `coi-smoke` updated the same way, not re-run). Screenshots:
  `docs/screenshots/m3-t1-{title,title-mobile,missions,missions-mobile}.png`,
  `m3-t2-{02..06}{,-mobile}.png`, `m3-t4-training{,-results}.png`.
- **Follow-ups:** `ResultsOverlay` should render a proper training variant (no tubes/table, a
  line explaining it) instead of the CSS hiding keyed on `.results__score` / `.results__table` /
  `.results__head` in `mission.css` (left untouched here: M3-T6 owned the file). Intro sequence
  (M4-T1) plugs into `TitleScreen.start`. `coi-smoke` not re-run against the Pages emulation.

### 2026-10-28 — M3-T6 Show the Proof
- `src/engine/dafny.ts`: `toDafny(level, law)` (header mapping game ↔ verification terms, `nat`/`int`
  vars, `while true` + `decreases *`, Law as the only `invariant`, `assert !(meltdown)`, alternative
  `if` per control with simultaneous assignment and an idle case), `dafnyExpr`, `dafnyName`.
- `src/ui/proof/ShowTheProof.tsx` + `highlight.ts` + `proof.css`: panel over the results (caption
  "You just wrote this." / "Your Law is the loop invariant. ARGUS was the verifier."), hand-rolled
  highlighting, the Law line marked, copy (Clipboard API, `execCommand` fallback), close / Escape
  (capture listener so the results stay open), focus returns to the button. Code block scrolls
  horizontally on phones. Minimal change in `ResultsOverlay.tsx` (SHOW THE PROOF button) and
  `overlays.css` (`.results__btn--proof`).
- Tests: `tests/dafny.test.ts` (Mission 01 key lines, mod/scale/negatives/and-or precedence, `!`,
  renaming), `tests/proofHighlight.test.ts`. Scripts: `scripts/dafny-check.mjs` (`npm run
  dafny-check`, loads the engine through Vite SSR), `scripts/proof-smoke.mjs` (`npm run proof-smoke`).
- Screenshots: `docs/screenshots/m3-t6-proof.png`, `m3-t6-proof-mobile.png`.
- **Dafny results** (Dafny 4.11.0, `dafny verify --boogie /infer:t`): 7/7 solutions verified,
  20/20 known-wrong Laws rejected. init_failure → "loop invariant could not be proved on entry";
  live/lab breaches → "invariant could not be proved to be maintained by the loop"; insufficient →
  "assertion might not hold". ~21 s for 27 programs.
- **Surprise:** without `/infer:t`, 4 known-wrong Laws verified (02 `x != 11`, `x <= 11`; 05
  `x >= 0`, `y >= 0`) because Boogie's interval analysis infers `0 <= x <= 10` / `x, y >= 0` itself.
  Also: Dafny rejects a non-exhaustive alternative `if` ("alternative cases may not cover all
  possibilities"), hence the idle case.
- Follow-ups: none required. Prettier currently flags `src/ui/App.tsx`, `tests/campaign.test.ts`,
  `tests/format.test.ts` (parallel M3-T1/T2/T4 work in progress, not touched here).

### 2026-10-28 — First live deploy
- Commit `7c74ef0` pushed; workflow run `40672270358` green in 1m42s.
- `node scripts/coi-smoke.mjs https://maahumada.github.io/lawbreakers/` passes against the live site:
  one reload on first visit, `crossOriginIsolated` true, Z3 verdicts in the worker, Mission 01
  `A + B = 6` → holds, app still starts without service workers.
- Follow-up: check Firefox by hand (not available to Playwright here).

### 2026-10-28 — M2-T6 Deploy
- `.github/workflows/deploy.yml`: push to `main` + `workflow_dispatch`; `build` job (checkout@v7,
  setup-node@v7 with `.nvmrc` = 24 and npm cache, `npm ci`, lint, typecheck, test, build with
  `LAWBREAKERS_BASE=/lawbreakers/`, configure-pages@v6, upload-pages-artifact@v5 of `dist`) and
  `deploy` job (deploy-pages@v5, `github-pages` environment). Permissions `contents: read`,
  `pages: write`, `id-token: write`; concurrency group `pages`, no cancel-in-progress.
- `vite.config.ts`: `base` from `LAWBREAKERS_BASE` (validated absolute); `lawbreakers:coi-serviceworker`
  build plugin emits `coi-serviceworker.js` + its LICENSE and injects the `COI_BOOT` config script and
  the worker script into `<head>`. `src/main.tsx` shows `ui/screens/BootScreen.tsx` (+ `boot.css`)
  while `data-coi="pending"`. `package.json`: `coi-serviceworker` devDependency, `engines.node >=24`,
  scripts `build:pages`, `pages-preview`, `coi-smoke`. `.nvmrc`.
- `scripts/pages-preview.mjs`: static server for `dist/` under `/lawbreakers/` with no COOP/COEP.
  `scripts/coi-smoke.mjs`: fresh-context first visit (one reload, isolated, SW controls the page,
  Z3 verdicts, Mission 01 holds), second visit without reload, and a context with service workers
  blocked (app mounts, no loop, not isolated).
- Results on the Pages emulation: `coi-smoke` OK (`crossOriginIsolated` true after exactly one reload,
  holds / live_breach), `smoke` OK (isolated, Z3 init ~0.3 s), `rack-smoke` OK, `engage-smoke` OK
  (53 checks). Against `vite preview` (base `/`): `smoke`, `rack-smoke`, `engage-smoke` OK.
- **Surprises:** `page.route` does not see requests that go through a service worker, so
  `engage-smoke`'s "Z3 cannot load" case failed on Pages; it now uses `context.route`. Locally the
  reload usually wins the race against the app module, so the boot screen is rarely painted.
  With service workers blocked the app waits the 3 s registration check before mounting.
- **Follow-ups:** after the first push, check the live URL plays Mission 01 in a fresh Chrome and
  Firefox (ROADMAP M2-T6 acceptance). Firefox still not smoke-tested locally.

### 2026-10-28 — M2-T4 Engage + verdict, M2-T5 Breach meter + results
- Engine: `src/engine/score.ts` (`BREACH_DELTA`, `addBreach`, `BREACH_MAX`, `timeBonus`,
  `scoreMission` → breakdown or `null` unless `holds`). Tests `tests/score.test.ts`.
- Game: `missionStore` gains `locked`, `display` (`mode`, `firing`, `pulse`), `breach`, `attempts`,
  `failures`, `startedAt` and `lock` / `show` / `replayFire` / `release` / `recordVerdict` /
  `restart`; player actions are ignored while locked. `rackStore` gains `locked` / `setLocked`
  (edits ignored). New `engageStore.ts` (phase `idle → attacking → replaying → verdict | results |
  failed`, terminal lines, engaged Law, verdict, breach delta, result), `argusLines.ts` (pools per
  moment and verdict with `{placeholders}`, `pickLine`/`fillLine`, for M3-T3), `bestScores.ts`.
- UI: `ui/argus/engage.ts` (sequence, cancellable; `engage` / `rebuild` / `retry`),
  `EngageConsole` (ENGAGE → live status → `VerdictBanner`), `Terminal` (typed lines, screen readers
  get whole lines), `BreachMeter` (cells light one by one, `+N%` flash, critical blink ≥ 60%),
  `verdictText.ts` (banner copy, non-breaking formulas), `useCountUp`. Machine: `ReplayStrip`
  (mode title + Law/meltdown probe), firing card flash, `replay.css` (live red alarm + shake, lab
  hologram, meltdown red nixies + lit placard, init red tubes, holds relay clack). Rack: locked
  hand, SHIELD "Under attack" / "Breached" (sparks, red wires) / "Sealed". Screens:
  `ResultsOverlay` (nixie count-up, breakdown table, Law, cost/budget, attempts, breach, best,
  Next mission `?mission=NN` / Retry / Back to console), `MissionFailedOverlay`. Z3 warms up on
  mount. `App` passes `next` and keys the screen by mission. `src/ui/motion.ts` (reduced motion,
  `revealElement`).
- Tests: `tests/engageFlow.test.ts` (line pools, verdict copy, replays through `step`, lock,
  session, rack lock). 204 tests total.
- Browser: `scripts/engage-smoke.mjs` (`npm run engage-smoke`, needs a server) — Mission 01 `A ≥ 1`
  live breach ends at (0, 6), probe FALSE, breach 20%, SHIELD breached, 3 telemetry rows; REBUILD
  keeps the circuit; `A + B = 6` holds → results, best saved, next link; retry resets. Mobile:
  gauges scrolled into view during replay, banner in view after, no overflow. `A ≥ 0` insufficient
  (0, 0) + lit placard; `A + B = 7` init failure; Missions 02 `x ≠ 11` and 05 `x ≥ 0` lab breach
  with SIMULATION; verifier fault (Z3 blocked) → fault line, unlocked, no breach; 5 live breaches →
  MISSION FAILED → retry. Passes on `vite dev` and `vite preview`. Screenshots:
  `docs/screenshots/m2-t4-{attacking,live-desktop,live-mobile,live-mobile-replay,insufficient,init,lab-m02,lab-m05}.png`,
  `m2-t5-{results,results-mobile,mission-failed}.png`. `npm run smoke`, `rack-smoke`,
  `screenshots` still pass.
- **Surprises:** a `scaleY` entrance animation made `scrollIntoView` measure a shrunken banner on
  phones (REBUILD ended below the fold) — switched to a `clip-path` reveal. `−0` from
  `-100 × 0` broke `toEqual`. Custom properties used by the probe had to be resolved on `.machine`
  before the lab/meltdown panels recolour `--human-primary`.
- **Follow-ups:** M3-T5 juice (screen shake on the whole console, audio) can hook into
  `.machine[data-mode]` and `data-shield`. Live-breach hint text is generic ("what stays the
  same…"); per-mission hints belong to M3-T3. Breach is not shown on the phone until the banner
  (meter sits in ARGUS's panel below). The SIMULATION watermark sits behind the nixies; may need
  a per-layout position for 3+ gauges. Results "Next mission" is a plain link (full reload) until
  M3-T1.

### 2026-10-28 — M2-T3 Rack editor
- Model: `src/game/rack.ts` (pure): `Rack = RackNode | null` under the SHIELD, sockets addressed by
  `SlotPath`; `canPlace` (type / occupied / exhausted / unknown sensor), `placeAt`, `removeAt`,
  `moveTo`, `setConstAt` (clamped `−20…20`), `rackToLaw` → `BoolExpr | null`, `rackCost`,
  `cardsUsed` / `cardsLeft`, `rackText` (`pretty` syntax with `?` holes), card shapes/labels.
  `src/game/rackStore.ts` (Zustand): `rack`, `selected`, derived `law` and `cost`, `reset(level)` /
  `clear` / `select` / `place` / `remove` / `move` / `setConst`. `MissionScreen` resets it with the
  mission.
- UI: `src/ui/rack/` `RackEditor` (DndContext, `pointerWithin`, DragOverlay ghost, Esc cancels),
  `Hand` (sensors + dial unlimited, dealt cards with `×n` counts, greyed at 0; also the drop zone to
  unplug), `RackBoard` (empty sockets as buttons/droppables, placed modules with × tab, SVG wires
  with amber current when complete, SHIELD plate lights up), `Dial` (spinbutton), `Readout` (`LAW
  A + B = 6`, `COST 5 / BUDGET 5`, red when over), `Shapes` (round/square plugs and jacks),
  `faces.ts`, `layout.ts` (pure), `useCompact` (phone metrics), `rack.css`. `format.ts` now exports
  `typeset`. ENGAGE gets `data-ready` when the Law is complete. Dependency: `@dnd-kit/core@6.3.1`.
- Tests: `tests/rack.test.ts` (31): every LEVELS.md reference solution built through `placeAt` /
  `setConstAt` gives the same `pretty`, `rackText`, `rackCost = size = budget`, cards within the
  hand; typed rejection at SHIELD/comparator/logic sockets; exhaustion; unplug returns cards;
  persistence; dial clamping; moves; `?` readout incl. parentheses and negatives; layout has no
  overlapping plates for Mission 06 at both metrics; store click-to-place flow.
- Browser: `scripts/rack-smoke.mjs` (`npm run rack-smoke`, needs a server) builds Mission 01 by
  click-to-place on desktop and mobile (desktop also drag & drop: a sensor dropped on the SHIELD is
  rejected, `=` dropped there plugs in), checks readout/cost/exhausted ADD/ENGAGE ready/unplug and no
  page overflow, then builds Mission 06's reference Law. Screenshots: `docs/screenshots/m2-t3-desktop.png`,
  `-desktop-selecting.png`, `-mobile.png`, `-m06-desktop.png`, `-m06-mobile.png`. The M2-T2 script and
  `npm run smoke` still pass.
- **Surprises:** Playwright refuses to click `aria-disabled` buttons (the smoke uses `force` to prove
  a rejected socket ignores clicks).
- **Follow-ups:** M2-T4: add the ENGAGE click (`useRack.getState().law` → `verifyLaw`), lock the
  rack while ARGUS attacks, and decide whether a breach highlights modules. On phones the SHIELD
  of deep Laws sits off-screen to the right (board scrolls); consider auto-scroll or a vertical
  layout after playtesting. Dial has no direct number typing (arrows/±only).

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

# Progress

Living status of the project. Read this first to know where things stand.
`ROADMAP.md` holds the task list (checkboxes); this file holds the current state, decisions taken
along the way, and a log of each work session.

## Current state

- **Milestone:** M4 — Polish, playtest, submit
- **Content:** fifteen missions; 01–06 main campaign, 07–09 bonus chapter *ARGUS Strikes Back*
  (reordered by difficulty: TWIN JACKS, THE AIRLOCK, THE SPLITTER), 10–15 deep chapter *The Deep
  Grid* ending at TWIN THRUSTERS, the true finale (Oct 29)
- **Post-playtest pass (Oct 29):** "fence + moves" copy in the lab/insufficient banners and the
  "?" panel, one-time COMMAND explainer cards (first lab breach, first insufficient), Mission 05
  replaced by THE COUNTERWEIGHT (`05-counterweight`); see `docs/REVIEW.md`
- **Gauge skins (Oct 29):** every mission draws its gauges as a machine (tanks, dial, pistons, pin
  row, crane, deck, selector, token trays, jugs, rotor, scope), each with an exact nixie numeral;
  optional `display` block in the level JSON, nixie stays the default. Owner spoiler review pending
  (`docs/REVIEW.md`)
- **Next task:** M4-T7 Submit (draft in `docs/SUBMISSION.md`). M4-T4 was an agent playtest; a
  human playtest with classmates is still pending (`docs/REVIEW.md`)
- **Blockers:** none
- **Deployed URL:** https://maahumada.github.io/lawbreakers/ (live since 2026-10-28, auto-deploys on
  push to `main`; verified in Chromium, Firefox still unchecked)

## Decisions log

Decisions that deviate from or refine the docs. Newest first.

| Date | Decision | Why |
|---|---|---|
| 2026-10-29 | Gauge skins: optional `display: { panels: [...] }` in the level JSON (zod discriminated union on `skin`, `engine/display.ts`); every variable in exactly one panel; absent → one `nixie` panel per variable rendered by the unchanged `Gauge`. Skins: `tank jug dial piston tokens selector scope deck hoist rotor` | composite pictures span several variables; the verifier never reads it; old levels stay pixel-identical |
| 2026-10-29 | Every skin keeps one `Readout` per variable (small nixie tubes) carrying `data-testid="gauge-<name>"`, `data-value`, `role="img"` and `aria-label="LABEL reads N"` plus out-of-range words (`, over capacity 9`, `, below empty`, `, no such position`, `, off the scope`); the SVG picture is `aria-hidden` | exact numbers stay readable (rule 5), smokes and screen readers keep working unchanged |
| 2026-10-29 | Skins paint only with `--human-*`/`--meltdown` tokens and animate with CSS transitions on `transform` (no JS timers) | `replay.css` lab cyan / meltdown red and the global reduced-motion rule apply with zero mode logic |
| 2026-10-29 | Marks: `alarm` marks must sit exactly where the meltdown flips (tested from the power-on state), other marks and jug capacities must appear in the briefing (tested); scope alarm points must be meltdown states; deck `tipAt` must flip the meltdown | "marks only from public facts" (proposal rule 2) is enforced, not just reviewed |
| 2026-10-29 | Ticks are uniform (one per unit up to a scale of 20) with emphasis every 5; tested that 5 is not a multiple of any `MOD k` a mission deals | rule 3: no grouping by 2 or 3 |
| 2026-10-29 | Scope trail = the last 6 telemetry states, drawn only in free play / live / holds; lab, meltdown and init show the shown state only, and after a replayed lab fire a dashed arrow from `Display.from` (new field: shown state before the last replayed fire) | a long trail would draw the reachable set; invented states never join the real trail |
| 2026-10-29 | Rotor spin is keyed on a fire counter (`log` cycle + replay pulse) and always rests at the same angle | the rotor's angle must never be a function of the state (it would draw a mod-3 invariant) |
| 2026-10-29 | `VerdictAnnouncer` keeps its text while the banner is up (`verdict`, `results`, `failed`), not only in `verdict` | root cause of the flaky a11y smoke and a real bug: on THE LAW HOLDS the results open 450 ms (reduced motion) / 950 ms after the banner and the region was emptied mid-announcement |
| 2026-10-29 | `a11y-smoke` runs axe after every finite animation has finished, and the "mission (verdict)" scan after the results dialog has opened | axe read the results button mid fade-in as low contrast (a false positive); the scan is now deterministic and covers the dialog too |
| 2026-10-29 | Bonus chapter reordered by renumbering ids and files (`07-twin-jacks`, `08-the-airlock`, `09-the-splitter`), not just the display order. `MOVED_MISSIONS` (part of `RENAMED_MISSIONS`) migrates secured ids on load; `migrateBestScores` moves `lawbreakers:best:<old>` to the new id (keeps the higher, removes the old key), unlike the replaced 05 whose score stays behind | the number in the id drives routes, chapter boundaries and the select list; one source of truth beats a separate order table. Same puzzle, so the score follows it |
| 2026-10-29 | Third chapter *The Deep Grid* (10–15), unlocked by 09 (same linear chain). `Chapter.tag` holds the heading tag ("Main campaign" / "Bonus chapter" / "Deep chapter"); "Campaign complete" moved to 15, 09 says "Bonus chapter complete … The Deep Grid is open" | the select screen and results lines stay data-driven |
| 2026-10-29 | Machines with more than four controls render `data-dense`: controls take the full width under gauges + telemetry, cards are smaller (4 per row at 1440 px, 2 per row at 390 px); three gauges get smaller tubes on phones (one row) | Mission 13 has 8 controls, 10/11/12/14 have 3 gauges; no new card types were needed |
| 2026-10-29 | Cost search speed-ups (all sound, same results): card usages interned and terms grouped by usage (one budget check per group pair), comparisons in AND-only hands must be true on every reached sample (OR-only: false on every meltdown sample), `=` comparisons that must hold on reached samples are a hash join on their readings | Mission 14 (SUB/MOD over three gauges, budget 23) did not finish in 10 min; now ~15 s; 01–09 holding lists unchanged |
| 2026-10-29 | Verdict copy frames induction as "the Law is the only fence, the controls are the only moves": LAB says ARGUS may start from any state the Law allows, then uses a real control; INSUFFICIENT says the machine may never reach the state but the Law cannot rule it out ("a proof only knows what the Law says"). Same framing in the "?" panel and Mission 06's first insufficient hint | owner playtest: players asked why an unreachable state like (3,3) counts |
| 2026-10-29 | One-time explainer cards (`game/explainerSeen.ts`, `help/ExplainerCard.tsx`): COMMAND voice, inline under the verdict banner, 0.7 s after it (0 with reduced motion), only in phase `verdict`, also in training; focus moves to "Got it", Esc/Enter dismiss, focus back to Rebuild. Seen flag per kind `lawbreakers:explainer-seen:<kind>`, set when the card appears; not cleared by Reset progress | explain the idea once, at the moment it bites, without covering the replay or trapping focus |
| 2026-10-29 | Mission 05 replaced: THE COUNTERWEIGHT (`05-counterweight`), crane with LOWER/HOIST, hand `=`, `≥ ×2`, AND, budget 11; the obvious `x ≥ 0 ∧ y ≥ 0` is a lab breach, `x = y` insufficient, reference `x = y ∧ y ≥ 0`. `RENAMED_MISSIONS` in `game/campaign.ts` migrates a saved `05-false-defense` to the new id on load; the old best score is not carried over | the old 05's obvious AND was the answer, so it did not teach strengthening beyond 02; saved players keep 06 unlocked |
| 2026-10-28 | Missions 07–09 are a bonus chapter (*ARGUS Strikes Back*) after FINAL BREACH, which stays the main finale. Chapters live in `CHAPTERS` (`game/campaign.ts`); unlocking stays one linear chain (07 needs 06). Mission select shows the chapter heading inside 07's station (one bus); 06's results say "Main campaign complete…" with Next mission → 07; "Campaign complete" moves to 09 | keeps the original arc intact and the select screen one wire; no schema change in the level JSON |
| 2026-10-28 | The rack readout brackets an AND under an OR (`rackText(…, { bracketMixed: true })`); `rackText` without options still equals `pretty` | Mission 09 is the first OR answer; the live formula should read like the typeset ones |
| 2026-10-28 | Cost search prunes soundly before verifying: Laws false on a reached state (BFS, ≤ 48) or true on a sampled meltdown state (≤ 48 from the grid) are dropped, and terms too expensive to nest are only built if they agree with the samples | the 08/09 hands (17/25 budget, AND/OR) made the old enumeration take minutes (and 4 GB); now ~8 s and ~5 s; same holding lists for 01–09 |
| 2026-10-28 | Typeset expressions (`formatExpr`) always bracket an AND inside an OR and vice versa; `pretty` (engine) unchanged | players should not need precedence rules to read `(A = 0 AND B = 0) OR A = 3` |
| 2026-10-28 | Tutorial steps may list `avoid` selectors; the card takes the first placement (below, above, right, left, right screen edge) that covers neither the target nor those | cards no longer hide the gauges/hand their text points at |
| 2026-10-28 | Time bonus clock restarts when the tutorial closes, if nothing has been engaged yet | reading the tutorial is not solving time |
| 2026-10-28 | MISSION FAILED adds a training-mode tip and a Mission select link; the last mission's results show "Campaign complete…" (when all six are secured) and a primary Mission select button | no dead ends; the campaign gets an ending |
| 2026-10-28 | `@axe-core/playwright` devDependency, used only by `npm run a11y-smoke` (serious/critical violations fail it) | cheap automated a11y regression check; not part of `npm test` |
| 2026-10-28 | Tutorial = 6 coach marks by COMMAND (human voice, sentence case, amber) over the live mission screen: facility & meltdown → controls/telemetry → hand & socket shapes → rack/SHIELD → ENGAGE → verdict. Non-blocking (only the card takes clicks; the game stays playable under the spotlight). Auto-starts on Mission 01 if `lawbreakers:tutorial-seen` is unset; finishing or skipping (button or a bare Esc) sets it; the results / mission failed dialogs end it. Replay from the "?" How to play panel on any mission | learn by doing, never trap the player; one flag, one place to replay |
| 2026-10-28 | "?" How to play panel in the top bar of title, mission select and mission screens: the three checks in ARGUS's order with their verdict names, live vs lab breach, controls/keyboard line; "Replay tutorial" only on mission screens. Modal with focus trap, Esc closes, focus returns to "?" | the rules in one screen, reachable anywhere |
| 2026-10-28 | Keyboard rack: placed modules are focusable (Delete/Backspace unplugs); after a placement the new module takes focus, after an unplug the empty socket does, but only if focus was lost (never stolen) | keyboard play without losing your place; no race with a player who already moved on |
| 2026-10-28 | Phone rack: the board scrolls itself after each placement so the new module and the sockets it opened are in view (as far right as that allows), and to the SHIELD once the Law is complete or ARGUS has it | deep Laws no longer hide the work or the SHIELD offscreen; no layout change |
| 2026-10-28 | Screen reader: an always-mounted `role=status` live region announces ARGUS's verdict (title, attack, body); control cards are named by their visible text with the plain-English rule as description; the ARGUS terminal is focusable (scrollable region) | axe serious/critical clean on title, help, mission select and a mission with a verdict |
| 2026-10-28 | Intro plays inside the title route (no `?intro` URL) on the first START only; seen flag `lawbreakers:intro-seen`; "Replay intro" on the title once seen. Esc, Enter, a click anywhere or SKIP leave it (all go to mission select). It calls `warmUp()` on mount | the URL stays shareable; any obvious gesture gets the player out; Z3 boots during ~16 s of reading |
| 2026-10-28 | Audio: one `AudioContext`, created/resumed on the first pointerdown/keydown (capture listener kept installed), master gain 0.32; mute in `lawbreakers:muted` (`"1"` = muted, default sound on). Sounds hook in by store subscriptions only (`audio/bindings.ts`): global (unlock, UI clicks) from `App`, mission sounds (rack, ENGAGE, scan, replay clacks, klaxon, success, typing ticks, hum) while `MissionScreen` is mounted | no game logic calls audio; the hum stops when the mission screen goes away |
| 2026-10-28 | Juice timing hooks on existing phases: breach shake/flash on `replaying → verdict` with a failed verdict (the moment the meter fills); success relays on `data-shield="sealed"`, one column every 140 ms (`--relay-step`, same as `RELAY_STEP_S` in `sfx.ts`), all inside the 950 ms before the results open. Shake/flash use the Web Animations API (no remounts); reduced motion keeps a softer flash and no shake | no change to `engage.ts` timings or the smokes |
| 2026-10-28 | Mission select gets an ARGUS threat board (radar of the six facilities + status + a progress taunt) from 1180 px up; hidden below | uses the empty right half on desktop, phones stay a clean list |
| 2026-10-28 | Module costs (`MODULE_COST` in `engine/level.ts`, used by `lawCost` and the rack's `rackCost`): sensor/constant 1; `ADD`/`SUB`/`×k`/comparators/`NOT` 2; `MOD k`/`AND`/`OR` 3. Budget = cost of the reference Law (01: 7, 02: 4, 03: 6, 04: 7, 05: 11, 06: 17). Efficiency term now `25 × (budget − cost)` (was 50 per module) | structure costs more than readings; with costs roughly doubled, halving the per-point weight keeps the efficiency term on the old scale |
| 2026-10-28 | Cost balance is a test: `tests/costBalance.test.ts` enumerates every Law each hand can build up to the reference cost (dials −2…12) and verifies the survivors of cheap concrete refutation with the real `verify`; `npm run cost-search` prints the wider report | a rebalanced hand or budget cannot silently open a cheaper unintended solution |
| 2026-10-28 | ARGUS lines: global pools in `game/argusLines.ts` + per-mission `argus.taunts` / `argus.rattled` in the level JSON, mixed into the pools; placeholders include one per gauge from the verdict's key state. Extra lines: identical failed Law engaged again (`repeat`), first reach of 50% breach, every failure from 80%, first-try win, win after ≥ 3 failures. All picks take an injectable RNG | data-driven, deterministic tests, missions get a voice without code |
| 2026-10-28 | Banner hints: per-mission ladder `argus.hints` (`default`, optional per-kind lists), one rung per failed engagement; init failures always get the generic power-on hint; lab/insufficient without their own list get the generic kind explanation first. Hints are free (the DESIGN "Hint used +10%" row is for a future on-demand hint) and tested never to contain a reference Law or a "comparator + number" fragment | escalate from nudge to specific without giving the answer |
| 2026-10-28 | Training results are a proper variant of `ResultsOverlay` (reads `missionStore.training`): no tubes, breakdown or breach; a cyan note says no score is recorded. The CSS hiding in `mission.css` is gone | the dialog says what happened instead of hiding parts of it |
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

### 2026-10-29 — Independent review: engine soundness, mission content, recent UI
- **Engine:** re-read `expr`, `parse`, `smt`, `verify`, `simulate`, `dafny`, the worker and
  client. No soundness bug: simultaneous updates go through one-shot substitution, `mod` is
  Euclidean on both sides, `D(s)` and `D(s')` are in every lab query, the 10 → 100 → unbounded
  escalation only moves on `unsat` (the last query is unbounded), every model is re-checked with
  the evaluator, and an `unknown` throws instead of becoming a verdict. Cross-checked with a
  throwaway oracle (not committed): ~9 800 random Laws over all 15 missions, brute-forced over the
  box `|v| ≤ 10`; no HOLDS with a counterexample in the box, no INSUFFICIENT where a lab breach
  exists, init verdicts agree. `dafny-check`: 22 verified, 67 correctly rejected, 0 wrong.
- **Fixed (content):** 07 TWIN JACKS briefing said the interlocks stop a jack "while it is already
  ahead", but `RAISE L` is armed at `L − R ≤ 1` (a jack one notch ahead may climb). Now "once it is
  two notches ahead", which is exactly the guard printed on the control card. 08 THE AIRLOCK said
  "any other combination of door and air is a meltdown", but over-pressure in phase 0 (e.g.
  `(0, 5)`) is not one; now it names the two meltdowns of the placard. JSON and `LEVELS.md` updated
  together; tests: "briefing claims match the rules" in `tests/level.test.ts`.
- **Fixed (display):** `formatExpr` lost the AND/OR brackets under a NOT (`NOT (A = 0 AND B = 0
  OR A = 3)`), against its own "players should not need precedence rules" contract; it recurses
  under NOT now (`ui/machine/format.ts`, test in `tests/format.test.ts`). Affects the engaged Law
  line, the probe, the results and guards.
- **Docs:** `REVIEW.md` note on explainer cards corrected (a REBUILD within 0.7 s cancels the card
  without marking it seen; it does not skip it for good). Open questions (hint ladders, solutions
  in the bundle, Airlock phase 2, first frame after a mission change, prototype keys) are in
  `REVIEW.md` under "Independent review (Oct 29)".
- **Checks:** lint, typecheck, test (485), build, `dafny-check` (22 verified, 67 rejected, 0
  wrong) all pass; smokes engage, missions, campaign, a11y, gauges, juice, proof and rack pass
  against `vite preview` (screenshots went to a scratch folder; `docs/screenshots` is unchanged).

### 2026-10-29 — Gauge skins for all 15 missions (G0–G6) + a11y smoke stabilised
- **a11y root cause:** `VerdictAnnouncer` emptied the live region as soon as the phase left
  `verdict`; on THE LAW HOLDS the results open after 450 ms (reduced motion) / 950 ms, so the
  announcement could be cut off and the smoke read `""`. Now kept during `verdict`/`results`/
  `failed`. The axe `.results__btn--primary` contrast hit was the dialog mid fade-in: `a11y-smoke`
  now awaits all finite animations before axe and scans the mission after the results open.
  3 green runs in a row (before and after the gauge work).
- **Engine:** `engine/display.ts` (zod union per skin, `defaultDisplay`, `displayIssues`), wired
  into `level.ts` (`Level.display`, default nixie). Verifier untouched.
- **UI:** `ui/machine/skins/` — `GaugePanel` (nixie → unchanged `Gauge`), `Readout`, `TankSkin`
  (+ `JugSkin`), `DialSkin`, `PistonSkin`, `TokensSkin` (+ `glyphs.tsx`), `SelectorSkin`,
  `ScopeSkin`, `DeckSkin`, `HoistSkin`, `RotorSkin`, `geometry.ts` (pure), `svg.ts`, `Hatch.tsx`,
  `skins.css`; `MachineView` maps `level.display.panels`; `missionStore` `Display.from`.
- **Levels:** a `display` block in all 15 JSON files (mapping in `LEVELS.md` "Display" lines).
- **Tests:** `tests/display.test.ts` (schema, coverage, arity, alarm marks vs meltdown, briefing
  marks, deck/scope alarms), `tests/skinGeometry.test.ts`, `tests/skins.test.ts` (SSR render of
  every mission at normal / negative / huge values, out-of-range words, spoiler guards: lab hides
  the trail, short trail, rotor independent of the state, no TOTAL/SUM/RATIO text). 482 tests.
- **Smokes:** new `scripts/gauges-smoke.mjs` (`npm run gauges-smoke`; readouts, follow the
  controls, 360/390/1440 px no sideways scroll, reduced motion; `gauges-live-NN(-mobile).png`).
  `missions-smoke` writes `gauges-live-NN-lab/-meltdown.png` and got four extra wrong Laws so every
  skin is seen in both states (03 `y = y`, 07 `L − R ≤ 3 AND R − L ≤ 3`, 08 `a = 4 OR a = 0`,
  15 `x ≤ 8`; verdicts confirmed by the real engine in the run). No selector changes were needed
  in the other smokes (test ids kept).
- **Checks:** lint, typecheck, 482 tests, build; `dafny-check` 22 verified / 67 rejected / 0 wrong;
  engage, missions, campaign, rack, a11y (×3), juice, proof, gauges smokes pass on `vite preview`.
- **Docs:** ARCHITECTURE (`display`, skins, smoke), DESIGN §8, LEVELS (Display lines + checklist
  item 6), GAUGES-PROPOSAL status, ROADMAP, REVIEW; `docs/media/live-breach.png` and
  `lab-simulation.png` refreshed.
- **Surprises:** the mockup's Die Hard row became 13 THE SLUICE TANKS (capacities 9/6 and the
  4-unit float are in the briefing); 14's rotor and 15's scope matched the real JSON. A 3-gauge
  media rule (`.gauges[data-count="3"] .tube`) outranked the small tubes; fixed by specificity.
- **Follow-ups:** owner spoiler review per skin (REVIEW); re-shoot the README hero clip,
  `mission-rack.png`, `mobile-breach.png`.

### 2026-10-29 — Deep chapter *The Deep Grid* (10–15) + bonus chapter reorder
Recorded afterwards: the agent that did this work was interrupted before writing its log entry;
this summary is reconstructed from its decisions, `REVIEW.md`, `LEVELS.md` and the repo state.
- Bonus chapter reordered by difficulty with renumbered ids/files (`07-twin-jacks`,
  `08-the-airlock`, `09-the-splitter`); `MOVED_MISSIONS` migrates secured ids and best scores.
- Six new missions in `src/levels/10-…15-…json`: THE READING ROOM, THE LOSSY EXCHANGE, THE FUEL
  CELL, THE SLUICE TANKS, THE PHASE ROTOR, TWIN THRUSTERS (true finale); chapter *The Deep Grid*
  (`Chapter.tag` "Deep chapter"), unlocked by 09; "Campaign complete" moved to 15.
- Dense machine layout (`data-dense`) for more than four controls; smaller tubes for three gauges
  on phones. Cost search speed-ups (usage grouping, AND-only filter, hash join for `=`).
- Changed from the research specs where the engine/cost search disagreed: 11, 14, 15 (details in
  `LEVELS.md`). Dafny quirk on one spelling of a 14 Law noted in `LEVELS.md` §14.
- Smokes: `missions-smoke` covers 02–15 (screenshots `chapter3-*.png`).
- Checks at the end of that session: 432 tests; `dafny-check` 22 verified / 67 rejected / 0 wrong.
- **Follow-ups:** owner plays 10–15 blind; review items in `docs/REVIEW.md`.

### 2026-10-29 — Post-playtest: "fence + moves", explainer cards, new Mission 05
- Copy: `ui/argus/verdictText.ts` (lab and insufficient bodies; new `explainerCopy`),
  `ui/help/HowToPlay.tsx` + `help.css` (fence paragraph, lab breach and 3rd check reworded),
  `levels/06-final-breach.json` (insufficient hint rung 1).
- Explainer cards: `game/explainerSeen.ts`, `ui/help/ExplainerCard.tsx` (mounted in
  `ui/argus/EngageConsole.tsx` under the banner), styles in `ui/help/help.css`.
- Mission 05: `levels/05-counterweight.json` (old `05-false-defense.json` deleted),
  `engine/level.ts` import, `game/campaign.ts` (`RENAMED_MISSIONS`, `migrateSecured`).
  Engine verdicts: `x ≥ 0 ∧ y ≥ 0` and `x ≥ 0` lab breach from `(0, 1)` HOIST → `(−1, 0)`; `x = y`
  insufficient at `(−10, −10)`; `y ≥ 0` insufficient `(−1, 0)`; `x = 0` live (one LOWER);
  `x = 1` init. Cost search: 4 holding Laws, all at 11.
- Tests: `tests/explainer.test.ts` (seen-once per kind, broken storage, copy), insufficient copy
  test in `engageFlow.test.ts`, migration test in `campaign.test.ts`, `argus/format/level` tests
  moved off the old turbine (the `x +y` effect test now uses an inline control). 334 tests.
- Smokes: `missions-smoke` plays the new 05 (two lab Laws, `x = y`, reference) and checks both
  cards (focus, Esc/Enter, seen once, no sideways scroll, desktop + phone), writes
  `post-playtest-05.png`, `post-playtest-explainer-{lab,insufficient}[-mobile].png`;
  `campaign-smoke` checks the card in training mode and seeds the new 05 id.
- Docs: LEVELS (05 section), DESIGN (fence + moves paragraph), README mission table, ARCHITECTURE
  and REVIEW Dafny-inference note (now `x = y` in 05), PLAYTEST note, ROADMAP Post-playtest, REVIEW.
- Checks: lint, typecheck, tests, build; `dafny-check` 13 verified / 35 rejected / 0 wrong;
  engage, missions, campaign, a11y, rack, juice smokes pass against `vite preview` :4173.
- **Surprises:** plain `dafny verify` (inference on) accepts the insufficient `x = y`; the
  `/infer:t` check rejects it. `x ≥ 0 ∧ x ≥ y` also holds at cost 11 (not listed in the JSON).
- **Follow-ups:** human playtest of the new 05 and the cards. Older screenshots of the turbine
  (`m3-t2-05*.png`, `m2-t4-lab-m05.png`) were regenerated by the smokes and now show the crane.

### 2026-10-28 — Stretch: More missions (07–09, bonus chapter ARGUS Strikes Back)
- New missions: `src/levels/07-the-splitter.json` (weighted conservation, `2·H + F = 6`, budget 9),
  `08-twin-jacks.json` (bounded difference with a swap control, `L − R ≤ 2 ∧ R − L ≤ 2`, budget
  17), `09-the-airlock.json` (disjunctive Law over a phase variable, budget 25). 13 known-wrong
  Laws covering every verdict kind; ARGUS intro/taunts/rattled/hint ladders. Registered in
  `engine/level.ts`; `docs/LEVELS.md` sections with verdict tables. No new card ids needed.
- Campaign: `CHAPTERS`/`chapterIndex`/`chapterStartingAt` in `game/campaign.ts`; chapter heading on
  mission select (`MissionSelectScreen.tsx`, `campaign.css`); `MissionScreen` computes the results
  end line (chapter or campaign complete), `ResultsOverlay` takes `endLine`; ThreatBoard has nine
  blip positions. Rack readout brackets AND under OR (`game/rack.ts`, `rack/Readout.tsx`).
- Cost search: `tests/fixtures/lawSearch.ts` sample pruning (see decisions); new test that pruning
  drops exactly the Laws disagreeing with the samples. `scripts/cost-search.mjs` wording.
- Tests: level/campaign/rack/costBalance updated (318 tests). Smokes: `missions-smoke` plays 07–09
  (two wrong Laws + reference each, desktop + phone) and writes `docs/screenshots/stretch-0N*.png`
  (+ `-reference` with the full Law built); `campaign-smoke` wins 06 from a seeded profile, checks
  the chapter line, Next mission → 07, chapter heading and unlocks (`stretch-06-results.png`,
  `stretch-missions.png`).
- Checks: conformance (all solutions hold, all known-wrong verdicts match), cost search (no
  cheaper holding Law in 07–09; 07 2, 08 16, 09 4 holding Laws, all at the reference cost),
  `npm run dafny-check` 11 verified / 33 rejected / 0 wrong, all smokes against `vite preview`
  (a11y flaked once on the known results-button contrast scan, then passed twice).
- **Surprises:** the first cost-balance run timed out (08: 35 s, 09: ~4 min and OOM-prone), hence
  the pruning. The rack readout did not bracket mixed AND/OR (only the typeset texts did).
- **Follow-ups:** human playtest of 07–09 (difficulty, briefing hints such as "4 units of air"),
  README/media screenshots still show six facilities; see `docs/REVIEW.md`.

### 2026-10-28 — M4-T4 Playtest (agent) + fixes
- Played the production build end to end in Playwright Chromium as a newcomer and as a
  verification student (fresh profile, intro + tutorial, wrong Laws first, then reasoning from the
  verdicts): all six missions, every verdict kind, spam ENGAGE, leave/Back/reload mid-attack, mute,
  training, MISSION FAILED, replay, 320 → 2560 px windows. Notes, issue list and highlights in
  `docs/PLAYTEST.md`. No P0 found.
- Fixes: `MissionFailedOverlay.tsx` (training tip, Mission select link; `overlays.css`),
  `ResultsOverlay.tsx` + `MissionScreen.tsx` (`campaignDone`, end text, Mission select button),
  `help/Tutorial.tsx` + `tutorialSteps.ts` (`avoid` placement), `machine/format.ts` (AND/OR
  brackets; `tests/format.test.ts` updated + 2 cases), `MissionScreen.tsx` (clock restarts when
  the tutorial closes), `machine.css` (control state fixed width), `index.html` (inline favicon).
- Checks: lint, typecheck, 271 tests, build; all 8 smokes pass against preview (`smoke-worker`
  needs `?dev` in its URL; `a11y-smoke` flaked once on a results contrast scan, then passed twice).
- **Follow-ups:** human playtest; design questions (hint ladder repeat, score loophole on leave,
  identical re-engage, phone ARGUS panel, signed PINS) in `docs/REVIEW.md`.

### 2026-10-28 — M4-T6 README + submission draft
- `README.md` rewritten: PLAY link, animated hero (`docs/media/mission-01-run.webp`), pitch, How
  to play (machine, rack/hand, ENGAGE, five verdicts, live vs lab, breach, score, training, Show
  the Proof), screenshot grid, Key design ideas (DESIGN §10 refined with what shipped) +
  considerations, Missions table (name + concept only), Under the hood (pipeline diagram,
  correctness evidence: 271 tests, conformance with 20 known-wrong Laws, cost search, dafny-check),
  Run locally, docs, credits (incl. "built with AI coding agents"), license note (none chosen).
- `docs/SUBMISSION.md`: ready-to-paste board post (Korean summary on top, links, how to play,
  design ideas, differences from InvGame, AI disclosure). Images use raw.githubusercontent URLs.
- `docs/media/`: stable-named copies of the best screenshots plus fresh ones from a Playwright run
  of Mission 01 (`mission-rack`, `live-breach`, `law-holds` cropped to hide the Law,
  `show-the-proof`). Hero clip: Playwright video (1440×1580) → ffmpeg animated WebP (880 px,
  12 fps, 1.25× speed, 4.1 MB); a GIF was 6.5–15 MB, so WebP it is (GitHub renders it).
- **Surprise:** port 4173 was already taken by another agent's `vite preview` (my own server
  failed with `--strictPort`), so the clip was recorded against that server's `dist/`; I stopped
  it by mistake when cleaning up and restarted `vite preview --port 4173` on `dist/`.
- **Follow-ups:** owner to pick a license; check the Korean summary; link `docs/PLAYTEST.md` from
  the README once it exists; re-record the clip if the UI changes visibly after the playtest fixes.

### 2026-10-28 — M4-T3 Tutorial, M4-T5 Mobile / keyboard / screen reader / reduced motion
- Tutorial (`ui/help/Tutorial.tsx`, `tutorialSteps.ts`, `helpStore.ts`, `HelpLayer.tsx`,
  `help.css`; `game/tutorialSeen.ts`): spotlight that follows its target every frame (clamped to
  the viewport), card beside the target on desktop, bottom sheet under 640 px; Next/Back/Skip, Esc
  skips unless a module is picked (then Esc only cancels the pick); step text in an
  `aria-live` region.
- How to play (`ui/help/HowToPlay.tsx`): "?" in the title, mission select and mission headers.
- Rack (`RackBoard.tsx`, `rack.css`): focusable placed modules, Delete/Backspace unplug, focus
  hand-off after place/unplug, phone auto-scroll. `VerdictAnnouncer.tsx` (live region),
  `ControlCard` name/description, terminal `tabIndex`. Dialog heads `header` → `div` (axe
  duplicate-banner). Phones hide the "Air-gapped" flavour so the header stays one row.
- Tests: `tests/help.test.ts` (script length, no answer leaks incl. "ADD"/"sum"/"total", clamp,
  seen flag + store, missing storage). 271 tests.
- Browser: new `scripts/a11y-smoke.mjs` (`npm run a11y-smoke`, `@axe-core/playwright` added):
  keyboard-only win of Mission 01 (normal + `reducedMotion: 'reduce'`, which also asserts no long
  or endless animations are running), no horizontal overflow at 390×844 / 768×1024 / 1440×900 on
  title, title help, intro, mission select, every tutorial step, mission help, idle, all five
  verdicts (lab via Mission 02), results and proof; phone SHIELD/deep-Law visibility; axe scans.
  The overflow check walks elements (body hides `overflow-x`, so `scrollWidth` alone misses
  clipped content). The other smokes preset `lawbreakers:tutorial-seen` with an init script.
  Screenshots `docs/screenshots/m4-t3-{tutorial-{1,3,4,6},help-title,help-mission}-{desktop,mobile}.png`,
  `m4-t5-{rack-shield,rack-deep,lab}-mobile.png`.
- Contrast: axe cannot judge most text here (CRT pseudo-elements / gradients make it
  "incomplete"); a custom pass over small text (computed colour × opacity vs nearest solid
  background) found nothing under 4.5:1 on title, mission select, mission and help.
- **Follow-ups:** the tutorial was only seen by me; a real first-timer (M4-T4) should say whether
  6 steps is right. Tabbing from a picked card to a socket walks the rest of the hand first.

### 2026-10-28 — M3-T5 Juice pass 1, M4-T1 Intro, M4-T2 Audio (+ mission select threat board)
- Juice (`ui/rack/RackBoard.tsx`, `rack.css`): flowing current is brighter, the glow breathes, the
  SHIELD jack pulses; a one-shot surge runs down the wires (deepest first, `pathLength=1` dash) when
  the circuit closes; modules drop in with a "clack" animation; breach: wires short-flicker, sparks
  on the root module as well as the SHIELD; holds: relays close column by column, two bolts lock the
  SHIELD, a light sweep crosses the board. `ui/fx/ImpactFx.tsx`: screen shake + red flash (cyan for
  lab breaches). `BreachMeter`: cells fill dark → white → red in sequence, notches at 50/75 %,
  crossing one pulses the meter. ENGAGE: a charge bar fills once when the Law completes, then an
  armed glow; press-down on click. All respect reduced motion (global rule + explicit `animation:
  none` for loops).
- Intro (`ui/screens/IntroScreen.tsx`, `introScript.ts`, `intro.css`, `game/introSeen.ts`): two
  acts, ARGUS's (red alarm frame, hex grid, glitch) then a power cut to the amber CRT; status
  lines show their value in red; ARGUS interjects twice; ends on "Open mission select".
  `TitleScreen` shows it on the first START, "Replay intro" afterwards.
- Audio (`src/audio/sound.ts`, `sfx.ts`, `bindings.ts`; `ui/fx/SoundToggle.tsx` on title, intro,
  mission select and mission headers): clack, unplug, notch (dial/move), UI click, typing ticks
  (rate limited), charge, scan beeps, klaxon, lab shimmer, success relays + chord, glitch, hum.
- Mission select: `ThreatBoard.tsx` + `campaign.css` (layout grid, radar with a rotating sweep).
- Tests: `tests/sfx.test.ts` (mocked AudioContext: every sound silent before a gesture and plays
  after, no throw on a broken context, tick rate limit, hum follows mute, mute persists and works
  without storage; intro seen flag; intro script; relay count). 265 tests.
- Browser: new `scripts/juice-smoke.mjs` (`npm run juice-smoke`): intro on first START, skip by
  button/Esc/Enter/click, the sound switch does not skip, seen flag, replay, mute persists, current
  flows, breach sparks, holds, phone has no threat board and no horizontal scroll. Screenshots
  `docs/screenshots/m4-t1-{intro-1,intro-2,intro-3,intro-end,intro-mobile,title,missions}.png`,
  `m3-t5-{rack-live,breach,holds}.png`. `campaign-smoke` now goes through the intro (skips it) on
  fresh profiles. `smoke` (`?dev`), `engage-smoke`, `missions-smoke`, `proof-smoke`, `campaign-smoke`
  pass on `vite preview`; `rack-smoke` failed only on its hard-coded "Cost 5 / Budget 5" checks,
  which M3-T7's new costs change (owned by the parallel session).
- **Follow-ups:** no human has heard the mix yet (levels are guesses); the first ARGUS intro line's
  prompt wraps above its text on desktop (reads as a speaker label, left as is); the nixie score
  count-up already existed in the results.

### 2026-10-28 — M3-T3 ARGUS personality, M3-T7 Cost rebalancing (+ training results variant)
- **M3-T7:** `engine/level.ts` gains `MODULE_COST`, `cardCost`, `lawCost`; `game/rack.ts`
  `rackCost` sums `moduleCost` (same table). `engine/score.ts`: `SCORE_PER_COST_POINT = 25`
  replaces `SCORE_PER_SPARE_MODULE = 50`. Budgets 01 7, 02 4, 03 6, 04 7, 05 11, 06 17 (= reference
  cost). `tests/fixtures/lawSearch.ts` (bounded enumerator over a hand + cheap sound refutation:
  init, BFS, a box of states for lab/meltdown; survivors through `verify`), `tests/costBalance.test.ts`,
  `scripts/cost-search.mjs` (`npm run cost-search [-- --slack N --only NN]`). Tests switched from
  `size` to `lawCost` (conformance, level, rack); score tests updated for 25/point.
- **Bounded-search results** (every buildable Law up to reference cost + 4, dials −2…12; the hands
  are small enough that this is the whole buildable space for those dials): 01 1 780 Laws, cheapest
  holding cost 7 = reference, alternatives `A + B ≥ c` for c = 1…6 at the same cost; 02 47 Laws,
  only `x ≤ 10` (4); 03 134 Laws, only `y = 2·x` (6); 04 95 Laws, `n mod 2 = 1` and `n mod 2 ≥ 1`
  (7); 05 2 080 Laws, only `x ≥ 0 ∧ y ≥ 0` (11); 06 159 837 Laws, `A + B = 6 ∧ A mod 2 = 0` and the
  `B mod 2 = 0` twin (17). No mission has a cheaper unintended solution, so no hand changed.
  Runtime: ~1 s per mission (06 ~9 s with slack 4), so the test runs in `npm test` at the
  reference bound.
- **M3-T3:** `game/argusLines.ts` rewritten: bigger global pools, `repeat`, `menaceMid`/`menaceHigh`
  (`MENACE_MID` 50, `MENACE_HIGH` 80), `holdsFirstTry`, `holdsAfterStruggle`; `verdictPools`,
  `pickVerdictLines`, `aftermathLines`, `GENERIC_HINTS`, `hintLadder`, `missionHint`, all with an
  injectable RNG. Level schema: `argus.taunts`, `argus.rattled`, `argus.hints` (required
  `default`); all six missions got a third intro line, taunts quoting counterexample values,
  rattled lines and a 3-rung hint ladder (+ per-kind ladders where a kind needs its own story:
  02/03/04/05 lab, 05/06 insufficient). `ui/argus/verdictText.ts`: `verdictVars` (placeholder
  values incl. one per gauge), `verdictCopy(…, failures)` takes hints from `missionHint`;
  `VerdictBanner` passes `missionStore.failures`. `ui/argus/engage.ts` (outside my area, minimal):
  `present` uses `pickVerdictLines`, a repeat line before an identical failure (`mission|law|kind`
  key, reset on RETRY), aftermath lines after `recordVerdict`.
- **Training results:** `ResultsOverlay` renders its own training variant (`data-training`,
  `results-training` test id); `.results__training` in `overlays.css`; the hiding rules removed from
  `mission.css` (only edit there).
- Docs: DESIGN §4 cost table, §5 ARGUS pools and hints, §6 formula (25 ×); LEVELS.md hand rules,
  budgets and cheapest Laws per mission; ARCHITECTURE level-file `argus` fields and cost.
- Tests: `tests/argus.test.ts` (pools, placeholders resolve for every mission × kind, determinism,
  aftermath thresholds, hint ladder, hints never contain a reference Law), `tests/costBalance.test.ts`.
  265 tests. `engage-smoke`, `campaign-smoke`, `missions-smoke` pass on `vite preview`
  (screenshots written to a scratch dir; only `m3-t4-training-results.png` refreshed in docs).
- **Follow-ups:** card faces in the hand do not show their cost yet (DESIGN §4 says they should;
  `ui/rack/` belonged to the parallel juice task). Aftermath lines are appended untyped right after
  the verdict (no pause); M3-T5 may want to pace them.

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

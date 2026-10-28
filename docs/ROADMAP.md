# Roadmap

Today: 2026-10-28. Hard deadline: 2026-11-30. **Target submission: 2026-11-28** (two days of buffer).

Each task is sized for one coding-agent session: clear scope, files it touches, acceptance criteria.
Do them in order inside a milestone unless marked *(parallel)*. Mark a task done by changing `[ ]` to
`[x]` in the same change that completes it.

---

## M0 — Foundations (Oct 28) ✅

- [x] **M0-T1** Design, levels, architecture, roadmap docs; `CLAUDE.md` agent rules.

## M1 — Engine (Oct 29 → Nov 4) ✅

Goal: the full verification pipeline works headless and is proven correct on all six missions.

- [x] **M1-T1 Scaffold.** Vite + React + TS strict, ESLint + Prettier, Vitest, folder layout from
  `ARCHITECTURE.md`, npm scripts `dev`, `build`, `test`, `lint`, `typecheck`. COOP/COEP headers in
  `vite.config.ts`.
  *Accept:* `npm run lint && npm run typecheck && npm test && npm run build` all pass on an empty app.
- [x] **M1-T2 Expressions.** `expr.ts`: AST types, type-safe constructors, `evalNum`/`evalBool`
  (Euclidean mod), `pretty` (`A + B = 6`), `size` (module count). `parse.ts`: infix parser with clear
  error messages.
  *Accept:* round-trip tests `parse(pretty(e)) ≡ e`; negative-mod test; parser rejects `x * y`.
- [x] **M1-T3 Levels.** `level.ts`: zod schema per `ARCHITECTURE.md`, loader that parses all
  expression strings, static checks (unknown vars, update to undeclared var).
  Write `01`–`06` JSON from `LEVELS.md`.
  *Accept:* all six load; a malformed fixture fails with a readable error.
- [x] **M1-T4 Simulation.** `simulate.ts`: `enabled(level, s)`, `step(level, s, controlId)`,
  `randomRun(level, steps, seed)` (seeded, deterministic), `bfsAttack(level, law, {depth, maxStates})`.
  *Accept:* Mission 01 `A >= 1` returns the 2-step trace; seeded runs are reproducible.
- [x] **M1-T5 SMT.** `smt.ts` translation and a `Solver` wrapper that inits Z3 once and exposes
  `findModel(constraints, vars, bounds?)`.
  *Accept:* tests for each operator, including `mod` on negatives, agree with `evalNum`.
- [x] **M1-T6 Verify.** `verify.ts` pipeline (init → live → lab → safety) with the small-model
  bound escalation.
  *Accept:* returns each `Verdict` kind on hand-built fixtures.
- [x] **M1-T7 Level conformance.** One test file that, for every level, checks `Safe(s0)`,
  domain preservation, all `solutions` → `holds`, all `knownWrong` → expected verdict, solutions fit
  the hand and budget. **Fix `LEVELS.md` if the engine disagrees with it.**
  *Accept:* green on all six missions.
- [x] **M1-T8 Worker.** `verify.worker.ts` + a typed promise API (`verifyLaw(levelId, law)`) for the
  UI; eager Z3 warm-up message.
  *Accept:* a dev page button verifies Mission 01's reference Law without freezing the UI.

## M2 — Vertical slice: Mission 01 playable (Nov 5 → Nov 11)

Goal: a stranger can open the URL, play Mission 01 start to finish and understand what happened.

- [x] **M2-T1 Theme.** `tokens.css` with both palettes from `DESIGN.md §8`, fonts, CRT/scanline and
  glitch utility classes, base layout (human panel left, ARGUS panel right; stacked on mobile).
- [x] **M2-T2 Machine view.** Gauges (nixie-style numbers + bar), control cards showing guard and
  effect, clickable to operate the machine manually; reset button; telemetry log (auto-run toggle).
- [x] **M2-T3 Rack editor.** Hand of module cards, SHIELD root socket, round/square sockets by type,
  drag & drop with dnd-kit, auto-drawn wires (SVG), remove module, live formula readout, cost counter
  against budget, cards consumed from the hand.
  *Accept:* every Mission 01 Law in `LEVELS.md` can be built; ill-typed drops are impossible.
- [ ] **M2-T4 Engage + verdict.** ENGAGE button → worker → ARGUS terminal lines → verdict banner.
  Live breach: replay the trace on the machine view step by step. Lab breach: same, inside a cyan
  "SIMULATION" overlay starting from the hypothetical state. Insufficient: show the meltdown state the
  Law allows. Init failure: highlight power-on state.
- [ ] **M2-T5 Breach meter + results.** Meter with the deltas from `DESIGN.md §6`, mission failure at
  100%, score computation (`score.ts`), results screen.
- [ ] **M2-T6 Deploy.** GitHub Actions workflow to Pages, `coi-serviceworker`, Vite `base`.
  *Accept:* the public URL plays Mission 01 in a fresh Chrome and Firefox.

## M3 — Content and depth (Nov 12 → Nov 19)

- [ ] **M3-T1** Campaign: mission select, unlock progression, progress in `localStorage`.
- [ ] **M3-T2** Missions 02–06 playable; per-mission briefing art / gauge layout as needed.
- [ ] **M3-T3** ARGUS personality: line pools per verdict and per mission, typing effect.
- [ ] **M3-T4** Training mode toggle (no breach, no score).
- [ ] **M3-T5** Juice pass 1: wire current animation, breach screen shake + sparks, success relay
  sequence, nixie score count-up.
- [ ] **M3-T6** Show the Proof: `dafny.ts`, panel with syntax highlighting and copy button.
  *Accept:* the six reference programs verify with real Dafny (run once by hand, paste output in PR).
- [ ] **M3-T7** Cost rebalancing: per-module costs and budgets tuned so the reference Law is the
  optimum or close to it.

## M4 — Polish, playtest, submit (Nov 20 → Nov 28)

- [ ] **M4-T1** Intro sequence (`YEAR 2050. GLOBAL NETWORK COMPROMISED…`), skippable.
- [ ] **M4-T2** Audio: synthesized SFX for plug, hum, scan, klaxon, success; mute toggle.
- [ ] **M4-T3** Tutorial overlay on Mission 01 (first-time hints on telemetry, rack, engage).
- [ ] **M4-T4** Playtest with 3–5 classmates; collect notes in `docs/PLAYTEST.md`; fix top issues.
- [ ] **M4-T5** Mobile/tablet layout check, keyboard accessibility for the rack, reduced-motion mode.
- [ ] **M4-T6** README: pitch, screenshots/GIF, **How to play**, **Key design ideas** (from
  `DESIGN.md §10`), tech overview, how to run locally.
- [ ] **M4-T7** Submit on the Social Contributions board: repo URL, page URL, how to play, design ideas.

## Stretch (only after M4-T6)

- Global leaderboard (Supabase table, nickname + per-mission score).
- Daily challenge (one seeded mission per day).
- Hint system (costs breach).
- Team mode: KAIST vs POSTECH aggregated scores.
- More missions.

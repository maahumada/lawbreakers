# To review with the owner

Things decided autonomously while the owner was away, or that need a human. Newest first.

## Needs a human

- [ ] **Firefox check** of the live site (Playwright here only has Chromium).
- [ ] **Playtest with 3–5 real people** (M4-T4 was done with an agent-driven playtest only).
- [ ] **Independent engine review did not run.** The `code-reviewer` agent failed with
      `model_not_found` (its definition points to `claude-4.6-opus-high-thinking`, request
      `req_011CgUXnYN6DJESRhzKru7nK`). Fix the agent's model or run `/code-review` on `src/engine/`
      together. The engine is still cross-checked by the conformance tests, the bounded cost search
      and `npm run dafny-check` against real Dafny.
- [ ] **Submission post** on the Social Contributions board (M4-T7): draft is in `docs/SUBMISSION.md`;
      posting is the owner's call.

## Decisions worth a second look

- **Tutorial copy and voice (M4-T3).** Six coach marks signed "Command" (amber, sentence case) in
  `src/ui/help/tutorialSteps.ts`. Step 2 says "Look for something that never changes" — the core
  idea of an invariant, not Mission 01's answer (a test bans "sum", "total", "ADD", comparator +
  number). Please read the six lines once for tone.
- **Tutorial does not block the game.** The spotlight only dims; you can play under it and it
  stays until Done/Skip/Esc. Esc while a module is picked only cancels the pick. If a playtester
  ignores it and plays, it just sits there; a modal version would be a small change.
- **"?" also on mission select** (asked for title + mission screens). The panel there has no
  "Replay tutorial" (the tutorial needs a mission screen).
- **Phone header hides the "Air-gapped" lamp** (≤ 520 px) so the sound switch and "?" fit one row.
- **Keyboard path is long on big hands.** After picking a card, Tab walks the rest of the hand
  before reaching the sockets (Mission 06: ~10 stops). Works, verified by the smoke; a "jump to
  first lit socket" shortcut would be nicer.
- **Rack auto-scroll on phones** jumps (no smooth scroll) so it never fights a drag; it only
  moves after a placement, a completed Law or a verdict, never on unplug.
- **axe:** zero violations at any impact on the scanned screens, but its colour-contrast rule is
  "incomplete" almost everywhere (CRT overlays); my own small-text contrast pass found nothing
  below 4.5:1. A human glance at the dimmest text (rack hint, gauge scales) is still worthwhile.
- **Sound mix is unheard.** All SFX are synthesized and only unit-tested with a mocked
  AudioContext; volumes (master 0.32, hum 0.05, klaxon 0.1) are guesses. Please listen once:
  especially the hum while a Law is complete and the klaxon on MISSION FAILED (it plays twice:
  breach, then failed).
- **Intro skip is aggressive.** Per the brief, Enter, Esc or a click anywhere leaves the intro
  entirely (no "fast-forward this line" step). START → intro only on the first visit; "Replay intro"
  sits top-left on the title.
- **Threat board copy** on mission select ("99.98% networked processors under ARGUS", progress
  taunts) is invented flavour; desktop only (≥ 1180 px).
- **Module costs and the score weight (M3-T7).** Sensor/constant 1; ADD/SUB/×k/comparators/NOT 2;
  MOD/AND/OR 3; budgets = reference cost (01 7, 02 4, 03 6, 04 7, 05 11, 06 17). The efficiency
  term dropped from 50 per module to 25 per cost point so a redundant conjunct still costs about
  what it did. The bounded search found no cheaper holding Law anywhere, so no hand was changed;
  the flip side is that the efficiency term is 0 for every optimal win (as before) and can only go
  negative. If you want "spare budget" to be a reward, give budgets some slack.
- **Hints are free and automatic.** The banner hint climbs a per-mission ladder with each failure;
  DESIGN's "Hint used +10% breach" row is kept for a possible on-demand hint and is not wired.
  The third rung is fairly specific (e.g. M01 "Feed both cells into ADD and watch its reading",
  M04 "Feed the count into MOD 2 and watch its reading") — it names the module but never the
  comparator or the constant. Tune in the level JSON (`argus.hints`).
- **ARGUS taunt texts** in the level JSON (`argus.taunts`, `argus.rattled`) are mine; worth a read
  for tone. Placeholders quote the real counterexample (e.g. M02 lab: "NO REAL VALVE REACHES x = 12.
  MINE DOES. ONE CLOSE: x = 11. PIPES BURST.").
- **Formatting touch on parallel files.** During M3-T3 I ran `prettier --write src` once; if the
  juice/audio agent's files were mid-edit and unformatted, they got reformatted (formatting only,
  no content change). `npm run lint` passes.
- **`engage.ts` edited outside my area (M3-T3):** `present` now takes the Law and uses mission
  line pools; a repeat line and the aftermath lines were added. Small, but it is the file the juice
  pass hooks into — check for merge overlap.

- **Dafny export and Dafny's own loop inference.** With plain `dafny verify`, a few wrong Laws
  (M02 `x != 11`, `x <= 11`; M05 `x >= 0`, `y >= 0`) verify anyway, because Dafny infers loop bounds by
  itself. `npm run dafny-check` disables that (`/infer:t`) to show the game's verdicts match Dafny's.
  The in-game panel only shows winning Laws, which verify with plain `dafny verify`. Worth knowing if
  someone pastes a wrong Law into Dafny by hand and asks why it passes.

# To review with the owner

Things decided autonomously while the owner was away, or that need a human. Newest first.

## Needs a human

- [ ] **Firefox check** of the live site (Playwright here only has Chromium).
- [ ] **Playtest with 3–5 real people** (M4-T4 was done with an agent-driven playtest only; notes
      and the issue list are in `docs/PLAYTEST.md`, a template for the human round).
- [ ] **Independent engine review did not run.** The `code-reviewer` agent failed with
      `model_not_found` (its definition points to `claude-4.6-opus-high-thinking`, request
      `req_011CgUXnYN6DJESRhzKru7nK`). Fix the agent's model or run `/code-review` on `src/engine/`
      together. The engine is still cross-checked by the conformance tests, the bounded cost search
      and `npm run dafny-check` against real Dafny.
- [ ] **Submission post** on the Social Contributions board (M4-T7): draft is in `docs/SUBMISSION.md`;
      posting is the owner's call.

## Decisions worth a second look

- **Agent playtest (M4-T4), design questions it raised** (details in `docs/PLAYTEST.md`; none of
  these were changed because they touch rules or mission content):
  - *Hint ladder can repeat itself.* For a lab/insufficient verdict without its own list the
    ladder is `[generic, ...default]`, so on Mission 01 a live breach (rung 1 = default[0]) followed
    by an insufficient Law (rung 2 = default[0] again) shows "Watch the total…" twice. Options:
    index the default list by failures regardless of kind, or show the generic line only once.
  - *Mission 01's first hint is nearly the answer* ("Watch the total of both cells while they
    move."). Fine for a tutorial mission if intended; otherwise swap rungs 1 and 2.
  - *Score loophole:* leaving a mission and coming back resets breach and attempts (the mission
    store reloads), so fail, leave, return, win "first try". Local scores only, so low stakes;
    a fix would keep the session per mission until it is won or failed.
  - *Re-engaging an identical failed Law* charges breach again (ARGUS has a taunt for it). A
    newcomer may do it by accident after REBUILD; greying out ENGAGE (or a confirm) for an
    unchanged failed Law would be kinder.
  - *Phones:* the ARGUS panel (breach meter + terminal) is below the console, so its typing during
    an attack is off screen; the verdict banner carries the information.
  - *Mission 04's PINS gauge is signed* (ℤ, "+" tube) although pins cannot be negative. Presumably
    deliberate (ℤ makes `n ≥ 1` a lab breach from n = 2 either way, but ℕ would change the
    domain the lab explores); worth a line in the briefing or a ℕ check against LEVELS.md.
- **Playtest fixes I chose (M4-T4).** MISSION FAILED now has a "Stuck? Training mode…" line and a
  Mission select link; the Mission 06 results say "Campaign complete…" and offer Mission select;
  tutorial cards avoid the parts their step names (gauges, telemetry, hand), falling back to the
  right edge over ARGUS's panel; mixed AND/OR is always bracketed in typeset expressions
  (`(A = 0 AND B = 0) OR A = 3`), which changes how Laws read in the banner, terminal and
  results too; the time bonus clock restarts when the tutorial closes (only before the first
  engage); the control card's state word has a fixed 6-character width, and the card's side
  padding went from `--space-4` to `--space-3` so "TRANSFER A→B LOCKED" fits on one line; an
  inline SVG favicon (amber shield) in `index.html` ends the `/favicon.ico` 404. Copy is mine.
- **a11y smoke flaked once** after these changes: axe flagged `.results__btn--primary` contrast
  on the Mission 01 results, then two reruns passed. Probably the scan catching the dialog's
  fade-in; worth making that scan wait for the animation if it recurs.

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

- **README / submission (M4-T6).**
  - **No license yet.** README says "all rights reserved by default". Pick one (MIT is the usual
    choice for a course project) and add `LICENSE`; then fix the README's License section.
  - **Korean summary** at the top of `docs/SUBMISSION.md` was written by an agent; please have a
    native speaker read it once.
  - **Mission 01's answer is visible in the media.** The hero clip (asked for: wrong Law → breach
    → correct Law → holds) and `docs/media/show-the-proof.png` show Mission 01's reference Law. No
    text in README/SUBMISSION names any Law, and `law-holds.png` is cropped above "YOUR LAW".
    Mission 01 is the tutorial and DESIGN already publishes it; if you want zero spoilers, replace
    the proof screenshot and cut the clip before the second ENGAGE.
  - **Hero clip is animated WebP, not GIF** (4.1 MB; the GIF was 6.5–15 MB because of the CRT
    scanlines). GitHub renders it; the course board may not — if not, upload the `.webp` there or
    link to the README.
  - **Clip recorded on the playtest agent's in-progress build** (port 4173 was its server). If the
    playtest fixes change the mission screen visibly, re-record (Playwright `recordVideo` +
    `ffmpeg … -c:v libwebp_anim -q:v 70`).
  - **Claims to double-check:** "Tested in Chromium-based browsers" (Firefox still unchecked);
    InvGame credited to Bounov, DeRossi, Menarini, Griswold, Lerner (CHI 2018 paper, from memory);
    "Claude Code" named as the agent tool in Credits and in the post.
  - **README links no PLAYTEST.md yet** (another agent is writing it); add it under Project docs.
  - **Submission images** use `raw.githubusercontent.com/.../main/docs/media/...`, so they only
    resolve after `docs/media/` is pushed to `main`.

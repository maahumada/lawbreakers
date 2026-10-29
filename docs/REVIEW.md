# To review with the owner

Things decided autonomously while the owner was away, or that need a human. Newest first.

## Needs a human

- [ ] **Firefox check** of the live site (Playwright here only has Chromium).
- [ ] **Playtest with 3–5 real people** (M4-T4 was done with an agent-driven playtest only; notes
      and the issue list are in `docs/PLAYTEST.md`, a template for the human round).
- [x] **Independent engine review** ran on Oct 29 (see "Independent review (Oct 29)" below): no
      soundness bug found; two briefing fixes and one display fix applied.
- [ ] **Submission post** on the Social Contributions board (M4-T7): draft is in `docs/SUBMISSION.md`;
      posting is the owner's call.

## Independent review (Oct 29): open questions

Fixed items are in the `PROGRESS.md` session log. These were left alone on purpose (design calls,
or too small to be worth a change without you). Solution Laws of 07–15 are not written here.

- **Hint ladders near-spell the reference Law on the last rung.** 07 (lab rung 3 + insufficient
  rung 2 together give the shape and the constant), 08 (rung 3 names the exact shape), 09 (rung 3),
  like 01/03/04 in the main campaign. They only appear after the third failed engagement, and
  `argus.test.ts` passes (no Law is spelled out), but they are close. Also: the per-kind ladder is
  indexed by the *total* failure count, so a first LAB BREACH after two INIT FAILUREs jumps straight
  to that kind's most specific rung. Decide whether that is intended.
- **Reference Laws ship in the client bundle.** `level.ts` imports the level JSON whole, so
  `solutions`/`knownWrong` are in the main bundle and the worker (readable in devtools). Never used
  for a verdict; stripping them at build time would need a Vite transform. Probably fine for a class
  game.
- **08 THE AIRLOCK, phase 2.** `p` is ℕ, so states with `p ≥ 2` exist in the lab; they are not
  meltdowns and no control is enabled there (the selector shows `?`). A Law can also allow them and
  still hold. Harmless; the briefing (now) names only the two real meltdowns.
- **First frame after a mission change uses the previous mission's stores.** `MissionScreen`
  resets mission/rack/engage in a `useEffect`, so its first commit can still see the old phase
  (e.g. `results`) and mount the old overlay for one commit. Click navigation flushes the effect
  before paint; browser Back (popstate) may flash for a frame. Not seen in the smokes; a
  `useLayoutEffect` (or resetting before navigation) would close it.
- **Plain-object lookup by variable name.** `substNum` reads a control's update map with
  `map[name] ?? e`, so a level variable named `constructor` or `toString` that a control leaves
  unchanged would hit `Object.prototype`. No bundled level has such a name; `loadLevel` could
  reject them (or use `Object.hasOwn`) if you add more missions.

## Decisions worth a second look

- **Gauge skins on all 15 missions (Oct 29).** Implemented from `docs/GAUGES-PROPOSAL.md`; nothing
  of the mockup was dropped. Look at `docs/screenshots/gauges-live-NN.png` (desktop),
  `gauges-live-NN-mobile.png` (390 px), and the lab / meltdown states
  `gauges-live-NN-lab.png` / `gauges-live-NN-meltdown.png`. Per-mission notes are the "Display"
  lines in `LEVELS.md`. Please eyeball these for hints at the invariant (play 10–15 first if you
  still want them blind):
  - *13 THE SLUICE TANKS:* the red FLOAT line at 4 is the placard's own number, but on a 9-unit
    bottle with one-unit ticks it is the only labelled level besides the rims. It cannot reveal
    more than the placard, yet it does draw the eye to "4 vs the rims 9 and 6". Remove the mark if
    it feels like a nudge (delete `marks` from the JSON; the test only checks marks that exist).
  - *15 TWIN THRUSTERS:* the scope draws the three meltdown points as red crosses (public) and a
    6-state trail of real runs. A long auto-run makes the trail wander inside a cone; 6 dots keep it
    from drawing the reachable set, but a careful player can still see "the dot never goes near the
    axes". That is the same information telemetry gives; judge whether it is too visual.
  - *12 THE FUEL CELL / 01 / 06:* tanks share one scale, so "hydrogen stands at twice oxygen" or
    "the two cells always sum to the same height" is visible (as the old shared bars already did).
    No total line, no molecule art.
  - *03 MIRROR PISTONS:* both rods on one ruler: the big rod is visibly twice the small one. The
    briefing already says so.
  - *10 THE READING ROOM:* every tray has 12 slots (never 3 hooks), writers are badges, not three
    tokens; *09 THE SPLITTER:* cores are hexagons, fragments triangles (no "two of one").
  - *14 THE PHASE ROTOR:* the rotor only spins once per fire and always rests upright (tested), so
    it never encodes the counts mod 3.
  - *05 THE COUNTERWEIGHT:* hook depth (cable notches) and the counterweight rack (2 columns of
    blocks) use different units on purpose so "LOAD = COUNTERWEIGHT" is never drawn as equal heights.
  - *Marks:* every red mark is checked by `tests/display.test.ts` to sit exactly where the meltdown
    flips; other marks/capacities must appear in the briefing.
  - *README media:* `docs/media/live-breach.png` and `lab-simulation.png` were replaced with the
    fresh smoke shots (new gauges; wrong Laws only, no answers). Still showing the old nixie gauges:
    the hero clip `mission-01-run.webp`, `mission-rack.png` and `mobile-breach.png`; re-shoot them
    if you want the README to match (the M4-T6 log says how they were made).
- **Flaky a11y smoke fixed (Oct 29).** Root cause in the app: the screen-reader live region was
  emptied when the results dialog opened (450 ms after THE LAW HOLDS with reduced motion), so an
  announcement could be cut off and the smoke sometimes read an empty region. It now keeps the
  verdict text while the banner is up. The axe hit on `.results__btn--primary` was the dialog
  caught mid fade-in; the smoke now waits for animations to finish. 3 green runs in a row.

- **Bonus chapter reorder + deep chapter *The Deep Grid* (10–15).** Written spoiler-free on purpose
  (the owner wants to play 10–15 blind); the Laws, traps and holding lists are in `LEVELS.md`.
  - *Reorder:* 07 TWIN JACKS, 08 THE AIRLOCK, 09 THE SPLITTER. Ids and files were renumbered
    (`07-twin-jacks`, `08-the-airlock`, `09-the-splitter`); `MOVED_MISSIONS` in `game/campaign.ts`
    migrates a saved secured list and moves best scores to the new keys (keeps the higher, deletes
    the old key). Consequence: an old shared link `?mission=07` now opens TWIN JACKS, not THE
    SPLITTER. Intros/briefings of the three were re-sequenced ("first target", "second target",
    "last stand on the surface").
  - *Chapter 3 arc:* tag "Deep chapter" on mission select; 09's results now say "Bonus chapter
    complete … The Deep Grid is open" and "Campaign complete" moved to 15. The chapter heading
    tags are now data (`Chapter.tag`).
  - *Changed from the research specs (engine/cost search disagreed):* 11 (A-crates now resell at
    full price, otherwise a cheaper Law held), 14 (the spec's one-fact Law is INSUFFICIENT; init
    raised; one `≠` card instead of two), 15 (meltdown got a mirror point, otherwise half of the
    intended Law was enough and cheaper). Details per mission in `LEVELS.md`.
  - *13 THE SLUICE TANKS:* each pour is two cards ("A→B ALL" / "A→B TO BRIM", same for B→A); only
    one of each pair is ever armed. Please judge whether that reads naturally. A lab breach there
    can start from a tank level above its capacity (the Law is the only fence, tanks included):
    correct by the rules, possibly surprising.
  - *14 THE PHASE ROTOR, Dafny quirk:* one particular (correct) spelling of a holding Law makes
    Dafny's Z3 time out (> 5 min) while the in-game engine proves it at once and every other
    spelling verifies in ~2 s in Dafny. If a player builds that spelling, "Show the Proof" exports
    a program Dafny cannot finish. The exact spelling is in `LEVELS.md` §14.
  - *Hints* were written to nudge (what to watch, what each control does to a quantity) without
    naming the Law; the `argus.test.ts` checks (no reference Law, no "comparator + number") pass.
    Worth a read once you have played them.
  - *Layout:* machines with more than four controls get a full-width, denser control grid (4 per
    row on desktop, 2 on a 390 px phone); three gauges get smaller tubes on phones so they stay on
    one row. Screenshots `docs/screenshots/chapter3-*.png`.
  - *Cost search* (`tests/fixtures/lawSearch.ts`) got three sound speed-ups (usage grouping,
    AND-only comparison filter, hash join for `=`); same holding lists for 01–09; Mission 14's
    search went from > 10 min (unfinished) to ~15 s.

- **Post-playtest: "fence + moves" copy and explainer cards (Oct 29).** Please read them in the game
  (screenshots `docs/screenshots/post-playtest-explainer-lab.png`, `…-insufficient-mobile.png`).
  - *Insufficient banner:* "The real machine may never reach A = 3, B = 3, but A + B = 6 cannot
    rule it out — and that state is a meltdown. A proof only knows what the Law says."
  - *Lab banner:* "ARGUS may start from any state your Law allows, even one the real machine never
    reaches, then use a real control. At …, LAW holds; one CONTROL gives …, where it fails. Your
    Law does not protect itself." (longer than before, worth a look on a phone.)
  - *Card "Why does ARGUS use a state that never happens?"* — "Your Law is the only fence. ARGUS
    may start anywhere inside it, here at …, even if the machine never gets there." / "From there
    it may only use the real controls: one CONTROL gives …, outside the fence." / "Hold at power-on
    and for one step from anywhere inside, and you cover every run, forever. That is the proof."
  - *Card "Never happening ≠ proven impossible"* — "The machine may never reach …. Your Law LAW
    still allows it." / "A proof never watches the machine run: it only knows what the Law says.
    To the proof, that state is possible, and it is a meltdown." / "Make the Law say why it cannot
    happen."
  - Cards sit inline under the verdict banner (not an overlay), appear 0.7 s after it (at once
    with reduced motion), take focus (Esc/Enter/Got it dismiss, focus returns to Rebuild). Seen
    flags `lawbreakers:explainer-seen:lab_breach|insufficient` are set when the card appears, so
    a REBUILD within those 0.7 s cancels the card without marking it (it shows on the next such
    verdict); "Reset progress" does not clear them (like the tutorial flag).
- **New Mission 05 THE COUNTERWEIGHT (replaces THE FALSE DEFENSE).** Spillway cable crane: LOAD
  `x`, COUNTERWEIGHT `y` (ℤ, init 0); LOWER `x+1, y+1`; HOIST `y ≥ 1 → x−1, y−1`; meltdown `x < 0`.
  Hand `=`, `≥ ×2`, AND, budget 11. `x ≥ 0 ∧ y ≥ 0` is a LAB BREACH (from `(0,1)`, HOIST), `x = y`
  is INSUFFICIENT (`(−10,−10)`), reference `x = y ∧ y ≥ 0`; four holding Laws at cost 11, none
  cheaper. Things to judge: difficulty jump after 04 (it is now clearly harder than before), the
  crane flavour, the briefing naming the interlock ("only reads the counterweight"), and the hint
  ladder (rung 3: "Tie the two gauges together, then add the one fact the interlock relies on").
  - *Id changed* to `05-counterweight`. Saved progress that secured `05-false-defense` is migrated
    on load (05 stays secured, 06 stays open); the old 05 best score is left orphaned in storage on
    purpose (different puzzle). Shared links `?mission=05` keep working (routes use the number).
  - Plain `dafny verify` (with Boogie inference) wrongly accepts `x = y` here; `npm run
    dafny-check` (`/infer:t`) rejects it as before. ARCHITECTURE/REVIEW notes updated.

- **Bonus chapter 07–09 (Stretch "More missions").** Content is mine; please play them once.
  - *Arc:* FINAL BREACH stays the main finale; 07–09 are "ARGUS Strikes Back", unlocked by 06.
    06's results now say "Main campaign complete… bonus chapter … is open" and offer Next mission
    instead of the old "Campaign complete" line, which moved to 09.
  - *08 TWIN JACKS uses a swap control* (`CROSS-FEED: L := R, R := L`, always enabled). It is what
    makes the one-sided Safe `L − R ≤ 2` a lab breach; it is a slightly abstract machine part.
  - *09 THE AIRLOCK has no arithmetic cards* (only `=`, `≥`, AND ×2, OR), which hints at the shape;
    with arithmetic, `a + 4·p = 4`-style linear Laws would compete. Its briefing names the air
    values per phase (4 / 0), so the puzzle is "how to say it" more than "what is true". Budget 25
    is the largest Law in the game; on phones the rack scrolls sideways to reach OR and the SHIELD
    (`docs/screenshots/stretch-09-mobile-reference.png`).
  - *07 THE SPLITTER* accepts both `2·H + F = 6` and `2·H + F ≤ 6` (same cost).
  - *Rack readout* now brackets an AND under an OR, e.g. `(p = 0 AND a = 4) OR (p = 1 AND a = 0)`.
  - *Cost search pruning* (`tests/fixtures/lawSearch.ts`) is new test infrastructure; it reproduces
    the old holding lists for 01–06 and has a test, but it is the reason the balance test is fast.
  - README hero/media (mission select screenshot) still show six facilities; captions were made
    count-neutral rather than re-shooting `docs/media/`.

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
  (M02 `x != 11`, `x <= 11`; M05 `x = y`) verify anyway, because Dafny infers loop bounds by
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

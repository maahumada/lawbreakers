# Playtest notes

## Method

**This was an agent playtest, not a human one.** On 2026-10-28 a coding agent played the production
build (`npm run build`, `npx vite preview --port 4173`) in headless Chromium driven by Playwright,
on a fresh profile, with the intro and the Mission 01 tutorial shown as a new player sees them. It
looked at a screenshot after every step and judged from what was on screen. Before playing it had
read only `CLAUDE.md`, `docs/PROGRESS.md` and the smoke scripts (for the test ids), not
`DESIGN.md`, `LEVELS.md` or the game source. Two personas:

- **Newcomer:** a KAIST undergrad who has never heard of a loop invariant. Tries the "obvious" Law
  first (usually the negated meltdown or a bound on one gauge) and reads ARGUS's answer.
- **Verification student:** knows invariants and inductiveness. Checks whether the verdict names
  (live breach, lab breach, insufficient) match the textbook notions, and reads Show the proof.

The real playtest with 3–5 classmates (ROADMAP M4-T4) is still pending: see `docs/REVIEW.md`.
The smoke scripts already lean on the solution text, so the agent was not a truly blind player for
Mission 01 (`scripts/engage-smoke.mjs` builds `A + B = 6`); treat the Mission 01 times as optimistic.

Viewports: 1440×900 for the campaign, then 2560×1080, 1024×640, 1024×768, 800×1000 and 320×640.

## Per mission

Times are wall-clock from opening the mission to THE LAW HOLDS, as the results screen reports
them. Each ENGAGE takes about 7 s of ARGUS animation.

| Mission | Attempts | Time | Laws tried, in order (verdict) |
|---|---|---|---|
| 01 The Last Reactor | 3 | 4:44 (most of it the tutorial) | `A ≥ 1` (live), `A + B ≥ 0` (insufficient), `A + B ≥ 5` (holds) |
| 02 Coolant Valve | 3 | 0:47 | `x ≠ 11` (lab), `x ≤ 11` (insufficient), `x ≤ 10` (holds) |
| 03 Mirror Pistons | 3 | 1:04 | `y ≠ 7` (lab), `x = 2×y` (live), `y = 2×x` (holds) |
| 04 Parity Lock | 4 | 0:49 | `n ≥ 1` (lab), `n ≥ 0` (insufficient), `n MOD 2 = 0` (init), `n MOD 2 = 1` (holds) |
| 05 The False Defense | 3 | 0:46 | `x ≥ 0` (lab), `y ≥ 0` (insufficient), `x ≥ 0 AND y ≥ 0` (holds) |
| 06 Final Breach | 4 | 0:53 | `A + B = 6` (insufficient), `A MOD 2 = 0` (insufficient), `A + B = 6 OR A MOD 2 = 0` (insufficient), `A + B = 6 AND A MOD 2 = 0` (holds) |

Every one of the five verdict types came up at least once, and each wrong Law got the verdict a
verification student would predict.

### Title, intro, mission select

- The title reads well; "The AI only needs one counterexample. You need a proof." sets the stakes.
- The intro (about 16 s) is fine and easy to skip. Older lines fade to a low contrast that is still
  readable.
- Mission select: the subtitles (`conservation`, `bounds`, `linear relation`, …) are a small
  spoiler for a verification student and mean nothing to a newcomer. Harmless.
- Every page load logged a console error: `/favicon.ico` 404. **Fixed.**

### 01 The Last Reactor

- Tutorial: 6 steps, clear copy. **Steps 1 and 2 placed their card over the gauges, which were
  the thing the text talked about** ("Gauges show its state", "Press a control and watch the
  gauges"). Step 4's card covered half of the hand. **Fixed:** steps can name what the card must
  leave visible, and the card moves over ARGUS's panel instead.
- Pressing TRANSFER A→B until A = 0 locked that control. The locked card's name **re-wrapped to two
  lines** ("TRANSFER / A→B") because "LOCKED" is wider than "ARMED", so the card jumped. **Fixed.**
- `A ≥ 1`: live breach, with a clear replay (the gauge panel turns into "LIVE ATTACK ON THE REAL
  MACHINE", with TRUE/FALSE badges for the Law and the meltdown). This is the best moment of the
  game: you see your rule die.
- The first hint is "Watch the total of both cells while they move.", which is close to handing
  over the answer on the first failure (see REVIEW).
- `A + B ≥ 0`: INSUFFICIENT PROTECTION: "protects itself, but it allows A = 0, B = 0". A newcomer
  may not know what "protects itself" means; the "?" panel explains it.
- The hint **did not climb** on the second failure (same "Watch the total…" line). By design:
  the first insufficient verdict starts from a generic rung. See REVIEW.
- Engaging the same failed Law twice charges breach again (ARGUS: "IDENTICAL CIRCUIT. IDENTICAL
  FATE.").
- Won by accident with `A + B ≥ 5` while aiming for `A + B = 5` to test an init failure. Valid, and
  it shows that more than one Law works.
- **Time bonus counted the tutorial** (4:44 → +10 only). **Fixed:** the clock restarts when the
  tutorial closes, if no Law has been engaged yet.
- Show the proof: the Dafny program with "YOUR LAW" as the loop invariant pays off well for the
  verification student.

### 02 Coolant Valve

- `x ≠ 11` (the natural first Law) got LAB SIMULATION: "at x = 12 it holds, and one CLOSE gives
  x = 11". The cyan lab replay with the made-up state is very clear. A newcomer's first reaction
  will be "but 12 can't happen!". The banner hint answers that right away ("ARGUS starts its lab at
  notches the real valve never reaches. Your Law must hold there too.").
- `x ≤ 11` is insufficient, `x ≤ 10` holds. Smooth.

### 03 Mirror Pistons

- AUTO-RUN shows the 1:2 coupling nicely.
- `y ≠ 7` lab breach at x = 10, y = 5, which is a state that breaks the coupling. The hint "Describe
  how the pistons are coupled instead" points the right way.
- Wiring `×2` onto the wrong sensor (`x = 2×y`) gives a live breach after one PUSH. Good, quick
  feedback.

### 04 Parity Lock

- `n ≥ 1`: lab breach from n = 2 ("a count the real lock never shows. What kind of count is
  that?"). Good hint. The briefing already says "an odd number of pins", so a newcomer gets there
  quickly.
- The PINS gauge is shown as signed (−10…10, "+" tube) although pins cannot be negative. That is
  probably the point of the ℤ domain (it makes `n ≥ 1` a lab breach), but it looks odd.

### 05 The False Defense

*(Since replaced by 05 THE COUNTERWEIGHT after the owner playtest; see `docs/LEVELS.md`.)*

- `x ≥ 0` is the trap, as intended. The lab replay (x = 0, y = −1 → x = −1) is clear, and so is the
  hint "In the lab the drive starts negative".
- `y ≥ 0` alone is insufficient, with the hint "it never mentions the momentum". Then AND. This
  mission teaches strengthening very well.

### 06 Final Breach

- The meltdown was shown as `A = 0 AND B = 0 OR A = 3`: correct with standard precedence, but a
  newcomer cannot tell how it groups. **Fixed:** shown as `(A = 0 AND B = 0) OR A = 3`
  everywhere expressions are typeset.
- Hints build up well: "Your Law stops one meltdown…", then "You need both at once.", then "watch
  the total, and whether bank A is odd or even".
- The OR card is a fair decoy.
- **End of campaign was flat:** the results showed a small "Last mission cleared." and no button
  forward (only Retry / Back to console). **Fixed:** "Campaign complete. Every facility holds.
  ARGUS has nothing left to break." plus a primary **Mission select** button, where the threat
  board answers "…EVERY LAW HOLDS. RECALCULATING."

### Odd things

- **Spamming ENGAGE** (6 clicks): one engagement and one breach charge. OK.
- **Leaving mid-attack** (Mission select link, or browser Back): the attack is cancelled with no
  error and no stray verdict. Forward/back again gives a fresh mission. OK.
- **Reload mid-attack:** fresh mission, no tutorial rerun. OK.
- **Leaving and coming back resets the breach meter and attempts**, so you can fail four times,
  leave, return and win "first try" for a full score (see REVIEW, scoring).
- **Mute:** persists across reload. OK.
- **MISSION FAILED** (5 × `A ≥ 1` on 01): the dialog only offered RETRY, a dead end for a stuck
  newcomer. **Fixed:** adds a "Stuck? Training mode…" line and a **Mission select** link.
- **Training mode:** clear badge "Training: no breach, no score", the breach meter reads
  "(training: off)", the results say no score is recorded. OK.
- **Replaying a won mission:** Retry clears the rack. Back to console leaves a "VIEW RESULTS"
  button. OK. CONTINUE with all six secured goes to mission select. OK.
- **Windows:** no horizontal overflow at 2560×1080, 1024×640, 800×1000 or 320×640. At 2560 wide the
  layout just stretches (the hand stays small and the board gets wide). At 1080 high, ENGAGE is
  below the fold. On phones the ARGUS panel (breach meter and terminal) sits under the console,
  so you do not see ARGUS typing while it attacks (the verdict banner still says it all).

## Issues, prioritized

P0 = bug that breaks play or shows wrong information; P1 = confusing / dead end; P2 = polish.

| # | Pri | Issue | Status |
|---|---|---|---|
| 1 | P1 | MISSION FAILED offers only RETRY: no way out, no pointer to training mode | **Fixed** |
| 2 | P1 | Campaign end: no "you won" moment and no button forward after Mission 06 | **Fixed** |
| 3 | P1 | Tutorial cards 1, 2 and 4 cover the gauges / hand they describe (desktop) | **Fixed** |
| 4 | P1 | Meltdown `A = 0 AND B = 0 OR A = 3` is ambiguous to a newcomer | **Fixed** (brackets) |
| 5 | P1 | Hint ladder can repeat the same line on consecutive failures of different kinds | REVIEW |
| 6 | P1 | First hint on 01 ("Watch the total…") nearly gives the answer | REVIEW |
| 7 | P2 | Time bonus counts time spent reading the tutorial | **Fixed** |
| 8 | P2 | Locked control card re-wraps its name (layout jump) | **Fixed** |
| 9 | P2 | `favicon.ico` 404 on every page load (console error) | **Fixed** (inline SVG icon) |
| 10 | P2 | Leaving and returning to a mission resets breach and attempts (score loophole) | REVIEW |
| 11 | P2 | Re-engaging an identical failed Law costs breach again | REVIEW |
| 12 | P2 | Phones: ARGUS terminal is below the console, out of sight during an attack | REVIEW |
| 13 | P2 | Ultra-wide (2560): the layout stretches, with no max width | open |
| 14 | P2 | PINS gauge (Mission 04) is shown signed although pins cannot be negative | REVIEW |

No P0 bugs found: every verdict was the right one, no page errors apart from the favicon, and no
stuck states.

## Fun highlights

- **The lab replay.** The board turns cyan, "LAB SIMULATION x = 12, then CLOSE", the Law badge
  flips to FALSE. It makes the abstract idea of "not inductive" something you can see.
- **ARGUS quoting your counterexample.** "x = 10, y = 5. ONE PUSH. NOW x = 11, y = 7. YOUR COUPLING
  WAS IMAGINARY." It is the real model, so it feels earned.
- **Mission 05.** `x ≥ 0` dies in the lab, `y ≥ 0` is "admirable, irrelevant", then the AND clicks.
  That is the strengthening lesson, learned by doing.
- **Show the proof.** "YOU JUST WROTE THIS." with your Law as the Dafny `invariant` is a great
  payoff for the verification student.
- The rack wiring (current flowing, SHIELD closing) feels physical, and a full Law is satisfying to
  look at (Mission 06's 17-point circuit).

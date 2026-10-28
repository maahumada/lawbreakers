# To review with the owner

Things decided autonomously while the owner was away, or that need a human. Newest first.

## Needs a human

- [ ] **Firefox check** of the live site (Playwright here only has Chromium).
- [ ] **Playtest with 3–5 real people** (M4-T4 was done with an agent-driven playtest only).
- [ ] **Submission post** on the Social Contributions board (M4-T7): draft is in `docs/SUBMISSION.md`;
      posting is the owner's call.

## Decisions worth a second look

- **Dafny export and Dafny's own loop inference.** With plain `dafny verify`, a few wrong Laws
  (M02 `x != 11`, `x <= 11`; M05 `x >= 0`, `y >= 0`) verify anyway, because Dafny infers loop bounds by
  itself. `npm run dafny-check` disables that (`/infer:t`) to show the game's verdicts match Dafny's.
  The in-game panel only shows winning Laws, which verify with plain `dafny verify`. Worth knowing if
  someone pastes a wrong Law into Dafny by hand and asks why it passes.

# LAWBREAKERS — instructions for coding agents

A browser game where players build loop invariants ("Laws") as physical circuits and a rogue AI
attacks them with counterexamples. Built for KAIST CS424 (Program Reasoning). Deadline 2026-11-30.

## Read first

- `docs/PROGRESS.md` — current state, decisions, session log. **Read it first, update it last.**
- `docs/DESIGN.md` — what the game is (source of truth for gameplay, tone, visuals).
- `docs/ARCHITECTURE.md` — stack, layout, core types, verification pipeline, gotchas.
- `docs/LEVELS.md` — mission content with expected verdicts.
- `docs/ROADMAP.md` — task list. Work on the task you were given; tick its box when done.

## Rules

- **Engine purity:** `src/engine/` is pure TypeScript with no React/DOM imports. UI depends on the
  engine, never the reverse.
- **Correctness over speed in the engine.** Every verdict must come from the real pipeline (Z3), never
  from matching against the `solutions` list. The `solutions`/`knownWrong` fields exist only for tests.
- **Before finishing any task:** `npm run lint && npm run typecheck && npm test` must pass. If you
  touch UI, also `npm run build`.
- **Levels:** if the engine disagrees with `docs/LEVELS.md`, trust the engine, then fix the doc and
  the JSON together and say so in your summary.
- **Scope:** stick to the task's scope. Ideas outside it go to the Stretch section of `ROADMAP.md`.
- **Style:** TypeScript strict, no `any`, small components, CSS variables from `src/styles/tokens.css`
  (no hard-coded colors). Comments only where the *why* is not obvious.
- **Text in the game and in the repo is English.**
- **Tracking:** when you finish a task, tick its box in `ROADMAP.md`, update "Current state" in
  `PROGRESS.md`, add a session-log entry (what, files, surprises, follow-ups), and record any decision
  that refines the docs in the decisions table. If a decision changes the design, update the relevant
  doc too.
- **Git:** do not commit or push. The owner commits by hand. Leave changes in the working tree and
  summarize them.

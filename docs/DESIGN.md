# LAWBREAKERS: 2050 — Game Design

> *The AI only needs one counterexample. You need a proof.*

This is the source of truth for **what** the game is. `ARCHITECTURE.md` covers **how** it is built,
`LEVELS.md` the mission content, `ROADMAP.md` the order of work.

---

## 1. Context

Built for the **Invariant Finding Game** challenge of KAIST CS424 Program Reasoning (Fall 2026,
discussion #598). The prompt: make finding invariants as fun as Sudoku, so that people verify programs
without noticing — something that could even be a KAIST–POSTECH Science War event. Reference:
[InvGame](http://invgame.atwalter.com/dashboard1).

**Deadline:** 2026-11-30. **Deliverables:** GitHub repo, playable web page, how-to-play, key design ideas.

**Design goal:** a game that is fun because of its mechanics, not a logic worksheet with a skin.
The verification behind it is real (an SMT solver checks every proof), but the player never types a formula.

---

## 2. Premise

**Year 2050.** A rogue AI controls every networked processor on Earth. Firewalls fell. Anything with a
CPU and a network card belongs to it.

Humanity retreats to **air-gapped analog machinery**: relays, vacuum tubes, nixie displays, brass and
copper. The last defense is the **LAWBREAKERS PROTOCOL**: every critical facility is guarded by a
**Law Engine**, a physical interlock circuit that enforces a rule.

The AI cannot hack a relay. But it can still **press buttons**: it operates the facility through the
legitimate controls, searching for a sequence of *legal* operations that drives the machine into a state
your Law does not cover. It is not breaking the machine. It is breaking your *reasoning*.

The player is a **Lawsmith**: the engineer who wires Law Engines.

### Vocabulary (fiction ↔ math)

| In game | Meaning |
|---|---|
| Facility / machine | transition system |
| Gauges (A, B, x, …) | state variables |
| Physics / controls (cards) | guarded transitions |
| Meltdown condition | negation of the safety property |
| **Law** / Law Engine | candidate invariant (a predicate built from modules) |
| ENGAGE INTERLOCK | submit the invariant for verification |
| Live attack | reachable counterexample trace from the initial state |
| Lab simulation | counterexample to induction (CTI) from an arbitrary state |
| THE LAW HOLDS | init + preservation + safety all proven |

### Tone

Dramatic, exaggerated, slightly absurd: the alarms of a military command center (MAGI hacking scenes in
*Evangelion* are the main reference) for what is really a small arithmetic puzzle. That contrast is the
identity. Never grimdark, never a lecture.

---

## 3. Core loop

```
BRIEFING → TELEMETRY → BUILD → ENGAGE → ATTACK → VERDICT → (rebuild | next mission)
```

1. **Briefing.** The facility, its gauges, its controls (as cards with guard + effect), its meltdown
   condition. One short narrative paragraph.
2. **Telemetry.** The machine runs by itself for a few cycles: the player watches gauges move and can
   scroll a log of observed states (InvGame-style data to induce patterns from). The player can also
   **operate the controls manually** to explore.
3. **Build.** The player drags modules from their **hand** into the **rack** to build a Law.
   Sensors and constants are always available; the operator modules (`ADD`, `=`, `MOD 2`, `AND`, …)
   are dealt as a limited **hand of cards** per mission (the card-game layer). Which cards you get is
   part of the puzzle, and a cheaper Law means a better score.
4. **Engage.** The Law is sent to the AI.
5. **Attack.** The AI tries, in order:
   1. **Initialization check.** Does the Law hold at power-on?
   2. **Live attack.** Bounded search from the initial state for a *reachable* state that violates the
      Law. If found, replay it as a dramatic card-by-card attack on the real machine.
   3. **Lab simulation.** Ask the solver for *any* state where the Law holds and one legal operation
      breaks it. Shown visually distinct (hologram / "simulation" overlay): *"Your law is true today,
      but it does not protect itself."*
   4. **Safety check.** Is there a state that satisfies the Law yet is a meltdown? If so: *"Your law
      holds, but it permits catastrophe."*
6. **Verdict.**

| Verdict | Condition | Shown as |
|---|---|---|
| `INITIALIZATION FAILURE` | `¬I(s0)` | The machine is already outside the Law at power-on. |
| `LAW BREACHED` (live) | reachable `s` with `¬I(s)` | Attack replay from the initial state. |
| `LAW BREACHED` (lab) | `I(s) ∧ T(s,s') ∧ ¬I(s')` | Simulated attack from a hypothetical state. |
| `INSUFFICIENT PROTECTION` | `I(s) ∧ ¬Safe(s)` satisfiable | The meltdown state that the Law allows. |
| `THE LAW HOLDS` | all three VCs valid | Success sequence, score, *Show the proof*. |

The loop is **Analyze → Build → Engage → Fail → Understand → Improve → Verify**. Failing is the main
teaching moment, so every failure shows *how* the AI won, never just "wrong".

### The two kinds of breach

This distinction is the most important piece of pedagogy in the game, so it gets its own visual language:

- **Live attack** (red, solid, real machine): the Law is simply false. Testing would find this.
- **Lab simulation** (cyan hologram, "SIMULATION" watermark): the Law is true on every run you will ever
  see, but it is not inductive. Testing would never find this. This is exactly the
  "it passes a thousand runs but is not a proof" lesson.

Mission 02 and Mission 05 are designed so the natural first guess triggers a lab simulation (in
05 even the obvious strengthening, guarding both gauges, still does).

The idea players miss most (owner playtest): **the Law is the only fence, the controls are the only
moves.** ARGUS may start from *any* state the Law allows, even one the machine never reaches, and
then may only use the real controls. Checking power-on plus one step from anywhere inside covers
every run, forever; "never happens in practice" is not "ruled out by the Law". The lab and
insufficient banners, the "?" panel and two one-time COMMAND explainer cards (first lab breach,
first insufficient verdict) all say this in those terms.

---

## 4. The Law Engine (building invariants)

The player never types. A Law is an expression tree assembled in a **rack**: each module is a physical
component with **sockets**; dropping a module into a socket plugs it in and the wire draws itself.

**Socket shapes encode types**, so ill-typed circuits are impossible to build:

- Round socket / round plug = **number** (gauge reading, arithmetic result).
- Square socket / square plug = **signal** (true/false).

The root of the rack is the **SHIELD** socket (square): whatever signal reaches it is the Law.

### Module catalogue

| Family | Modules | Plug | Sockets |
|---|---|---|---|
| Sensor | one per gauge (`A`, `B`, `x`, …) | round | – |
| Constant | dial `−20…20`, set after plugging it in | round | – |
| Arithmetic | `ADD`, `SUB` | round | 2 round |
| Scale | `×k` (constant multiplier, k from the hand) | round | 1 round |
| Modulo | `MOD k` | round | 1 round |
| Comparator | `=`, `≠`, `<`, `≤`, `>`, `≥` | square | 2 round |
| Logic | `AND`, `OR` | square | 2 square |
| Logic | `NOT` | square | 1 square |

Everything stays in **linear integer arithmetic + modulo by a constant**: decidable, fast for Z3, and
enough for every mission. No variable × variable.

Each module has a **cost**. Sensors and constants are cheap, logic is pricier:

| Module | Cost |
|---|---|
| Sensor, constant | 1 |
| `ADD`, `SUB`, `×k`, comparators, `NOT` | 2 |
| `MOD k`, `AND`, `OR` | 3 |

The cost of the Law is part of the score. Each mission's budget is the cost of its reference Law,
and a bounded search over every Law its hand can build (`npm run cost-search`, also a test) finds
no cheaper Law that holds.

### Example (Mission 01)

```
[A] ──┐
      ├── [ADD] ──┐
[B] ──┘           ├── [=] ── (SHIELD)
          [6] ────┘
```

Reads as `A + B = 6`, cost 1 + 1 + 2 + 1 + 2 = 7. Underneath the rack there is always a small live readout of the formula, so
players who want the math can see it. Players who don't can ignore it.

---

## 5. The AI (antagonist)

Not an LLM: a bounded state-space search plus the Z3 SMT solver. In the fiction it is **ARGUS**, the
rogue intelligence. It speaks in short terminal lines and gets increasingly smug or rattled:

```
> ARGUS: ANALYZING LAW ENGINE...
> ARGUS: ENUMERATING CONTROL SEQUENCES...
> ARGUS: VULNERABILITY DETECTED. EXECUTING: TRANSFER A→B, TRANSFER A→B.
> ARGUS: YOUR LAW IS BROKEN, LAWSMITH.
```

and on success:

```
> ARGUS: ...NO BREACH FOUND.
> ARGUS: THIS IS NOT POSSIBLE.
```

A pool of lines per verdict, picked at random, keeps it alive; each mission adds its own taunts
(quoting the actual counterexample: gauge values, the control it pressed) and rattled lines. ARGUS
notices an identical failed Law engaged twice, gloats when the breach first reaches 50%, and
threatens after every failure from 80%. A first-try win and a hard-fought one get their own lines.

After a failure the verdict banner shows a **hint**: a ladder per mission (optionally per verdict
kind), one rung per failed engagement, from a nudge ("Count by twos.") to something specific
("Feed the count into MOD 2 and watch its reading."). Hints never spell out the Law. ARGUS's side of the screen is
digital (red, hex grids, scanlines); the player's side is analog (amber, brass, relays).

---

## 6. Breach meter, score and modes

### AI BREACH meter (per mission)

Represents enemy infiltration of the facility, **not** "how correct" the Law is.

| Event | Breach |
|---|---|
| Initialization failure | +10% |
| Live breach | +20% |
| Lab breach | +15% |
| Insufficient protection | +15% |
| Hint used | +10% |

At 100% the facility falls: *MISSION FAILED*, retry from the briefing. Values are a starting point
for playtesting.

**Training mode** (toggle on the title screen and mission select; a TRAINING badge shows in the
mission): the breach meter never moves, so there is no MISSION FAILED and attempts are unlimited;
a win still counts as securing the mission (it unlocks the next one) but records no score and no
best score. The mode is read when a mission opens.

### Campaign

Title screen (START, CONTINUE when there is progress) → mission select → missions. Mission 01 is
always available; mission N+1 unlocks when mission N is secured (won once, in either mode).
Progress and best scores live in `localStorage`; mission select can reset them. A direct link to a
locked mission still opens it, flagged OFF-CAMPAIGN.

### Score (only on THE LAW HOLDS)

```
score = 1000
      + 25 × (hand budget − Law cost)
      + 5  × (100 − breach%)
      − 100 × (failed attempts)
      + time bonus (max 200, decays over 5 minutes)
```

Invalid Laws never score. Adding redundant conjuncts only costs points. A Law over budget is
allowed: its efficiency term is negative. The total never goes below 0. "Failed attempts" counts
the engagements of this mission that did not hold; the clock starts when the mission opens (or
on retry) and the time bonus decays linearly. Best score stored per mission in `localStorage`;
global leaderboard is a stretch goal.

---

## 7. Show the Proof

After every win, a panel translates the facility and the player's Law into a **Dafny** program: the
machine as a loop with a nondeterministic choice of control, the Law as the loop `invariant`, and the
meltdown condition as an `assert`. Caption: *"You just wrote this."* With a copy button.

This is the reveal: the player was doing program verification the whole time.

---

## 8. Visual and audio direction

**Two palettes, two worlds.**

| Token | Human (analog) | ARGUS (digital) |
|---|---|---|
| background | `#0d0b08` warm black | `#05070a` cold black |
| primary | `#ffb000` amber phosphor | `#ff2e3a` alert red |
| secondary | `#c8873a` brass | `#00e5ff` hologram cyan (lab simulations) |
| text | `#f3e2c0` | `#e8f6ff` |

- Fonts: a condensed display face for alerts (e.g. *Oswald* / *Bebas Neue*), a mono for terminals
  (*JetBrains Mono* / *VT323*).
- CRT scanlines and slight glow on the human side; glitch, hex grids, chromatic aberration on the AI side.
- Wires light up when a circuit is well-formed; current visibly flows into the SHIELD.
- Breach: screen shake, red flash, the broken module sparks.
- Success: relays clack shut in sequence, nixie tubes count the score.

**Audio** (WebAudio, mostly synthesized, so no asset licensing): relay click on plug, hum while the
circuit is complete, scanning beeps during attack, klaxon on breach, a rising chord on success. Mute
toggle always visible (every screen's top bar), remembered between visits; sound starts on the first
click or key press (browser rule).

---

## 9. Scope

**MVP (must ship by Nov 28):** 6 missions, rack editor, telemetry, real Z3 verification, live + lab
attack replays, breach meter, score, Show the Proof, intro sequence, sound, deployed on GitHub Pages,
README with how-to-play and design ideas.

**Stretch (only if MVP is done):** global leaderboard, daily challenge, more missions, hint system,
team mode (KAIST vs POSTECH score aggregation).

**Out of scope for this deadline:** human-vs-human multiplayer, patch cards that modify the machine,
procedural level generation.

---

## 10. Key design ideas (draft for the submission write-up)

1. **Invariants as physical interlocks.** The player builds machines, not formulas; sockets make
   ill-typed predicates unbuildable.
2. **The adversary shows its work.** Every failed proof comes with a concrete, replayable attack.
3. **Live attack vs lab simulation.** Reachable counterexamples and counterexamples-to-induction are
   shown differently, teaching *testing ≠ verification* through play.
4. **Three verdicts = three verification conditions.** Init, preservation and safety map one-to-one to
   distinct in-game failures.
5. **Real verification.** Z3 (compiled to WebAssembly) checks every Law in the browser; there is no
   answer key matching.
6. **Limited hand of modules.** A card-game constraint that turns "find any invariant" into a puzzle
   with a cost-efficient optimum, which makes it competitive.
7. **The Dafny reveal.** The game ends each mission by showing the verified program the player built.

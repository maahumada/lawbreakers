# Missions

Each mission is a JSON file in `src/levels/` validated against the schema in `ARCHITECTURE.md`.
Every mission ships with **reference solutions** and **known-wrong Laws with their expected verdict**;
the engine test suite runs all of them, so a level cannot regress silently.

Notation: `x ∈ ℕ` means the variable has domain `nat` (the solver assumes `x ≥ 0` in every state),
`x ∈ ℤ` means domain `int`. Transitions are `guard → simultaneous updates`.

**Hand rules:** sensors (one per gauge) and constants are always available in unlimited supply;
`Cards` lists the operator modules the mission deals, with multiplicity. Module costs (M3-T7,
`MODULE_COST` in `src/engine/level.ts`): sensor and constant 1; `ADD`, `SUB`, `×k`, comparators and
`NOT` 2; `MOD k`, `AND`, `OR` 3. Budget = the cost of the reference Law. A bounded search over every
Law each hand can build (dial values −2…12; `tests/costBalance.test.ts`, `npm run cost-search`)
finds no holding Law cheaper than the reference in any mission; the cheapest holding Laws are listed
per mission below.

Every verdict below is confirmed by the real engine (`tests/conformance.test.ts`, M1-T7): each
table row is a `solutions` or `knownWrong` entry in the mission's JSON. The states in the *Why*
column are examples; the engine may pick a different (equally valid) counterexample. When adding a
row here, add it to the JSON too.

---

## 01 — THE LAST REACTOR

*Concept: conservation (a constant sum).*

> The last fusion reactor stores energy in two cells. Energy can be moved between them, never created
> or destroyed. If both cells empty, the reactor dies — and with it, the city.

- State: `A ∈ ℕ`, `B ∈ ℕ`. Init: `A = 2, B = 4`.
- Controls:
  - `TRANSFER A→B`: `A ≥ 1 → A := A − 1, B := B + 1`
  - `TRANSFER B→A`: `B ≥ 1 → B := B − 1, A := A + 1`
- Meltdown: `A = 0 ∧ B = 0` (Safe: `¬(A = 0 ∧ B = 0)`).
- Cards: `ADD`, `=`, `≥`. Budget: 7. Cheapest holding Laws (cost 7): `A + B = 6` and `A + B ≥ c` for every `c` in 1…6.

| Law | Verdict | Why |
|---|---|---|
| `A + B = 6` | **HOLDS** | reference |
| `A ≥ 1` | LIVE BREACH | `A→B, A→B` reaches `(0, 6)` |
| `A ≥ 0` | INSUFFICIENT | allows `(0, 0)` |
| `A = 2` | LIVE BREACH | one transfer |
| `A + B = 7` | INIT FAILURE | `2 + 4 ≠ 7` |
| `A + B ≥ 1` | **HOLDS** | also valid (alternative solution, same cost: 7) |

---

## 02 — COOLANT VALVE

*Concept: bounds, and the first lab simulation.*

> A coolant valve has eleven notches, 0 to 10. The control electronics refuse to open it past 10. At
> notch 11 the pipes burst.

- State: `x ∈ ℤ`. Init: `x = 0`.
- Controls:
  - `OPEN`: `x < 10 → x := x + 1`
  - `CLOSE`: `x > 0 → x := x − 1`
- Meltdown: `x = 11`.
- Cards: `≤`, `≠`. Budget: 4. Cheapest holding Law (cost 4): `x ≤ 10`, the only one.

| Law | Verdict | Why |
|---|---|---|
| `x ≤ 10` | **HOLDS** | reference |
| `x ≠ 11` | LAB BREACH | from `x = 12`, `CLOSE` gives `11`. True on every real run, not inductive. |
| `x ≤ 11` | INSUFFICIENT | inductive (the guard stops `OPEN` at 10), but allows `x = 11` |
| `x = 0` | LIVE BREACH | one `OPEN` |

Teaching beat: the obvious answer "just say it's never 11" gets a lab simulation from an unreachable
state. The player learns a Law must protect itself.

---

## 03 — MIRROR PISTONS

*Concept: a linear relation between variables.*

> Two pistons are mechanically coupled: the big one always moves twice as far as the small one. If the
> big piston ever reaches position 7, it hits the fuel line.

- State: `x ∈ ℤ`, `y ∈ ℤ`. Init: `x = 0, y = 0`.
- Controls:
  - `PUSH`: `true → x := x + 1, y := y + 2`
  - `PULL`: `x > 0 → x := x − 1, y := y − 2`
- Meltdown: `y = 7`.
- Cards: `×2`, `=`, `≠`. Budget: 6. Cheapest holding Law (cost 6): `y = 2·x`, the only one.

| Law | Verdict | Why |
|---|---|---|
| `y = 2·x` | **HOLDS** | reference (`y` even, so never 7) |
| `y ≠ 7` | LAB BREACH | from `y = 5`, `PUSH` gives 7 |
| `y ≥ 0` | LAB BREACH | from `(1, 0)`, `PULL` gives `(0, −2)`: the lab runs before the safety check, and `y ≥ 0` alone is not inductive |
| `y ≥ 2·x` | INSUFFICIENT | inductive (both controls keep `y − 2·x` fixed), but allows `(−10, 7)`. Not buildable with this hand (no `≥`); test-only row |
| `x = y` | LIVE BREACH | one `PUSH` gives `(1, 2)` |

---

## 04 — PARITY LOCK

*Concept: modular invariants.*

> The vault lock holds an odd number of pins. Pins are always inserted or removed in pairs. If the
> count ever hits zero, the vault opens.

- State: `n ∈ ℤ`. Init: `n = 1`.
- Controls:
  - `INSERT PAIR`: `true → n := n + 2`
  - `REMOVE PAIR`: `n ≥ 2 → n := n − 2`
- Meltdown: `n = 0`.
- Cards: `MOD 2`, `=`, `≥`. Budget: 7. Cheapest holding Laws (cost 7): `n mod 2 = 1`, `n mod 2 ≥ 1`.

| Law | Verdict | Why |
|---|---|---|
| `n mod 2 = 1` | **HOLDS** | reference |
| `n ≥ 1` | LAB BREACH | from `n = 2`, `REMOVE PAIR` gives 0 (unreachable, since `n` is always odd) |
| `n ≠ 0` | LAB BREACH | from `n = 2`, `REMOVE PAIR` gives 0 (the engine may also pick `n = −2`, `INSERT PAIR`) |
| `n = 1` | LIVE BREACH | one `INSERT PAIR` |

---

## 05 — THE FALSE DEFENSE

*Concept: strengthening. The safety property itself is not inductive; it needs a helper Law.*

> A turbine accumulates momentum. Every cycle, the momentum `x` grows by the drive `y`, and the drive
> itself grows by one. If momentum ever goes negative, the turbine reverses and tears itself apart.

- State: `x ∈ ℤ`, `y ∈ ℤ`. Init: `x = 0, y = 0`.
- Controls:
  - `CYCLE`: `true → x := x + y, y := y + 1`
- Meltdown: `x < 0`.
- Cards: `≥ ×2`, `AND`. Budget: 11. Cheapest holding Law (cost 11): `x ≥ 0 ∧ y ≥ 0`, the only one.

| Law | Verdict | Why |
|---|---|---|
| `x ≥ 0 ∧ y ≥ 0` | **HOLDS** | reference |
| `x ≥ 0` | LAB BREACH | from `(0, −1)`, `CYCLE` gives `(−1, 0)` |
| `y ≥ 0` | INSUFFICIENT | allows `x = −1` |
| `x = 0` | LIVE BREACH | after two cycles `x = 1` |

Narrative beat: ARGUS taunts — *"Your law is TRUE, Lawsmith. It is also USELESS."* The title refers to
the defense that looks right because it is literally the safety condition.

---

## 06 — FINAL BREACH

*Concept: compound Laws; two independent facts, each necessary.*

> The Core: two capacitor banks exchange charge in pairs of units. Two meltdowns are possible: both
> banks empty (core shutdown) or bank A at exactly 3 (resonance cascade).

- State: `A ∈ ℕ`, `B ∈ ℕ`. Init: `A = 2, B = 4`.
- Controls:
  - `PULSE A→B`: `A ≥ 2 → A := A − 2, B := B + 2`
  - `PULSE B→A`: `B ≥ 2 → B := B − 2, A := A + 2`
- Meltdown: `(A = 0 ∧ B = 0) ∨ A = 3`.
- Cards: `ADD`, `MOD 2`, `= ×2`, `AND`, `OR`. Budget: 17. Cheapest holding Laws (cost 17): `A + B = 6 ∧ A mod 2 = 0`, `A + B = 6 ∧ B mod 2 = 0`.

| Law | Verdict | Why |
|---|---|---|
| `A + B = 6 ∧ A mod 2 = 0` | **HOLDS** | reference |
| `A + B = 6` | INSUFFICIENT | allows `(3, 3)` |
| `A mod 2 = 0` | INSUFFICIENT | allows `(0, 0)` |
| `A + B = 6 ∨ A mod 2 = 0` | INSUFFICIENT | weaker than either |

---

## Authoring checklist for new missions

1. The reference Law is inductive and implies Safe (engine test).
2. The Safe property alone is **not** the intended answer, or is deliberately a trap (as in 02/04/05).
3. The hand allows the reference Law within budget, and does not trivially allow writing `Safe`
   itself unless that is the trap.
4. At least one known-wrong Law per verdict type the mission is meant to teach.
5. Telemetry from init shows the pattern within ~10 steps.

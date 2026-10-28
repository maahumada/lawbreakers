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
per mission below. (The search prunes, soundly, every Law that is false on a reachable state or
true on a sampled meltdown state before it calls the verifier; that keeps the big AND/OR hands of
08–09 within seconds.)

**Chapters:** 01–06 are the main campaign (*The Lawbreakers Protocol*), ending at FINAL BREACH;
07–09 are the bonus chapter *ARGUS Strikes Back* (`CHAPTERS` in `src/game/campaign.ts`). Unlocking
stays one chain: 07 opens when 06 is secured.

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

# Bonus chapter: ARGUS STRIKES BACK

## 07 — THE SPLITTER

*Concept: weighted conservation. The conserved quantity is not a plain count.*

> ARGUS strikes back. Its first target: an isotope splitter. A heavy core can be split into two
> fragments, and two fragments can be fused back into one core. Nothing is ever lost, but nothing
> is counted one for one either. If the fragment chamber ever holds 7 or more, the containment
> field fails.

- State: `H ∈ ℕ` (heavy cores), `F ∈ ℕ` (fragments). Init: `H = 3, F = 0`.
- Controls:
  - `SPLIT`: `H ≥ 1 → H := H − 1, F := F + 2`
  - `FUSE`: `F ≥ 2 → H := H + 1, F := F − 2`
- Meltdown: `F ≥ 7`.
- Cards: `ADD`, `×2`, `=`, `≤`. Budget: 9. Cheapest holding Laws (cost 9): `2·H + F = 6`,
  `2·H + F ≤ 6`, the only two.

| Law | Verdict | Why |
|---|---|---|
| `2·H + F = 6` | **HOLDS** | reference (`F ≤ 6` because `H ≥ 0`) |
| `2·H + F ≤ 6` | **HOLDS** | also valid, same cost |
| `H + F = 3` | LIVE BREACH | one `SPLIT` gives `(2, 2)`: the Mission 01 reflex counts pieces, not mass |
| `F ≤ 6` | LAB BREACH | from `(1, 5)`, `SPLIT` gives `(0, 7)`. The Safe property is the trap again |
| `2·H + F ≤ 7` | INSUFFICIENT | inductive, but allows `(0, 7)` |
| `2·H + F = 7` | INIT FAILURE | `2·3 + 0 = 6` |

Teaching beat: telemetry shows `H + F` wandering (3, 4, 5, 6), so the plain sum from Mission 01 is
visibly wrong; the player has to find the weights. The fix for the lab trap is a relation, not a
tighter bound.

---

## 08 — TWIN JACKS

*Concept: bounded difference. Two gauges stay within a band of each other; the band needs both
sides because a control swaps them.*

> A lift bridge rides on two hydraulic jacks. Interlocks stop a jack from climbing while it is
> already ahead, but a cross-feed valve can swap the two pressures at any moment. The river side is
> unbraced: if the left jack ever stands 3 or more notches above the right one, the deck tips into
> the water.

- State: `L ∈ ℕ`, `R ∈ ℕ`. Init: `L = 0, R = 0`.
- Controls:
  - `RAISE L`: `L − R ≤ 1 → L := L + 1`
  - `RAISE R`: `R − L ≤ 1 → R := R + 1`
  - `CROSS-FEED`: `true → L := R, R := L`
- Meltdown: `L − R ≥ 3`.
- Cards: `SUB ×2`, `≤ ×2`, `AND`. Budget: 17. Cheapest holding Laws (cost 17): 16 spellings of
  the same band (`L − R ≤ 2 ∧ R − L ≤ 2`, `−2 ≤ L − R ∧ L − 2 ≤ R`, …), nothing else.

| Law | Verdict | Why |
|---|---|---|
| `L − R ≤ 2 ∧ R − L ≤ 2` | **HOLDS** | reference |
| `L ≤ R` | LIVE BREACH | one `RAISE L` gives `(1, 0)` |
| `L − R ≤ 2` | LAB BREACH | from `(0, 3)`, `CROSS-FEED` gives `(3, 0)`. This is Safe itself: the guarded side is safe only if the other side is too |
| `R − L ≤ 2` | LAB BREACH | the mirror image: from `(3, 0)`, `CROSS-FEED` gives `(0, 3)` |
| `L − R ≤ 3 ∧ R − L ≤ 3` | INSUFFICIENT | inductive (the swap and the interlocks keep it), but allows `(3, 0)` |

Teaching beat: one meltdown, one side, yet the Law needs both sides. Unlike Mission 05 the helper
fact is not about another gauge but about the same gap read the other way; `SUB` is new.

---

## 09 — THE AIRLOCK

*Concept: disjunctive Laws. The machine has two phases with different facts in each; the first
mission where OR is the answer.*

> ARGUS's last stand is an orbital airlock. In phase 0 the inner door is open and the chamber must
> be fully pressurised (4 units of air); in phase 1 the outer door is open to space and the chamber
> must be empty. Venting dumps the air and swings the doors; repressurising does the reverse. Any
> other combination of door and air is a meltdown.

- State: `p ∈ ℕ` (door phase), `a ∈ ℕ` (chamber air). Init: `p = 0, a = 4`.
- Controls:
  - `VENT`: `p = 0 ∧ a ≥ 4 → p := 1, a := a − 4`
  - `REPRESSURIZE`: `p = 1 → p := 0, a := a + 4`
- Meltdown: `(p = 0 ∧ a < 4) ∨ (p = 1 ∧ a > 0)`.
- Cards: `= ×4`, `≥`, `AND ×2`, `OR`. Budget: 25. Cheapest holding Laws (cost 25): the reference
  and three spellings of it (`0 ≥ a` for `a = 0`, `p ≥ 1` for `p = 1`).

| Law | Verdict | Why |
|---|---|---|
| `(p = 0 ∧ a = 4) ∨ (p = 1 ∧ a = 0)` | **HOLDS** | reference |
| `p = 0 ∧ a = 4` | LIVE BREACH | one `VENT` gives `(1, 0)`: the AND reflex describes one phase only |
| `(p = 0 ∧ a ≥ 4) ∨ (p = 1 ∧ a = 0)` | LAB BREACH | from `(0, 5)`, `VENT` gives `(1, 1)`. This is (nearly) Safe itself; a bound is not enough, the air must be pinned |
| `a = 4 ∨ a = 0` | LAB BREACH | from `(1, 4)`, `REPRESSURIZE` gives `(0, 8)`: air without the phase |
| `p = 0 ∨ p = 1` | INSUFFICIENT | inductive, but allows `(1, 4)` |
| `(p = 0 ∧ a = 0) ∨ (p = 1 ∧ a = 4)` | INIT FAILURE | phases swapped; power-on is `(0, 4)` |

Teaching beat: no arithmetic cards at all, so no linear relation can describe the machine; the
player has to say "this, or that". The reference is the most expensive Law in the game (25), which
also shows the rack at its largest.

---

## Authoring checklist for new missions

1. The reference Law is inductive and implies Safe (engine test).
2. The Safe property alone is **not** the intended answer, or is deliberately a trap (as in 02/04/05).
3. The hand allows the reference Law within budget, and does not trivially allow writing `Safe`
   itself unless that is the trap.
4. At least one known-wrong Law per verdict type the mission is meant to teach.
5. Telemetry from init shows the pattern within ~10 steps.

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
true on a sampled meltdown state before it calls the verifier, groups terms by the cards they use,
and, for hands without OR/NOT, keeps only comparisons true on every reached state; that keeps the
big hands of 07–15 within seconds.)

**Chapters:** 01–06 are the main campaign (*The Lawbreakers Protocol*), ending at FINAL BREACH;
07–09 are the bonus chapter *ARGUS Strikes Back*, ordered by difficulty (TWIN JACKS, THE AIRLOCK,
THE SPLITTER); 10–15 are the deep chapter *The Deep Grid*, ending at TWIN THRUSTERS, the true finale
(`CHAPTERS` in `src/game/campaign.ts`). Unlocking stays one chain: 07 opens when 06 is secured, 10
when 09 is. (The bonus chapter used to be 07 SPLITTER, 08 TWIN JACKS, 09 AIRLOCK; saved progress
and best scores under the old ids are migrated, see `MOVED_MISSIONS`.)

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
- Display: `tank` ×2 (energy cells, shared scale). Risk low: no pipe between the cells, no total line.

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
- Display: `dial`, notches 0–10 printed, red BURST arc at 11, dashed unprinted zone past 10 (a lab `x = 12` sits there; farther out the needle pegs). Risk low: no stop pin drawn at 10.

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
- Display: `piston` ×2 on one ruler (same unit length), red FUEL LINE at 7 on the big rail; negative positions retract into a red hatch. Risk medium: no lever, linkage or ratio readout is drawn.

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
- Display: `tokens` (pins) in one evenly spaced row of 12, `+k MORE` beyond, negative counts as red dashed "owed" pins. Risk high if pins were grouped in pairs: they never are.

| Law | Verdict | Why |
|---|---|---|
| `n mod 2 = 1` | **HOLDS** | reference |
| `n ≥ 1` | LAB BREACH | from `n = 2`, `REMOVE PAIR` gives 0 (unreachable, since `n` is always odd) |
| `n ≠ 0` | LAB BREACH | from `n = 2`, `REMOVE PAIR` gives 0 (the engine may also pick `n = −2`, `INSERT PAIR`) |
| `n = 1` | LIVE BREACH | one `INSERT PAIR` |

---

## 05 — THE COUNTERWEIGHT

*Concept: strengthening. The safety property is not inductive, and neither is the obvious
strengthening (guard both gauges); the helper fact is a relation between them.*

> A cable crane hangs over the spillway. LOWER pays out one notch of cable and racks one
> counterweight block; HOIST reels in a notch and drops a block. The hoist interlock only reads the
> counterweight: with no blocks racked it refuses. If the cable ever reads below zero, the drum
> winds past its stop and the cable snaps.

- State: `x ∈ ℤ` (LOAD), `y ∈ ℤ` (COUNTERWEIGHT). Init: `x = 0, y = 0`.
- Controls:
  - `LOWER` (id `push`): `true → x := x + 1, y := y + 1`
  - `HOIST` (id `pull`): `y ≥ 1 → x := x − 1, y := y − 1`
- Meltdown: `x < 0`.
- Cards: `=`, `≥ ×2`, `AND`. Budget: 11. Cheapest holding Laws (cost 11): `x = y ∧ y ≥ 0`,
  `x = y ∧ x ≥ 0`, `x ≥ y ∧ y ≥ 0`, `x ≥ 0 ∧ x ≥ y`, nothing cheaper.
- Display: `hoist`: cable drum with the hook at depth LOAD, red DRUM STOP line (snaps below 0), counterweight blocks in a 2-column rack (a different unit on purpose, so load and blocks never line up as equal heights); `(−10, −10)` shows cable past the stop and 10 owed blocks.

| Law | Verdict | Why |
|---|---|---|
| `x = y ∧ y ≥ 0` | **HOLDS** | reference |
| `x = y ∧ x ≥ 0` | **HOLDS** | also valid, same cost |
| `x ≥ y ∧ y ≥ 0` | **HOLDS** | also valid, same cost (`x ≥ 0 ∧ x ≥ y` too) |
| `x ≥ 0 ∧ y ≥ 0` | LAB BREACH | from `(0, 1)`, `HOIST` gives `(−1, 0)`: the obvious AND guards each gauge but not the link between them |
| `x ≥ 0` | LAB BREACH | from `(0, 1)`, `HOIST` gives `(−1, 0)` (Safe itself) |
| `x = y` | INSUFFICIENT | inductive (both controls move both gauges together), but allows `(−10, −10)` |
| `x = 0` | LIVE BREACH | one `LOWER` gives `(1, 1)` |
| `x = 1` | INIT FAILURE | power-on is `(0, 0)` |

Teaching beat: the player fixes the Mission 02 lesson ("guard the gauge the meltdown is about") and
adds the other gauge, and ARGUS still wins from a state the crane never reaches (an empty load with
a block racked). The relation `x = y` alone then gets INSUFFICIENT at `(−10, −10)`: never reached,
but not ruled out. Both halves are needed: the relation ties the load to what the interlock reads,
the bound is what the interlock actually guarantees. Replaced the old 05 (THE FALSE DEFENSE,
turbine `x := x + y, y := y + 1`, answer `x ≥ 0 ∧ y ≥ 0`) after the owner playtest: there the
obvious AND was the answer.

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
- Display: `tank` ×2 (capacitor banks, shared scale), red RESONANCE line at 3 on bank A (placard). Risk low: uniform ticks, emphasis only every 5.

| Law | Verdict | Why |
|---|---|---|
| `A + B = 6 ∧ A mod 2 = 0` | **HOLDS** | reference |
| `A + B = 6` | INSUFFICIENT | allows `(3, 3)` |
| `A mod 2 = 0` | INSUFFICIENT | allows `(0, 0)` |
| `A + B = 6 ∨ A mod 2 = 0` | INSUFFICIENT | weaker than either |

---

# Bonus chapter: ARGUS STRIKES BACK

## 07 — TWIN JACKS

*Concept: bounded difference. Two gauges stay within a band of each other; the band needs both
sides because a control swaps them.*

> ARGUS strikes back. Its first target is a lift bridge riding on two hydraulic jacks. Interlocks stop a jack from climbing while it is
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
- Display: `deck`: plank on two jacks, tilt = left − right (the placard's own quantity), river on the right, a dashed red ghost plank at the tipping tilt. Risk medium: no ±2 tolerance band is drawn.

| Law | Verdict | Why |
|---|---|---|
| `L − R ≤ 2 ∧ R − L ≤ 2` | **HOLDS** | reference |
| `L ≤ R` | LIVE BREACH | one `RAISE L` gives `(1, 0)` |
| `L − R ≤ 2` | LAB BREACH | from `(0, 3)`, `CROSS-FEED` gives `(3, 0)`. This is Safe itself: the guarded side is safe only if the other side is too |
| `R − L ≤ 2` | LAB BREACH | the mirror image: from `(3, 0)`, `CROSS-FEED` gives `(0, 3)` |
| `L − R ≤ 3 ∧ R − L ≤ 3` | INSUFFICIENT | inductive (the swap and the interlocks keep it), but allows `(3, 0)` |

Teaching beat: one meltdown, one side, yet the Law needs both sides. Unlike Mission 05 the helper
fact is not a relation to another gauge but the same gap read the other way; `SUB` is new.

---

## 08 — THE AIRLOCK

*Concept: disjunctive Laws. The machine has two phases with different facts in each; the first
mission where OR is the answer.*

> ARGUS's second target is an orbital airlock. In phase 0 the inner door is open and the chamber must
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
- Display: `selector` for the door phase (INNER OPEN / OUTER OPEN, any other value lights a `?` notch) + `tank` for the air with a FULL mark at 4 (briefing). Risk medium: nothing pairs a phase with an air level.

| Law | Verdict | Why |
|---|---|---|
| `(p = 0 ∧ a = 4) ∨ (p = 1 ∧ a = 0)` | **HOLDS** | reference |
| `p = 0 ∧ a = 4` | LIVE BREACH | one `VENT` gives `(1, 0)`: the AND reflex describes one phase only |
| `(p = 0 ∧ a ≥ 4) ∨ (p = 1 ∧ a = 0)` | LAB BREACH | from `(0, 5)`, `VENT` gives `(1, 1)`. This is (nearly) Safe itself; a bound is not enough, the air must be pinned |
| `a = 4 ∨ a = 0` | LAB BREACH | from `(1, 4)`, `REPRESSURIZE` gives `(0, 8)`: air without the phase |
| `p = 0 ∨ p = 1` | INSUFFICIENT | inductive, but allows `(1, 4)` |
| `(p = 0 ∧ a = 0) ∨ (p = 1 ∧ a = 4)` | INIT FAILURE | phases swapped; power-on is `(0, 4)` |

Teaching beat: no arithmetic cards at all, so no linear relation can describe the machine; the
player has to say "this, or that". The reference (25) is the deepest OR Law in the game; only
Mission 15 (28) costs more.

---

## 09 — THE SPLITTER

*Concept: weighted conservation. The conserved quantity is not a plain count.*

> ARGUS's last stand on the surface is an isotope splitter. A heavy core can be split into two
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
- Display: `tokens`: hexagonal cores and triangular fragments (unrelated shapes, same size), red slot at the 7th fragment (FAILS AT 7). Risk high if a core looked like two fragments: it does not.

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

## 10 — THE READING ROOM

*Concept: a Petri-net place invariant (readers–writers). Tokens are conserved, but a writer holds
three of them.*

> ARGUS has gone underground, into the Deep Grid: the buried analog stations nobody ever digitised.
> The first is a records vault with three brass access tokens. A reader takes one token to enter and
> returns it on leaving. A writer needs all three at once and gives all three back when done. If a
> reader and a writer are ever inside together, or two writers, the ledgers are torn and the vault
> seals for good.

- State: `R ∈ ℕ` (readers), `W ∈ ℕ` (writers), `S ∈ ℕ` (free tokens). Init: `(0, 0, 3)`.
- Controls:
  - `READ IN`: `S ≥ 1 → S := S − 1, R := R + 1`
  - `READ OUT`: `R ≥ 1 → R := R − 1, S := S + 1`
  - `WRITE IN`: `S ≥ 3 → S := S − 3, W := W + 1`
  - `WRITE OUT`: `W ≥ 1 → W := W − 1, S := S + 3`
- Meltdown: `(R ≥ 1 ∧ W ≥ 1) ∨ W ≥ 2`.
- Cards: `ADD ×2`, `×3`, `=`, `≤`, `AND`. Budget: 12. Cheapest holding Laws (cost 12): the weighted
  token count `= 3` and `≤ 3`, in three addition orders each (6 spellings), nothing else.
- Display: `tokens` in three trays: readers (figures), writers (badges), free tokens (rings); red slot at the 2nd writer (TORN AT 2). Risk high if the free tray had exactly three hooks: every tray has the same 12 slots.

| Law | Verdict | Why |
|---|---|---|
| `R + 3·W + S = 3` | **HOLDS** | reference: every token is on the hook, with a reader, or (three of them) with the writer |
| `R + 3·W + S ≤ 3` | **HOLDS** | also valid, same cost |
| `R + W + S = 3` | LIVE BREACH | one `WRITE IN` gives `(0, 1, 0)`: counting heads, not tokens |
| `W ≤ 1 ∧ (W = 0 ∨ R = 0)` | LAB BREACH | Safe itself (test-only, needs OR): from `(0, 1, 1)`, `READ IN` gives `(1, 1, 0)` |
| `W ≤ 1` | LAB BREACH | from `(0, 1, 3)`, `WRITE IN` gives `(0, 2, 0)` |
| `R + 3·W + S ≤ 4` | INSUFFICIENT | inductive, but allows `(1, 1, 0)` |
| `R + 3·W + S = 4` | INIT FAILURE | power-on is `(0, 0, 3)` |

Teaching beat: Mission 01's conservation with Mission 09's weights, now over three gauges; the
weight is not a mass but "how many tokens this person holds".

---

## 11 — THE LOSSY EXCHANGE

*Concept: a weighted inequality (monovariant). Nothing is conserved: one trade loses value, so the
Law is a ceiling, not an equation.*

> Deeper in the grid sits an old barter exchange, still counting in brass chits. You start with 12
> chits. An A-crate costs 2 chits and sells back for 2. A B-crate costs 3, but the broker skims its
> resale: it sells back for only 2. The vault floor holds at most 4 B-crates; a fifth one collapses
> it.

- State: `x ∈ ℕ` (A-crates), `y ∈ ℕ` (B-crates), `m ∈ ℕ` (chits). Init: `(0, 0, 12)`.
- Controls:
  - `BUY A`: `m ≥ 2 → m := m − 2, x := x + 1`
  - `BUY B`: `m ≥ 3 → m := m − 3, y := y + 1`
  - `SELL A`: `x ≥ 1 → x := x − 1, m := m + 2`
  - `SELL B`: `y ≥ 1 → y := y − 1, m := m + 2`
- Meltdown: `y ≥ 5`.
- Cards: `ADD ×2`, `×2`, `×3`, `=`, `≤`. Budget: 14. Cheapest holding Laws (cost 14): the reference
  in three addition orders, nothing else.
- Display: `tokens`: A-crates, B-crates (barrels) with the 5th slot red (COLLAPSE AT 5), chits as coins. Risk medium-high: no price tags, no portfolio value.

| Law | Verdict | Why |
|---|---|---|
| `2·x + 3·y + m ≤ 12` | **HOLDS** | reference: wealth at purchase price never grows (`SELL B` loses 1) |
| `2·x + 3·y + m = 12` | LIVE BREACH | `BUY B, SELL B` gives `(0, 0, 11)`: the skim breaks the equation |
| `y ≤ 4` | LAB BREACH | Safe itself: from `(0, 4, 3)`, `BUY B` gives `(0, 5, 0)` |
| `2·(x + y) + m ≤ 12` | INSUFFICIENT | inductive (B-crates priced too cheaply still never gain), but allows `(0, 5, 0)` |
| `2·x + 3·y + m ≤ 11` | INIT FAILURE | power-on wealth is 12 |

**Changed from the research spec:** the spec had `SELL A` refund 1 (both resales skimmed). The cost
search then found `x + 3·y + m ≤ 12` holding at cost 12 (weight 1 on A also never grows). With A
resold at full price the A weight is forced to exactly 2 and the reference is the cheapest Law.

---

## 12 — THE FUEL CELL

*Concept: two conservation laws at once (one per element), joined with AND.*

> The Deep Grid's backup power is a sealed fuel cell. A burn combines two units of hydrogen with one
> of oxygen into two units of water; electrolysis splits two units of water back. Nothing leaves
> the casing. The hydrogen tank bursts at 5 units, the oxygen tank at 3.

- State: `a ∈ ℕ` (hydrogen), `b ∈ ℕ` (oxygen), `c ∈ ℕ` (water). Init: `(4, 2, 0)`.
- Controls:
  - `BURN`: `a ≥ 2 ∧ b ≥ 1 → a := a − 2, b := b − 1, c := c + 2`
  - `ELECTROLYSIS`: `c ≥ 2 → a := a + 2, b := b + 1, c := c − 2`
- Meltdown: `a ≥ 5 ∨ b ≥ 3`.
- Cards: `ADD`, `×2`, `= ×2`, `≤ ×2`, `AND`. Budget: 16. Cheapest holding Laws (cost 16): five, all
  "hydrogen + water fixed AND hydrogen tied to oxygen": `a + c = 4 ∧ a = 2·b`, with `≤` on either
  side (`2·b ≤ a ∧ a + c ≤ 4` …), and `2·b = a ∧ a + c ≤ 5`.
- Display: `tank` ×3 (hydrogen, oxygen, water; shared scale), red BURST lines at 5 and 3 (placard). Risk medium: no molecule art or atom counters.

| Law | Verdict | Why |
|---|---|---|
| `a + c = 4 ∧ a = 2·b` | **HOLDS** | reference |
| `c = 0` | LIVE BREACH | one `BURN` gives `(2, 1, 2)` |
| `a ≤ 4 ∧ b ≤ 2` | LAB BREACH | Safe itself: from `(0, 2, 2)`, `ELECTROLYSIS` gives `(2, 3, 0)` |
| `a + c = 4 ∧ b ≤ 2` | LAB BREACH | from `(2, 2, 2)`, `ELECTROLYSIS` gives `(4, 3, 0)`: hydrogen is right, oxygen is loose |
| `a + c = 4` | INSUFFICIENT | inductive, but allows `(4, 3, 0)` |
| `a = 2·b` | INSUFFICIENT | inductive, but allows `(6, 3, 0)` |
| `a + c = 6 ∧ a = 2·b` | INIT FAILURE | power-on is `(4, 2, 0)` |

---

## 13 — THE SLUICE TANKS

*Concept: a divisibility invariant (the Die Hard jugs). Every level the tanks can show is a multiple
of gcd(9, 6) = 3.*

> Under the river, a sluice station keeps two measuring tanks: tank A holds 9 units, tank B holds 6.
> Each can be filled from the river, emptied into the drain, or poured into the other until the
> source runs dry or the target is full to the brim. ARGUS has wired a trigger to the old float at
> the 4-unit mark of tank A: if tank A ever holds exactly 4 units, the sluice gates open and the
> station floods.

- State: `a ∈ ℕ`, `b ∈ ℕ`. Init: `(0, 0)`.
- Controls (a pour is two guarded linear controls, exactly one of which is armed at a time):
  - `FILL A`: `a < 9 → a := 9`; `FILL B`: `b < 6 → b := 6`
  - `EMPTY A`: `a ≥ 1 → a := 0`; `EMPTY B`: `b ≥ 1 → b := 0`
  - `A→B ALL`: `a ≥ 1 ∧ a + b ≤ 6 → a := 0, b := b + a`
  - `A→B TO BRIM`: `b < 6 ∧ a + b > 6 → a := a + b − 6, b := 6`
  - `B→A ALL`: `b ≥ 1 ∧ a + b ≤ 9 → a := a + b, b := 0`
  - `B→A TO BRIM`: `a < 9 ∧ a + b > 9 → a := 9, b := a + b − 9`
- Meltdown: `a = 4`.
- Cards: `MOD 3 ×2`, `= ×2`, `≠`, `≤ ×2`, `AND`. Budget: 17. Cheapest holding Laws (cost 17): the
  reference with `≤ 0` for `= 0` on either side (4 spellings).
- Display: `jug` ×2: bottles with their rim at capacity 9 and 6 (briefing), one-unit ticks only, red FLOAT line at 4 on tank A (placard); a lab level above the rim spills over it (`▲ k OVER THE RIM`). Risk high if ticks grouped by 3: they do not (owner review: the FLOAT line itself is public but sits on a non-multiple).

| Law | Verdict | Why |
|---|---|---|
| `a MOD 3 = 0 ∧ b MOD 3 = 0` | **HOLDS** | reference |
| `a ≤ 6` | LIVE BREACH | one `FILL A` gives `(9, 0)` |
| `a ≠ 4` | LAB BREACH | Safe itself: from `(10, 0)`, `A→B TO BRIM` gives `(4, 6)` (the Law alone does not even cap the tank; any `(1, 3)`, `B→A ALL` works too) |
| `a MOD 3 = 0` | LAB BREACH | from `(6, 1)`, `A→B TO BRIM` gives `(1, 6)`: a pour carries B's remainder into A |
| `a ≤ 9 ∧ b ≤ 6` | INSUFFICIENT | inductive (the walls), but allows `(4, 0)` |
| `a MOD 3 = 1` | INIT FAILURE | power-on is `(0, 0)` |

---

## 14 — THE PHASE ROTOR

*Concept: modular invariants on differences (the chameleon puzzle). Every shift changes each
pairwise difference by 0 or ±3, so the differences mod 3 never change.*

> The grid's oldest generator is a three-phase rotor with coils in phase R, G and B. A shift pulls
> one coil out of each of two phases and winds both into the third. The coils never leave the
> rotor. If all of them ever pile into a single phase, the rotor locks and tears its bearings
> apart.

- State: `r ∈ ℕ`, `g ∈ ℕ`, `b ∈ ℕ`. Init: `(2, 3, 4)` (residues 2, 0, 1: all different, so no two
  phases can ever both be empty).
- Controls:
  - `SHIFT TO B`: `r ≥ 1 ∧ g ≥ 1 → r := r − 1, g := g − 1, b := b + 2`
  - `SHIFT TO G`: `r ≥ 1 ∧ b ≥ 1 → r := r − 1, b := b − 1, g := g + 2`
  - `SHIFT TO R`: `g ≥ 1 ∧ b ≥ 1 → g := g − 1, b := b − 1, r := r + 2`
- Meltdown: `(r = 0 ∧ g = 0) ∨ (r = 0 ∧ b = 0) ∨ (g = 0 ∧ b = 0)`.
- Cards: `SUB ×2`, `MOD 3 ×2`, `= ×2`, `≠`, `AND`. Budget: 23. Cheapest holding Laws (cost 23): 30;
  12 are "two pairwise differences pinned mod 3" (`(r − g) MOD 3 = 2 ∧ (r − b) MOD 3 = 1` and its
  spellings), 18 are "the total is 9 AND one pair of phases differs mod 3"
  (`9 − r − g = b ∧ g MOD 3 ≠ r MOD 3` and spellings). No cheaper Law holds; there is no OR card, so
  enumerating states is impossible.
- Display: `rotor`: three coils, one ring per unit (six, then `+k`), phases told apart by stroke (solid / brass / dashed); the rotor only spins once per fire and always rests upright. Risk high if its angle followed the counts: it never does (tested).

| Law | Verdict | Why |
|---|---|---|
| `(r − g) MOD 3 = 2 ∧ (r − b) MOD 3 = 1` | **HOLDS** | reference |
| `(b − g) MOD 3 = 1 ∧ (b − r) MOD 3 = 2` | **HOLDS** | same idea, other pair |
| `9 − r − g = b ∧ g MOD 3 ≠ r MOD 3` | **HOLDS** | the other idea: conservation plus one residue gap |
| `r ≠ 0` | LIVE BREACH | `SHIFT TO B` twice gives `(0, 1, 8)` |
| `r ≠ g` | LAB BREACH | from `(3, 0, 1)`, `SHIFT TO G` gives `(2, 2, 0)` |
| `r ≠ g ∧ g ≠ b` | LAB BREACH | test-only (one `≠` in the hand): from `(4, 3, 0)`, `SHIFT TO B` gives `(3, 2, 2)` |
| `(r − g) MOD 3 = 2` | INSUFFICIENT | inductive, but allows `(2, 0, 0)`: one gap is not enough |
| `(r − g) MOD 3 ≠ 0 ∧ (g − b) MOD 3 ≠ 0` | INSUFFICIENT | test-only: inductive, but allows `(0, 4, 0)` (r and b agree mod 3) |
| `(r − g) MOD 3 = 1 ∧ (g − b) MOD 3 = 2` | INIT FAILURE | `(2 − 3) MOD 3 = 2` |

**Changed from the research spec:** the spec's Law `(r − g) mod 3 = 2` alone is INSUFFICIENT
(the engine finds `(2, 0, 0)`): with no conserved total a single gap allows a pile. The Law needs
two gaps (or the total plus one gap). Init raised from `(1, 2, 0)` to `(2, 3, 4)` so the rotor has
55 reachable states. The `≠` hand is one card (two made the cost search slow, see PROGRESS).
`(r − g) MOD 3 = 2 ∧ (g − b) MOD 3 = 2` also holds (engine), but Dafny's Z3 times out on that one
spelling (> 5 min) while every other spelling verifies in ~2 s; it is not listed as a solution.

---

## 15 — TWIN THRUSTERS

*Concept: vector-addition reachability = a lattice AND a cone. The final mission: two different
kinds of fact, and one of them needs both sides.*

> ARGUS's last core rides an old orbital tug at the bottom of the launch silo, the deepest point of
> the grid. The tug steers with two thrusters, and every burn loads both hull frames: a port burn
> puts 1 unit of stress on the port frame and 2 on the starboard frame, a starboard burn the
> reverse. The interlock stops burning once 10 units are loaded. Two failure modes: a frame at 3
> while the other is still unloaded shears the hull, and both frames at exactly 2 ring the hull at
> its resonance and crack it.

- State: `x ∈ ℕ` (port frame), `y ∈ ℕ` (starboard frame). Init: `(0, 0)`.
- Controls:
  - `BURN PORT`: `x + y ≤ 9 → x := x + 1, y := y + 2`
  - `BURN STARBOARD`: `x + y ≤ 9 → x := x + 2, y := y + 1`
- Meltdown: `(x = 3 ∧ y = 0) ∨ (x = 0 ∧ y = 3) ∨ (x = 2 ∧ y = 2)`.
- Cards: `ADD`, `×2 ×2`, `MOD 3`, `=`, `≤ ×2`, `AND ×2`. Budget: 28. Cheapest holding Laws (cost
  28): the reference in three bracketings/orders, nothing else.
- Display: `scope`: phosphor dot at (PORT, STARBOARD) with a 6-state fading trail of real runs only, axes and a 5-unit grid, red crosses at the three meltdown points (placard); lab states show only the invented step as a dashed arrow. Risk medium-high: a long trail would draw the reachable cone, so the trail is short (tested) and there are no diagonal guides.

| Law | Verdict | Why |
|---|---|---|
| `(x + y) MOD 3 = 0 ∧ x ≤ 2·y ∧ y ≤ 2·x` | **HOLDS** | reference: every burn adds 3 to the total and keeps each frame within twice the other |
| `x ≤ y` | LIVE BREACH | one `BURN STARBOARD` gives `(2, 1)` |
| `x + y ≠ 4` | LAB BREACH | test-only (no `≠` card): from `(1, 0)`, `BURN PORT` gives `(2, 2)` |
| `(x + y) MOD 3 = 0` | INSUFFICIENT | the lattice alone: allows `(0, 3)` |
| `x ≤ 2·y ∧ y ≤ 2·x` | INSUFFICIENT | the cone alone: allows `(2, 2)` |
| `(x + y) MOD 3 = 0 ∧ x ≤ 2·y` | INSUFFICIENT | half a cone: allows `(0, 3)` |
| `(x + y) MOD 3 = 1` | INIT FAILURE | power-on is `(0, 0)` |

**Changed from the research spec:** the spec's meltdown was `(2, 2)` or `(3, 0)` only. Then
`x ≤ 2·y` is inductive on its own and `(x + y) MOD 3 = 0 ∧ x ≤ 2·y` holds at cost 19, so the
reference was not the cheapest. The mirror point `(0, 3)` makes both sides of the cone necessary
(story: "a frame at 3 while the other is unloaded", either side).

---

## Authoring checklist for new missions

1. The reference Law is inductive and implies Safe (engine test).
2. The Safe property alone is **not** the intended answer, or is deliberately a trap (as in 02/04/05).
3. The hand allows the reference Law within budget, and does not trivially allow writing `Safe`
   itself unless that is the trap.
4. At least one known-wrong Law per verdict type the mission is meant to teach.
5. Telemetry from init shows the pattern within ~10 steps.
6. The `display` (gauge skin) draws no derived quantity except the meltdown's own: no sum, total,
   ratio, difference or grouping by 2/3 that the placard does not print; marks come only from the
   placard (`alarm`, tested to sit where the meltdown flips) or the briefing (tested to appear in
   it). Add a "Display" line with the spoiler risk (docs/GAUGES-PROPOSAL.md §2, §4).

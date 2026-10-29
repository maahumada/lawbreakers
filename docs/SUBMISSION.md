# Submission post (draft)

Ready to paste on the KAIST CS424 Social Contributions board, as a reply to the *Invariant Finding
Game* challenge (discussion #598). Everything below the line is the post. Images use absolute
GitHub URLs so they render outside the repo once `main` is pushed.

---

# LAWBREAKERS: 2050 — Humanity's last firewall is a loop invariant

> **요약.** LAWBREAKERS: 2050은 루프 불변식(loop invariant)을 찾는 브라우저 게임입니다. 수식을
> 직접 입력하는 대신 모듈을 회로처럼 연결해 "법칙(Law)"을 만들면, 악성 AI ARGUS가 반례로 그
> 법칙을 공격합니다. 모든 판정은 브라우저 안에서 실행되는 Z3 SMT 솔버가 내리고, 미션을 클리어하면
> 방금 증명한 Dafny 프로그램을 보여 줍니다. 실제 실행에서 나오는 반례(live attack)와 귀납성이
> 깨지는 반례(lab simulation)를 다르게 보여 주어, "테스트 통과 ≠ 증명"을 플레이로 배울 수 있습니다.
> 설치 없이 아래 링크에서 바로 플레이할 수 있습니다.

- **Play:** https://maahumada.github.io/lawbreakers/
- **Code:** https://github.com/maahumada/lawbreakers

![Mission 01: a wrong Law is breached by a live attack, then a better one holds](https://raw.githubusercontent.com/maahumada/lawbreakers/main/docs/media/mission-01-run.webp)

It is 2050 and a rogue AI owns every networked machine. Humanity's last defenses are analog
**Law Engines**: interlock circuits that enforce a rule on a facility. You wire the Law; the AI
operates the facility through its legal controls, hunting for the one sequence that breaks it.
Under the fiction, every Law is a loop invariant, every attack is a counterexample, and every win
is a proof checked by the real Z3 solver, compiled to WebAssembly and running in your browser.

## How to play

1. **Watch the machine.** Each mission is a small facility with gauges (its state), controls
   (when they can fire, what they change) and a meltdown condition. Press the controls yourself or
   let it auto-run, and look for something that never changes.
2. **Build a Law.** Wire modules into the rack: sensors and constants are free, operator cards
   (`ADD`, `=`, `MOD 2`, `AND`, …) are a limited hand that changes every mission. Round sockets
   take numbers and square sockets take true/false, so only well-typed Laws can be built.
   Whatever reaches the SHIELD is your Law.
3. **ENGAGE INTERLOCK.** ARGUS answers with one of five verdicts: *initialization failure* (false
   at power-on), *law breached — live attack* (real moves make it false; replayed on the machine),
   *law breached — lab simulation* (true on every real run but not inductive; shown as a cyan
   hologram), *insufficient protection* (it allows a meltdown), or **THE LAW HOLDS**.
4. **Don't let the breach meter fill.** Each failure lets ARGUS deeper, and gives you a hint. At
   100 % the facility falls. Training mode turns the meter off.
5. **Win, score, and see the proof.** Score rewards cheap Laws, few failures and speed. *Show the
   Proof* turns the facility into a Dafny loop with your Law as its `invariant`: *"You just wrote
   this."*

Fifteen missions: conservation, bounds, linear relations, modular invariants, strengthening and
compound Laws in the main campaign, then a bonus chapter (*ARGUS Strikes Back*) with bounded
differences, disjunctive Laws and weighted conservation, and a deep chapter (*The Deep Grid*) with
classic puzzles: readers–writers tokens, a lossy market, a fuel cell, the Die Hard jugs, a
three-phase rotor and a two-thruster reachability finale. Works on phones and with the keyboard.

## Key design ideas and considerations

**Invariants as physical interlocks.** The player builds a machine, not a formula. Socket shapes
are the type system, so there are no syntax errors, only logical ones. The formula is still shown
under the rack for anyone who wants it.

**The adversary shows its work.** "Wrong" is never the whole answer: every failure comes with a
concrete attack replayed step by step on the machine. Failing is where the learning happens, so
failing is the show.

**Three verdicts = three verification conditions.** Initialization, preservation and safety map
one-to-one to distinct in-game failures, so learning the rules of the game is learning the shape of
an inductive invariant proof.

**Two kinds of breach.** Reachable counterexamples (red, the real machine) and counterexamples to
induction (cyan hologram, a state the machine may never reach) look and sound different. Two
missions are built so the obvious first guess gets a lab simulation. That teaches *passing every
test is not a proof* through play rather than a lecture.

**Real verification, no answer key.** Z3 decides every verdict in a Web Worker (live search for a
dramatic replay, then two Z3 queries for preservation and safety). Any genuinely inductive and safe
Law wins, including ones the designer never thought of. Laws stay in linear integer arithmetic plus
modulo by a constant, so the solver always answers quickly, and counterexamples are searched in
small ranges first so they use numbers a player can follow.

**A hand of cards with a price.** A limited hand turns "find any invariant" into a puzzle, and
module costs turn it into a competition: the cheapest Law that holds scores best. An exhaustive
search over every Law each hand can build confirms that no mission has a cheaper unintended
solution.

**An antagonist with a personality.** ARGUS is a search plus a solver, not an LLM, but it gloats
with the actual counterexample, notices when you engage the same broken Law twice, and gets
rattled when it loses. Hints escalate from a nudge to something specific and never give the answer.
The whole thing is played as a melodramatic command-center alarm for what is really a small
arithmetic puzzle; that contrast is the tone.

**Trustworthy.** 318 automated tests, including a conformance suite where every mission's
reference Laws and 33 known-wrong Laws must get their exact verdict from the real pipeline; the
exported Dafny programs are cross-checked with real Dafny (reference Laws verify, wrong ones fail
for the matching reason); browser smoke tests cover every verdict, the campaign, keyboard play,
reduced motion and phone layouts.

## How it differs from InvGame

[InvGame](http://invgame.atwalter.com/dashboard1) showed that people will find invariants as a
game: players look at rows of observed values and type expressions that fit them. LAWBREAKERS
keeps that "look at the data" step (the telemetry log) and changes the rest:

- **Building, not typing.** Laws are wired from a limited hand of typed modules, which makes the
  search space a puzzle and makes the game playable without knowing any syntax.
- **An opponent instead of a checklist.** Candidates are attacked, not just scored: every failure
  is a concrete counterexample you can watch.
- **Induction is the lesson.** Fitting the data is not enough. The lab simulation shows, in a
  separate visual language, exactly why a Law that fits every observed run can still fail to be a
  proof, and the three verdicts spell out the three proof obligations.
- **Instant, real verification.** Each candidate is verified by Z3 in the browser, typically in well under a second once the solver has loaded,
  with no server.
- **The reveal.** Each win ends with the Dafny program the player just verified.
- **Campaign and score.** Fifteen missions (six plus two bonus chapters) that each introduce one invariant idea, a breach meter,
  cost-based scoring and best scores, plus a no-pressure training mode.

## Built with AI

The design was directed by me; most of the code, tests and docs were written by AI coding agents
(Claude Code) working from design documents in the repo, as allowed for this challenge. Every
in-game verdict comes from Z3, never from the agents. The repo's `docs/` folder holds the design,
architecture and a full progress log of how it was built.

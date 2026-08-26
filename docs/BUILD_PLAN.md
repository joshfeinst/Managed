# Build-out plan — the remaining ladder

**Running 01:20–09:20 UTC, 2026-08-26.** This file is the recovery point. The
container has been rebuilt three times in this project and each one wipes
`/tmp` and rolls the working tree back to an old commit. Everything that
matters is committed and pushed as it lands; if you are reading this after a
rebuild, `git fetch origin main && git reset --hard FETCH_HEAD` and carry on
from the first unchecked box.

## Where the ladder stood at the start

| rung | own tickets | events | state |
|---|---|---|---|
| intern | 35 | 14 | done |
| t1 | 14 | 14 | done |
| t2 | 14 | 14 | done |
| t3 | 15 | 14 | done |
| project | 15 | 19 | done — `df51585` |
| procure | 15 | 24 | done — `aa525f6` |
| relmgr | 2 | 24 | **to build** |
| solarch | 1 | 24 | **to build** |
| vcio | 2 | 22 | **to build** |
| director | 5 | 14 | **to finish** |

## The order

- [x] 1. Project Team — 14 tickets, 5 meetings, event tier-gating engine change
- [x] 2. Procurement — 14 tickets, 5 meetings
- [x] 3. Relationship Manager — you stop owning the work and own how they feel about it
- [x] 4. Solutions Architect — you own the drawing, and the drawing outlives you
- [x] 5. vCIO — you own a decision you made four years ago that is now everyone's ceiling
- [x] 6. Director of IT — finish the rung: it has 5 own tickets and needs its own meetings
- [x] 7. **Promotion scenes.** There are currently ZERO in the entire game. Nine
      gates fire and none of them says anything. `run.pendingScenes` is the hook.
- [x] 8. **The Big Migration.** — `650e869`. Dealt on the last day at the top,
      once, early; landing it picks which of two retirements you read.
- [ ] 9. **The balance pass.** Bigger than "re-measure" — see below.

## Rules for this run

1. **Commit and push every rung, alone.** A rebuild then costs one rung.
2. **No harness run over ~3 minutes.** `gate.js --ladder` drives 216 careers and
   several rebuilds landed near runs like it. Use small seed counts routinely;
   save the full sweep for step 9.
3. Every change keeps the suite green. New behaviour gets an invariant, and the
   invariant gets a mutation that must fail.
4. `pri` is INVERTED in TICKETS: `pri:4` renders P1 and is worth 7 points.

## Known open questions, not to be silently decided

- **Craft moves the score by 2 points; triage moves it by 24** (`docs/BALANCE.md`).
  Six bespoke minigames would each buy about as much as the fifth did. The rungs
  are being built with tickets, meetings and scenes first for that reason; the
  board question goes back to Josh with a real rung in front of him.
- ~~Upper rungs are hard to clear because performance degrades across a
  career.~~ **Measured and wrong.** Three real causes, all found 2026-08-26 and
  written up in `docs/BALANCE.md`: one deal rate copy-pasted down eight rungs
  (a flawless vCIO scored 14% and was fired on arrival); the disposable share
  of the queue collapsing 25% → 6% so there was nothing cheap to sacrifice; and
  meeting time accumulating to 151 minutes of a 480-minute day. The first and
  third are fixed. The second is fixed with content at rungs 5–9.

## Step 9 — what is actually left

Rates and bars are a **matched pair** and must be set together from
`tools/bars.js --sweep`, never by hand. The sweep taken before the meeting
budget landed is stale; everything set from it needs redoing.

- [x] Re-sweep deal rates under the meeting budget, set rates and bars together
- [x] Re-baseline `GATE_DEBT` / `GATE_DEBT_BUDGET` and say why — 69 → 52
- [x] relmgr/solarch fixed by the meeting budget + senior time scale, not by a bar
- [x] Full battery: verify, visual, save, meta, burn, human, templates, gate --ladder
- [x] `docs/BALANCE.md` rewritten — three causes, all measured
- [x] **vCIO fixed** — its work got cheaper, not its bar lower. Separation 6 →
      10 points; all nine rungs now healthy on tools/bars.js.
- [x] **Six bespoke boards, rungs 4-9** — THE ADDRESS PLAN (project),
      THE SHORTFALL (procure), KEEPING EVERYBODY (relmgr), THE DIAGRAM
      (solarch), THE BOARD PAPER (vcio), WHOSE SATURDAY (director). Each with
      its own tickets and mutation-tested invariants. The vertical slice Josh
      chose is complete.
- [ ] Put the minigame question to Josh: craft now measures 3-8 points against
      triage 7-12, not the 2-vs-24 the old single-seed reading claimed, so the
      boards matter more than the objection assumed. Worth his call on whether
      craft should feed the day score harder.

## The standing job (2026-08-26, after the overnight run)

**Done, mostly** — twelve droppable tickets took project 9 -> 12, procure
8 -> 11 and relmgr 9 -> 11. **Procurement** is the one left: 8 points, the narrowest on the ladder, and the
only rung bars.js still calls misplaced. It has had its chaff already, so the
gap is structural — the levers left are cheaper tickets there, or a wider stakes
spread in its pool.

The original note, kept because the rule generalises: project, procure
and solarch separated good triage from bad by 9, 8 and 11 points — the narrowest
on the ladder — and on a rung that narrow both columns of `GATE_DEBT` move
together, so lowering the bar lets bad play through and raising it locks good
play out. Measured both ways; neither works.

What fixed vCIO when it was in this position was **cheaper tickets** (more
closures a day, so a day's triage decision is made across more items). What
fixed the senior rungs generally was **more genuinely droppable work**. Those
are the two levers that have actually moved this number.

Everything else is in `docs/BALANCE.md`, and the rule that matters most:
`bars.js` and `meta.js` both get run after any content lands, and when they
disagree the one that plays whole careers is the one that is right.

### Procurement's 8-point gap: five hypotheses, all eliminated

It is **stable, not noise** — 8 points at 24 seeds and 8 at 30. It is the
narrowest on the ladder (relmgr and solarch are 9, everything else 11–16), and
`bars.js` calls it 70% good / 33% bad against a 30% threshold. One marginal
rung out of nine.

What it is *not*, each measured rather than assumed:

| hypothesis | procure | t3 (gap 16) | verdict |
|---|---|---|---|
| ceiling too low | 43 | 43 | identical |
| too little droppable work | 21% of dealt | 19% | procure is *better* |
| priority mix compressed | 24/27/28/21 | 22/29/27/22 | identical |
| dear tickets cost more to finish | P1 29 min | P1 29 min | identical |
| dear work capped out of the day | 19% of daily slots | 20% | identical |

What the bots actually do differs, and this is the thing to explain next:

| | closed/day | avg stakes per closed |
|---|---|---|
| t3, good triage | 5.2 | **4.48** |
| t3, bad triage | 5.4 | 2.55 |
| procure, good triage | 5.0 | **3.75** |
| procure, bad triage | 5.9 | 2.68 |

Good triage captures 76% more value per ticket at T3 and only 40% at
Procurement, on pools whose composition measures the same. The good bot cannot
find work as dear at procure as it can at T3, and none of the five inputs above
explains why. That is where the next look should start — probably by dumping
what `pridead` actually closes, ticket by ticket, on one seed at each rung.

---

## 2026-08-26 — the door, the drowning, and the clock

Everything below started from one map bug and ended up re-tuning the ladder.
The full working is in `docs/BALANCE.md`; this is the recovery point.

**The server room's only door faced south**, away from the whole building, so
`SERVERS` — the destination fourteen tickets send you to, more than any other —
cost 70-90 minutes from every desk outside it. One door in the north wall fixed
it. `WALK_BUDGET` (62 min) is the new ratchet, and re-sealing the wall fails it
with 26 legs over.

**That made the gates worse**, because `sla` is `work x slaMult` and the walking
tax had been secretly supplying the ticket-size variance that makes triage
matter. Six fat multi-stop jobs now author that variance on purpose, half of
them low-priority so "big" stays independent of "important".

**`tools/score.js` is new** and is the thing that explains the ladder. It takes
`dayPerf` apart into stakes closed, realisation and burn. It found that flawless
triage burned three quarters of the queue at every mid rung, that burn was ~72%
of the denominator, and that burn barely moved with skill — so the score was
mostly measuring how much of an impossible day evaporated.

**`URGENT_GRACE` is the fix that reached every rung.** Triage only happens
between tickets, so a P1 needs a window that outlasts the ticket you are already
holding. P1 x2.0 and P2 x1.5. Every rung's good-vs-bad gap roughly doubled.

**Bars are bisected against `meta.js`, not placed at `bars.js`'s p25.** A career
gets many three-day windows; p25 let 24 of 24 players retire in 5.3 careers.
Settled just above the p25/p50 midpoint: 18/24 at skill .85 in 8.1 careers,
9/16 at skill .70 in 9.8.

**T3's priorities did not mean urgency** and now do — five important-but-not-
urgent P1s demoted, two real incidents given real clocks, `URGENCY_SLOPE`
(-0.45) added as a ratchet with a band-ordering lint beside it.

**Both verdict systems on the review screen were grading on a curve that no
longer existed.** They read off `reviewAt` now — 0 is the fired floor, 1 is the
promotion bar — so the same sentence means the same thing at every desk.

### What is left

- ~~Procurement is the narrowest rung.~~ **Done** — its deal rate was stale
  (swept at 14 seeds, which is not a measurement). Re-swept at 26: 1.5 -> 1.9
  doubles its gap to 15. Meeting load turned out not to be a lever at all, 68
  minutes against 50 landing inside the noise, so the meetings stay.
- ~~T3 is the narrowest rung now.~~ **Done** — same signature, same cause,
  1.5 -> 1.9 takes its gap from 14.5 to 19.8.
- ~~Project Team is the narrowest left.~~ **Tried and reverted** — raising its
  rate to 1.9 widens its own gap from 11.0 to 17.9 and collapses the career arc
  from 75-80% retiring to 35%. The ladder has a total difficulty budget and by
  the fifth rung it was spent. Project Team keeps 1.5 and a 13-point gap, and
  that is the right price. Anything further here has to be CONTENT, not a rate.
  Eight dated-commitment tickets were written for it and did NOT move the gap
  (12.8 -> 11.4); they stay because they are good content, but the rung is
  still the narrowest and still open. It is the ONLY thing left on this list.
- **14 seeds is not a measurement.** Three separate numbers set from 14-seed
  sweeps this session had to be redone at 26. Sweep at 26 the first time.
- ~~Craft vs triage is open for Josh.~~ **Answered: no change needed.** At 24
  seeds `tools/dials.js` measures triage at 11.7 points and craft at 9.9 —
  judgement leads, hands are a close second, which is the balance the design
  wants. Two things fell out of the same table: priority-first has caught up
  with shortest-first (0.3 points apart, from 1.8), so the game no longer pays
  more for skimming small tickets than for protecting important ones; and the
  README's claim that arrival-order and worst-priority-first score the same is
  no longer true (62.3% against 59.6%), so it was corrected.
- ~~The bars are bisected by hand against `meta.js`.~~ **Done** —
  `bars.js --careers --target=0.75` places every bar at the same fraction of
  its own [p25, p50] span and bisects that one fraction until the share of
  careers reaching retirement hits the target. Six steps, one command. It
  independently reproduced the hand-tuned bars to within a few points on its
  first run, which is the cross-validation the numbers needed.

### The balance document drifted, and now it is generated

`docs/BALANCE.md` carried a ladder table hand-copied forward from its own
previous version, and it was wrong: Procurement and Relationship Manager kept
bars that had been re-bisected away, and Solutions Architect was listed at a
deal rate it had not had for hours — an error that reached a commit message too.

`node tools/ladder.js index.html --measure` prints that table from the shipped
file. Paste it; never retype it. **Re-read the file rather than trusting any
table older than its last edit.**

---

## 2026-08-26 (second pass) — the levels, built out

Every rung is now complete on every structural measure: 22-35 tickets and 5-6
meetings written for it and nowhere lower, and rungs 4-9 each deal their own
bespoke board off their own tickets. All six relationships are ratcheted.

Totals: 65 events, 266 tickets, 637 dialogue nodes, 10 people, 341 self-tests.

Three new colleagues for the senior floor — Yvonne (Finance, has read the
contract to the end), Noor (Compliance, right since 2021 and still waiting) and
Callum (second-year apprentice, does the jobs nobody puts a ticket on). Their
desks are `n4`, `n5` and `n9`, which were the last free NPC anchors on the map.

### What is left

- ~~The office is still one floor.~~ **Done** — the ground floor exists, the
  lift goes there and comes back, and every map invariant runs on every map.
  What it is NOT yet is a place a ticket can send you: no anchor down there is
  one a ticket uses, deliberately, because anchors resolve against the loaded
  map. Making a ticket able to say "go to the post room" needs cross-floor
  pricing in `walkCostFromDesk` — that is the next piece if the floor is to
  become mechanical rather than social.
- **`tools/ladder.js --measure` generates the balance table.** Paste it.
- ~~The junior rungs share four boards.~~ **Done** — the pit has its own now,
  the new-starter checklist, and it is a sequence rather than a matching or a
  judgement, which no other board in the game is. Finding it took three
  harnesses and a screenshot; the screenshot is the one that found that nothing
  had ever called a board's `draw()`.

## 2026-08-26 (third pass) — downstairs

The brief was: fix any pre-existing bugs in the levels first, then cross-floor
pricing so tickets can send you to the ground floor, then build that floor out.
In that order, and it mattered: the level pass found two shipped bugs that
nothing in a 345-test suite could see, and the cross-floor work found a third
that only a *measurement* could see.

**Fixed before anything new was built:**

- The queue row clipped 238 of 268 tickets once the walk-cost hint was in the
  same cell. The hint was added so a player could see a P4 is a two-hour round
  trip before taking it; it was ellipsed off the end of nearly every row.
- The dialogue box grew off the top of the frame in a small window — 72 nodes
  at 400x300, `i.day1` by 165px. `visual.js` drives that window and passes,
  because it never opens a dialogue there.
- `tools/audit.js` was reporting 91 non-problems from two character counts I
  picked without measuring anything. Deleted; the self-test measures the
  rendered box instead. Its dominance check is a report now, not a defect list.
- Two content bugs it was right about: two VPN tickets with the same title
  overlapping at rungs 2-4, and a vCIO ticket priced at two points for a walk,
  two choices and ten stress, so burning it always beat working it.
- Three dialogue nodes where the plain "fix it" option carried no rep at all
  and "leave it" carried `rep:1`.

**Then the crossing.** `FLOOR_DIST`/`FLOOR_POS` index both floors at boot;
`walkLegs` prices a leg that changes floor and is now the single copy of that
walk, shared by `workLeft`, `legHint`, `ticketWork` and the budget lint. The
ground floor was replanned around the lift, which cannot move — `ELEV` is
[1,1] on both maps — and rebuilt from a car park into a reception hall, two
meeting rooms, a manager's office, a post room, a stationery store and a
canteen. Six tickets go down there.

**And the one only a measurement could find.** Those six tickets took careers
reaching retirement from 18/24 to 24/24 while the day-score decomposition said
nothing had changed. `advanceStep` resolved a `goto` with `anchorPos()`, which
answers for the loaded map, and read the null it got for anything downstairs
as "no such step" — so every cross-floor ticket was priced for a trip nobody
took. The bot skipped it too, for the same reason, which is why no per-day
number moved. 19/24 at 11.5 careers once the leg is actually walked.

## 2026-08-26 (fourth pass) — a player played it

Three bugs in the first ninety seconds of a real game, none of which any
harness could see, because none of them had ever played: an objective arrow
armed by queue length that never went out and pointed at the wrong tile under
the wrong name, a PRESS E instruction that silently fails when you are facing
the wrong way, and a tutorial line asserting a clock time and a countdown for
a meeting that does not happen.

All fixed and guarded. `tools/firstday.js` now plays the first day through
real key events and clicks and reads only what is on screen — including the
canvas, because the arrow is drawn, not written.

## What is left

- **Small talk is the third unfilled path, and it is clean by luck.** `smalltalk`
  hands its line to `openDlg` as `custom.text`, and `openDlg` fills `node.t` but
  passes `custom.text` through untouched. Swept: zero CHAT lines and zero NPC
  fallback lines contain a `{token}` today, so nothing is broken — but the
  ticket path was fine and the event path was not, and this one is structurally
  the same. Either fill `custom.text` too, or accept that a `{client}` written
  into a CHAT pool will reach the screen as braces.


- **The ground floor has no events of its own.** Six tickets go down there and
  two NPCs live there, but nothing in `EVENTS` happens on that floor. A fire
  drill, a client arriving early, the landlord's contractor — the floor can
  carry a scene, and does not have one.
- **`MEET_B` and `FRONT` are scenery.** 36 and 21 tiles from the lift, so
  nothing can be sent to them inside `CROSS_FLOOR_BUDGET`. Either they earn a
  reason to exist or the floor should say so.
- **54 nodes still carry a dominated option** and that is deliberate — they are
  jokes with a price tag. The list is a report in `tools/audit.js`. It is worth
  re-reading occasionally for the narrow case that is a bug: a dead option that
  reads as the *competent* one.
- The `GATE_DEBT` table is unchanged and still describes rungs no human has
  reached.

# Balance: what is measured, and what it means

Every number here was measured against the build in this repo, by a tool in
`tools/`, on the date given. Nothing in this file is a guess. When a number
moves, the tool that moved it is named.

The one rule: **a number nobody can re-derive is a number nobody should trust.**
This file exists because two earlier balance tables lived only in source
comments, went stale the moment the code changed underneath them, and were then
used to set the promotion gates twice.

## The measurement that invalidated everything before it

`simDay` charged a bot **0.238 minutes per tile**. A real player pays about
**1.05**. The queue row that tells you "~9 min walk" used **0.30**.

Three models of the same walk, never compared. The bot breached 2 tickets a day
where humans breached 15, ended a day at 22% stress where humans ended at 100,
and promoted to T1 in 12 seeds out of 12 while five human testers across roughly
thirty player-days promoted exactly never.

Fixed 2026-08-25: one constant, `WALK_MIN_PER_TILE`, read by the queue estimate
and by `simDay` alike. Every balance figure taken before that date describes a
game nobody plays.

### Why it is not guarded by a timed test

Three attempts, three different answers, none reproducible:

| where | measured | why it lies |
|---|---|---|
| inside `selfTest` | 5.38 min/tile | a tight `sim()` loop races the shift clock past a walk tween that waits on real time |
| in `tools/verify.js` | 0.39 min/tile | headless Chromium throttles rAF; clock and tween ride it and distort differently |
| real keys, real career | **1.05 min/tile** | matches a tester's independent 13 tiles in 13 game-minutes |

A check that reports a new number every run gets ignored and then deleted. What
IS asserted, exactly and cheaply, is that the bot and the player are priced off
one constant instead of two.

## The scoring ceiling

`dayPerf = earned / (stakesDone + burnedStakes)` — the share of a day's
available points that you banked. The day is **deliberately oversubscribed**:
it holds roughly half again as much work as one person can touch.

So the score has a hard ceiling near 50%, and **a 70% bar was never reachable
by arithmetic**, whatever anyone did to tuning. It had been set in the wrong
units. `BREACH_TOLERANCE` was .12 — forgiving as if the day held 12% more than
fits — and is now .35, forgiving in proportion to how oversubscribed the day
actually is.

Measured career-long distribution, 16 seeds x 8 days, best rolling 3-day window:

| profile | min | p25 | median | p75 | max |
|---|---|---|---|---|---|
| flawless | 29.6 | 40.8 | **45.9** | 51.2 | 56.8 |
| good | 28.6 | 39.8 | **44.1** | 49.7 | 55.0 |
| mediocre | 28.2 | 33.9 | **37.9** | 41.1 | 47.9 |
| sloppy | 19.5 | 25.6 | **30.6** | 33.5 | 46.7 |

Bars are set inside that range and flat across the ladder (0.44–0.46), because
achievable performance FALLS as a career runs on — burnout compounds, nights
give back less — so a rising bar makes the ladder harder in two directions at
once.

## CRAFT BARELY MATTERS. TRIAGE IS EVERYTHING.

The single most important number for anyone deciding what to build next:

- **craft** (how well you play the minigames) separates flawless from mediocre
  by **2 points** across a career — `SKILL_DEBT`
- **triage** (which ticket you work next) separates the same bot from itself by
  **24 points**: skill .35 playing correct priority order scores 52%, the
  identical bot playing worst-first scores 28%

The five minigame boards are most of the game's surface area and nearly all of
its art, and they move the outcome by almost nothing. That is not automatically
wrong — "you cannot clear the queue, triage IS the job" is the stated pillar,
and this is that pillar showing up in the arithmetic. But **a sixth board buys
no more discrimination than the fifth did**, and any plan to give every rung a
bespoke minigame should be read against this number first.

It also means "sloppy" must be measured as bad TRIAGE. Measured as bad craft, a
sloppy bot plays perfect priority order, scores 52%, and clears every gate —
which says nothing about the gate and everything about craft not mattering.

## Why the top of the ladder was shut (2026-08-26)

The previous version of this file ended "the top is still shut, and the reason
is not the bar" and blamed career-long degradation. That was wrong. Three
separate causes were found by measurement, and none of them was the bar.

### 1. One deal rate, copy-pasted down eight rungs

`ratePerHr` was **3.0 on every rung from T1 to vCIO** — 24 tickets a day —
while the tickets underneath it got steadily more expensive. Measured closures
per day for a flawless bot:

| rung | intern | t1 | t2 | t3 | project | procure | relmgr | solarch | vcio |
|---|---|---|---|---|---|---|---|---|---|
| closures/day | 7.6 | 7.3 | 6.2 | 5.4 | 4.3 | 3.7 | 2.9 | 2.4 | **1.9** |

Since the day is scored on the share of the pool you protect, perf fell 48% →
**14%**, under a 46% bar *and* under a 0.27 firing floor. **A flawless vCIO was
fired on arrival.** Every gate above Project Team was decoration.

### 2. Nothing cheap left to sacrifice

Triage is choosing what to drop. That needs droppable things. The disposable
(P4) share of the weighted queue, before the fix:

| rung | intern | t1 | t2 | t3 | project | procure | relmgr | solarch | vcio |
|---|---|---|---|---|---|---|---|---|---|
| P4 share | 25% | 22% | 15% | 12% | 9% | 8% | 7% | 7% | **6%** |

Every senior ticket had been authored as important, because everything a vCIO
touches feels important. The result was a rung where every option cost the same
and the choice between them was therefore not a choice. Measured: **bad triage
scored as well as good triage above Procurement**, and at vCIO it scored better.

Fixed with content, not tuning — fourteen senior tickets that are genuinely
droppable (`expenses-rejected`, `bake-off-judge`, `the-printer-on-two`, the
recurring invite whose organiser left in 2022). That is not filler: it is the
joke the game is about. The higher you go, the more of your day is nonsense
that only you can sign.

### 3. The calendar ate the day

Every rung ADDS events and none are ever retired, so eligibility accumulates:
**37 events live at vCIO against 12 at intern**, and the senior ones are the
long ones (mean 19.1 minutes against 5.5). Measured meeting time per day:

| rung | intern | t1 | t2 | t3 | project | procure | relmgr | solarch | vcio |
|---|---|---|---|---|---|---|---|---|---|
| meeting min/day | 27 | 24 | 24 | 32 | 59 | 82 | 121 | 143 | **151** |

**A third of a 480-minute day, gone before a vCIO touched a ticket.** This is
the funniest true thing in the file and it was quietly strangling the game.

Every event stays. The *calendar* now has a per-role budget (`meetingMin`):
meetings are kept in roll order until the rung's minutes are spent and the rest
are cancelled — which is what happens to a real senior calendar, and is the
best part of anyone's week. The opener is never cancelled; the standup is
load-bearing satire.

## How the deal rate and the bar are actually set

They are a **matched pair**. Change one and the other is wrong.

What the rate sets is not how much work you get — closures per day barely move
with it, because throughput is bound by the eight hours. What it sets is what
**share** of the day you can reach. And triage only separates good play from
bad when that share is roughly **30–45%**: above it you finish the queue in any
order, so order cannot matter; below it everything drowns and nothing you chose
shows up.

So each rate is the one whose flawless-vs-sloppy gap was widest with flawless
still landing in a sane band, and each bar sits between the two bots' medians
**at that rate**. Both come from `tools/bars.js`:

```
node tools/bars.js index.html            # is each bar placed right?
node tools/bars.js index.html --sweep    # which deal rate separates best?
node tools/bars.js index.html --window   # how many days should a gate average?
```

### What a bar is for, and the check that got it wrong

`bars.js` first judged a bar by asking whether flawless's 25th percentile beat
sloppy's 90th, and duly called **every rung in the game misplaced**. That is
asking whether a good player's bad career beats a bad player's best one, which
no game with seed variance survives. The question a gate actually decides is a
**clear-rate**: good triage should get through most seeds, bad triage should
not. Healthy is now defined as good ≥60% of seeds, bad ≤30%.

The lesson is the same one this file keeps learning: a measurement with the
wrong question in it is more dangerous than no measurement, because it comes
with a number attached.

### The gate window is not the dial

Averaging more days shrinks seed noise, so it looked like the fix for rungs
where skill drowned in variance. Swept 3–10 days: it does not help. Longer
windows lower both bots together. Gates stay at 3 days.

*(Caveat recorded because it nearly misled: any window longer than the shortest
career reads as 0, since careers that end early have too few days to fill it.
Only the 3–5 day rows of that sweep are trustworthy.)*

## The ladder after the pass, 12 seeds x 8 days (`tools/gate.js --ladder`)

| rung | rate | meetings | bar | floor | flawless misses | sloppy clears |
|---|---|---|---|---|---|---|
| intern | 2.2 | 30 | 53% | .24 | 2/12 | 1/12 |
| t1 | 2.8 | 34 | 41% | .18 | 3/12 | 1/12 |
| t2 | 2.8 | 40 | 42% | .19 | 4/12 | 1/12 |
| t3 | 2.8 | 48 | 38% | .17 | 4/12 | 1/12 |
| project | 2.2 | 60 | 38% | .17 | 4/12 | 1/12 |
| procure | 2.2 | 68 | 40% | .18 | 6/12 | 1/12 |
| relmgr | 2.2 | 78 | 41% | .18 | 5/12 | 1/12 |
| solarch | 2.2 | 84 | 38% | .17 | 4/12 | 1/12 |
| vcio | 2.2 | 88 | 42% | .19 | 3/12 | 2/12 |

`GATE_DEBT` total **45**, from 69. Before this pass the tight column read
8/12, 7/12, 11/12, 12/12, 10/12, 8/12 from T3 upward — **the top five rungs
were shut.** The loose column is now one seed in twelve on eight rungs of nine.

`tools/bars.js`, 24 seeds x 12 days: **all nine rungs healthy** — good triage
clears ≥60% of seeds, bad triage ≤30%. It was three of nine, and at vCIO bad
triage outscored good.

`tools/meta.js`, 24 players x 16 careers: **8 of 24 reach retirement**, best
rung DIRECTOR, average 12.6 careers to a win. It had never reached the top.

*(An 8-player run of the same build reported 1 of 8 and looked like a collapse.
It was small-sample noise. Reachability gets 24 players before anyone reacts
to it.)*

### vCIO: fixed by making its work cheaper, not by moving its bar

vCIO was the worst rung left — good triage separated from bad by 6 points, the
narrowest on the ladder. The cause was not the queue: the *theoretical* ceiling
there is 42 points, against intern's 47, with the widest stakes spread in the
game. The bots simply could not realise it.

| | closed/day | avg stakes per closed | perf |
|---|---|---|---|
| intern, good triage | 8.2 | 3.55 | 50% |
| intern, bad triage | 7.5 | 2.67 | 34% |
| vCIO, good triage | 5.5 | 4.27 | 37% |
| vCIO, bad triage | 6.1 | 3.19 | 30% |

Good triage buys the *same* relative advantage on both rungs — about a third
more value per ticket closed. But a vCIO day protected only **38% of its
queue's value** against an intern's 51%, so that advantage was swamped by the
burned pool. Cutting top-rung choice costs a second time took vCIO's separation
from 6 points to 10 and its closures from 5.5 to 6.2 a day. It is healthy now.

### The five-day gate: measured, and rejected

The gate fires on the **best rolling window** of a career, so a three-day window
in an eight-day career gives six chances and a bad player only needs one lucky
streak. That is exactly how sloppy triage backs into a promotion. Widening the
senior gates to five days was measured and it worked on that axis:

| rung | sloppy clears @3d | @5d |
|---|---|---|
| project | 25% | 8% |
| procure | 38% | 17% |
| relmgr | 29% | 8% |
| solarch | 29% | 4% |
| vcio | 25% | 8% |

`gate.js --ladder` liked it too: total debt 52 → 45. **Both tools said ship it.**

`tools/meta.js` — which plays whole careers rather than rungs — said the
opposite, and it was right: **3 of 8 careers reaching retirement became 0 of 8,
best rung DIRECTOR became procure.** At four days it was still 0 of 8 (best
rung solarch). Careers are burnout-limited, so every extra day a gate demands is
a day not spent climbing, and requiring five good days on five senior rungs put
the top of the ladder outside a career's budget entirely.

**Reverted to three days.** The trade is that bad triage clears 1–4 seeds in 12
at the top, recorded as `GATE_DEBT.loose` and unfixed.

The lesson is about the tools, not the window: two harnesses measuring rungs
agreed on a change that a harness measuring *careers* showed was ruinous.
Anything touching gate shape gets `meta.js` run against it before it lands.

### Bar placement (`tools/bars.js`, 24 seeds x 10 days)

Healthy = good triage clears ≥60% of seeds, bad triage ≤30%. **Eight of nine
rungs are healthy**; procure is the one still marginal. Before the pass it was
three of nine, and at vCIO bad triage outscored good.

## Craft vs triage, re-measured honestly

The old headline — *craft 2 points, triage 24* — was read off **a single
seed**. A 16-seed grid varying skill and triage independently:

| rung | triage @ skill 1.0 | triage @ skill .35 | craft (1.0 vs .35) |
|---|---|---|---|
| intern | 12 | 10 | 8 |
| project | 8 | 8 | 3 |
| vcio | 9 | 7 | 4 |

**Triage still dominates, but by 2–3x, not 12x.** Craft is worth 3–8 points,
not 2. The direction of the original finding holds and its magnitude does not;
the 24 was never reproduced by any multi-seed measurement.

`BREACH_TOLERANCE` .35 → **.20** came out of this. Forgiving the cheapest 35%
of a day's casualties subsidises bad triage at senior rungs, where even the
cheapest casualty is expensive: it took vCIO's triage separation from 3 points
to 8.

## The tests that were lying

Three, all in the F4 gate block, all the same disease — **one sample**:

1. Every assertion ran the single career `GATE-T`. A single career lands
   anywhere in a distribution twenty points wide, so the block swung from a
   clean pass to "mediocre beats flawless by 9 points" on a change `bars.js`
   called healthy across 24 seeds. Now 8 seeds.
2. Sampling 5 seeds and taking the **median** was no better: on two of the five
   the worst-triage bot outscored the best, the medians tied at 45%, and the
   means were four points apart. A median over a handful of samples is a single
   sample wearing a hat. Now the mean.
3. `play()` never pinned the rung. Every assertion is written against
   `ROLES[0]`'s bar, but `runInit` starts at `startingRung()` — `meta.carry` —
   so once a career had been banked the block measured one rung against
   another's gate and reported the mismatch as a balance regression.

Both re-baselines below move a ratchet the wrong way. Neither is a loosening:
the old numbers were measured with a statistic that could not reproduce itself.

## After the six bespoke boards (2026-08-26)

Rungs 4–9 each got a board of their own. That is eleven new tickets in the
senior pools, and a bigger pool is a bigger denominator, so the same play
protects a smaller share of it. Bars were re-derived and all nine rungs read
healthy on `tools/bars.js` (24 seeds × 12 days). Through `gate.js`'s harsher
12-seed, 8-day window the debt is **48, up from 45**.

| rung | bar | floor | flawless misses | sloppy clears |
|---|---|---|---|---|
| intern | 53% | .24 | 2/12 | 1/12 |
| t1 | 41% | .18 | 3/12 | 1/12 |
| t2 | 42% | .19 | 4/12 | 1/12 |
| t3 | 38% | .17 | 4/12 | 1/12 |
| project | 42% | .19 | 6/12 | 0/12 |
| procure | 38% | .17 | 4/12 | 2/12 |
| relmgr | 37% | .18 | 6/12 | 2/12 |
| solarch | 36% | .16 | 4/12 | 1/12 |
| vcio | 39% | .18 | 5/12 | 1/12 |

`tools/meta.js`, 24 players: **6 of 24 reach retirement**, best rung DIRECTOR,
average 14.7 careers to a win — against 8 of 24 at 12.6 before the boards.

The game got harder because it got bigger. The alternative was to drop the new
tickets' weights so they rarely deal, which buys the number back and loses the
rungs — a signature board nobody is shown is not content.

**The rule this establishes:** content and bars are the same matched pair as
rates and bars. Adding tickets to a rung changes what a day there is worth, so
`bars.js` and `meta.js` both get run after any content lands, not just after
tuning.

## The boards had no difficulty data at all

The career bots never play a board — `simDay` synthesises a craft score from
the skill dial — so six boards shipped with every invariant proving that
*perfect* play scores 1.0 and nothing at all saying whether a person could get
near it. `tools/boards.js` drives each board through three policies:

```
node tools/boards.js index.html [rounds=40]
```

| board | perfect | careless | random | gap |
|---|---|---|---|---|
| cable | 100% | 39% | 26% | 61 |
| pw | 100% | 47% | 53% | 53 |
| jargon | 100% | 34% | 28% | 66 |
| script | 100% | 57% | 49% | 43 |
| blast | 100% | 0% | 0% | 100 |
| subnet | 100% | 17% | 14% | 83 |
| quote | 100% | 32% | 46% | 68 |
| keep | 100% | 70% | 74% | 30 |
| diagram | 100% | 0% | 11% | 100 |
| paper | 100% | 0% | 7% | 100 |
| weekend | 100% | 0% | 38% | 100 |

Perfect play must reach ~100% or the board is unwinnable; careless must not
come within 20 points of it or there is no game in it; random is where a player
who has not read the card starts.

It found two things on its first run, neither of which any invariant could see:

**KEEPING EVERYBODY was completely broken.** `RM_MOVES.slice()` is a *shallow*
copy, so every hand held references to the same move objects and `mv.done` from
one board survived into every board after it. The second game a player opened
was already spent: the meters never moved and it scored the same 0.667 for
perfect play as for random. Two invariants passed straight through it — the
solvability check reads `fx` and never touches `done`, and "pleasing the client
is never how you do it" was green because the client-first bot **could not play
anything at all**. Nothing in the self-test opens a board twice in one process,
which is exactly what this harness does.

**THE SHORTFALL topped out at 68%.** Scored absolutely, the budget only ever
affords about two upgrades, so playing procurement flawlessly was recorded as
mediocre craft while every other board reaches 100%. It is scored against the
best quote that *fits* now — brute-forced at generation, 3^6 = 729
combinations, free and exact — which is the right question to be marked on
anyway.

### Three of the eleven drivers were wrong before any board was

Worth recording, because it is the failure mode of this whole technique: a
harness that drives a game can be measuring itself.

- **cable** finished 0 of 40 rounds. The driver never stepped the cursor past a
  cable it had already plugged, so it re-picked the same one forever.
- **pw** read 47/47/53, as though the board had no game in it. The "perfect"
  driver credited only the approvals — which is the careless policy — so the
  two were the same function under different names.
- **script** read 76% for perfect play. The driver fired the fix the moment it
  armed, throwing away every box still unbanked, on the one board whose own
  card says half the marks are the script and half are the call.

None of those was a fault in the game. Every flagged board gets read twice
before it gets touched.

## Nothing had ever pressed a key on a board

`boards.js` drives the boards by calling their methods and `visual.js` only
looks at them. Neither presses a key. Six boards shipped with input written
straight against `press.one`..`press.four` and never once driven through the
real keydown layer — and a key that is bound in the how-to-play card and dead
in the handler is indistinguishable, to a player, from a game that has crashed.

```
node tools/keys.js index.html
```

It opens each board for real, dismisses the card, presses every key that
board's card promises, and asserts the board's own state moves. **All eleven
boards, 53 bindings, none dead.** Deleting one binding is reported precisely
and only on the board that lost it.

Getting there took three corrections, all of them to the harness:

1. The real frame loop clears `press` every tick. Stepping the board by hand
   without an explicit `clearInput()` let a flag set by the *previous* key
   survive into the next board, which produced dead-key reports on boards
   nothing had been done to — and a different set of them on every run.
2. Stripping `flashTxt` from the state hash made three boards look dead for
   behaving correctly. A key that refuses and says why is not dead: *"that is a
   person, not a group"* is the game answering you.
3. A key can land on what is already set. Every quote line starts at ADEQUATE,
   so `2` sets what is already there — and moving the cursor does not help,
   because the next line starts there too. The sweep now perturbs with the
   board's own sibling keys until the key under test has somewhere to go.

The same tool sweeps the **click rects** — every `rowRect`, `optNRect`,
`tierRect`, `nodeRect`, `cardRect` and button each board declares. All live.
Two more harness corrections were needed: buttons must be tested **last**
(clicking SUBMIT first ends the board, and every rect after it then reports
dead — which is what the first run said about quote and diagram, both fine),
and the cursor must be parked **away** from the rect under test.

**What the click sweep cannot see, checked rather than assumed:** a rect in the
wrong *place*. The probe point is computed from the same function the handler
tests against, so moving quote's tier rects 900px off the panel moves the probe
with them and everything still reports live. It catches a rect that is declared
and never *wired* — deleting diagram's node hit-test reports exactly `node1
node2 node3`. Position is `visual.js`'s job.

cable and script hit-test partly inline rather than from a declared rect, and
the sweep says so rather than counting them as covered.

## The most-dealt ticket at every rung was the intern tutorial

Measured over 12 seeds x 6 days at each rung: `coffee-derek` — `tiers:[0,0]`,
"Coffee for DEREK before the standup" — was **the single most-dealt ticket at
all ten rungs**, 7–10% of every arrival. `rollDay` filters the bag by tiers and
then force-feeds the day-one tutorial ticket straight past that filter, and
careers start as high as vCIO from carried reputation. A resumed vCIO career
opened on fetching Derek a coffee.

Fixed, and the *general* form is guarded rather than the specific one, because
the specific one was written on purpose:

    no ticket is ever dealt outside its own tiers

Careers that do not start at the bottom get their own opener now —
`first-day-back`, whose accounts were set up by somebody who has never met
them, whose display name is their email address, and who is in one group called
"Temp".

## TRIAGE_EDGE was set from a lucky sample, three hours after I wrote that down

The ratchet went in at **9**, read off eight seeds. The next content change
took it to 8.2 and tripped it. Measured properly, the quantity moves:

| sample | edge |
|---|---|
| GATE-T x8 | 8.2 |
| GATE-T x16 | 5.2 |
| GATE-T x32 | 6.1 |
| ALT x16 | 8.8 |
| ZZ x16 | 9.3 |
| QQ x16 | 10.6 |

Roughly six, with three points of spread either side. A ratchet pinned to one
reading of a number that moves that much is a ratchet that gets edited away the
first time it fires — which is worse than a lower one that means something. The
self-test samples **16 seeds** now, and `TRIAGE_EDGE` is **4**: under the floor
of everything observed. Mutating `dayPerf` so that what you let burn stops
counting fails five invariants including this one.

The lesson is the one this file already contains, in the section about a
single-seed reading of 24 points. It was written three hours before the 9 was.

## Four rungs shared one calendar

Every senior rung got five bespoke meetings when it was built. Intern through
T3 shared a single ungated pool of twelve — so the first four promotions, the
ones players actually live through, changed the tickets and never the week.

Seven helpdesk meetings now: the queue review where Linda reads your numbers
back to you, shadowing Raj (who is shadowing you at the same time, which nobody
has acknowledged), the new call script with a line in it that is not true on
Tuesdays, the on-call handover where two people were on call and both thought
it was the other one, your first change advisory board, the escalation review
where four of the six went past T2 because T2 was in this meeting, and the
knowledge base amnesty that will be cancelled next month for capacity reasons.

**The meeting budget absorbed them, which is what it is for.** Adding seven
events to rungs 1–5 moved the actual load only as far as each rung's cap
allows — T2 from 23 to 33 minutes against a 40-minute budget — so the *variety*
rose and the *cost* did not run away. More meetings to draw from, the same
week.

Bars were re-derived per the matched-pair rule. `GATE_DEBT` **48 → 46**, and
`meta.js` improved: **7 of 24 players reach retirement at 12.4 careers**,
against 6 of 24 at 14.7.

Relationship Manager remains the marginal rung. Its good-versus-bad gap reads
between 7 and 12 points across runs at 24 seeds, which straddles the healthy
line, so its bar reads "misplaced" on some sweeps and not others. That is
measurement noise around a genuinely narrow gap, not a bar that needs moving
again — it is the rung to look at next if anything here gets looked at.

## A repeated key is not an error, it is a silent deletion

A duplicate key in a JavaScript object literal is legal: the later one wins and
everything written under the earlier one is discarded, without a warning. This
file is twelve thousand lines of object literals, and it has now been bitten
three times:

- `worst` in `run.lastScore`, shadowed by the burn ledger forty lines below it
  in the same literal. Dead code from the day it was written; the review screen
  printed `worst: a P[object Object],...` to every player who breached.
- a `const dealt` collision that stopped the page parsing — the only one of the
  three that failed loudly, because `const` does.
- three CHAT entries given rung-aware lines that were thrown away in silence,
  because entries for those people already existed further down the table.

The self-test cannot see any of it: by the time it runs, the object has already
collapsed. So `tools/verify.js` checks the **source text** — every `const
UPPERCASE = {` table, every key, counted. It found two real duplicates on its
first run: a scene id collision where a second procurement ticket had been
written with the same premise as one already in the pool, in different words,
so its dialogue was dead the moment it was saved and both tickets showed the
older scene. The redundant ticket is gone and the board went to the ticket that
was already there.

A similarity scan across all 194 ticket titles found no other pair above 0.62.

## The desk moves now, and it costs you

Every role shipped with `deskAnchor:'TERMINAL'` — one chair for nine
promotions — while the plan had always said the desk should relocate and
improve as you climb the same map. Nine desks now, walking you steadily away
from the pit: the far end of the helpdesk, the good end of it, beside the
terminal, the project room downstairs, the client side, and finally the quiet
suite off Linda's office.

It is not decoration. **Tickets are priced from your desk**, so the printer and
the coffee machine genuinely get further away as you get more senior, and an
errand costs a Solutions Architect real minutes it never cost an intern. That
is the joke and it is also the mechanic.

What it did to the ladder:

| | before | after |
|---|---|---|
| `GATE_DEBT` | 46 | **45** |
| relmgr / solarch, sloppy clears | 2/12, 2/12 | **0/12, 0/12** |
| relmgr / solarch, flawless misses | 6/12, 4/12 | 7/12, 8/12 |
| `meta.js`, players reaching retirement | 7/24 | **11/24** |
| bars.js | 1 rung misplaced | **all nine well placed** |

The two rungs sitting furthest from everything pay for it in the tight column
and buy the loose column outright. That is the right way round: a gate a bad
player clears is worse than one a good player sometimes has to wait for. And
more careers reach the top than before, not fewer.

Three invariants, because `deskAnchor` is a field that would mis-price every
SLA on a rung rather than fail if it were wrong:

    every rung has a desk you can actually stand on
    and the desk moves as you climb
    and you can walk to it from the front door

The first one earned its place immediately: `DESK_ARCH` was written at [34,18],
which is a server rack.

## Reputation bought one exam, and then nothing, forever

Reputation accumulates across every career you have ever had. There was a single
certificate costing three of it, and after that banked reputation did nothing at
all except set the rung you are re-hired at. For a roguelite, the meta layer is
the game; this one had one row in it. The plumbing was hardcoded to that one id
in two places, so a second entry in the table would have been bought, banked,
displayed, and completely inert.

Four certificates now, read generically through `metaFx()`: A+ makes the boards
a step easier, ITIL forgives one more casualty a day, PRINCE2 takes a fifth off
the meeting budget, CISSP slows burnout by a fifth. Three perks arrive on their
own as the careers add up, the last of them slowing burnout a further tenth.

**The bots hold no certificates**, so every number in this file is measured on
the bare game and certificates only ever make it easier from a known floor. That
is the only honest way round, and it is why the ladder table did not move when
this landed. What did move is `meta.js`, which plays whole careers and therefore
does earn the perks: **12 of 24 players reach retirement at 13.3 careers**,
against 11 at 14.3.

Four invariants, because "a certificate that does nothing" is a price tag:

    every certificate declares an effect the game reads
    and holding it actually changes something
    the study list offers every certificate you do not hold
    two things that slow burnout compound

The last one is the one that would have gone wrong silently: two multipliers
where the second overwrites the first look identical until somebody holds both.

## The third time the same fix worked

The middle of the ladder had the same disease the top did, and it took three
separate discoveries of it to see that it is one disease.

Droppable (P4) share of the weighted queue, before and after:

| rung | intern | t1 | t2 | t3 | project | procure | relmgr | solarch | vcio |
|---|---|---|---|---|---|---|---|---|---|
| before | 25% | 19% | 12% | 9% | 7% | 14% | 17% | 17% | 16% |
| after | 25% | 30% | 26% | 22% | 20% | 24% | 23% | 17% | 16% |

Eighteen tickets had just landed on T1–T3 to fix a *breadth* problem, and they
were mostly P1s and P2s — so the middle of the ladder got heavier without
getting more decidable. Twelve more, all of them things you are allowed to let
burn, and every narrow rung's good-versus-bad gap widened with them:

| rung | gap before | gap after |
|---|---|---|
| project | 9 | 12 |
| procure | 8 | 11 |
| relmgr | 9 | 11 |

Then six more for Solutions Architect and vCIO, the last two rungs still under
20% droppable — the editable Visio file Sales want so they can remove the box
that says the thing they have been telling the client is not a limitation; the
naming-convention thread on its fourteenth reply; the forty-page document
attached to the words "could you just sanity check this".

**Final position, all three axes at once:**

| | |
|---|---|
| `GATE_DEBT` | **46**, from 50 |
| `bars.js` | **all nine rungs well placed** |
| `meta.js` | **15 of 24 players reach retirement**, at 12.4 careers |

For comparison, before this whole pass: the top five rungs were shut, a flawless
vCIO scored 14% against a 46% bar and was fired on arrival, and `meta.js` had
never reached DIRECTOR at all.

**The rule, now that it has held three times:** a rung that will not separate
good triage from bad wants *cheap work in it*, not a different bar. It was true
of the senior rungs, then of vCIO, then of the middle of the ladder. Adding
important-feeling content to a rung that is already all-important makes it
worse, and that is the trap every time — because important content is the
content that feels worth writing.

## The README was wrong about the game's central claim

It said: *"A P1 is worth much more than a P4, so the big ugly ticket beats the
quick easy one nearly every time."* Measured over 40 seeds x 6 days
(`tools/dials.js`), the quick easy one wins:

| strategy | perf | closed/day | breached/day |
|---|---|---|---|
| shortest first | **0.490** | 9.84 | 6.73 |
| priority then deadline | 0.472 | 8.03 | 8.54 |
| priority | 0.463 | 7.89 | 8.68 |
| newest first | 0.458 | 8.61 | 7.96 |
| deadline then priority | 0.419 | 8.02 | 8.55 |
| most slack first | 0.402 | 7.58 | 8.98 |
| longest first | 0.384 | 7.08 | 9.49 |
| worst priority first | 0.364 | 7.82 | 8.75 |
| **oldest first** | **0.362** | 7.00 | 9.57 |

Two things fall out of it, and the second is better than the claim it replaces.

**There is no single right answer, and that is the design working.** *Protect
the big ones* and *close what you can actually finish* are within two points of
each other. A game where one triage rule dominates is a game with a solution.

**Working the queue in the order it arrived is exactly as expensive as
deliberately doing the least important thing first.** 0.362 against 0.364 — the
two worst strategies available, and indistinguishable. That is the whole satire
in one number, and it feels like diligence the entire time you are doing it.

It is pinned now, next to the triage edge it belongs with:

    gate: working the queue in order is as bad as working it backwards

## The lift finally goes somewhere

There was one on-site ticket. Its prose said *"ninety minutes each way"* and it
charged you a walk to the lift and a cable board — about eleven minutes. The
largest decision an MSP day contains cost less than a printer jam.

Five now, all at weight 1 so one lands about once a week. Each is the same
shape and it is the real dilemma: **drive out and lose sixty-odd minutes of a
480-minute day, or try to talk somebody through it down the phone for twenty.**
It is the only decision in the game at that scale.

| | |
|---|---|
| `GATE_DEBT` | 46 → **50** |
| t3, procure | one seed of flawless reach each |
| solarch, vCIO | two seeds of sloppy each |
| `meta.js` | 15 of 24 → **17 of 24** reaching retirement |
| worst rung any of 24 finished on | procure → **relmgr** |

**Two caveats, because both would mislead somebody later:**

`botPick` with no policy takes option **zero**, and every on-site lists the
going option first. The bot therefore drives out *every single time* and pays
the worst case; a person would not. Every number above is the pessimistic
reading of this mechanic. It also means option ORDER is a balance input across
the whole game, which nothing had noticed before.

`gate.js` measures 12 seeds × 8 days; `bars.js` measures 24 × 12. They disagree
by three or four points of debt at the margin, and `bars.js` reads eight of nine
rungs healthy on exactly this build. **The ratchet is the smaller sample** —
that is the conservative choice, not the accurate one.

Procurement is now the narrowest rung on the ladder at 8 points, and the one
`bars.js` still calls misplaced. It has already had its chaff; the gap is
structural. It is the named next job.

## The server room was a cul-de-sac, and it was holding the balance up (2026-08-26)

`SERVERS` is the destination fourteen tickets send you to — more than any other
anchor in the game. It cost **70 to 90 minutes** to reach from every desk on the
ladder except the two that are inside it.

The map is why. The east room's only door faced south, into the back corridor,
so the path from the helpdesk pit ran the length of the floor, west through the
kitchen, and back east again. A player physically walking it spends about
seventy seconds holding a direction key, each way, inside an eight-minute day.

One door in the north wall:

| rung | SERVERS, before | after |
|---|---|---|
| intern | 71 | 40 |
| t3 | 75 | 30 |
| procure | 74 | 32 |
| relmgr | 75 | 9 (printer 75 -> 22) |
| solarch | 75 | 3 (printer 75 -> 30) |
| vcio | 89 | 45 |

The existing flood-fill had proved every anchor **reachable**, which is not the
same as reachable in time, and it passed this happily for months. The new lint
charges `WALK_MIN_PER_TILE` across the real path from every rung's desk to every
anchor a ticket can demand, and fails anything over `WALK_BUDGET` (62 — the
architect-to-lift leg, which is the length of the floor and ought to hurt).
Re-sealing the wall fails it with 26 legs over budget.

### And the walking tax was secretly supplying the game's variance

Fixing the door made the gates **worse**, which is how the rest of this got
found. `sla` is `work x slaMult`, so cheaper walks meant smaller tickets and
smaller tickets meant less absolute slack. The rungs whose good-vs-bad gap
collapsed were exactly the rungs whose ticket-size spread collapsed:

| rung | CV of ticket work, before -> after | gap before -> after |
|---|---|---|
| relmgr | .741 -> .445 | 8 -> 8 |
| solarch | .757 -> .533 | 9 -> 7 |
| t3 | .595 -> .376 | 16 -> 12 |
| procure | .579 -> .425 | 8 -> 4 |

**Triage only matters when the tickets are different sizes**, and for months the
thing supplying that difference was a bug. The spread is authored now — six fat
multi-stop jobs, three of them P1 and three P3/P4, because "big" has to be
independent of "important" or the queue sorts itself and there is no decision
left.

## The day was drowning, and the score was mostly measuring the water

Three fixes were tried against the collapsed gaps and each made them smaller.
`tools/score.js` is new and says why: it takes `dayPerf` apart into the three
terms it is made of — stakes closed, realisation, and burn — because `bars.js`
reports the number those produce and cannot say which one moved.

| rung | flawless breach | burn as share of the denominator |
|---|---|---|
| t2 | 74% | 68% |
| t3 | 78% | 72% |
| procure | 76% | 73% |
| relmgr | 74% | 72% |

A flawless triager burned three quarters of the queue every day, and a sloppy
one burned 39.0 stakes against 41.0 — near enough the same. Burn was most of the
denominator and burn barely moved with skill, so the score was mostly measuring
how much of an impossible day evaporated. That is not pressure, it is weather.

Deal rates came down, swept per rung rather than shared out of a copy-paste:

| rung | flawless breach | flawless day score |
|---|---|---|
| intern | 59% -> 39% | .455 -> .624 |
| t1 | 69% -> 40% | .350 -> .633 |
| t2 | 74% -> 42% | .295 -> .594 |
| t3 | 78% -> 58% | .264 -> .456 |
| vcio | 69% -> 62% | .366 -> .433 |
| director | 59% -> 51% | .500 -> .585 |

## Urgent work needs a clock that outlasts the ticket you are holding

The one rung none of that reached was Relationship Manager, at a 4-point gap.
The burn ledger (`run.burnLog`, dumped by priority) found it: flawless triage
lost **1.38 P1s a day** and deliberately-worst triage lost **1.55**. Doing the
important thing first bought you almost nothing.

Because triage only happens **between** tickets. You cannot abandon work
half-done, so a P1 landing thirty minutes into something else has to survive
that wait or it dies whatever you decide. Its window was `work x 1.8` and the
work either side of it was 30-40 minutes, so it usually did not. Triage skill
was being asked to save tickets that were already unsaveable.

`URGENT_GRACE` widens the top two bands (P1 x2.0, P2 x1.5):

| rung | gap x1 | x1.6 | x2.0 |
|---|---|---|---|
| t2 | 5.8 | 11.9 | 11.6 |
| t3 | 7.8 | 12.3 | 13.0 |
| project | 6.4 | 10.7 | 12.5 |
| procure | 5.8 | 10.1 | 9.1 |
| relmgr | 3.1 | 8.6 | 13.0 |
| solarch | 5.3 | 9.7 | 13.5 |
| vcio | 10.3 | 12.8 | 13.6 |
| director | 12.0 | 16.6 | 19.7 |

It reads right, too. A P1 gets a bridge call and an agreed target; a P4 gets
whatever the portal said when it was raised.

## Measured and rejected, so nobody spends the afternoon on them again

**Widening the bottom two bands.** The mirror of the fix above, and run first.
Longer P3/P4 windows shrink every gap on the ladder, because a P4 that lives
longer is one the bad triager finishes before reaching the P1 anyway.

**Breach tolerance as a skill multiplier.** Forgiveness goes to the *cheapest*
casualties first, so raising it looked like it should reward exactly the player
who sacrifices cheap tickets on purpose. Swept `.20` to `.65` across all ten
rungs: it lifts good and bad by the same 10-14 points and moves the gap by 1-3,
which is noise. It is a difficulty dial, not a skill dial.

**Priority and urgency being uncorrelated.** If P1s were also the most patient
tickets, deferring them would cost nothing and the priority number would be
decorative. Measured across all 240 templates: `corr(pri, slaMult)` is -0.45 to
-0.71 at every rung but T3, where it is -0.28 and the P1 band is fractionally
*more* patient than the P2 band. T3 is the only rung where that is worth fixing.

**Restoring the offered work with deal rates.** After the door, work offered per
day fell 8-19%. Putting it back with rates restored the volume and not the
score, because the door took away *slack*, not *work* — the day got less patient
without getting shorter.

**Procurement's narrow gap, five earlier hypotheses.** Ceiling, droppable share,
priority mix, P1 work cost, daily slot share — all identical to T3's. A sixth,
share of arrivals by priority band, is also eliminated: 20.8% P1 at procure
against 21.9% at T3. The real answer was `URGENT_GRACE`, and it was never a
procurement problem at all.

## Where the bar actually belongs

`bars.js` places a bar at flawless p25, which is right for one eight-day stretch
and too generous once a whole career is in view — a career gets many three-day
windows, not one. Bisected against `meta.js` instead, which is the harness that
answers "is a career winnable":

| bar at | p25 | midpoint | +2pts | p50 |
|---|---|---|---|---|
| reached retirement | 24/24 | 21/24 | 12/24 | 7/24 |
| careers to win | 5.3 | 6.8 | 7.6 | 9.9 |

Settled just above the midpoint: a competent player (skill .85) retires in 18 of
24 careers averaging 8.1; a weaker one (skill .70) in 9 of 16 averaging 9.8.
Sloppy triage clears its gate in 0-30% of seeds at eight of nine rungs, against
50-97% before. Relationship Manager is still the weak one at 40%.

## Priority has to mean urgency, and at T3 it did not

The triage rule sorts by priority **first** and only breaks ties on the
deadline, so a ticket that is valuable but in no hurry outranks one that is
genuinely about to breach — and the player who "did the P1s first" loses the
day doing it.

T3 was full of them. TKT-4471, open 412 days. "Please close, I sorted it
myself." A ticket whose subject is "hi", no body, no name. One blank page after
every document, since 2019. All `pri:4`, all worth the most stakes on the board,
not one of them urgent by its own title.

| rung | P1 | P2 | P3 | P4 | corr(pri, slaMult) |
|---|---|---|---|---|---|
| t3, before | 1.94 | 1.86 | 1.96 | 2.28 | **-0.284** |
| t3, after | 1.68 | 1.90 | 2.03 | 2.28 | -0.543 |

Two fixes, both content and neither a dial: demote the five that are
important-but-not-urgent, and tighten the window on the two that should have
been urgent all along (a door badge PC 340 days up with 61 patches pending; a
scheduled task called "temp" running at 02:00 since 2019 whose author has left).

`URGENCY_SLOPE` (-0.45) is the new ratchet, alongside a band-ordering lint: P1
tightest through P4 loosest at every rung.

## The evening card was grading on a curve that no longer existed

Two verdict systems on the review screen — the prose line and the PERFORMANCE
headline — were both **absolute**: `.80` great, `.60` good, `.40` poor. That was
fine while every rung scored in the same range and became a lie the moment the
rungs were tuned individually.

| | score | old verdict |
|---|---|---|
| a **flawless** Solutions Architect day | .575 | *Derek looked at your queue, then at you, then just... exhaled* / DEVELOPING (HR WORD FOR STRUGGLING) |
| a **sloppy** Project Team day | .629 | *You closed the ones that mattered and let go of the ones that did not* / MEETS EXPECTATIONS |

Banding off the promotion bar was the first attempt and wrong in the other
direction — the bar is cleared by the best three-day window of a career, so an
average flawless day sits below it, and nine rungs out of ten then told a
player who had done everything right that the day got away from them.

Everything reads off `reviewAt` now: **0 is the floor they fire you under, 1 is
the bar they promote you over.** Measured across the ladder, a flawless day
lands at 80-90% of that span and a sloppy one at 29-54%, so the bands are cut at
100 / 70 / 40. It is the only way the same sentence can mean the same thing at
ten desks with ten different score ranges.

Found while photographing a real evening to check the previous fix, which is the
argument for photographing it.

## The deal rates were swept before URGENT_GRACE existed

The matched-pair rule caught this one on the way out. Every rung's deal rate was
swept and set BEFORE the urgent-window fix landed, so all of them were tuned to
a world where a P1 could not survive being deferred. With the grace in place the
day affords far more work, and the burn ledger said so plainly: Project and
Procurement were protecting their P1s beautifully (a 2x good-vs-bad ratio) and
burning only 8 stakes a day — too little for the burn term to move the score at
all. Their days had become under-subscribed.

Re-swept, and every one of them wanted more:

| rung | rate | gap at old rate | gap at new |
|---|---|---|---|
| t2 | 1.3 -> 1.9 | 9.3 | 20.0 |
| t3 | 1.6 -> 1.5 | 12.4 | 23.1 |
| project | 1.1 -> 1.5 | 12.4 | 16.1 |
| procure | 1.1 -> 1.5 | 7.9 | 21.2 |
| relmgr | 1.1 -> 1.9 | 7.7 | 14.0 |

**Anything that changes what a day can hold invalidates every deal rate on the
ladder.** That is the third time the same lesson has been paid for in this file.

## Procurement was the last one, and its rate was the last stale number

`tools/score.js` names which of the three terms carries each rung's gap, and
Procurement's read `bad burns +-0.2`. Every healthy rung has the sloppy bot
burning 3.5 to 8.8 stakes a day MORE than the careful one; at Procurement it
burned very slightly less. The burn term — the largest of the three — was
contributing nothing at all, and the rung's whole 7.3-point gap came from the
other two.

The burn ledger said why, at both ends at once:

| rung | flawless P1s burned | sloppy P1s burned | ratio | gap |
|---|---|---|---|---|
| t2 | 0.48 | 1.12 | 2.33 | 21.0 |
| relmgr | 1.01 | 2.11 | 2.09 | 18.7 |
| t3 | 0.57 | 0.96 | 1.68 | 10.9 |
| **procure** | **1.02** | **1.50** | **1.47** | **7.3** |

Procurement's *flawless* player was losing a whole P1 a day — twice what T2's
loses — while its sloppy player lost only half again as many. Both ends
compressed, so there was nothing for the score to read.

Its deal rate was the culprit and it was stale for the same reason all the
others had been: swept at 14 seeds, which is not a measurement. Re-swept at 26,
against two dials rather than one:

| rate | meetings | good | bad | gap | breach |
|---|---|---|---|---|---|
| 1.5 | 68 | .575 | .480 | 9.6 | 54% |
| **1.9** | **68** | **.513** | **.363** | **15.0** | **61%** |
| 2.3 | 68 | .445 | .277 | 16.8 | 67% |
| 1.9 | 50 | .537 | .388 | 14.9 | 59% |
| 2.3 | 50 | .466 | .296 | 16.9 | 66% |

The meeting load is not the lever — 68 minutes against 50 is 15.0 against 14.9,
inside the noise — which is worth knowing, because the meetings are the joke and
now they do not have to be paid for. Rate 1.9 doubles the gap and leaves the day
playable; 2.3 buys two more points for six more points of breach and is the
drowning trade again.

## T3 had the same signature, and the same cause

`bad burns +1.9` where a healthy rung reads +3.5 to +8.8 — Procurement's tell,
one rung up the ladder. Same recipe, and the same answer: its deal rate had been
swept at 14 seeds too.

| rate | meetings | good | bad | gap | P1s burned good/bad | breach |
|---|---|---|---|---|---|---|
| 1.5 | 48 | .646 | .500 | 14.5 | 0.53 / 1.07 | 46% |
| **1.9** | **48** | **.582** | **.384** | **19.8** | **0.75 / 1.71** | **53%** |
| 2.3 | 48 | .462 | .288 | 17.4 | 1.11 / 2.42 | 65% |
| 1.9 | 34 | .589 | .406 | 18.4 | 0.71 / 1.62 | 52% |

Meetings are not a lever here either — 48 minutes against 34 is 19.8 against
18.4. Two rungs, two independent sweeps, same conclusion: **the meeting load is
satire, not balance, and it never has to be traded away.**

**Fourteen seeds is not a measurement.** Three separate numbers set from 14-seed
sweeps in one session had to be redone at 26. Sweep at 26 the first time.

## Project Team: the same fix, and this time meta.js said no

Third rung, same recipe, and the rung-level numbers looked as good as the other
two: at 26 seeds, raising the deal rate from 1.5 to 1.9 takes Project Team's gap
from **11.0 to 17.9** and its P1 burn ratio from 1.75 to 2.12. On every reading
`bars.js` and `score.js` can produce, it is the same win T3 and Procurement got.

`meta.js` refused it. The share of players reaching retirement fell from
**75-80% to 35%**, and — the tell — the bar bisection went *non-monotonic*:
f=0.250 gave 35%, and every lower bar gave 25-30%. When lowering the bar stops
helping, the bar is not what is stopping people.

The reason is that a rung's gap is **local** and a career is a **series
product**. Every career has to pass through Project Team, and by then T2, T3,
Procurement and Relationship Manager are all already at 1.9. Each of those was
a good trade measured alone. The fifth one was not, because the ladder has a
total difficulty budget and by that point it was spent.

Reverted. Project Team keeps rate 1.5 and a 12-point gap, which is the
narrowest on the ladder and is the right price for a career arc that works.

**This is the fourth time this session a rung-level harness and `meta.js` have
disagreed, and the fourth time `meta.js` was right.** The rule stands: run
`meta.js` against anything that touches gate shape, and believe it over the
rung.

## Where the ladder stands, 2026-08-26 (final)

Read straight off the shipped file and re-measured at 30 seeds x 8 days per
rung, plus 24 careers. **No rung is misplaced** — `bars.js` reports ALL BARS
WELL PLACED, which has not been true before.

| rung | rate | meetings | bar | floor | flawless p50 | sloppy p50 | gap | good clears | bad clears |
|---|---|---|---|---|---|---|---|---|---|
| intern | 1.9 | 30 | 0.772 | 0.347 | 80% | 62% | 18 | 67% | 0% |
| t1 | 1.9 | 34 | 0.756 | 0.340 | 78% | 61% | 16 | 63% | 3% |
| t2 | 1.9 | 40 | 0.635 | 0.286 | 69% | 48% | 21 | 73% | 10% |
| t3 | 1.9 | 48 | 0.631 | 0.284 | 64% | 46% | 19 | 67% | 3% |
| project | 1.5 | 60 | 0.624 | 0.281 | 67% | 54% | 13 | 67% | 17% |
| procure | 1.9 | 68 | 0.513 | 0.231 | 57% | 43% | 14 | 73% | 10% |
| relmgr | 1.9 | 78 | 0.501 | 0.225 | 59% | 42% | 17 | 83% | 27% |
| solarch | 1.7 | 84 | 0.611 | 0.275 | 65% | 49% | 16 | 60% | 17% |
| vcio | 1.7 | 88 | 0.641 | 0.288 | 70% | 53% | 17 | 67% | 17% |
| director | 1.6 | 80 | — | 0.310 | — | — | — | — | — |

Careers: **18 of 24 reach retirement at skill .85, averaging 11.4 careers; 12 of
16 at skill .70, averaging 11.9.**

Where the day began: gaps of 3-10 points at the mid rungs, sloppy triage
clearing its gate in 33-97% of seeds, and a flawless triager burning three
quarters of the queue. Gaps are 13-21 now and sloppy triage clears 0-27%.

Project Team is the narrowest at 13 and is the one rung a rate cannot fix —
raising it widens the rung and collapses the career arc, and eight new tickets
written for it did not move it either. Anything further there is content with
sharper consequences, not a dial.

### A note on where these numbers come from

This table was wrong for several hours before it was checked against the file.
It carried Procurement at .57 and Relationship Manager at .54 (both re-bisected
since) and Solutions Architect at rate 2.2 when the shipped value has been 1.7
since its own sweep — an error that also reached a commit message.

Every number here is now read out of `index.html` rather than copied forward
from the previous version of the table, because a balance document that
misstates the shipped build is worse than no document: the next session tunes
against a ladder that does not exist. **Re-read the file; do not trust the
table above its own last edit.** The table above is generated —
`node tools/ladder.js index.html --measure` prints it. Paste it; never retype
it.

### And the bisection is a command now

Hand-bisecting nine bars against `meta.js` cost four rounds today and happened
twice. `bars.js --careers --target=0.75` does it: every bar is placed at the
same fraction **f** of the way from its own flawless p25 to its own p50, and f
alone is bisected until the share of careers reaching retirement hits the
target. One dial, nine bars, each still measured against its own distribution.

It converged on f=0.547 (75% retire, 10.7 careers) and its answer landed within
a few points of the bars that were already in the file:

| rung | hand-tuned | bisected |
|---|---|---|
| intern | 0.785 | 0.785 |
| t1 | 0.765 | 0.760 |
| t3 | 0.735 | 0.690 |
| procure | 0.680 | 0.675 |
| relmgr | 0.530 | 0.564 |
| solarch | 0.605 | 0.601 |

Two independent methods agreeing is the only evidence these numbers have ever
had, so it is worth writing down. The shipped bars are the hand-tuned ones,
because those are what the full battery and 24 careers were actually measured
against; the tool is for the next time the scoring moves underneath them.

## Nothing had ever played a career to its end

Every gate, bar, rate and ratchet in this file is measured a rung at a time.
The shape of a whole career — how far you get, how long you last, and what
finally stops you — was assumed for the entire life of the project.

Played out, five personas over sixty careers, each starting from scratch at the
intern desk with no banked reputation:

| persona | ending | best rung | median rung | median days |
|---|---|---|---|---|
| slacker | fired 12/12 | intern | intern | 5 |
| sloppy | fired 10, burnout 2 | t2 | t1 | 12 |
| coffee-abuser | fired 9, burnout 3 | t2 | t1 | 18 |
| ordinary | burnout 7, fired 5 | t3 | t2 | 17 |
| diligent | burnout 11, fired 1 | project | t3 | 16 |

The assumption held, which is the only reason it is worth pinning. A slacker is
fired inside a week without leaving the pit — the original plan's target was
"slacker fired by day 5" and it lands on 5 exactly. A careless career ends
around T1 with a sacking. A careful one climbs to T3 or the Project Team and is
stopped by **burnout**, not by Linda: the run-ender the plan names, reached by
the player who did nothing wrong.

**Neither win ending appears in a single career, and that is correct.** One
career takes you about a third of the way up; the meta layer — reputation
banked, next career started higher — carries the rest. `meta.js` reports 17 of
24 players retiring precisely because it plays up to fourteen careers each.

The new invariant guards the ORDER, not the numbers: care must out-climb
carelessness and out-last it, and a careful career must end in burnout rather
than the sack. A change that let sloppy triage climb higher than careful triage
would pass every other test in this file. Zeroing the intern's fired floor
fails it; flattening `STAKES` so priority is worthless fails six tests.

## Dates, not fires — eight tickets for Project Team, and an honest result

Project Team is the one rung a deal rate cannot fix, so it got content instead:
eight dated commitments with tight windows. A thing that is due, that is not on
fire, and that stops being possible at a specific hour whether or not anyone is
looking — the crane booked for Saturday with the cabinet still in Rotterdam,
sign-off that has to be in before five or the install slot goes elsewhere, the
engineer who flies in Tuesday for fibre nobody ordered. That is the rung's whole
joke and it was underweight in its own pool.

**It did not move the gap.** Project Team went from 12.8 to 11.4 points at 14
seeds and 12 to 13 at 30, and its burn ratio did not shift at all. What the
content *did* do is make rungs 4-8 harder across the board, which dropped
careers from 17/24 to 14/24 until the bars were re-bisected.

Two things worth keeping from that. The content is good on its own terms and
every lint passes it, so it stays — the game is a satire pool first and the
pool is deeper for it. And the re-bisection took one command where the same job
took four hand rounds in the morning, which is the tool paying for itself the
same day it was written.

The duplicate-key lint also earned its keep on the way in: `p.lic.a` and
`p.lic.b` already existed in Procurement's block, and without the lint the new
pair would have silently won and quietly replaced a shipped Procurement ticket's
dialogue with a Project Team one.

## Craft versus triage, resolved

This has been an open question for Josh since the day craft was re-weighted, on
the grounds that craft measured 3-8 points against triage's 7-12 and might need
to feed the day score harder. Measured cleanly at 24 seeds after the ladder pass
(`tools/dials.js`):

| triage rule | day score | | skill | day score |
|---|---|---|---|---|
| shortest-first | **71.3%** | | .95 | **69.0%** |
| priority-then-deadline | 71.0% | | .75 | 65.8% |
| priority-first | 69.5% | | .55 | 62.3% |
| newest-first | 67.9% | | .35 | 59.1% |
| earliest-deadline | 65.8% | | | |
| oldest-first | 62.3% | | | |
| longest-first | 60.9% | | | |
| worst-priority-first | 59.6% | | | |

**Triage spread 11.7 points, craft spread 9.9.** No change needed. Judgement
leads and hands are a close second, which is the balance the design wants — the
note in `resolveTicket` about two human testers running craft at 20-27% while
triaging better than the "flawless" bot is the reason craft must never lead, and
9.9 against 11.7 is as close as it should get.

Two things fell out of the same table:

**Priority-first has caught up with shortest-first.** They were 1.8 points apart
when the README's central claim was corrected; they are now 0.3 apart, inside
the noise. The game no longer pays you more for skimming small tickets than for
protecting important ones — `URGENT_GRACE` did that, because a P1 you defer can
now survive long enough to be worth deferring for.

**The bottom of the table is no longer a tie.** The README said doing the least
important thing first and working in arrival order scored the same. They are now
59.6% and 62.3%, 2.7 points apart, with longest-first between them at 60.9%.
Corrected in the README rather than left to rot, which is what happened to the
last central claim.

## What the meta layer is actually worth

Every number in this file is measured on the bare game, because the bots hold
no certificates. That is the honest way round — certificates make it easier from
a known floor — but it also means nothing had ever checked that any of them
does anything. Measured at last, 8 seeds x 4 days at every rung, skill .75:

| meta item | day score | vs bare |
|---|---|---|
| (nothing) | 49.51% | — |
| ITIL FOUNDATION — one more casualty forgiven | 51.66% | **+2.15** |
| PRINCE2 — meetings take a fifth less of the day | 51.77% | **+2.26** |
| CISSP — evenings cost you less | 49.79% | +0.29 |
| YOU HAVE SEEN THIS ONE BEFORE — slower burnout | 49.67% | +0.16 |
| A GUY WHO KNOWS A GUY — start higher | 49.51% | 0.00 |
| THEY REMEMBER YOU HERE — start higher | 49.51% | 0.00 |
| **everything at once** | **54.18%** | **+4.67** |

Six of the seven are correct. The two reputation perks pay into the *next*
career and should read zero on a day score. CISSP and the burnout perk are
stress and burnout effects that compound across a career and cannot show up in
four days.

**A+ measured +0.00 and is the only one that could have been a real bug.**
`simDay` never opens a board — it synthesises the score from the skill dial —
so a certificate that makes boards easier is invisible to every harness in the
repo. It could have been worth ten points or nothing and nothing would have
known.

It turns out to be wired correctly: `openGame` reads `metaFx('gameDiff')`,
lowers the difficulty, and on the easiest boards, where there is no difficulty
left to remove, pays out as a forgiven slip instead. So what the new invariant
pins is the **wiring**, board by board, since that is precisely the part a bot
cannot reach. Unwiring either half fails it across all eleven boards.

## A sound nobody plays is a sound that is not in the game

`phone` — a handset ringing twice — sat in `SFX` for the whole life of the
project and was never once called, on a board that is literally a phone call.
There is no way to notice this by playing, because the missing sound is the one
you have never heard, and no harness listens.

So it is counted instead: every recipe must be reachable from the source or
named as deliberate (`step` and `door` are, because constant footsteps would be
unbearable). Unwiring `phone` fails it, and so does adding a new recipe without
wiring it.

**The lint has to match conditional call sites, and the first version did not.**
The grep that found `phone` also reported `fired` dead — and `fired` is played,
by `sfx(kind === 'retired' || kind === 'shortof' ? 'promo' : 'fired')` on the
ending screen. A literal-only pattern misses every ternary in the file.

That is not a harmless false positive. **A lint that reports work already done
is worse than no lint, because the fix is a duplicate**, and that is exactly
what happened: `fired` was wired a second time at the top of `careerOver()` and
would have played twice, overlapping itself, at the most dramatic moment a
career has. It was caught only because the mutation test refused to fail —
removing the new line left the suite green, which is the signal that the line
was never doing anything.

The mutation discipline earned its keep on a test of the mutation discipline.

## The ratchets

| name | value | meaning | direction |
|---|---|---|---|
| `GATE_DEBT_BUDGET` | 48 | sum of the table above | may only fall |
| `GATE_REACH` | 19 | points between flawless play and the bar it is scored against | may only fall |
| `SKILL_DEBT` | 1 | craft separation, flawless vs mediocre | may only rise |
| `TRIAGE_EDGE` | 4 | points separating good triage from bad at identical skill | may only rise |
| `LADDER_DEBT` | {0,0} | rungs with a thin or duplicated pool | closed |
| `WALK_BUDGET` | 62 | worst desk-to-anchor errand, in minutes | may only fall |
| `URGENCY_SLOPE` | -0.45 | how strongly a rung's priority predicts its urgency | may only fall |

Two were re-baselined on 2026-08-25 in the direction a ratchet is not supposed
to move. Both because the old number was measured on the 4.4x bot, not because
anything got worse. A ratchet whose numbers can be edited is a comment, so the
reason is written beside each one in the source.

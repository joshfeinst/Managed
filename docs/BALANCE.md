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

Reverted. Project Team keeps rate 1.5 and a 13-point gap, which is the
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

## Building the levels out to completion (2026-08-26, second pass)

The per-rung inventory said the ladder was finished. Measured, it was not, and
the two gaps pointed in opposite directions.

**The calendar was empty at the bottom.** Every senior rung shipped five bespoke
meetings; the intern pit had none of its own, and T1, T2 and T3 had two or three
between them. The four rungs players actually live through were the four with no
week of their own. Fourteen new meetings close it — every rung now has five.

**The queue was inherited at the top.** A vCIO's day was 16% vCIO tickets;
eleven templates are dealt at every rung from the pit to the corner office, and
a flat weight across a wide band makes the printer jam exactly as likely at the
top of the ladder as on day one.

Two fixes were needed and neither was sufficient alone:

| | own voice | from 4+ rungs below |
|---|---|---|
| procure | 22 -> 29% | 19 -> 7% |
| relmgr | 17 -> 23% | 21 -> 9% |
| solarch | 20 -> 24% | 22 -> 10% |
| vcio | 17 -> 29% | 23 -> 8% |
| director | 25 -> 50% | 37 -> 15% |

`QUEUE_MEMORY`/`QUEUE_FADE` fade work you did more than two rungs ago. Swept: at
4 and .45 it is a no-op, because the floor of 1 in the bag absorbs it. At 2 and
1.8 it moves the mix and still deals the pit's running gags to a vCIO about
every other day, which is the right frequency for a joke meant to follow you
your whole career. Nothing is ever retired.

**And reweighting plateaus.** With 18 templates written for vCIO against 126
eligible, no amount of weighting makes the day its own; the rest is supply. Nine
new tickets each at vCIO and Director.

### What the same pass found by looking rather than counting

- **Two stand-ups four minutes apart.** A vCIO's morning opened with the
  all-company standup at :10 and the project standup at :14. T2 could get two
  on-call handovers; the Director two all-hands. Slots fix it — one meeting per
  slot per day — and `MEETING_GAP` (12 min) stops any pair landing closer than
  it takes to walk between rooms.
- **The corner office had no window.** The pit's north wall is glass for its
  whole length; the executive suite's was eleven characters of brick, and by
  vCIO there was nothing on that floor to walk to at all.
- **Two orphan dialogue nodes** written for a CSAT survey mechanic that never
  shipped, out of 576. That ratio only stays good if something watches it.
- **The building did not consistently sound British.** The sign said THE
  ELEVATOR in a building whose own prose calls it the lift, and two scenes had
  everybody standing in a parking lot.

### Where the ladder stands

Generated by `node tools/ladder.js index.html --measure`. Paste it; never retype
it.

| rung | rate | meetings | bar | floor | flawless p50 | sloppy p50 | gap | good clears | bad clears |
|---|---|---|---|---|---|---|---|---|---|
| intern | 1.9 | 30 | 0.730 | 0.329 | 78% | 61% | 18 | 83% | 0% |
| t1 | 1.9 | 34 | 0.706 | 0.318 | 77% | 59% | 19 | 77% | 3% |
| t2 | 1.9 | 40 | 0.598 | 0.269 | 67% | 48% | 19 | 77% | 10% |
| t3 | 1.9 | 48 | 0.563 | 0.253 | 68% | 47% | 22 | 83% | 20% |
| project | 1.5 | 60 | 0.628 | 0.283 | 68% | 55% | 13 | 70% | 27% |
| procure | 1.9 | 68 | 0.521 | 0.234 | 58% | 43% | 14 | 83% | 17% |
| relmgr | 1.9 | 78 | 0.511 | 0.230 | 61% | 44% | 17 | 77% | 17% |
| solarch | 1.7 | 84 | 0.553 | 0.249 | 68% | 51% | 17 | 87% | 27% |
| vcio | 1.7 | 88 | 0.653 | 0.294 | 69% | 51% | 18 | 77% | 3% |
| director | 1.6 | 80 | — | 0.310 | — | — | — | — | — |

Careers: **18 of 24 reach retirement at skill .85**, averaging 10.3 careers, and
every one of the twenty-four reached Director at least once.

Re-measured 2026-08-26 after the six cross-floor tickets landed: **19 of 24,
averaging 11.5**, with one player topping out at relationship manager. The
rungs themselves did not move — the table above is still what `ladder.js`
reads off the shipped file — so the extra career is the errands downstairs
costing what they claim. The intermediate reading of 24/24 at 9.4 was the
skipped leg, and is written up under "Crossing the floors" below.

65 events, 268 tickets, 641 dialogue nodes, 10 people, 12 boards, 342 self-tests.

### The helpdesk had no board of its own

Rungs four to nine each got a bespoke minigame; rungs zero to three shared the
same four. The pit's own is a **sequence** rather than a matching, a judgement
or a selection — a new starter on Monday and a printed checklist in the order
somebody thought of the steps. You cannot make a mailbox before the licence
exists and the checklist puts the mailbox first.

Three harnesses caught it in turn, and the third found a hole in all of them:

| | what it said |
|---|---|
| the self-test | no ticket deals this board — the dead-content class, again |
| `boards.js` | careless play scores 83% against a perfect 100%; a 17-point spread is not a game |
| **a screenshot** | it throws the moment it is drawn |

The third is the one that matters. It referenced `CX`, a local const inside the
how-to-card renderer, and `verify` reported PAGE ERRORS 0 while `visual` passed
and `boards.js` gave it a clean bill — because **nothing in the suite had ever
called a board's `draw()`**. Twelve boards, forty rounds each, and not one of
them was ever rendered.

Every board is now initialised at all three difficulties and drawn, before and
after a step. A fourth bug surfaced immediately on the same route: seven rows at
22px ran to y=250 against a panel that ends at 240, so difficulty three fell off
the bottom. The draw test proves a board renders, not that it renders *inside*.

### Eight ratchets added, all mutation-tested

| what it guards | how it fails |
|---|---|
| every rung has 22 templates and 5 meetings of its OWN | drop two intern events |
| a day never holds two meetings about the same thing | remove the slot dedupe |
| ...nor two you could not walk between | remove the gap check |
| every interactable is reachable, answers, and speaks | wall the window back up |
| every scene is one something opens | add an unreferenced node |
| a rung's signature board is dealt off its own tickets | demote all three of vCIO's |
| every board can actually be drawn | put `CX` back in the starter board |
| the office sounds like the country it is in | put THE ELEVATOR back on the sign |

## The lift goes somewhere (2026-08-26, third pass)

It said IT GOES TO OTHER FLOORS since the first build and went nowhere. There is
a ground floor now — reception, two glass meeting rooms, and the post room —
with two people on it who do not work for you.

**No anchor on that floor is one a ticket uses.** Anchors resolve against the
LOADED map, so a `SHELF` in reception would silently steal a `goto` meant for the
supply shelf upstairs. The lift is the single deliberate exception.

`run.markerFloor` is the other half: two floors share a coordinate space, so an
arrow set upstairs points at a cell in the post room that happens to share its
numbers. The arrow points at the lift instead, and `gotoCheck` cannot fire on the
wrong floor.

**Every map invariant now runs on every map.** They all named `MAPS.office1` for
the life of the project, so the second floor arrived walkable by luck rather than
by proof.

### What the harnesses could not see, and a screenshot could

| | |
|---|---|
| a one-way lift | the worst bug the feature can have — the day runs to 17:00, every ticket is upstairs, and a player stuck in reception can only watch the clocks run out. Played now, not reasoned about. |
| the camera did not move | you arrived with it stuck where you had been on the other floor; the floors are different heights, so the first ride down opened on two thirds of black |
| the art was wrong twice | parcels drawn as server racks (the post room read as a second data centre); waiting-room plants drawn with the *reception desk* tile |

That is the fourth time in two days a screenshot found something no harness
could — after the board that threw on `draw()`, the clipped-looking dispatch
line that was only mid-typewriter, and THE ELEVATOR on the sign. **Look at the
game.** The suite proves the game is correct, not that it is right.

## The floor the queue could not describe (2026-08-26, fourth pass)

Three bugs, all found by measuring or by looking, none by running the suite —
which passed 345/345 throughout.

**The queue row was cutting 89% of its own tickets in half.** `#tix` was 600px
wide. Measured across all 268 tickets, that clipped 114 titles outright, and
once `legHint()` is appended into the same cell it clipped 238 — so the
walk-cost hint, which exists precisely so a player can see a P4 is a two-hour
round trip *before* taking it, was ellipsed off the end of nearly every row. A
shipped feature, invisible.

| panel | title cell | titles clipped |
|---|---|---|
| 600px | 392px | 114 (43%) |
| 680px | 472px | 12 (4%) |
| 720px | 512px | 0 |

The fix is layout, not 114 rewrites: 720px, the hint on its own line, and the
title wraps rather than clips. At 720px, 247 of 268 titles are one line and
even with every `{fill}` at its longest none reaches three.

The first version of the guard measured `TICKETS[id].title` — the template —
and passed clean. A screenshot then caught two rows still cut: `{user}` is
"Janet" in the template and "the temp whose badge never worked" on screen. Any
test of what a box holds has to resolve the fills first.

**The dialogue box grew off the top of the screen.** `#dlg` is bottom-anchored
and grows upward and nothing bounded it. Rendered at 400x300 — a size
`visual.js` already drives — 72 nodes grew past the top edge, `i.day1` by
165px: the intern's first scene, the opening conversation of a new career,
with its speaker and first lines above the screen. `visual.js` passes that
window because it never opens a dialogue there, and the suite had never
rendered the box at all: it is DOM, and 641 nodes had only ever been checked
as data.

Written to measure at the tester's own window, the new guard passed at
verify.js's 1280x720 while proving nothing — which is exactly how the bug
shipped. It shrinks `#view` to 400x225 first. It also drives `openDlg` and
`dlgPaint` rather than a replica: the first draft rebuilt the box by hand,
which measures the CSS and nothing else, and deleting the renderer's own
scroll-into-view left that version green.

**A lint that reports work that is not work.** `tools/audit.js` checked two
line lengths against numbers picked without measuring anything and reported 91
problems that were not problems. Options are DOM buttons with no nowrap and no
fixed height: they *wrap*, and at every viewport from 400x300 up not one of
the 21 flagged ever overflowed. Titles really were being cut, but by px in a
392px cell — the longest title that fits is 63 characters and the shortest
that clips is 55, so a character count was never going to answer it. Both
checks are deleted rather than left to disagree with the self-test.

The dominance check went from FAIL to a report. Read at face value it flags 57
nodes and most of them are the game working: "Attend. Somebody must know what
it is for" is *meant* to cost you, and the option's own text is the warning.
Three were a real authoring slip — the plain fix-it option written with no rep
field at all beside a do-nothing option carrying `rep:1`, so leaving a fault
alone beat repairing it on every axis at once. `t2.unfix.b` nearly got "fixed"
here too and should not have: "Document what they did, in detail, in the
ticket" losing rep and the bonus reads as diligence punished until you read
the scene, where it is a paper trail written to blame the client.

## Crossing the floors, and the leg nobody walked

`anchorPos()` answers against the LOADED map and nothing else, so a `goto` to
an anchor on the other floor resolved to nothing and cost `WALK_FALLBACK`: a
flat 14 minutes whether the errand was beside the lift or the length of the
building away. That is why no ticket had ever sent anyone downstairs.

Both floors are indexed once at boot — load each in turn, flood fill out from
every anchor, keep the tile distances and positions. A crossing then composes
as `here -> this floor's lift + LIFT_MIN + far lift -> the anchor`. `ELEV` is
the one name both floors carry and is deliberately excluded from
`ANCHOR_FLOOR`: a name on two maps has no single home.

`CROSS_FLOOR_BUDGET = 78`, measured rather than picked. The architect's desk
is 57 tiles from the lift — 60 minutes before the doors open — so no crossing
was ever going to fit inside `WALK_BUDGET`'s 62. It buys the rule the ground
floor is built to: anything a ticket can be sent to down there lives within
twelve tiles of the lift.

The walk-budget lint is per rung now. A ticket is only ever dealt inside its
own tiers, so pricing the architect's desk against an errand that stops at T2
measured a walk nobody takes — and that fiction was deciding how far from the
lift the ground floor was allowed to put anything.

| anchor | tiles from the ground lift | who can be sent there |
|---|---|---|
| RECEPTION | 9 | every rung |
| MEET_A | 12 | every rung; written for relmgr and up |
| POST | 25 | T2 to procurement |
| MEET_B | 36 | scenery |
| FRONT | 21 | scenery |

**Then the six new tickets took retirement from 18 of 24 to 24 of 24, and the
day-score decomposition said nothing had changed** — every rung within 0.02,
gaps equal or better. Both were true.

`advanceStep` resolved a goto with `anchorPos()` and read the null it got for
anything downstairs as "no such step": `si++` and carry on, as though the walk
had happened. Every cross-floor ticket was priced for a trip and never made
anyone take it — a long window, four to seven stakes, and none of the cost.
The bot did the same thing for the same reason, `walkTo(null)` returning
having charged nothing, so the simulation agreed with the game about a walk
neither of them did. That is why the per-day numbers looked innocent, and it
is the sharpest example yet of the rule that a measurement can only see what
the model models.

Four sites had each grown their own copy of the leg walk: `advanceStep`,
`simDay`, `ticketWork`, and `legHint`/`workLeft`. They share `walkLegs` now,
which tracks the floor as well as the tile.

| build | retire | careers to win |
|---|---|---|
| before any of this | 18/24 | 10.5 |
| pricing + new floor, no tickets | 18/24 | 10.5 |
| tickets, leg skipped | 24/24 | 9.4 |
| tickets, leg walked | 19/24 | 11.5 |

The middle two rows are the point. The pricing and the floor moved nothing on
their own, which is what a refactor verified at 0 diffs across 977 ticket/rung
pairs should do; the tickets moved everything, in the wrong direction, for a
reason no score decomposition could see.

**The reception-floor-as-a-data-centre mistake, made twice.** The store room
was built with `S` and came out full of server racks — three comment lines
below the note recording the first time that happened. Found by looking at it.
Scenery glyphs `h` and `v` carry SHELF's and VEND's art with no anchor and no
act, because using `H` and `V` directly would give both names two homes.

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
| own tickets / own events | 22 / 5 | content whose home is that rung and nowhere lower | may only rise |
| `MEETING_GAP` | 12 | minutes a day must leave between two meetings | may only rise |
| `LIFT_MIN` | 4 | what a floor change costs, each way | may only rise |
| `CROSS_FLOOR_BUDGET` | 78 | worst desk-to-anchor errand that crosses floors | may only fall |
| `QUEUE_TITLE_LINES` | 2 | lines a ticket title may take in its queue row | may only fall |

Two were re-baselined on 2026-08-25 in the direction a ratchet is not supposed
to move. Both because the old number was measured on the 4.4x bot, not because
anything got worse. A ratchet whose numbers can be edited is a comment, so the
reason is written beside each one in the source.

## Nothing here had ever played a day (2026-08-26, fifth pass)

A player opened the build, and inside ninety seconds hit three things that
355 self-tests, `visual.js`, `human.js` and `audit.js` all passed over. They
are worth writing down together because they have one cause.

**The arrow that would not go out.** `objectiveTarget()` was armed by
`run.queue.length`, so from the moment the first ticket landed it pointed at
the terminal for the whole of every day you had anything queued. Arriving did
not clear it, because arriving was never what cleared it. The line beside it
said PRESS TAB — which works from anywhere — while the arrow said walk over
here, and the player did, and it stayed lit.

It also called the terminal YOUR DESK. Desks became per-rung when the office
started rearranging itself as you climb; this line did not follow. The
intern's desk is `DESK_PIT [15,7]`, `clockIn` spawns them sitting at it, and
the arrow pointed at `TERMINAL [28,9]` and told them to go and find the thing
they were sat on.

**PRESS E did nothing.** Use is facing-based — `workInput` reads
`faceCell()` — so standing ON the terminal tile with your back to it, the key
the game had just named does nothing and says nothing about why. An
instruction is only allowed to name a control that cannot silently fail from
where the player is standing, so the line names TAB.

**A meeting that did not exist.** "The 9:15 standup starts in nine minutes",
read at 9:23. Three lies in one sentence: the `{mtg}` pool hardcoded a clock
time, `rollDay` puts the morning meeting at 96 on day one and on most seeds
none at all, and the countdown was authored as a constant. On JOB-1 the day's
first event is 12:45PM and `{mtg}` had rolled "the QBR" — for an intern, on
day one.

The common cause is not any of these. It is that **every harness in this repo
read state, and none of them played.** `human.js` proves the title screen
boots. `visual.js` drives four window sizes and never opens a dialogue in any
of them. The self-tests call the functions directly and therefore agree with
whatever the functions believe. None of them had ever pressed a key at 9:00
and looked at the screen at 9:23.

`tools/firstday.js` does that, and found the E-does-nothing case unprompted.

Its first draft is the lesson inside the lesson. It "checked" the arrow by
reading the objective line, and passed with the shipped bug put back — the
line was right; the arrow was the thing that was wrong, and the arrow is
canvas. It counts the marker's own pixels now: 0 on the fixed build, 20 with
the bug restored. **A driver that can only read text cannot check anything
drawn**, and a check that cannot see the defect it is named after is worse
than no check, because its green is mistaken for evidence.

## Five more, from playing it (2026-08-26, sixth pass)

All found by playing or by sweeping for a shape, none by running the suite,
which was green throughout.

**The review disagreed with itself about your own score.** "27 of 28 priority
points banked — that ratio IS your performance", directly above "Performance
95%". `earned`, `closed` and `burned` were each rounded for the screen while
`dayPerf` divided the unrounded values; over 72 bot days, 48 printed a
fraction that does not equal the percentage beside it. "23 of 23 banked"
showed as 98% — a flawless day reported as an imperfect one. Rounding happens
once now, before the score is taken, so the fraction on the screen IS the
number the gate uses.

There was a test for this and it passed the whole time. It checked one
hand-made scenario whose numbers were integers and therefore always agreed,
and it allowed a 1.5-point gap on top — **a tolerance that permitted exactly
the contradiction the test was named after.** It drives four real bot days now
and requires equality.

Ladder re-measured: 17/24 retire in 11.6 careers against 19/24 in 11.5.
Rounding is unbiased and the average is unchanged, so that is sample noise on
a correctness fix.

**The exit interview printed the same stat twice.** "Days survived: 8" above
"Days on the queue: 8" — one reads `run.day`, the other `perfHist.length`, and
across twelve real careers they were identical every single time. It counts
days at a helpdesk rung now, which is what the game's own promotion line means
by it ("Project Team. You are off the queue — properly off it").

**The handbook was describing a different game.** "A vCIO spends a third of the
week in them" against a `meetingMin` of 88 in a 480-minute day, which is a
fifth. "The quiet suite upstairs" when `DESK_EXEC` is on `office1`, the same
floor as the pit — wrong when written, and misleading once the building had a
real second floor. The paragraph is generated from ROLES now.

**The game was guessing people's gender.** `{user}` is drawn from a pool
holding Janet, Dale, Sharon, Gary in shipping, Priya and the owner's brother,
and four tickets wrote "he" or "she" about whoever it dealt: "Remove Sharon's
access. All of it. He left in April." Fourteen lines, every one wrong about
half the time, in the most-read text in the game. All neutral now, and a ticket
that resolves `{user}` may no longer use a gendered pronoun anywhere.

**Do not send a new player to an empty queue.** The HUD reads QUEUE 0 and the
objective line said PRESS TAB TO OPEN THE QUEUE, for the fifteen minutes before
the first ticket lands. `taughtQueue` is set the moment that ticket arrives, so
the line could never have been true.

The pattern across all five is the same one this file keeps rediscovering, in
a new place: **the game states a fact about itself, and nothing re-derives it.**
A ratio in prose, a stat read from the wrong field, a meeting figure written
from memory, a pronoun for a name drawn at random, an instruction for a queue
that is empty by construction. Each was true once, or never, and no test could
tell because no test was reading the sentence against the number.

## Two more, from playing further (2026-08-26, seventh pass)

**The player was reading "{Client} has a new starter".** Events and interludes
open with `openDlg(id, {}, null)` — no fills at all — so every `{client}` an
author wrote into a scene reached the screen as the literal template text.
Rendered, not inferred:

    ON SCREEN: {Client} has a new starter. She is in reception with a
               lanyard, a notebook, and no account.

Five lines across four scenes. `e.hd1.starter` is what a T1 reads on the
morning they are promoted; `e.hd3.problemboard` opens the problem review. The
most ceremonial text in the game, showing its own braces. Scenes get fills now,
resolved from the day and the scene's own name rather than from a stream — a
scene must not be able to shift the day's tickets, and consuming no randomness
means it cannot.

**Pressing E at the lift did nothing unless you had walked in facing it.** An
anchor is the tile you use a thing FROM; the thing is on the next tile. The
arrow points at the anchor. Measured, the lift rode from exactly one of four
facings. It matters most there because arriving at a normal destination
completes that step by itself, while the lift has to be USED and every
cross-floor ticket depends on that press. Same shape as the day-one terminal:
the game points at a tile and the action silently fails depending on which way
you came. Found because the driver sat on "THE FRONT DESK IS ON THE OTHER
FLOOR — TAKE THE LIFT" for ninety-four steps.

### Three tests that measured nothing, in one sitting

Worth recording together, because the failure is more instructive than any of
the fixes:

1. The token test built its own fills and **passed with both real call sites
   reverted** — it was testing `sceneFills`, which was never what was broken.
   Fixed by driving `openEvent` and the `pendingScenes` path.
2. The ambiguity test watched `G.state` — and the two things in reach were both
   racks, which only put up a toast. It was measuring a side effect the case it
   was named after does not have.
3. Rewritten to watch for the call instead, it still could not fail: **neither
   shipped map has a single walkable tile with two distinct acts beside it**,
   so the branch is unreachable today. That test was deleted rather than kept
   green. The defensive branch stays in the code and the comment says so.

The rule this keeps arriving at: **a test earns its green only by having been
made to go red on the exact code that shipped the bug.** Three drafts here
passed on a build with the defect fully restored, and each one looked like
evidence.

## Two Garys (2026-08-26, eighth pass)

GARY is an NPC — "Client, was just in the area" — who walks the office on a
schedule and carries a nameplate. `FILLS.user` dealt "Gary in shipping". So a
ticket names Gary, the player looks up, sees GARY across the room, and goes to
talk to him about a ticket he has never heard of.

The second time. A compliance lead called Priya was renamed Noor by hand for
exactly this, against exactly this pool. **Twice by hand is the point where a
thing stops being something somebody remembers and becomes a lint** — matched
on the whole value and on its first word, so "Gary in shipping" is caught by
GARY, and it is mutation-verified by putting the old name back.

Swept at the same time and clean: every event has a calendar name, a scene and
an fx; no `ANCHOR_NAMES` entry describes an anchor no map has; no two NPCs
share a name; every user-facing string containing a number is built from a
constant rather than typed (zero literals with a bare number); and the only two
numbers left in the static markup are "page 1 of 214", which is a joke, and
"1 – 3" for dialogue choices, which is the measured maximum.

That last sweep is the one worth keeping. After the handbook and the "9:15
standup", the question "what else states a number it does not derive?" has a
mechanical answer, and today the answer is nothing.

## The buttons, the promotion, and a meeting that lied about its own length (2026-08-26, ninth pass)

Four more, all found by driving the real screens rather than reading state.

**A review you could not click your way out of.** The longest review in the
game — a promotion with three named casualties — ran 782px tall in a 768px
window. NEXT DAY sat below the fold, the screen did not scroll, and the button
could not be reached with Tab either, so the only exit was Enter, which the
screen never mentions. Measured 15–32px past the fold at 1366×768, 1280×900,
1280×800 and 1280×720 — the four commonest laptops. The handbook's first
promise is that the mouse plays the whole game. Screens scroll now and the
action row is pinned to the bottom of the scrollport, so the buttons are on
screen *at rest*, not only after a scroll a player has no reason to attempt.
Guarded for the review, the exit interview and the pause screen: force each
one taller than the window, then require the button to be inside the scrollport
**and** to be what `elementFromPoint` returns — a wrong z-index leaves it
visible and dead.

**PROMOTED, and under it a 0% you never scored.** Promoting sets `rungSince`
to `perfHist.length`, which is right — the new job's bar is judged on the new
job — but it leaves the gate window empty for exactly one evening, and the
line reported that emptiness as a measurement: *"Promotion needs 67% averaged
over 3 days — your last 0 average 0%"*, directly beneath PROMOTED and the new
title. Guarded from both sides, so deleting the clause cannot pass either.

**E did nothing on the new-starter checklist.** The board tested `press.act`.
The input layer has never had a flag by that name. UP and DOWN moved a
highlight nothing could act on while the card said *"E or CLICK — do the step
you are on"*. `tools/keys.js` exists to catch exactly this and did not, because
its list of which keys each card promises was **hand-kept and did not include
the one board with the bug**. It reads `GAME_BRIEF` now. Three self-tests, one
per way this goes wrong: a board testing a flag the input layer does not have,
a key the card promises and the board ignores, a key the board takes and the
card never names.

**A ninety-minute briefing that took twenty-six.** Fifteen event scenes
announce how long a meeting is; ten of them announced one number and charged
another — the vendor briefing said ninety minutes and took 26, the knowledge
amnesty said two hours and took 18, the requirements workshop booked three
hours and took 36. The clock is the only instrument a player has and it said
the prose was wrong. Every scene states its length with `{cost}` now, filled
by `openEvent` from the same `fx.time` it charged three lines earlier.

### The thread through all four

Same as every pass before it: *the game states a fact about itself and nothing
re-derives it.* The new wrinkle is the harness version of the same disease —
`tools/keys.js` claimed coverage of twelve boards and had eleven in its table,
and the missing one was the broken one. A hand-kept list inside a test is a
statement about the game that nothing re-derives either.

### One reported bug that was not one

The fired ending appeared to throw the player to the title screen after 2.4
seconds. It does not: `bootDone()` ends with `toTitle()`, and the harness had
driven the game before boot finished. Checked rather than filed. Harnesses now
wait for `G.state === 'title'` before touching anything.

## The mouse could not close the queue (2026-08-26, tenth pass)

Five more. The first came from taking the handbook's opening paragraph
literally: *"The mouse plays the whole game. … Nothing needs the keyboard
except typing a job posting ID."* Every harness in this repo presses keys, so
nothing had ever checked it.

**The service queue closed on Escape and nothing else.** No close control, no
click-outside — and the day-one objective sends every new player straight into
that panel, where the shift clock is frozen. A mouse-only player was not merely
stuck, they were stuck at 9:03 with a queue that would never fill. It has a ✕
now, and a click outside closes it while a click inside does not.
`tools/mouseonly.js` plays from the title screen to a worked ticket without a
single keypress, and covers all twelve how-to-play cards and the pause menu.

**The pause menu was the other keyboard-only door**, and SAVE & QUIT lives
behind it, so mid-day the one thing a mouse could not do was stop playing. The
HUD has a PAUSE button; it is the only thing in the HUD that takes a pointer.

**The HUD lost the coffee counter at 400×300** — a resource the game charges
you for, warns you about, and then hid on exactly the windows narrow enough to
need the warning. It shrinks to stay on one line, and wraps rather than clips
if that is not enough. Two harnesses split the job: the self-test squeezes the
frame and proves the row degrades instead of clipping; `tools/visual.js` resizes
the window for real and catches the other failure, a HUD that answers a narrow
window by wrapping across the panels drawn beneath it.

**"One P1 outweighs 7 P4s"** — generated from STAKES so it could not drift from
the maths, and false anyway. A P1 is seven points and seven P4s are seven
points: the trade the handbook told you to make comes out level. The evening
said the same thing the other wrong way, with a hard-coded "three" in a
sentence whose other four numbers all come from STAKES. Both derive from
`p4sBeaten()` now, and the guard checks the claim against the sum it is a claim
about rather than against its own formula.

**SPEED printed 0% on a day that closed nothing**, which is not a slow day, it
is no data, and it reads as the worst score on the screen — on exactly the
evening a player is least able to argue with it. CRAFT two lines below already
said "nothing hands-on today".

**"Days on the queue: 0 — you got off it"** on every career hired above the
helpdesk, which is every career after the first one that reaches Project Team.

### What this pass says about the harnesses

`tools/firstday.js` recorded only the first fourteen lines of the screen. Two
new buttons pushed the ticket row past the cut and it reported an empty queue
over a frame that had the ticket in it — a false alarm that cost most of an
hour to chase. A harness that samples has to say so; this one now records the
whole screen and prints sixteen lines. Same disease as the hand-kept key table
in the pass before it: the test made a claim about the game that nothing
re-derived.

### One reported bug that was not one

Every certificate does what its description says: A+ deals a board one step
easier, ITIL adds a forgiven casualty (and the `max(2, …)` floor only swallows
it below eight arrivals a day, where no real day lands), PRINCE2 cuts the
meeting budget to 0.84× of a claimed 0.80 because meetings are whole numbers,
CISSP slows burnout by exactly a fifth. Checked rather than assumed.

## The building gets a second lift (2026-08-26, eleventh pass)

Level work this time, and the numbers are what drove it.

**One shaft, at the west end of a forty-four-tile floor.** The Solutions
Architect's desk was fifty-seven tiles from the only way downstairs — sixty
game-minutes before the doors opened. Against a cross-floor budget of
seventy-eight that left thirteen tiles of ground floor, and the ground floor is
fifty-five tiles deep. Measured per rung, as the share of that floor a ticket
could legally send you to:

| rung | intern | T1 | T2/T3 | project | procure | relmgr | solarch | vCIO | director |
|---|---|---|---|---|---|---|---|---|---|
| before | 81% | 70% | 58% | 55% | 51% | 39% | **20%** | 34% | 32% |
| after | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |

Two thirds of that floor could not be reached by anybody above T1 at any price,
which is why three of its rooms had no name and no ticket: the store room, the
canteen and the accounts office were built, furnished and unreachable. A second
shaft at the east end of the long corridor on both floors, plus a door out of
the exec block so the senior desks can get to it, takes the architect from 57
tiles to 19.

The routing is the part worth keeping: the near half and the far half of a
cross-floor trip are **not independent** — you leave by a lift and arrive at the
one directly above or below it — so the cheapest route is the smallest sum, not
the nearest lift here plus the nearest lift there. One function decides it and
everything that prices a walk goes through it. The **arrow** follows the same
choice; pointing at the main lift while the SLA was priced on the east one
would send a player the long way round to a job they were charged the short way
for.

**Then the rooms got tickets.** Dead floor (more than six tiles from anything
with a name) fell 62% → 45%; downstairs errands 0.30 a day → 0.67; every rung
now has somewhere to go down there.

**And four colleagues got work.** Yvonne, Noor, Callum and Mackenzie had desks,
schedules, faces and small talk, and no ticket had ever walked you to any of
them; two had never spoken inside a ticket at all. Writing the fourth found
that `n5` had no entry in ANCHOR_NAMES — nothing had ever sent anybody there —
so the first ticket that did would have printed "GO TO n5 — FOLLOW THE ARROW"
and a queue row reading "· n5, ~31 min walk".

### Ratchets added

- both floors have both lifts, and each opens on its own counterpart
- a cross-floor errand is priced by the cheaper shaft, and the arrow points at it
- every room on the ground floor is inside the day for every rung
- every room on the ground floor is somewhere a ticket sends you
- every rung has work that takes it downstairs
- every place a ticket sends you has a name a player can read
- every desk in the building is somewhere a ticket sends you
- everybody in the building speaks inside a ticket
- a ticket that says "my desk" sends you to that desk

### Two harnesses that were passing for the wrong reason

`tools/firstday.js` clicked a fixed offset thirteen tiles east of the player, on
the theory that that was where the arrow was. It was — at the first step only.
The walk reached the desk because the pit's east wall stopped it there. Open a
door at the end of that corridor and the same driver walks east forever,
thirteen tiles at a time, reporting that the day-one arrow cannot be followed.
It reads the arrow's real position now, every step, which is what somebody
looking at it does.

The burn-ledger test compared day one against day two, and day one is a
deliberate half load: five new tickets in the pool and it dealt a day that
burned nothing, so it passed by having nothing to compare. Two full days now.

### One I made and caught before it shipped

The payroll errand walks you to the accounts office on the ground floor and
opened with Yvonne saying the machine was "the tower under my desk" — her desk
is n4, upstairs in the pit. The line named one room and the arrow pointed at
another, four seconds apart, in the same ticket. The guard is mechanical: a
named speaker who says "my desk" is describing somewhere, and it has to be
somewhere the errand goes.

## Twelfth pass — the evening, and the board the career is aimed at

### The board the whole career is aimed at could not be played with a pointer

WHOSE SATURDAY is the Big Migration: a Director's last Friday deals it, and
landing it is the entire difference between RETIRED and RETIRED (LEGEND).
Clicking a job on it moved the cursor and nothing else. Handing that job to
somebody was on 1, 2, 3 and 4 and nowhere else, so a pointer could reach the
rows and the SUBMIT button — and SUBMIT can only ever answer "SOMETHING ON THAT
LIST HAS NOBODY AGAINST IT". A click also latches `use`, so clicking a job *was*
pressing submit: the first thing a mouse player did on that board was get told
off. On a phone that is where the run ends, on the one board it is aimed at.

Three harnesses had passed over it. `keys.js` proved every key its how-to card
promises is live, and proved every rectangle it declares does something —
neither asks whether the rectangles are *enough*. `touch.js` said PHONE OK
without ever opening a minigame: every check in it was DOM, so "playable with
taps alone" was a claim about the menus. And its how-to card was the only one in
the game with no pointer row on it at all, which was the tell nobody read.

Two invariants now. In the game: **every board is opened, clicked with nothing
but its own declared rectangles, and required to reach a result** — any result,
not a good one. A board is two kinds of rectangle, one you select with and one
you act with, so the driver picks a thing and then does something to it, which
is what the card tells a player to do. In `touch.js`: the same, but through real
taps at real pixels on a 390x844 phone, in both orientations. Restoring the
shipped `weekend` step fails the first with `weekend:never finished` and the
second with `every minigame can be finished with taps alone — weekend`.

What the in-game one does *not* prove: that a rectangle is where the board
*draws* the thing. It aims with the board's own rects, so a rect and its
renderer can drift together and it stays green. That is what `visual.js` and a
screenshot are for.

That board also announced FIVE THINGS while dealing `4 + min(diff,2)` — the
wrong number of jobs on two difficulties out of three.

### Four things the evening said that the evening did not do

Found by forcing every terminal screen at every rung and *reading* it, rather
than asserting against the template that produced it.

- **A Director was sold a promotion discount.** Goodwill printed "lowers the
  PROMOTION BAR by 7.0 points (as much as it ever buys)" on every Director
  evening including THE LAST FRIDAY. There is no rung above Director — the
  screen omits the *Promotion needs* row for exactly that reason, then quoted
  the bar two lines later. At the top it buys nothing; half of it banks.
- **The evening a career ends planned the promotion.** The same two rows
  appeared under YOUR LAST DAY and YOU ARE DONE IN. The window is still
  computed — the save and the exit interview read it — it is simply not
  something to tell someone there is no tomorrow for.
- **"Retirement unlocks nothing further"** sat two rows under "Reputation
  banked +17". Retiring banks five more than any other ending, which is most of
  a CISSP, and carries you back in at vCIO.
- **Being let go quietly costs a rung** off `meta.carry` — the only thing in
  this game that walks backwards — under a note promising the next career starts
  with everything you banked.

And one number had two names ten seconds apart: the morning card called
`run.rep` "Reputation" while the evening called it Goodwill, and "Reputation
banked" already belonged to `meta.rep`, which is a different quantity and the
one that buys certificates.

Two of the guards had to be proven against an over-correction as well as
against the bug: dropping the promotion row for everybody, and taking the bar
out of the goodwill line entirely, are both caught by the guard that requires an
ordinary evening below the top to still be told both.

### Every errand in the game, walked

`boards.js` plays the minigames and `playday.js` plays one day. Neither walks
every ticket, so a goto that cannot be reached, a step that never turns over, or
a marker on a floor the player cannot get to only shows up on the ticket it is
in — and there are 284 of them. `tools/errands.js` deals each at the lowest rung
that can receive it and drives the real step machine: 284 errands, 95 markers,
11 lift rides, nothing teleported.

Walking to a marker's *coordinates* is not arriving. The two floors share a
coordinate space, so a ticket whose destination floor got lost still lands the
player on a tile of the right shape upstairs and the step turns over as though
the trip had happened — which is the exact shape of the cross-floor bug this
game shipped once already. The anchor each step names is checked after the step
turns over: it has to resolve on the map that is loaded, and the player has to
be standing next to it. Dropping the destination floor fails 11 errands with
"walked to ACCOUNTS and arrived on office1, where there is no ACCOUNTS".


## Thirteenth pass — errands for the senior rungs

### What was measured first

Of the tickets AUTHORED at each rung, the share that walk you anywhere:

| rung | before | after |
|---|---|---|
| intern | 50% | 50% |
| project | 43% | 43% |
| procure | 33% | 33% |
| relmgr | 25% | 33% |
| solarch | **9%** | 30% |
| vcio | 25% | 34% |
| director | 25% | 38% |

Cross-floor tickets of a rung's own: relmgr 1 → 3, solarch **0 → 4**, vcio
1 → 5, director **0 → 4**. Four rooms downstairs — the front desk, the front
doors, the post room, the store room — were places nobody above Procurement
had ever been sent, and the kitchen and the pit were places nobody was ever
sent at all. All six are senior destinations now. `errands.js`: 284 → 303
tickets walked, 95 → 114 markers, **11 → 25 lift rides**.

Nineteen tickets, priced from each rung's own desk against
`CROSS_FLOOR_BUDGET` before a word of them was written — which is why the
Solutions Architect, at 75 minutes from the front doors, is not sent to the
front doors, and the vCIO and the Director, at 67 and 68, are.

### The harnesses disagreed again, and meta.js was right again

They went in at P2 and P3, which felt like the right register for a
"walk downstairs and look at a cupboard" ticket. Then:

| | bars.js good/bad clears | meta.js retirements |
|---|---|---|
| before the errands | vcio 45%/5%, solarch 85%/20% | 9 / 20 |
| errands at P2–P3 | vcio 78%/13%, solarch 68%/5% | **8 / 20** |
| errands re-priced | vcio 83%/15%, solarch 73%/10% | **11 / 20** |

`bars.js` said every senior rung had improved. It had — the triage gaps
widened, which is the whole design goal. `meta.js` said the ladder had
narrowed, and `meta.js` is the one that plays careers.

**A long walk has to be worth the day it eats.** A cross-floor errand costs
33 to 72 minutes of a 480-minute shift, three or four times a talking ticket.
The expensive destinations are P1s and P2s now. The three that are
deliberately not worth the trip — the hamper in the post room, the lobby
screen that still says Tuesday, the diagrams pinned up in the pit — keep
their low priority and are drawn less often instead, so letting one burn is a
decision rather than the shape of the whole afternoon. Careers to a win also
came down, 12.9 → 11.8.

### The vCIO bar, set from the measurement

0.653 → 0.540 (floor 0.294 → 0.243, the 0.45x every rung uses). It was
already the bar `bars.js` called misplaced before this rung had any errands
in it — a flawless player cleared 45% of seeds against it — and a longer day
took that to 23%. The separation is what improved: good triage against bad
went from a 12-point gap to 19, the healthiest this rung has measured, and a
bar the flawless player could not reach was hiding it. Rungs misplaced: 4 → 2
(T1 and Procurement, both untouched by this pass).

### There is no lint for the pricing rule, and that is deliberate

Written, run, and deleted. The obvious static form — what share of a rung's
draw is a long walk worth two points or less — passed the un-priced build
unchanged, because the re-priced tickets moved from P3 to P2 and P3 was never
inside its definition. The statistic that does track the change, weighted
points per minute of work, moves the WRONG way: it falls on every senior rung
in the build `meta.js` scores highest, because the errands make the rung more
about triage and triage is the thing being rewarded. A guard that fires on
the build you want is not a guard. `meta.js` is the guard for this.

### One harness flake, fixed rather than tolerated

`touch.js` reported "the queue closes with a tap" as broken about one run in
three once the senior pools grew: a ticket can land between clearing the
dialogue and tapping the close button, so the tap goes through a scene. The
day stops dealing for the length of that one check now. The button, the tap
and the panel are all still the real ones — nothing can walk in front of them.

## Fourteenth pass — the building is a graph, and the front doors open

### The router was a pair, and its failure mode was silent

The cross-floor model composed exactly one hop and required that hop to be a
connector present *by the same anchor name on both maps*. Two floors joined by
two shafts is the only shape that fits. Anything else fails without a sound:
`liftsOn()` returns `[]` for a map with no lift, the loop body never runs,
`crossTiles` returns `null`, and `walkCost`'s null branch hands back
`WALK_FALLBACK + LIFT_MIN` — **a flat eighteen minutes from every desk at every
rung**, which is the exact flat-price bug the subsystem was written to kill.
Nothing throws and no test fails.

`EXITS` is the graph now: leave map `from` at anchor `at`, arrive on map `to`
at anchor `arrive`, having spent `mins`. `routeVia()` is Dijkstra over
`(map, the anchor you arrived at)`. Routes of different length are not
comparable in tiles, so it compares **minutes**; with every route the same
length — which is every route in a two-floor building — that is identical to
comparing tiles, and ties still break on the first exit listed, keeping ELEV
ahead of ELEV_E exactly as the old loop did.

**Proven by snapshot, not by argument.** 1850 prices captured before the
refactor: `walkCost` and `tilesFromLift` for every anchor from every rung's
desk on both maps, plus `ticketWork` and the leg breakdown for all 490
ticket/rung pairs. After: every `walkCost` identical, every `tilesFromLift`
identical, all 490 ticket prices identical. One column moved — `bestLiftTo`,
on 280 rows, every one of them "named a lift → null", because it used to
answer which shaft to take to a destination that needs no shaft.

### Two ways out, because one is not enough

The front doors have opened onto a solid wall since the first build. Measured,
the cheapest car park anchor *through them* costs a Solutions Architect 79
minutes of a 78-minute budget, so no senior rung could have been sent outside
at all. A fire door at the east end of the ground floor is four tiles from the
east lift:

| anchor | through the front doors | through the fire door |
|---|---|---|
| the arrival tile | 55–79 | **38–56** |

Destinations were then placed against that. YOUR CAR moved from `[16,4]` to
`[35,8]` because the first bay cost a Relationship Manager 84 minutes; at the
new one the worst rung on the ladder pays 72. The bins moved to the fire exit
— which is where people actually smoke — bringing that anchor from 86 to 70.
The front doors themselves (79 at solarch) and the visitor bays (83) are simply
not written for that rung.

A door costs `DOOR_MIN` 2 rather than `LIFT_MIN` 4. You push it and you are
through; a lift you wait for.

### The arrow had to learn the route, and the key matters

`run.markerLift` held a single lift name. The car park is two hops from every
desk, so the arrow pointed at the lift, you rode it, and on the far side it
pointed at the lift again. The fix is an exit chain — but **an ordered list is
not enough**: the east lift is on the route out of `office1` *and* is a way out
of `ground`, so a list-and-first-match arrow sent the player bouncing between
floors forever. That is not hypothetical; it is what the round-trip self-test
did until the chain became a map → exit dictionary.

### Four tests were asking the right question for a two-floor building

- *"both floors have both lifts"* → **"every exit is built at both ends"**, plus
  "every floor can be reached from every other". The car park has no lift.
- the ground-floor room lint excused `LIFTS`; it excuses every **connector**
  now, because the fire door is a way out exactly as the shafts are.
- the cross-floor round trip forced the player onto ELEV and called
  `takeLift()` **once** — testing the first half of the journey and asserting
  the whole of it. It walks the route now, however many hops it takes.
- `tools/errands.js` had the same assumption and reported all seventeen car
  park tickets broken with "rode the lift six times and never arrived", because
  on the ground floor the nearest lift goes back up.

Two guards caught my own mistakes before they shipped: "every tile the atlas
bakes is a tile some floor uses" fired on all five new car park tiles before
they had a map to sit on, and `tools/levels.js` found that the car park's own
doors had no act — you could walk out and not back in — and that a bin was
walled into a corner with nothing beside it.

### And five lines nobody could read

`takeLift()` reached `elevatorLine()` only when the destination map was
missing, and with both floors always present that was never. Four rung-flavoured
lines and a fifth about the car park, written, asserted upon by a green
self-test, and unreadable in play. `TOAST_LOG` records what the game actually
said, so the new guard drives eight real trips and reads the log back rather
than asking a helper what it would have returned.

### Project Team, and a change that measured worse and did not ship

`bars.js` has called Project Team misplaced through every pass of this
session, and no bar fixed it: sloppy triage kept clearing a quarter of seeds at
whatever bar was suggested, which is the harness's own way of saying *the rung
needs content, not a number*. Three hypotheses, measured in order:

| | project | rest of the ladder |
|---|---|---|
| P1 share of the weighted draw | 24% | 9–28% |
| P4 share | 19% | 19–28% |
| board (hands-on) share | 31% | 27–46% |
| **work dealt ÷ day room** | **1.06** | **1.18–1.48** |

The priority spread is the healthiest on the ladder and the board density sits
exactly between its neighbours. What is different is that **the day is not
oversubscribed**: twelve seeds deal 443 minutes of work into 420 minutes of
room. A rung whose day FITS cannot ask which ticket you protect, and a player
who chooses badly still gets through nearly all of it.

Raising `ratePerHr` from 1.5 fixes the rung and costs the ladder:

| project rate | oversub | flawless/sloppy (12 seeds) | bars verdict | **meta.js, 20 players** |
|---|---|---|---|---|
| 1.5 (shipped) | 1.06 | 51% / 39% | misplaced | **12 / 20** |
| 1.7 | 1.19 | — | — | 10 / 20 |
| 1.9 | 1.31 | 51% / 27% | healthy, 83% vs 18% | 10 / 20 |

`meta.js` is the harness of record when the two disagree, and it says the
shipped rate is the best of the three. 12 against 10 is close to this sample's
noise, but a change that measures no better does not ship. **Reverted**, with
the numbers written into the role record so the next pass does not re-derive
them.

The fix this rung actually wants is **heavier tickets**, so its day is
oversubscribed by work rather than by count. That is a writing pass.

### The writing pass, and what the harnesses said about it

Fourteen Project Team tickets of sixty-five to a hundred and ten minutes —
two boards and two legs apiece, `tiers:[4,4]` because every other rung is
already oversubscribed and would tip.

| | before | after |
|---|---|---|
| weighted mean work | 35.8 min | 42.6 min |
| work dealt ÷ day room | 1.02 | 1.22 |
| bars.js, good triage clears | 35% | 85% |
| bars.js, bad triage clears | 8% | 20% |

The rung reads healthy for the first time in this project. The bar came down
with the work — 0.628 was above the *median* flawless player once the days got
heavier, so the rung was unleaveable rather than hard — to 0.540, flawless p25.

**And the weight is 3, not 4, because `meta.js` said so.** At weight 4 the rung
read healthy and the career got worse; careers stalled *at* Project Team rather
than passing through it. Swept on the same 40 seeds:

| heavy-ticket weight | oversub | meta.js, 40 players |
|---|---|---|
| none (before) | 1.02 | 26 / 40 |
| 4 | 1.29 | **18 / 40** |
| 2 | 1.16 | 24 / 40 |
| **3 (shipped)** | **1.22** | **26 / 40** |

Their stress came down with the weight. A hundred-minute planning job eats the
day; it does not spike your pulse, and pricing it like a phones-down P1 was
burning players out three days early.

### Doing the job properly was costing you the score for being prompt

`resolveTicket` measured promptness off the raw clock, and an option's
`fx.time` is charged to that clock — so every minute the honest answer cost
came off the score for being on time, and the expensive option is the one
carrying the rep and the bonus. Over the 1,189 (ticket, rung) pairs the game
can deal:

| how you played it | full marks on |
|---|---|
| the best option every time | 609 / 1,189 |
| the cheapest option every time | 1,174 / 1,189 |

The forks' minutes are credited back now. The day still pays for them — that
was always the point of `fx.time` — but they are not evidence that you let the
ticket wait. What it did to the ladder:

| | before | after |
|---|---|---|
| bars.js, rungs misplaced | 1 (t3, flagged all session) | **0** |
| meta.js, 40 players | 26 / 40 | **33 / 40** |
| worst career tops out at | Procurement | Solutions Architect |

The gates had been tuned against a player who was being quietly docked for
doing the work well.

### Re-barring the whole ladder to flawless p25: measured, rejected

Every bar now sits *below* the p25 `bars.js` suggests, so the obvious follow-up
was to raise the ladder back to its own method. Built and measured at 40 seeds:

| | shipped bars | every bar at flawless p25 |
|---|---|---|
| bars.js, rungs misplaced | 0 | 0 |
| meta.js, 40 players | **33 / 40** | 20 / 40 |

Both readings are healthy by `bars.js`, and `bars.js` is not the harness of
record. Thirteen fewer players in forty reach retirement for no gain in
separation. **Not shipped.**

### The ace: measured, and left alone

`ACE = .95` is what earns a ticket "CSAT 5★" on the toast and a tally on the
evening card. Its record says it was raised from `.80` because at that level a
player "aced four tickets in five; it meant nothing". Measured now, over 16
seeds and six days at every profile:

| threshold | flawless | competent | sloppy |
|---|---|---|---|
| 0.95 (shipped) | 72% | 40% | 38% |
| 0.98 | 68% | 39% | 37% |
| 0.99 | 62% | 38% | 37% |
| 0.999 | 56% | 38% | 36% |

So it is back where it was — and **no threshold fixes it**, which is the
finding. The per-ticket score saturates by construction: a ticket is graded out
of what it offers, so a bot with perfect hands, perfect promptness and the
best option taken scores exactly 1.00 on almost everything, and there is
nothing above 1.00 to separate it from itself. Raising the bar to 0.999 costs
the flawless player sixteen points of ace rate and the sloppy one two.

This is also why the sloppy profile aces 38%: `simDay`'s default `botPick` is
option 0 — the do-it-properly one — for every profile, so the deliberately-bad
bot is bad at triage and bad with its hands and still makes every choice
correctly. That is deliberate (it keeps the two profiles comparable on the one
axis under test) and it means the ace rate is not a reading of play quality at
all.

A human's craft term will not be 1.00, which is where the separation actually
lives. **No change shipped.** Written down so the next pass does not re-derive
the same table.

### And the bot lost its hands a cup early

The same off-by-one cup as the coffee toast, in the half of the file every
bar is bisected against. `simDay` docked 0.08 of craft from `run.coffee >=
BURN.freeCups` — cup two — under a comment that said "cup four", against a
game that makes the work harder from cup three. Lifted into `botJitter()` and
held against `gameDiff()` by a test: same three conditions, same thresholds,
one step of difficulty per 0.08 of craft, swept over every cup and both stress
thresholds.

### Where the ladder stands at the end of this session

`bars.js`, 40 seeds × 8 days per rung:

| rung | bar | flawless p50 | sloppy p50 | good clears | bad clears |
|---|---|---|---|---|---|
| intern | 73% | 78% | 57% | 78% | 3% |
| T1 | 65% | 69% | 53% | 73% | 5% |
| T2 | 60% | 65% | 45% | 63% | 8% |
| T3 | 56% | 62% | 45% | 70% | 10% |
| Project Team | 54% | 64% | 49% | 88% | 23% |
| Procurement | 52% | 57% | 43% | 78% | 5% |
| Relationship Mgr | 51% | 60% | 39% | 90% | 15% |
| Solutions Architect | 55% | 60% | 47% | 75% | 15% |
| vCIO | 54% | 64% | 46% | 85% | 18% |

T2 gave up some headroom — 70/3 to 63/8 — when it stopped sharing a desk with
T3 and moved four tiles west along the pit, which re-prices every walk that
rung is dealt. Still healthy, and the handbook's promise that the desk moves
on every promotion is worth more than three points of clearance.

**Zero rungs misplaced** — every rung clears the harness's own definition of
healthy (good triage above 60%, bad triage below 30%). This is the first pass
in the project where that has been true, and the promptness fix is what did
it: the gates had been tuned against a player who was being quietly docked for
doing the work well.

`meta.js`, 40 players of fourteen careers each: **33 reach retirement**, in
11.0 careers on average, and the worst player tops out at Solutions Architect.

---

## The hands-on pass, and what it cost the ladder

The senior half of the ladder was the least hands-on part of the game. Share of
each rung's pool that opens a board, before:

| rung | intern | t1 | t2 | t3 | project | procure | relmgr | solarch | vcio | director |
|---|---|---|---|---|---|---|---|---|---|---|
| before | 49% | 41% | 41% | 36% | 38% | 29% | 28% | 27% | 27% | 28% |
| after | 49% | 41% | 41% | 36% | 38% | 31% | 32% | 33% | 35% | 36% |

It was flat and slightly **falling** as you climbed, on a plan whose promise is
that the games get more technical the higher you go — "subnetting at Project
Team, quote Tetris at Procurement, budget defense at vCIO". Now it rises
monotonically from Procurement to Director, and the intern still sits highest
because the helpdesk is where the work is physical, which is the joke.

Two kinds of change got it there. Ten new Director tickets were written, every
one carrying a board, because that rung had twenty-nine of its own and six of
them opened one. The other twelve needed nothing written: they were already
describing a board in their own titles and then resolving in dialogue — a
data-flow map that never opened the diagram board, an end-of-life notice on "a
thing every client is running" that never opened blast, a backup review you
have invoiced for twice and cannot evidence that never opened paper. Each was
given the board it was already about.

### What it cost

Every one of the twelve gains 14 minutes of work, and its SLA widens with it.
`bars.js`, 16 seeds x 8 days per rung, on the build that shipped it:

| rung | bar | flawless p50 | sloppy p50 | gap | good clears | bad clears |
|---|---|---|---|---|---|---|
| intern | 73% | 78% | 58% | 21 | 69% | 0% |
| T1 | 65% | 69% | 53% | 16 | 63% | 0% |
| T2 | 60% | 64% | 47% | 17 | 69% | 6% |
| T3 | 56% | 62% | 43% | 19 | 63% | 6% |
| Project Team | 54% | 61% | 50% | 10 | 81% | 19% |
| Procurement | 52% | 57% | 43% | 14 | 69% | 13% |
| Relationship Mgr | 51% | 59% | 38% | 20 | 88% | 6% |
| Solutions Architect | 55% | 64% | 46% | 18 | 81% | 6% |
| vCIO | 54% | 57% | 43% | 15 | 81% | 25% |

Still zero rungs misplaced. Solutions Architect came out of it healthier — its
separation went 15 points to 18 and good triage clears 69% to 81% — which is
what you would expect if craft has more places to express itself.

`meta.js`, 40 players, like-for-like against the 33/40 on the previous build:
**34 of 40 reach retirement**, in 10.5 careers on average against 11.0, and the
worst player still tops out at Solutions Architect. A 20-seed run of the same
build read 19/20 with every player reaching Director, which is the favourable
half of the same distribution and is exactly why the reference number is
forty.

Project Team is the rung to watch: its separation is 10 points, the tightest on
the ladder, and it has been drifting down (14, then 11, then 10) across three
passes. It still clears the healthy definition. It is the next rung that will
need content rather than a bar.

---

## Project Team: the rung had nothing to lose

Flagged at the end of the last pass and fixed here. Its flawless/sloppy
separation was the tightest on the ladder and had drifted 14 → 11 → 10 across
three passes.

The previous fix for this rung made its day oversubscribed — fourteen heavy
tickets took it from 1.02 to 1.22 — and that held; it sits at 1.23 now. What
had drifted back is the other half of triage. Measured over thirty seeds:

| | P4s dealt per day | share of arrivals | p10 stakes/minute |
|---|---|---|---|
| Project Team | 1.8 of 12.0 | 15% | 0.031 |
| every other rung | — | 20–28% | 0.020–0.037 |

A sloppy triager works the worst priority first. At Project Team they ran out
of droppable work after two tickets and spent the rest of the day on P3s and
P2s, which are worth having. **Bad triage could not lose there because there
was nothing to lose** — and the rung's *cheapest* ticket per minute was among
the dearest on the ladder.

Ten P4s of forty to eighty minutes: the RAID log nobody has touched since
kickoff, the status report forty-one people receive and four open, the plan in
the tool that disagrees with the plan in the spreadsheet by eleven days, a
lessons-learned workshop for a project that finished in April, a change request
for a change made in March that has been live ever since. Project administration
that eats an afternoon and protects nobody, worth one point each.

| | P4 share | p10 stakes/min | value spread |
|---|---|---|---|
| before | 15% | 0.031 | 7.1× |
| after | 25% | 0.019 | 14.4× |

### The sweep, at 40 seeds like-for-like

| variant | flawless p50 | sloppy p50 | good clears | bad clears | meta | careers |
|---|---|---|---|---|---|---|
| before | 64% | 49% | 85% | **25%** | 34/40 | 10.5 |
| weight 3 | 60% | 46% | 75% | 10% | 31/40 | 11.0 |
| **weight 2 (shipped)** | 61% | 48% | **85%** | **15%** | 31/40 | 11.3 |

Weight 3 buys the best bad-clear number and pays for it with good play.
Weight 2 leaves good triage exactly where it was and still takes ten points off
bad triage, so that is what shipped.

The p50 gap stayed at 14 either way, and that is the honest headline: this did
not widen the spread, it moved the bottom of it. Both p50s fall a little
because more low-value work dilutes `dayPerf` for everybody and a burned P4
still adds its point to the denominator.

Both weights cost the same three careers in forty, so the cost is the content
existing rather than how often it arrives. That is not a regression to tune
away: the worst player now tops out at Procurement instead of Solutions
Architect, which is weak triage stalling one rung past the gate that was
supposed to catch it. Thirty-one players in forty still retire.

**Still open**: no rung's p50 gap has moved this session. Every fix so far has
lowered what bad play scores rather than raising what good play scores, because
`dayPerf` is a ratio and adding anything to the day divides everyone. Raising
the top would mean making protection itself worth more — a change to STAKES or
to the weighting, not to content — and that is a measurement pass of its own.

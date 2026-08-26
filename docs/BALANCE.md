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
| project | 2.2 | 60 | 36% | .16 | 3/12 | 3/12 |
| procure | 2.2 | 68 | 39% | .18 | 6/12 | 2/12 |
| relmgr | 2.2 | 78 | 36% | .16 | 4/12 | 3/12 |
| solarch | 2.2 | 84 | 34% | .15 | 4/12 | 3/12 |
| vcio | 2.2 | 88 | 33% | .15 | 3/12 | 4/12 |

`GATE_DEBT` total **52**, from 69. Before this pass the same table read 8/12,
7/12, 11/12, 12/12, 10/12, 8/12 in the tight column from T3 upward — **the top
five rungs were shut.** They are open now.

`tools/meta.js`, 8 careers: **3 reached retirement**, best rung DIRECTOR, about
11.7 careers to a win. It had never reached the top at all.

### The sloppy column went UP, and that is not the regression it looks like

It was 0/12 on every rung. It was zero because the bars were so high that
*nobody* cleared them — flawless was missing 8 to 12 seeds out of 12 up there.
A gate nobody can clear has a perfect sloppy record for the worst possible
reason. With the bars re-cut, bad triage now backs into a promotion on 1–4
seeds in 12. **That is the real number**, it is recorded as the new ratchet
floor, and it may only fall. vCIO's 4/12 is the worst and the one to fix first.

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

## The ratchets

| name | value | meaning | direction |
|---|---|---|---|
| `GATE_DEBT_BUDGET` | 52 | sum of the table above | may only fall |
| `GATE_REACH` | 19 | points between flawless play and the bar it is scored against | may only fall |
| `SKILL_DEBT` | 1 | craft separation, flawless vs mediocre | may only rise |
| `TRIAGE_EDGE` | 9 | points separating good triage from bad at identical skill | may only rise |
| `LADDER_DEBT` | {0,0} | rungs with a thin or duplicated pool | closed |

Two were re-baselined on 2026-08-25 in the direction a ratchet is not supposed
to move. Both because the old number was measured on the 4.4x bot, not because
anything got worse. A ratchet whose numbers can be edited is a comment, so the
reason is written beside each one in the source.

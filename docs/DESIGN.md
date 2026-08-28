# Under the hood

How Managed is built and how its numbers were arrived at. Players want
[the README](../README.md); this is for anyone changing the thing.

## Four maps, three kinds of trip

Floor 2 (the pit and the senior end), the ground floor (reception, post,
canteen, accounts), the car park, and one client site — Unit 4 on the estate.
They are joined by a general `EXITS` table and a Dijkstra over it, so a route
can be any number of hops: a cupboard errand from a senior desk is lift, walk,
fire door, walk, car, drive, walk.

Each kind of trip has its own measured ceiling, because each is a different
trip: `WALK_BUDGET` 62 for one floor, `CROSS_FLOOR_BUDGET` 78 for two,
`OFF_SITE_BUDGET` 119 for a drive. They are ratchets — measured from the
layout, and they only ever come down. The off-site one went up once, from 99,
and only because the measurement behind 99 was wrong: routes were priced at a
flat lift fare per hop, so the drive was quoted at four minutes and charged at
twenty-six. Driving to a client now costs a quarter of the shift on the clock
as well as in the fiction.

## Shape

One file, eight script blocks: core (seeded RNG, input, audio), art (tiles and
people baked at startup), data (roles, tickets, events, NPCs, dialogue, maps —
all the content, so the writing scales without touching the engine), engine
(tile world, pathfinding, camera, renderer), sim (the day machine, SLA, burnout,
versioned saves), UI, tests, and the PWA registration.

No engine, no assets, no build step, and it runs from `file://`. Every gameplay
roll goes through a seeded PRNG in one of six named streams, so an extra NPC
roll can never shift ticket content and a job posting ID deals the same career
twice.

## What the day is actually scored on

Measured across 16 seeds and six days each, with every board played perfectly so
that only the triage rule differs, the two strategies that work are
*protect the big ones* (72.3%) and *close what you can actually finish*
(70.0%) — four points apart, so there is no single right answer, which is the
point. Two things lose you the most: doing the least important thing first
(50.8%), and **working the queue in the order it arrived** (59.9%). Going in
order costs you well over half of what choosing badly does, and it feels like
diligence the whole time you are doing it.

Skill at the minigames matters and judgement matters more: fumbling every
board against acing them is 10.5 points, and the best triage rule against the
worst is 23.3. Hands are worth having; they will not save a day you triaged
badly.

### How far apart good and bad triage sit, by rung

`tools/bars.js` measures each rung's separation as flawless p50 minus sloppy
p50, in points of day score. All nine are healthy — good triage clears at least
60% of seeds and bad triage no more than 30% — but they are not equal:
**T3 Helpdesk is the narrowest rung at 17 points**, and **Procurement is the
widest at 28**. A narrow rung is one where the day is closest to fitting, so
there is least to decide.

That pair of names is checked: `bars.js` re-reads this paragraph and fails if
either rung stops being the one it says, which is how a sentence like this one
stops being true six weeks after somebody writes it. It replaced a roadmap line
naming a rung that had not been narrowest for two content passes.

Every number in this file and in the README is re-derived from the built game by
`tools/claims.js`, which fails if either document drifts from what the game
does. The long-form record of how the balance got here — every sweep, every
number that moved and why — is in [`BALANCE.md`](BALANCE.md).

## The harnesses

They're in `tools/`: run `npm i playwright`, then pass each one the path to
`index.html`. They exist because most of this game's real bugs were invisible to
the ones that came before them.

In a Claude Code on the web session that install is done for you —
`.claude/hooks/session-start.sh` runs at session start, puts playwright in the
repo, and checks the checkout against the remote. It is there because a
restored container repeatedly came back holding a checkout months behind origin
with the fetch refspec missing, which makes `origin/main` a fossil and every
`git status` a confident lie.

| | |
|---|---|
| `verify.js` | boots it and runs the 510 in-game self-tests |
| `claims.js` | re-derives every number the README and this file state from the built game |
| `dead.js` | finds data, state, functions and dialogue that are written and never read |
| `firstday.js` | plays the first day through real key events and clicks, and reads only what is on screen |
| `mouseonly.js` | plays from the title screen to a worked ticket without pressing a single key, because the handbook's first line promises the mouse can |
| `touch.js` | plays it on a 390x844 phone with taps alone, in both orientations, measures what a finger can reach, and plays all twelve boards to a result |
| `levels.js` | reads each map as a LEVEL: is every door a way through or a way out, is the floor one connected region, can every act be stood next to, is every legend glyph placed. It finds which acts are exits by probing — using one and seeing whether the map changed |
| `errands.js` | walks every ticket in the game — deals it, follows every marker it puts down, takes the lift when the marker is downstairs, and requires the ticket to close |
| `playday.js` | plays past the first ticket — follows markers, answers dialogue, leaves boards it cannot solve |
| `liftride.js` | takes a downstairs ticket and rides the lift with real clicks and keys |
| `driveout.js` | the same for the whole journey off the premises — lift, fire door, car — clicking only what the objective points at, because every other proof the drive works was a unit-level probe calling the pieces |
| `visual.js` | screenshots every screen and board at four window sizes, asserting no text is invisible — clipped where it cannot be scrolled to, or painted over where it sits |
| `stakes.js` | sweeps what a ticket is worth by priority and reports how far it separates good triage from bad, against the table the game is actually holding |
| `stale.js` | checks every balance number quoted in a source comment against the one the game holds |
| `clock.js` | reads every dialogue option that says how long it takes and checks it against what it charges — with a written list of the durations that belong to the world rather than to your afternoon |
| `boards.js` | plays every minigame perfectly, carelessly, at random, and **blind** — the best rule that needs no comprehension — and reports the spread |
| `keys.js` | presses every key each board's how-to-play card promises, and pokes every click rect — the card list is read off `GAME_BRIEF`, because the hand-kept one omitted the board that had a dead key |
| `bars.js` | where should each promotion bar sit? `--sweep` finds the deal rate that best separates good triage from bad; `--careers --target=0.75` bisects every bar at once against the share of careers that reach retirement |
| `gate.js` | `--ladder` measures every rung against the debt recorded in the game |
| `score.js` | takes the day score apart into the three terms it is made of — stakes closed, realisation, burn — because `bars.js` reports the number those produce and cannot say which one moved |
| `probe.js` | dumps what a triage rule actually closes, ticket by ticket, with what it was worth and what it cost |
| `ladder.js` | prints the shipped ladder as a markdown table, so `BALANCE.md` is generated rather than hand-copied — it drifted once and cost a session |
| `meta.js` | plays whole careers across many players — the only one that can see whether the top of the ladder is reachable. Takes triage and choice policy as arguments, so it can be asked about a bad player and not only a good one |
| `save.js` | mid-day save, reload, and the afternoon has to survive it |
| `audit.js` | the things the suite does not check — whether the content is any GOOD: pool depth, priority spread, board density, whether anything cheap is punishingly stressful |
| `playtest.js` | three personas play whole seeded careers for pacing: days survived, promotion days, breach rates, ending distribution |
| `human.js`, `marathon.js`, `burn.js`, `templates.js`, `dials.js`, `trace.js`, `timing.js` | input driving, long soaks, burnout curves, per-template fairness |

Anything that changes a rung's content or its numbers has to be run past
`bars.js` **and** `meta.js` before it lands. They disagree, and the one that
plays careers is the one that's right — there's a note in `BALANCE.md` about
the day two harnesses both said ship it and `meta.js` showed it would have shut
the top of the ladder.

## Two rules that keep the documents honest

**A number in a comment is a measurement with a date on it, not a fact.**
`stale.js` checks every tunable quoted in a source comment against the value the
game holds. It exists because comments claiming a balance number outlived the
number more than once.

**A dead option has to be a deliberate one.** An option beaten by a sibling on
all four axes the game scores — time, reputation, stress, quality — is not a
choice. Usually that is the joke and it is the best writing in the game; the
accidental version is the thorough option costing more and returning nothing,
which teaches that care is never worth paying for. `FUTILE_BY_DESIGN` in
`index.html` lists the deliberate ones and a self-test asserts that set exactly,
in both directions.

# Managed

You've been hired as the intern at Proactive IT Partners, a managed IT services
provider. Congratulations. The coffee is free and the coffee is bad.

The game is your career there: the ticket queue, the SLA timers, the printer
that is possessed, the standup that could have been an email, and if you last,
the climb through T1/T2/T3 helpdesk, Project Team, Procurement, Relationship
Manager, Solutions Architect, vCIO, and Director of IT.

It's a roguelite, so a run is a career, and careers end. Yours will end in
burnout, or in a meeting with Linda you don't walk back from, or, if you make
Director and hold on, in retirement. Retirement is the good ending.

You climb the ladder across careers rather than inside one. Come back after a
run and you start a rung below wherever the industry currently rates you. Get
let go and that costs you a peg. Nine promotions don't fit inside one person's
patience.

It's one HTML file. No engine, no assets, no build step. A canvas tile world you
walk around with real text on top of it, because satire dies in a 6-pixel font.
Same idea as its sibling project
[Agent 360](https://github.com/joshfeinst/Agent360), whose arcade cabinet is in
the break room.

## Play it

| | |
|---|---|
| **In a browser** | [joshfeinst.github.io/Managed](https://joshfeinst.github.io/Managed/) — installs as an app, works offline after the first load |
| **From a file** | Download `index.html` and double-click it. That's the whole game. |
| **Locally** | `python3 -m http.server` in the repo, then `http://localhost:8000` |

## Controls

Walk with WASD or the arrow keys. Talk, use, and advance dialogue with E, Space,
Enter, or a mouse click. Pick a conversation choice with 1–3, or click it. Open
the ticket queue with Tab. Pause with Esc, mute with M.

Inside a minigame, H brings back the rules card. F1 shows a log of your day in
plain English if you want to see what happened. F4 runs the game's own
self-tests if you're curious.

**The mouse plays the whole game on its own.** Click a patch of floor to walk
there, click a machine or a person to walk over and use them, click to advance
anything, and there are QUEUE and PAUSE buttons in the corner of the HUD.
Nothing needs the keyboard except typing a job posting ID.

### On a phone

It works out that it is on a phone by itself. There is no switch, and there
does not need to be one: the page asks `(hover:none) and (pointer:coarse)`,
which is a question about the *primary input* — is it a finger — rather than a
guess at the device from its name. That is automatic, it is right about
touchscreen laptops and tablets with keyboards attached, and it re-answers
itself the moment the input changes, so pairing a keyboard to an iPad flips the
game back to its desktop layout while it is running.

What changes when it is a finger: every control grows to at least 44px, the two
it needs most — QUEUE and PAUSE — float in the bottom corner where a thumb
already is, a tap on the world is a move rather than a zoom, and in portrait
the HUD comes out from on top of the canvas and sits underneath it. Landscape
is the better way to hold it and the game says so once, in the space it is
talking about. Installed from the browser's *Add to Home Screen*, it launches
fullscreen and landscape and works offline.

## A day at Proactive

You clock in at 9:00 and the shift is eight game-hours. Working a ticket costs
you minutes off that shift, and so does a meeting, and you can watch it happen —
but the panels themselves hold the clock, so reading a line is free and taking
your time over a decision is free. The work is priced, not your reading speed.

Options has a pace dial for how fast those eight hours pass in the real world:
about thirteen minutes on Relaxed, eight on Standard, five on Crunch. The
tickets, the deadlines and the scoring are the same at all three, so it changes
how much room you get and nothing else. A profile that hasn't finished a career
yet starts on Relaxed.

You cannot clear the queue. That's deliberate: about fourteen tickets arrive
against a day a flawless triager gets through five or six of, so deciding what
to let burn is the game. It gets harsher as you climb, not gentler — an intern
works nine of fifteen, a Procurement Specialist five of fifteen — because the
work gets bigger and the calendar gets fuller. An intern loses five per cent of
the day to meetings; a vCIO loses sixteen.

Every ticket has a priority, P1 through P4, on its queue row, and it's the
office's priority rather than the technically correct one. The account manager's
coffee run is a P1. The client who wants MFA switched off is a P4. Learning
whose absurdity outranks whose is the skill.

At the end of the day you're scored on what you protected against what was at
stake. A P1 is worth ten times a P4. Dropping tickets is expected, and there's
some forgiveness for your first casualties. Dropping the wrong ones is what
hurts.

Measured across 16 seeds and six days each, with every board played perfectly
so that only the triage rule differs, the two strategies that work are
*protect the big ones* (72.0%) and *close what you can actually finish*
(67.7%) — four points apart, so protecting the big ones is the better rule and
finishing what you start is a defensible second, which is the point. Two
things lose you the most: doing the least important thing first
(51.2%), and **working the queue in the order it arrived** (55.7%). Going in
order costs you nearly as much as choosing badly, and it feels like diligence
the whole time you are doing it.

Skill at the minigames matters and judgement matters more: fumbling every
board against acing them is 8.2 points, and the best triage rule against the
worst is 21.2. Hands are worth having; they will not save a day you triaged
badly.

Some other things worth knowing:

- Work tickets at your terminal, or hit Tab from anywhere.
- Some tickets need you to physically go somewhere, and the game draws you a
  route.
- Grab a ticket when it lands and work it straight through and you win the
  promptness half outright, on any template — the clock you're racing is the one
  that runs while it sits there, not the one that runs while you're on it. What
  you do once you're in it is the rest: how the minigame goes, and which of the
  three things you decide to do about it.
- The first time you meet a minigame it opens on a card explaining what it is,
  which keys do what, and what costs you marks. H brings it back later.
- Every rung has its own boards, and they are the rung. The intern patches
  racks, triages passwords and translates meetings. T1 takes calls where the
  script and the caller disagree. T2 gets the change you can make instantly,
  where the only question is who it lands on. The Project Team carves one /24
  into sites and finds out that a block one size too generous starves the last
  one on the list. Procurement gets a budget that will not stretch and three
  lines it is not allowed to cheapen. The Relationship Manager gets a client,
  a team and a margin who cannot all be satisfied by the same sentence. The
  Solutions Architect gets the as-built drawing and three outage windows to
  test it with. The vCIO gets a board paper where some questions have no answer
  and saying so is the right move. The Director decides whose Saturday it is.
  None of them are on a stopwatch; take as long as you like and be right.
- Stopping to talk to someone costs you nothing. Neither does clicking away
  mid-conversation; you come back to the line you were on.
- Stress climbs all day and makes hands-on work harder. That's what the kitchen
  is for. The fourth cup of coffee is a trap.
- Stress mostly resets overnight. Burnout doesn't. That's the run.

Clock out and you face the Daily Performance Review. Promotions are judged on
your rolling average over recent days at your current rung, not on one heroic
Tuesday. Being decent to people helps a little: Linda decides, and Linda has
heard good things.

## Roadmap

Every rung is playable, deals a queue the rung below can't get, has its own
meetings, says something to you when you're promoted, and has a board of its
own. The Big Migration turns up on your last day at the top and you can lose
it — there are two retirements now, and which one you read depends on whether
you signed the thing.

What's left:

The elevator should go somewhere. Client sites. The dreaded on-site visit.

Relationship Manager is the weakest rung on the ladder: good triage separates
from bad by fewer points there than anywhere else. It's measured, it's written
down in `docs/BALANCE.md`, and it wants content rather than another pass at its
bar.

Then multiplayer to a degree: a shared career leaderboard, where the same seed
deals the same tickets and you compare whose career went better. Ghosts later.
And more meta-progression — LinkedIn connections, and other MSPs willing to hire
you. There are four certifications to bank reputation against now, and three
perks that arrive on their own as the careers add up; there should be more of
both.

## Under the hood

One file, eight script blocks: core (seeded RNG, input, audio), art (tiles and
people baked at startup), data (roles, tickets, events, NPCs, dialogue, maps —
all the content, so the writing scales without touching the engine), engine
(tile world, pathfinding, camera, renderer), sim (the day machine, SLA, burnout,
versioned saves), UI, tests, and the PWA registration.

Every run is seeded, so a job posting ID deals the same career twice.

The headless harnesses are in `tools/`: run `npm i playwright`, then pass each
one the path to `index.html`. They exist because most of this game's real bugs
were invisible to the ones that came before them.

In a Claude Code on the web session that install is done for you —
`.claude/hooks/session-start.sh` runs at session start, puts playwright in the
repo, and checks the checkout against the remote. It is there because a
restored container twice came back holding a checkout months behind origin
with the fetch refspec missing, which makes `origin/main` a fossil and every
`git status` a confident lie.

| | |
|---|---|
| `verify.js` | boots it and runs the 468 in-game self-tests |
| `claims.js` | re-derives every number this README states from the built game |
| `dead.js` | finds data, state, functions and dialogue that are written and never read |
| `firstday.js` | plays the first day through real key events and clicks, and reads only what is on screen |
| `mouseonly.js` | plays from the title screen to a worked ticket without pressing a single key, because the handbook's first line promises the mouse can |
| `touch.js` | plays it on a 390x844 phone with taps alone, in both orientations, measures what a finger can reach, and plays all twelve boards to a result |
| `levels.js` | reads each map as a LEVEL: is every door a way through or a way out, is the floor one connected region, can every act be stood next to, is every legend glyph placed. It finds which acts are exits by probing — using one and seeing whether the map changed |
| `errands.js` | walks every ticket in the game — deals it, follows every marker it puts down, takes the lift when the marker is downstairs, and requires the ticket to close |
| `playday.js` | plays past the first ticket — follows markers, answers dialogue, leaves boards it cannot solve |
| `liftride.js` | takes a downstairs ticket and rides the lift with real clicks and keys |
| `visual.js` | screenshots every screen and board at four window sizes, asserting no text lands on the canvas |
| `stakes.js` | sweeps what a ticket is worth by priority and reports how far it separates good triage from bad |
| `stale.js` | checks every balance number quoted in a source comment against the one the game holds |
| `boards.js` | plays every minigame perfectly, carelessly, at random, and **blind** — the best rule that needs no comprehension — and reports the spread |
| `keys.js` | presses every key each board's how-to-play card promises, and pokes every click rect — the card list is read off `GAME_BRIEF`, because the hand-kept one omitted the board that had a dead key |
| `bars.js` | where should each promotion bar sit? `--sweep` finds the deal rate that best separates good triage from bad; `--careers --target=0.75` bisects every bar at once against the share of careers that reach retirement |
| `gate.js` | `--ladder` measures every rung against the debt recorded in the game |
| `score.js` | takes the day score apart into the three terms it is made of — stakes closed, realisation, burn — because `bars.js` reports the number those produce and cannot say which one moved |
| `probe.js` | dumps what a triage rule actually closes, ticket by ticket, with what it was worth and what it cost |
| `ladder.js` | prints the shipped ladder as a markdown table, so docs/BALANCE.md is generated rather than hand-copied — it drifted once and cost a session |
| `meta.js` | plays whole careers across many players — the only one that can see whether the top of the ladder is reachable |
| `save.js` | mid-day save, reload, and the afternoon has to survive it |
| `audit.js` | the things the suite does not check — whether the content is any GOOD: pool depth, priority spread, board density, whether anything cheap is punishingly stressful |
| `playtest.js` | three personas play whole seeded careers for pacing: days survived, promotion days, breach rates, ending distribution |
| `human.js`, `marathon.js`, `burn.js`, `templates.js`, `dials.js`, `trace.js`, `timing.js` | input driving, long soaks, burnout curves, per-template fairness |

Anything that changes a rung's content or its numbers has to be run past
`bars.js` **and** `meta.js` before it lands. They disagree, and the one that
plays careers is the one that's right — there's a note in `docs/BALANCE.md`
about the day two harnesses both said ship it and `meta.js` showed it would
have shut the top of the ladder.

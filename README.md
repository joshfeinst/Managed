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

You cannot clear the queue. That's deliberate: about eighteen tickets arrive
against a day you can work eight or nine of, so deciding what to let burn is the
game. The ratio holds as you climb, but the shape of it changes — a vCIO is
dealt fewer, heavier things and spends a third of the week in rooms.

Every ticket has a priority, P1 through P4, on its queue row, and it's the
office's priority rather than the technically correct one. The account manager's
coffee run is a P1. The client who wants MFA switched off is a P4. Learning
whose absurdity outranks whose is the skill.

At the end of the day you're scored on what you protected against what was at
stake. A P1 is worth seven times a P4. Dropping tickets is expected, and there's
some forgiveness for your first casualties. Dropping the wrong ones is what
hurts.

Measured across 40 seeds, the two strategies that work are *protect the big
ones* and *close what you can actually finish*, and they're within two points of
each other — so there's no single right answer, which is the point. The two that
lose you the most are doing the least important thing first, and **working the
queue in the order it arrived**. Those two score the same. Going in order is
exactly as expensive as choosing badly, and it feels like diligence the whole
time you're doing it.

Some other things worth knowing:

- Work tickets at your terminal, or hit Tab from anywhere.
- Some tickets need you to physically go somewhere, and the game draws you a
  route.
- Grab a ticket when it lands and work it straight through and you'll score full
  marks. The clock you're racing is the one that runs while it sits there.
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

| | |
|---|---|
| `verify.js` | boots it and runs the ~290 in-game self-tests |
| `visual.js` | screenshots every screen and board at four window sizes, asserting no text lands on the canvas |
| `boards.js` | plays every minigame perfectly, carelessly and at random, and reports the spread |
| `keys.js` | presses every key each board's how-to-play card promises, and pokes every click rect |
| `bars.js` | where should each promotion bar sit? `--sweep` finds the deal rate that best separates good triage from bad |
| `gate.js` | `--ladder` measures every rung against the debt recorded in the game |
| `meta.js` | plays whole careers across many players — the only one that can see whether the top of the ladder is reachable |
| `save.js` | mid-day save, reload, and the afternoon has to survive it |
| `human.js`, `marathon.js`, `burn.js`, `templates.js`, `dials.js`, `trace.js`, `timing.js` | input driving, long soaks, burnout curves, per-template fairness |

Anything that changes a rung's content or its numbers has to be run past
`bars.js` **and** `meta.js` before it lands. They disagree, and the one that
plays careers is the one that's right — there's a note in `docs/BALANCE.md`
about the day two harnesses both said ship it and `meta.js` showed it would
have shut the top of the ladder.

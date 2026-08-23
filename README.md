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

You clock in at 9:00 and the shift is eight game-hours. The clock doesn't stop
for dialogue, for meetings, or for a minigame — your SLAs count down the whole
time. Options has a pace dial for how fast those eight hours pass in the real
world: about thirteen minutes on Relaxed, eight on Standard, five on Crunch. The
tickets, the deadlines and the scoring are the same at all three, so it changes
how much room you get and nothing else. A profile that hasn't finished a career
yet starts on Relaxed.

You cannot clear the queue. That's deliberate: about 23 tickets arrive against a
day with room for roughly 16, so deciding what to let burn is the game.

Every ticket has a priority, P1 through P4, on its queue row, and it's the
office's priority rather than the technically correct one. The account manager's
coffee run is a P1. The client who wants MFA switched off is a P4. Learning
whose absurdity outranks whose is the skill.

At the end of the day you're scored on what you protected against what was at
stake. A P1 is worth much more than a P4, so the big ugly ticket beats the quick
easy one nearly every time. Dropping tickets is expected, and there's some
forgiveness for your first casualties. Dropping the wrong ones is what hurts.

Some other things worth knowing:

- Work tickets at your terminal, or hit Tab from anywhere.
- Some tickets need you to physically go somewhere, and the game draws you a
  route.
- Grab a ticket when it lands and work it straight through and you'll score full
  marks. The clock you're racing is the one that runs while it sits there.
- The first time you meet a minigame it opens on a card explaining what it is,
  which keys do what, and what costs you marks. The clock stops while that card
  is up.
- Stress climbs all day and makes hands-on work harder. That's what the kitchen
  is for. The fourth cup of coffee is a trap.
- Stress mostly resets overnight. Burnout doesn't. That's the run.

Clock out and you face the Daily Performance Review. Promotions are judged on
your rolling average over recent days at your current rung, not on one heroic
Tuesday. Being decent to people helps a little: Linda decides, and Linda has
heard good things.

## Roadmap

Every rung is playable, but the senior desks are thin — eight tickets deep where
the intern has thirty-five. They need the same density: more tickets, more
events, more promotion scenes, and minigames that match the job, like subnetting
on the Project Team, quote Tetris in Procurement, and defending a budget as
vCIO. The engine doesn't need anything new for that, since rungs are data.

The elevator should also go somewhere. Client sites. The dreaded on-site visit.

After that, multiplayer to a degree: a shared career leaderboard, where the same
seed deals the same tickets and you compare whose career went better. Ghosts
later. And more meta-progression — certifications, LinkedIn connections, other
MSPs willing to hire you, and something worth spending banked reputation on.

## Under the hood

One file, eight script blocks: core (seeded RNG, input, audio), art (tiles and
people baked at startup), data (roles, tickets, events, NPCs, dialogue, maps —
all the content, so the writing scales without touching the engine), engine
(tile world, pathfinding, camera, renderer), sim (the day machine, SLA, burnout,
versioned saves), UI, tests, and the PWA registration.

Every run is seeded, so a job posting ID deals the same career twice. The
headless test harnesses are in `tools/`: run `npm i playwright`, then pass each
one the path to `index.html`.

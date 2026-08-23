# Managed

You've been hired as the intern at **Proactive IT Partners**, a managed IT
services provider. Congratulations. The coffee is free and the coffee is bad.

This is a game about living that career — the ticket queue, the SLA timers, the
printer that is possessed, the standup that could have been an email — all the
way up, if you last, through T1/T2/T3 helpdesk, Project Team, Procurement,
Relationship Manager, Solutions Architect, vCIO, and Director of IT.

It's a roguelite, so a run is a career, and careers end. Yours will end in
burnout, or in a meeting with Linda you don't walk back from, or — if you make
Director and hold on — in retirement, which is the good ending. You climb the
ladder *across* careers, not inside one. Come back after a run and you start
one rung below wherever the industry currently rates you. Get let go and that
costs you a peg. Nine promotions were never going to fit in one person's
patience.

It's also one HTML file. No engine, no assets, no build step. A canvas tile
world you walk around, and real text on top of it, because satire dies in a
6-pixel font. Same idea as its sibling project
[Agent 360](https://github.com/joshfeinst/Agent360), whose arcade cabinet is in
the break room.

## Play it

| | |
|---|---|
| **In a browser** | [joshfeinst.github.io/Managed](https://joshfeinst.github.io/Managed/) — installs as an app, works offline after the first load |
| **From a file** | Download `index.html`, double-click it. That's the whole game. |
| **Locally** | `python3 -m http.server` in the repo, then `http://localhost:8000` |

## Controls

Walk with **WASD** or the **arrow keys**. Talk, use, and advance dialogue with
**E**, **Space**, **Enter** — or just click. Pick a conversation choice with
**1–3**, or click it. Open the ticket queue with **Tab**. Pause with **Esc**,
mute with **M**.

**F1** pulls up a plain-English log of your day so far, if you want to see what
actually happened. **F4** runs the game's own self-tests, if you're curious.

## A day at Proactive

You clock in at 9:00. One game-minute passes every real second, so a shift runs
about eight minutes, and the clock never stops — not for dialogue, not for
meetings, not while you're elbow-deep in a minigame. Your SLAs are counting down
the entire time.

**You cannot clear the queue.** That's deliberate. Roughly 23 tickets arrive
against a day with room for about 16. Deciding what to let burn *is* the game.

Every ticket has a priority, **P1 through P4**, right there on its queue row —
and it's the office's priority, not the technically correct one. The account
manager's coffee run is a P1. The client who wants MFA switched off is a P4.
Learning whose absurdity outranks whose is the actual skill being tested.

At the end of the day you're scored on what you protected versus what was at
stake. A P1 is worth far more than a P4, so the big ugly ticket beats the quick
easy one nearly every time. Dropping tickets is fine — expected, even. There's
some forgiveness built in for your first casualties. Choosing the *wrong* ones
to drop is what hurts.

A few other things worth knowing:

- Work tickets at your terminal, or hit **Tab** from anywhere.
- Some tickets need you to physically go somewhere. The game will draw you a
  route.
- Grab a ticket when it lands and work it straight through and you'll score full
  marks. The clock you're really racing is the one that runs while it sits
  there.
- **Stress** climbs all day and makes hands-on work harder. That's what the
  kitchen is for. The fourth cup of coffee is a trap.
- **Stress** mostly resets overnight. **Burnout** doesn't. That's the run.

Clock out and you'll face the Daily Performance Review. Promotions are judged on
your rolling average over recent days at your current rung, not on one heroic
Tuesday. Being decent to people helps a little — Linda decides, and Linda has
heard good things.

## Roadmap

- **More ladder.** Every rung is playable, but the senior desks are thin —
  eight tickets deep where the intern has thirty-five. They need the same
  density: more tickets, more events, more promotion scenes, and minigames that
  match the job (subnetting on the Project Team, quote Tetris in Procurement,
  defending a budget as vCIO). The engine doesn't need anything new for this;
  rungs are just data.
- **More office.** The elevator should go somewhere. Client sites. The dreaded
  on-site visit.
- **Multiplayer, to a degree.** A shared career leaderboard first — same seed,
  same tickets, whose career went better. Ghosts later.
- **More meta.** Certifications, LinkedIn connections, other MSPs willing to
  hire you, and something worth spending banked reputation on.

## Under the hood

One file, eight script blocks: core (seeded RNG, input, audio) → art (tiles and
people baked at startup) → data (roles, tickets, events, NPCs, dialogue, maps —
all the content, so the writing scales without touching the engine) → engine
(tile world, pathfinding, camera, renderer) → sim (the day machine, SLA,
burnout, versioned saves) → UI → tests → PWA.

Every run is seeded, so a job posting ID deals the same career twice. The
headless test harnesses live in `tools/` — `npm i playwright`, then pass each
one the path to `index.html`.

# Managed — an MSP life simulator

You get hired as the unpaid intern at **360 Smart Networks**, a managed IT
services provider, and you live the career: the ticket queue, the SLA timers,
the coffee machine, the printer that is possessed, the standup that could have
been an email — all the way up (if you survive) through T1/T2/T3 helpdesk,
Project Team, Procurement, Relationship Manager, Solutions Architect, vCIO,
and Director of IT.

**It's a roguelite.** A run is a career. It ends in burnout, in a Linda
meeting you don't walk back from, or — if you make Director and hold on — in
retirement, the good ending. Certifications and industry reputation persist
across careers: your next job starts higher because of what the last one did
to you.

**It's one HTML file.** No engine, no assets, no build. Canvas tile world for
the office (walk it, Pokemon-style), real DOM for the prose — satire dies in a
6-pixel font. Same zero-dependency philosophy as its sibling project
[Agent 360](https://github.com/joshfeinst/Agent360), whose arcade cabinet
lives in this game's break room.

## Play it

| Channel | How |
|---|---|
| **Hosted (PWA)** | `https://joshfeinst.github.io/managed/` — live once this repo is public (Pages doesn't publish from private repos on a free plan; the deploy workflow is committed and fires on the next push after visibility changes). |
| **Single file** | Download `index.html`, double-click. That's the game. |
| **Local server** | `python3 -m http.server` in the repo → `http://localhost:8000`. |

## How a day works

Clock in at 9:00. One game-minute per real second — a shift is 8 minutes, and
the clock **never stops**: dialogue, meetings, and minigames all happen while
your SLAs count down. Tickets arrive all day (pre-rolled at commute from your
career's seed, so the same Job Posting ID always deals the same days — race a
colleague on the same seed). Work them at your terminal (or press **Tab**),
walk where the job needs you, keep the coffee under four cups (the crash is
real, and cup four gives you the minigame jitters), and clock out to face the
Daily Performance Review. String together good days to get promoted. String
together bad ones and Linda "pops a meeting on your calendar."

**Stress** resets mostly overnight. **Burnout** doesn't. That's the run.

## Controls

Walk **WASD/arrows** · talk/use/advance **E / Space / Enter** · choices
**1–3** · queue **Tab** · pause **Esc** · mute **M** · self-test **F4**.

## The numbers are refereed, not guessed

- **F1** shows a plain-language session log — every ticket in, every choice
  taken, what each resolved at, breaches, coffees, promotions — so play
  feedback can cite what actually happened.
- **F4** runs a 31-invariant self-test in-game: map reachability audits, NPC
  schedule clashes, content lints (every ticket resolvable, every dialogue
  exits, every fill token resolves), seeded-RNG determinism (same posting →
  identical day, twice), stream isolation (100 stray NPC rolls cannot reshape
  the queue), a zero-`Math.random` tripwire across a simulated day, save
  roundtrip identity, a full simulated day that must reach the review, a lint
  that every ticket's SLA actually fits the walking and minigame work it
  demands (measured against real play, where the tutorial ticket once wanted
  47 minutes inside a 45-minute window), and regressions for every bug the
  adversarial review rounds have found.
- `tools/verify.js` runs that suite headlessly:
  `npm i playwright && node tools/verify.js "$(pwd)/index.html"`.
- `tools/playtest.js` plays whole careers with three bot personas through the
  game's own headless day-bot, priced at honest human time costs (reading a
  line ~3s, a minigame ~12s — an adversarial review caught the bot originally
  paying 1/10th of what a player pays, which invalidated every target).
  Current numbers, all green:
  - **diligent** (skill .8): T1 by day ~3, ~6% breach rate, reaches T2, burns
    out around day 17 — promotion is itself a burnout accelerant, which is
    the joke.
  - **slacker**: fired by day 2.
  - **overcaffeinated**: sleep debt is real; coffee is a loan, and a cup you
    never metabolise is still charged at 5pm.
- `tools/marathon.js` drives the **real** frame loop and real input path (not
  the day-bot) through whole careers with a scripted player, watching for
  faults, frozen states, modal traps and occupancy corruption — the failures a
  headless day-sim structurally cannot see:
  `node tools/marathon.js "$(pwd)/index.html"`.

Balance constants live in one `BURN` record (daily entropy, evening
threshold and rate, sleep debt, unmetabolised-crash cost) that both `endDay`
and its self-tests read, so retuning can never silently drift away from the
invariants guarding it.

## Roadmap

- **v0.2+ — content packs up the ladder**: each rung gets its own ticket pool,
  minigames (subnetting at Project Team, quote Tetris at Procurement, budget
  defense at vCIO), events, and promotion scenes. The engine needs nothing new
  — rungs are data.
- **More office**: the elevator goes somewhere eventually (client sites,
  the dreaded on-site).
- **Multiplayer "to a degree"**: shared career leaderboard first (same-seed
  races), ghosts later — same ladder as the Agent 360 roadmap, same
  SharePoint-friendly hosting story (embed the Pages URL in a SharePoint page
  via the Embed web part).
- Meta depth: more certs, LinkedIn connections, alternate MSPs to be hired
  into.

## Development

Single file, eight script blocks: core (seeded RNG streams, input, audio) →
art (tile atlas + paper-doll people baked at boot) → data (ROLES, TICKETS,
EVENTS, NPCS, DIALOGUE, MAPS — all content is data; the satire scales without
engine changes) → engine (tile world, A* schedules, camera, renderer) → sim
(the day machine, SLA, burnout, saves with versioned migrations) → UI →
tests/boot → PWA guard. Gameplay randomness flows through named seeded
streams; `Math.random` is cosmetics-only and the self-test enforces it.

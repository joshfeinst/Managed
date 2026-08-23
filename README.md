# Managed — an MSP life simulator

You get hired as the unpaid intern at **Proactive IT Partners**, a managed IT
services provider, and you live the career: the ticket queue, the SLA timers,
the coffee machine, the printer that is possessed, the standup that could have
been an email — all the way up (if you survive) through T1/T2/T3 helpdesk,
Project Team, Procurement, Relationship Manager, Solutions Architect, vCIO,
and Director of IT.

**It's a roguelite.** A run is a career. It ends in burnout, in a Linda meeting
you don't walk back from, or — if you make Director and hold on — in
retirement, the good ending. **The ladder is climbed across careers, not
within one:** you come back one rung below where the industry currently rates
you, and being let go costs you a peg. Nine promotions do not fit inside one
burnout budget, and were never meant to.

**It's one HTML file.** No engine, no assets, no build. Canvas tile world for
the office (walk it, Pokemon-style), real DOM for the prose — satire dies in a
6-pixel font. Same zero-dependency philosophy as its sibling project
[Agent 360](https://github.com/joshfeinst/Agent360), whose arcade cabinet
lives in this game's break room.

## Play it

| Channel | How |
|---|---|
| **Hosted (PWA)** | `https://joshfeinst.github.io/Managed/` — needs Pages switching on once: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The deploy workflow is committed and fires on every push to `main`; until that switch is flipped it fails at `configure-pages`, because the Actions token is not allowed to create a Pages site by itself. |
| **Single file** | Download `index.html`, double-click. That's the game. |
| **Local server** | `python3 -m http.server` in the repo → `http://localhost:8000`. |

## The day, and the decision it is really asking about

Clock in at 9:00. One game-minute per real second — a shift is 8 minutes, and
the clock **never stops**: dialogue, meetings and minigames all happen while
your SLAs count down.

**You cannot clear the queue.** It is oversubscribed on purpose: about 23
tickets arrive against a day that holds roughly 16. Choosing what to let burn
*is* the game.

So every ticket carries a priority, **P1 to P4**, shown on its queue row — and
it is the office's priority, not the technically correct one. The account
manager's coffee run is a P1. The client who wants MFA switched off is a P4.
Learning which absurdity outranks which is the skill.

- A day is scored on **stakes earned against stakes at risk**. Stakes are
  superlinear (P4 1 · P3 2 · P2 4 · P1 7), so working the P1 is worth more per
  minute than working the quick one — which took measuring to get right, since
  at a linear weighting the two came out identical and a rational player was
  indifferent.
- **Dropping tickets is allowed; choosing badly which is not.** A tolerance
  forgives your first casualties at a quarter of their stakes, cheapest first.
  Letting the P4 age costs almost nothing. Letting the P1 burn is the day.
- **Promptness is graded against a ticket's slack, not its whole window.** Pick
  it up when it lands and work it straight through and you score full marks on
  any template; the clock you are racing is the one you spend letting it wait.
- Each ticket is graded out of what it actually offers — no ticket is marked
  against a minigame it does not have.

Work tickets at your terminal (or press **Tab**), walk where the job needs you,
keep an eye on stress (frayed hands make hands-on work harder — that is what
the kitchen is for, and why the fourth cup is a trap), and clock out to face the
Daily Performance Review. A promotion is judged on your **rolling average over
your last few days at the current rung**, not on a streak of perfect ones.
Goodwill from the decent choices takes a little off the bar, capped, because
Linda decides and Linda has heard good things.

**Stress** mostly resets overnight. **Burnout** doesn't. That's the run.

## Controls

Walk **WASD/arrows** · talk/use/advance **E / Space / Enter** · choices
**1–3** · queue **Tab** · pause **Esc** · mute **M** · session log **F1** ·
self-test **F4**.

## The numbers are refereed, not guessed

Every balance claim on this page was measured, and most of them started out
false. A sample of what measuring found and fixed:

- The central decision was **inert**: across ten triage rules the day score
  spread **0.014**, and playing at skill .95 instead of .45 moved it 0.57 to
  0.63. It is **0.128** and **0.138** now, and the priority-aware rule is the
  best one while its inverse is the worst.
- The **win condition was unreachable**: 464 simulated careers, none retired,
  none past rung 6 of 9. Expert career-sequences now retire in about 5 careers,
  a weaker player in about 9, and a bad one never does.
- **Which template you were dealt** mattered more than how you played — a 0.245
  spread between the luckiest and unluckiest ticket against a 0.11 skill range.
  Now 0.145, and smooth rather than bimodal.
- A day dealt 23 tickets from **15 distinct templates**, the same one up to five
  times, with four **literally identical lines**. Now 18.6 distinct, capped at
  two, and identical lines are gone.
- **Every ticket title in the queue rendered blank** — correct markup, correct
  colour, clipped to nothing by an inherited zero line-height. No harness looks
  at pixels, so `tools/visual.js` now does.
- **Number keys could not take a dialogue choice** for a while, because a
  helper added for the bots shared a name with the dialogue UI's own.
- Taking **the second option** beat every considered strategy in the game, so
  the options are shuffled per encounter now — seeded, so a posting still deals
  the same conversation twice.
- **Coffee was strictly bad** on every axis. **Reputation** bought nothing while
  you were still there. **Four resolved tickets in five** were decorated "aced".

Tools, all headless, all exit non-zero on failure:

| | |
|---|---|
| `tools/verify.js` | the 83-invariant in-game suite (also **F4** while playing) |
| `tools/visual.js` | where glyphs actually paint, screen by screen |
| `tools/timing.js` | can a human finish each ticket inside its window, walking included |
| `tools/playtest.js` | four bot personas across whole careers |
| `tools/meta.js` | whole *sequences* of careers — is the roguelite winnable |
| `tools/dials.js` | do triage and skill actually move the score |
| `tools/ceiling.js` | what each rung produces for six profiles of play |
| `tools/templates.js` | per-template score spread — luck versus play |
| `tools/burn.js` | the burnout curve, day by day |
| `tools/marathon.js` | the real frame loop and real input path, whole careers |
| `tools/trace.js` | readable career transcripts, for reviewing play not code |
| `tools/save.js` | play, save, **reload the page**, resume — does the afternoon survive |

`npm i playwright` first; each takes the file path as its first argument.

**F1** shows a plain-language session log — every ticket in, every choice, what
each resolved at and at what priority, what got dropped, breaches, coffees,
promotions — so feedback can cite what actually happened.

Balance constants live in single records — `BURN` for the burnout economy,
`STAKES` for priority, `REP` for goodwill — that both the code and its
self-tests read, and anything the game *tells* you about its own arithmetic
(the handbook, the password policy) is generated from those same constants,
because both had already silently drifted away from them.

## Roadmap

- **v0.3+ — deeper content packs up the ladder**: every rung now has its own
  eligible pool, but the senior desks are eight tickets deep against the
  intern's thirty-five. More of each, plus
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
  into, and something to spend banked reputation on.

## Development

Single file, eight script blocks: core (seeded RNG streams, input, audio) →
art (tile atlas + paper-doll people baked at boot) → data (ROLES, TICKETS,
EVENTS, NPCS, DIALOGUE, MAPS — all content is data; the satire scales without
engine changes) → engine (tile world, A* schedules, camera, renderer) → sim
(the day machine, SLA, burnout, saves with versioned migrations) → UI →
tests/boot → PWA guard. Gameplay randomness flows through named seeded
streams; `Math.random` is cosmetics-only and the self-test enforces it.

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

It's one HTML file — no engine, no assets, no build step. Same idea as its
sibling project [Agent 360](https://github.com/joshfeinst/Agent360), whose
arcade cabinet is in the break room.

## Play it

| | |
|---|---|
| **In a browser** | [joshfeinst.github.io/Managed](https://joshfeinst.github.io/Managed/) — installs as an app, works offline after the first load |
| **From a file** | Download `index.html` and double-click it. That's the whole game. |
| **Locally** | `python3 -m http.server` in the repo, then `http://localhost:8000` |

Every run is seeded. A job posting ID deals the same career twice, so you can
hand one to somebody else and compare how it went.

## Controls

Walk with WASD or the arrow keys. Talk, use, and advance dialogue with E, Space,
Enter, or a mouse click. Pick a conversation choice with 1–3, or click it. Open
the ticket queue with Tab. Pause with Esc, mute with M.

Inside a minigame, H brings back the rules card. F1 shows a log of your day in
plain English if you want to see what happened.

**The mouse plays the whole game on its own.** Click a patch of floor to walk
there, click a machine or a person to walk over and use them, click to advance
anything, and there are QUEUE and PAUSE buttons in the corner of the HUD.
Nothing needs the keyboard except typing a job posting ID.

**On a phone it works out that it's a phone.** Every control grows to at least
44px, QUEUE and PAUSE float where a thumb already is, and a tap on the world is
a move rather than a zoom. Landscape is the better way to hold it. Installed
from *Add to Home Screen*, it launches fullscreen and works offline.

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
stake. A P1 is worth fourteen times a P4. Dropping tickets is expected, and
there's some forgiveness for your first casualties. Dropping the wrong ones is
what hurts.

There is no single right way to triage. Protecting the big ones and closing what
you can actually finish are both good, and they're close enough together that
which one suits you is a matter of taste. Two things reliably lose you the day:
doing the least important thing first, and working the queue in the order it
arrived — that second one costs you real ground and feels like diligence the
whole time you're doing it.

Some other things worth knowing:

- Work tickets at your terminal, or hit Tab from anywhere.
- Some tickets need you to physically go somewhere, and the game draws you a
  route. A few of them send you off the premises entirely: down to the car
  park, into your car, and out to the client. Those are the biggest tickets in
  the game — the drive is real, it is priced like any other errand, and the
  queue row tells you it is a drive before you take it.
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
- Skill at the minigames matters. Judgement about what to work on matters more.
- Stopping to talk to someone costs you nothing. Neither does clicking away
  mid-conversation; you come back to the line you were on.
- Stress climbs all day and makes hands-on work harder. That's what the kitchen
  is for. The fourth cup of coffee is a trap.
- Stress mostly resets overnight. Burnout doesn't. That's the run.
- Once burnout has you frayed, the evening card offers you a day of annual
  leave, twice a career. It hands back a real chunk of burnout and costs you a
  day, every point of goodwill you were saving for the promotion bar, and a
  first morning back with the queue that built up while you were gone. It buys
  you time, not progress, and that is the trade.

Clock out and you face the Daily Performance Review. Promotions are judged on
your rolling average over recent days at your current rung, not on one heroic
Tuesday. Being decent to people helps a little: Linda decides, and Linda has
heard good things.

Between careers you spend banked reputation on certifications. There are eight,
they cost more than one career earns, and three more perks arrive on their own
as the careers add up — so you choose what to study rather than collecting the
set.

## Roadmap

Things we want to build next, roughly in the order they'd make the game better.

**More than one client site.** There is one now — Unit 4 on the estate, with a
comms cupboard that has a mop in it — and four tickets that drive you out to
it. One site means every visit is the same building. A handful of them, each
with its own layout and its own guy, is what makes the drive a place rather
than a corridor.

**More depth per rung.** Every rung is healthy now, but Project Team is the one
where triaging well and triaging badly are closest together, and the ladder is
long enough that a rung wants more than one shape of day. Which rung is
narrowest is measured rather than guessed — see
[`docs/DESIGN.md`](docs/DESIGN.md).

**A career leaderboard.** The same job posting ID deals the same career to
everyone, so the comparison is already fair. Post a finished career, see how
other people's went on the seed you just played. Ghost runs after that.

**More meta between careers.** LinkedIn connections that actually do something,
rival MSPs willing to headhunt you mid-run, and more certifications and perks
to spend a career's reputation on.

**More boards.** Every rung has one signature minigame; the good ones could
carry two or three, and the ladder is long enough that repetition shows.

**More to spend a day on.** Annual leave is the one thing you can spend a day of
a career on. There should be others: a training course that makes a board
easier for the rest of the run, a day shadowing someone senior, a Friday
afternoon spent on the documentation nobody has read since 2019.

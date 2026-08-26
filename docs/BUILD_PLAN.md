# Build-out plan — the remaining ladder

**Running 01:20–09:20 UTC, 2026-08-26.** This file is the recovery point. The
container has been rebuilt three times in this project and each one wipes
`/tmp` and rolls the working tree back to an old commit. Everything that
matters is committed and pushed as it lands; if you are reading this after a
rebuild, `git fetch origin main && git reset --hard FETCH_HEAD` and carry on
from the first unchecked box.

## Where the ladder stood at the start

| rung | own tickets | events | state |
|---|---|---|---|
| intern | 35 | 14 | done |
| t1 | 14 | 14 | done |
| t2 | 14 | 14 | done |
| t3 | 15 | 14 | done |
| project | 15 | 19 | done — `df51585` |
| procure | 15 | 24 | done — `aa525f6` |
| relmgr | 2 | 24 | **to build** |
| solarch | 1 | 24 | **to build** |
| vcio | 2 | 22 | **to build** |
| director | 5 | 14 | **to finish** |

## The order

- [x] 1. Project Team — 14 tickets, 5 meetings, event tier-gating engine change
- [x] 2. Procurement — 14 tickets, 5 meetings
- [x] 3. Relationship Manager — you stop owning the work and own how they feel about it
- [x] 4. Solutions Architect — you own the drawing, and the drawing outlives you
- [x] 5. vCIO — you own a decision you made four years ago that is now everyone's ceiling
- [x] 6. Director of IT — finish the rung: it has 5 own tickets and needs its own meetings
- [x] 7. **Promotion scenes.** There are currently ZERO in the entire game. Nine
      gates fire and none of them says anything. `run.pendingScenes` is the hook.
- [x] 8. **The Big Migration.** — `650e869`. Dealt on the last day at the top,
      once, early; landing it picks which of two retirements you read.
- [ ] 9. **The balance pass.** Bigger than "re-measure" — see below.

## Rules for this run

1. **Commit and push every rung, alone.** A rebuild then costs one rung.
2. **No harness run over ~3 minutes.** `gate.js --ladder` drives 216 careers and
   several rebuilds landed near runs like it. Use small seed counts routinely;
   save the full sweep for step 9.
3. Every change keeps the suite green. New behaviour gets an invariant, and the
   invariant gets a mutation that must fail.
4. `pri` is INVERTED in TICKETS: `pri:4` renders P1 and is worth 7 points.

## Known open questions, not to be silently decided

- **Craft moves the score by 2 points; triage moves it by 24** (`docs/BALANCE.md`).
  Six bespoke minigames would each buy about as much as the fifth did. The rungs
  are being built with tickets, meetings and scenes first for that reason; the
  board question goes back to Josh with a real rung in front of him.
- ~~Upper rungs are hard to clear because performance degrades across a
  career.~~ **Measured and wrong.** Three real causes, all found 2026-08-26 and
  written up in `docs/BALANCE.md`: one deal rate copy-pasted down eight rungs
  (a flawless vCIO scored 14% and was fired on arrival); the disposable share
  of the queue collapsing 25% → 6% so there was nothing cheap to sacrifice; and
  meeting time accumulating to 151 minutes of a 480-minute day. The first and
  third are fixed. The second is fixed with content at rungs 5–9.

## Step 9 — what is actually left

Rates and bars are a **matched pair** and must be set together from
`tools/bars.js --sweep`, never by hand. The sweep taken before the meeting
budget landed is stale; everything set from it needs redoing.

- [x] Re-sweep deal rates under the meeting budget, set rates and bars together
- [x] Re-baseline `GATE_DEBT` / `GATE_DEBT_BUDGET` and say why — 69 → 52
- [x] relmgr/solarch fixed by the meeting budget + senior time scale, not by a bar
- [x] Full battery: verify, visual, save, meta, burn, human, templates, gate --ladder
- [x] `docs/BALANCE.md` rewritten — three causes, all measured
- [x] **vCIO fixed** — its work got cheaper, not its bar lower. Separation 6 →
      10 points; all nine rungs now healthy on tools/bars.js.
- [x] **Six bespoke boards, rungs 4-9** — THE ADDRESS PLAN (project),
      THE SHORTFALL (procure), KEEPING EVERYBODY (relmgr), THE DIAGRAM
      (solarch), THE BOARD PAPER (vcio), WHOSE SATURDAY (director). Each with
      its own tickets and mutation-tested invariants. The vertical slice Josh
      chose is complete.
- [ ] Put the minigame question to Josh: craft now measures 3-8 points against
      triage 7-12, not the 2-vs-24 the old single-seed reading claimed, so the
      boards matter more than the objection assumed. Worth his call on whether
      craft should feed the day score harder.

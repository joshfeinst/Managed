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

- [ ] Re-sweep deal rates under the meeting budget, set rates and bars together
- [ ] Re-baseline `GATE_DEBT` / `GATE_DEBT_BUDGET` / `GATE_REACH` and say why
- [ ] Relationship Manager and Solutions Architect separated good triage from
      bad by only 3–9 points at every rate tried. If the re-sweep does not fix
      them, they need shorter work, not a different bar — write it down rather
      than tuning around it.
- [ ] Full battery: verify, visual, save, meta, marathon, gate --ladder
- [ ] `docs/BALANCE.md` final table

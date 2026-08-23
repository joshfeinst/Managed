# Overnight refinement log

Rounds of expert play, adversarial review and measured retuning, run against
the `main` build. Every cycle ends with the full battery green and a push.

| # | What it changed | Evidence it was needed | Verified by |
|---|---|---|---|
| 1 | **Triage became the decision.** Ticket stakes (P1–P4), stakes-weighted day score, saturating promptness, tolerance forgiving only the cheapest casualties, breach stress tracking stakes, ladder retuned around the new load. | Triage spread across six policies was **0.014**; skill .45→.95 moved the day only 0.57→0.63; the intern day was 48% subscribed, so the queue could simply be cleared. | Triage spread **0.076** (5.4×), skill spread **0.120** (2.1×); priority-aware play is now the best policy and its inverse the worst; personas separate (diligent T1 by day 5.3, 16/16, reaches T2 — priority-blind costs 3 days and a rung). |
| 1b | **Burnout economy rebuilt** for a full queue: per-ticket stress residue rescaled, overnight recovery deepened to match the stated pillar, queue load flattened above intern, gates re-derived from a six-profile sweep at each rung. | Instrumenting the stress budget showed resolving alone cost **+15 stress/day at T1**, ending every career on day 8; players woke at 47/100 every morning. | Careers now run **11–18 days** on a smooth burnout curve. |
| 1c | **Dialogue choices were dead to the keyboard.** A bot-policy helper named `pickOpt` overwrote the dialogue UI's `pickOpt`. | The smoke harness printed `SMOKE OK` over five FAILs — its verdict only read faults, never its own checks — and it ignored its file argument, so it could not test a baseline. | Both harness bugs fixed; it then found the collision. Self-test added and mutation-verified. |
| 2 | **Content + instrumentation.** "before the the client call" fixed with `{Token}` capitalising form and an article lint; trace harness parsing, choice-policy argument, triage selection and the sliding `SLOG` index all fixed. | A trace of the new build printed the doubled article, `choicePolicy=optionNaN`, and an empty ticket table assembled from regexes that no longer matched. | Fixed instrument reports what a player drops: **P4 55, P3 89, P2 28, P1 3** — the economy rewards what it was rebuilt to reward. |
| 3 | **Every ticket title in the queue rendered blank.** `#frame{line-height:0}` is inherited by overlays; the title cell is the only one with `overflow:hidden`, so its glyphs were clipped while the DOM stayed perfectly correct. | Found by screenshotting the panel. No harness looks at pixels, so nothing could have caught it. | `tools/visual.js` added: it measures where glyphs actually paint and whether a clipping ancestor eats them, across every screen. Mutation-verified against the original bug. |

## Standing numbers

- Self-tests: **43** (F4 in-game, `tools/verify.js` headless)
- Battery: verify · visual · smoke · exploits · npc · marathon · playtest · dials · burn · trace

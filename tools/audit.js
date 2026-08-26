/* Managed content audit: the things the self-test suite does NOT check.
 *
 * The suite proves the game is CORRECT — every key unique, every reference
 * resolvable, every anchor reachable, every board discriminating. It does not
 * prove the content is any good, and four of the last five real bugs were
 * found by looking at the game rather than by running it.
 *
 * This looks at all of it at once, at a level the suite cannot: is every
 * ticket actually finishable, is any choice strictly dominated by another, is
 * any line too long for the box it is drawn in, does any ticket's fiction
 * disagree with its own numbers.
 *
 *   node tools/audit.js /abs/path/index.html
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium'))){
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)) { try { return await chromium.launch({ executablePath:p }); } catch(_){} }
  }
  throw e; } }

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await page.goto('file://' + target);
  await page.waitForFunction(() => typeof simDay === 'function' && typeof TICKETS !== 'undefined');

  const R = await page.evaluate(() => {
    SAVE_SUSPEND = true; QUIET = true;
    const out = {};

    /* ---- 1. can every ticket be FINISHED, at every rung it is dealt at? ---
       tools/timing.js drives ten of them through the real UI, which is the
       gold standard and far too slow for 268. This prices the whole steps
       list against the window the ticket is born with. */
    {
      const tight = [], impossible = [];
      for (const id in TICKETS){
        const T = TICKETS[id];
        for (let r = T.tiers[0]; r <= T.tiers[1] && r < ROLES.length; r++){
          rngInit('AUD'); runInit('AUD'); run.rung = r;
          loadMap('office1');
          const a = makeArrival(id, 0, ROLES[r]);
          const work = ticketWork(T);
          const slack = a.sla - work;
          if (slack <= 0) impossible.push(id + '@' + ROLES[r].id +
            ' work ' + work + ' > sla ' + a.sla);
          else if (slack < MIN_SLACK * .8) tight.push(id + '@' + ROLES[r].id +
            ' only ' + Math.round(slack) + ' min of slack');
          run = null;
        }
      }
      out.impossible = impossible; out.tight = tight;
    }

    /* ---- 2. is any option strictly dominated? -------------------------------
       Three options are a decision only if none of them is better than another
       on EVERY axis at once. applyFx moves exactly four things — time, rep,
       stress, bonus — and an option carries nothing else: no branch, no flag,
       no next. So the four axes here are the whole of what a choice does.

       This is a REPORT, not a defect list, and it is deliberately not fatal.
       Read at face value it flags 57 nodes, and most of them are the game
       working: "Attend. Somebody must know what it is for", "Take the call —
       you never know", "Reply-all to Finance about the cost of processing it".
       Those are meant to be worse. The satire is that the futile option is
       futile, and the option's own text is what warns you.

       What is worth acting on is the narrower shape this cannot tell apart:
       a dead option that reads as the COMPETENT one, beaten by a less
       competent one. That teaches the player that care is not worth paying
       for, which is the opposite of what the rest of the game says. Judge the
       list by reading it; do not sweep it.

       One caveat the numbers hide: on a TICKET node, negative stress is not
       free — applyFx charges it back as burnout at DUCK_DEBT. Five of these
       pairs are won by an option that ducks stress, and on a ticket those are
       not really dominant at all. */
    {
      const dominated = [];
      for (const id in DIALOGUE){
        const opts = DIALOGUE[id].opts;
        if (!opts || opts.length < 2) continue;
        for (let i = 0; i < opts.length; i++)
          for (let j = 0; j < opts.length; j++){
            if (i === j) continue;
            const A = opts[i].fx || {}, B = opts[j].fx || {};
            const at = A.time || 0, bt = B.time || 0;
            const ar = A.rep || 0, br = B.rep || 0;
            const as = A.stress || 0, bs = B.stress || 0;
            const ab = A.bonus || 0, bb = B.bonus || 0;
            /* A dominates B: no worse anywhere, better somewhere */
            const noWorse = at <= bt && ar >= br && as <= bs && ab >= bb;
            const better  = at <  bt || ar >  br || as <  bs || ab >  bb;
            if (noWorse && better)
              dominated.push(id + ': "' + String(opts[j].t).slice(0,38) +
                             '" is beaten outright by "' + String(opts[i].t).slice(0,38) + '"');
          }
      }
      out.dominated = [...new Set(dominated)];
    }

    /* ---- 3. does any line overflow the box it is drawn in? -----------------
       This used to count characters against two numbers I picked without
       measuring anything — 62 for a title, 74 for an option — and reported 70
       titles and 21 options as broken. Both were wrong. Options are DOM
       buttons with no nowrap and no fixed height: they WRAP, and rendered at
       every viewport from 400x300 up, not one of them ever overflowed. Titles
       really were being cut, but by px in a 392px cell, not by character
       count: the longest fitting title was 63 characters and the shortest
       clipped one was 55.

       Both questions are now answered by the self-test, which measures the
       rendered box instead of guessing at it ("no ticket title outgrows its
       queue row", "no dialogue box grows outside the frame", "every dialogue
       option stays reachable inside its box"). Nothing here can beat that, so
       this check is gone rather than left to cry wolf. */

    /* ---- 4. does every speaker exist? --------------------------------------
       who:'sys' and who:'client' are the two narrator voices; anything else
       has to be a person in the building or the portrait is blank. */
    {
      const KNOWN = new Set(['sys','client'].concat(Object.keys(NPCS)));
      const ghosts = [];
      for (const id in DIALOGUE){
        const w = DIALOGUE[id].who;
        if (w && !KNOWN.has(w)) ghosts.push(id + ':' + w);
      }
      out.ghosts = ghosts;
    }

    /* ---- 5. is every board a ticket opens available at that ticket's tiers? */
    {
      const wrongTier = [];
      for (const id in TICKETS){
        const T = TICKETS[id];
        for (const st of T.steps){
          if (!st.game) continue;
          if (!GAMES[st.game]) { wrongTier.push(id + ':no board ' + st.game); continue; }
          if (st.diff === undefined) wrongTier.push(id + ':' + st.game + ' has no difficulty');
          else if (st.diff < 1 || st.diff > 3) wrongTier.push(id + ':' + st.game + ' diff ' + st.diff);
        }
      }
      out.wrongTier = wrongTier;
    }

    /* ---- 6. two tickets that read as the same ticket ----------------------- */
    {
      const norm = s => s.toLowerCase().replace(/\{\w+\}/g,'').replace(/[^a-z ]/g,'').split(/\s+/)
        .filter(w => w.length > 3).sort().join(' ');
      const byNorm = {}, dupes = [];
      for (const id in TICKETS){
        const k = norm(TICKETS[id].title);
        if (byNorm[k]) dupes.push(byNorm[k] + ' ~ ' + id + ' :: ' + TICKETS[id].title.slice(0,50));
        else byNorm[k] = id;
      }
      out.dupes = dupes;
    }

    /* ---- 7. a ticket that costs more stress than its whole band is worth --- */
    {
      const mad = [];
      for (const id in TICKETS){
        const T = TICKETS[id], p = 5 - (T.pri || 2);
        if ((T.stress || 0) >= 10 && p >= 3) mad.push(id + ' P' + p + ' stress ' + T.stress);
      }
      out.mad = mad;
    }
    QUIET = false; SAVE_SUSPEND = false;
    return out;
  });

  let bad = 0;
  const show = (title, arr, fatal) => {
    if (!arr || !arr.length){ console.log('  ok   ' + title); return; }
    if (fatal) bad += arr.length;
    console.log((fatal ? '  FAIL ' : '  warn ') + title + ' — ' + arr.length);
    for (const l of arr.slice(0, 12)) console.log('         ' + l);
    if (arr.length > 12) console.log('         ...and ' + (arr.length - 12) + ' more');
  };
  console.log('CONTENT AUDIT\n');
  show('every ticket fits inside its own window', R.impossible, true);
  show('...with room to notice it', R.tight, false);
  show('no option is strictly beaten by another', R.dominated, false);
  show('every speaker is somebody in the building', R.ghosts, true);
  show('every board call is real and graded', R.wrongTier, true);
  show('no two tickets are the same ticket', R.dupes, false);
  show('nothing cheap is punishingly stressful', R.mad, false);
  console.log('\n' + (bad ? bad + ' PROBLEM(S)' : 'AUDIT CLEAN'));
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

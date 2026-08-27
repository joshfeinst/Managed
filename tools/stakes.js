/* WHAT A TICKET IS WORTH, SWEPT.
 *
 * Every balance fix in this project so far has widened the good/bad spread by
 * lowering what bad play scores — more droppable work, heavier days, tighter
 * windows. None has raised what GOOD play scores, and the reason is structural:
 *
 *     dayPerf = SUM(score x stakes) / (SUM stakes + burnedStakes)
 *
 * is a ratio, so anything added to the day divides everybody. The one dial that
 * can move the top is STAKES itself — how much more a P1 is worth than a P4 —
 * because it decides how much PROTECTING one is worth and how much BURNING one
 * costs. Forgiveness goes to the cheapest casualties first, so a steeper table
 * should leave a good triager's burned P4s forgiven while a bad one's burned P1s
 * are not.
 *
 * That is a hypothesis. This measures it.
 *
 * Only the SHAPE of the table matters, never its scale: dayPerf divides stakes
 * by stakes, so {1,2,4,7} and {2,4,8,14} are the same game. Every candidate is
 * therefore normalised to P4 = 1.
 *
 * The metric is bar-independent on purpose. Comparing "clears at today's bar"
 * across tables would conflate the table with bars tuned to the old one, so
 * what is reported is the separation itself:
 *
 *   gap    flawless p50 minus sloppy p50, in points
 *   leak   with a bar placed at THIS table's own flawless p25, the share of
 *          SLOPPY seeds that still clear it. Lower is better. This is the
 *          number that says whether a bar can be placed at all.
 *
 * The bot is byte-identical to the one in bars.js and gate.js, so the three
 * can never disagree about what a flawless career scores.
 *
 *   node tools/stakes.js /abs/path/index.html [seeds=16] [days=8]
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
const SEEDS = +(process.argv[3] || 16);
const DAYS  = +(process.argv[4] || 8);
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium'))){
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)) { try { return await chromium.launch({ executablePath:p }); } catch(_){} }
  }
  throw e; } }

/* pri 1..4 -> value. pri:4 renders P1 and is the dear one.
   THE SHIPPED ROW IS NOT IN THIS LIST, and used to be. It was hardcoded as
   {1,2,4,7} and labelled SHIPPED; the game shipped 10 and then 14, and this
   file went on calling 7 "the shipped table" for both. Every verdict it
   printed -- including "CANDIDATES THAT BEAT THE SHIPPED TABLE" -- was
   measured against a table the game had stopped using, which is a tool saying
   one thing and doing another, and it is the whole reason it kept recommending
   a change that had already been made. The baseline is read from the live
   STAKES now, so it cannot go stale again. 1:2:4:7 stays below as a named
   historical control, which is what it always actually was. */
const TABLES = [
  { name:'linear (rejected once)', t:{ 1:1, 2:2, 3:3, 4:4  } },
  { name:'shallower',              t:{ 1:1, 2:2, 3:3, 4:5  } },
  { name:'shipped to 26 Aug',      t:{ 1:1, 2:2, 3:4, 4:7  } },
  { name:'steeper top',            t:{ 1:1, 2:2, 3:4, 4:10 } },
  { name:'steeper throughout',     t:{ 1:1, 2:3, 3:6, 4:12 } },
  { name:'steep top only',         t:{ 1:1, 2:2, 3:4, 4:14 } },
  { name:'steepest',               t:{ 1:1, 2:3, 3:8, 4:18 } }
];

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await page.goto('file://' + target);
  await page.waitForFunction(() => typeof simDay === 'function' && typeof ROLES !== 'undefined');

  const out = await page.evaluate(({ SEEDS, DAYS, TABLES }) => {
    SAVE_SUSPEND = true; QUIET = true;
    /* identical to bars.js and gate.js */
    const play = (seed, skill, days, rung, order) => {
      const o = [];
      QUIET = true; rngInit(seed); runInit(seed);
      if (run) run.rung = rung;
      for (let d = 0; d < days && run && !run.pendingEnd; d++){
        rollDay(); simDay(skill, { order: order || 'pridead' });
        if (!run) break;
        o.push(run.perfHist[run.perfHist.length - 1]);
        if (run.pendingEnd) break;
        startCommute();
      }
      run = null; return o;
    };
    const pct = (arr, p) => { const a = arr.slice().sort((x,y)=>x-y);
      return a[Math.min(a.length-1, Math.floor(p/100 * a.length))]; };
    const seeds = Array.from({ length:SEEDS }, (_, i) => 'GATE-' + i);
    /* the baseline is whatever the game is actually holding right now */
    const LIVE = { 1:STAKES[1], 2:STAKES[2], 3:STAKES[3], 4:STAKES[4] };
    const same = x => [1,2,3,4].every(k => x.t[k] === LIVE[k]);
    const twin = TABLES.find(same);
    const CANDS = [{ name:'SHIPPED', alias:twin ? twin.name : null, t:LIVE }]
                    .concat(TABLES.filter(x => !same(x)));
    const results = [];
    for (const cand of CANDS){
      /* STAKES is const-bound but its properties are not, and stakesOf reads
         it live — which is the only reason this sweep can exist in-process. */
      for (const k of [1,2,3,4]) STAKES[k] = cand.t[k];
      const rungs = [];
      for (let r = 0; r < ROLES.length; r++){
        if (!ROLES[r].gates.nextAt) continue;
        const need = ROLES[r].gates.nextAt;
        const best = ds => { let b = 0;
          for (let i = 0; i + need.days <= ds.length; i++)
            b = Math.max(b, ds.slice(i, i + need.days).reduce((a,c)=>a+c,0) / need.days);
          return b; };
        const tight = seeds.map(s => best(play(s, 1.0,  DAYS, r, 'pridead' )));
        const loose = seeds.map(s => best(play(s, 0.35, DAYS, r, 'worstpri')));
        const at = pct(tight, 25);
        rungs.push({ id:ROLES[r].id,
          tp50:pct(tight,50), lp50:pct(loose,50),
          gap:pct(tight,50) - pct(loose,50),
          leak: loose.filter(v => v >= at).length / loose.length });
      }
      results.push({ name:cand.name, alias:cand.alias || null, t:cand.t, rungs });
    }
    for (const k of [1,2,3,4]) STAKES[k] = LIVE[k];   /* put the game back as found */
    return results;
  }, { SEEDS, DAYS, TABLES });

  const pc = v => (v*100).toFixed(0).padStart(4) + '%';
  console.log('WHAT A TICKET IS WORTH — ' + SEEDS + ' seeds x ' + DAYS + ' days per rung\n');
  console.log('  table                  P4:P3:P2:P1 | mean gap  worst gap | mean leak  worst leak');
  const summary = [];
  for (const r of out){
    const gaps = r.rungs.map(x => x.gap), leaks = r.rungs.map(x => x.leak);
    const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
    const s = { name:r.name, alias:r.alias, t:r.t, meanGap:mean(gaps),
                worstGap:Math.min.apply(null,gaps),
                meanLeak:mean(leaks), worstLeak:Math.max.apply(null,leaks), rungs:r.rungs };
    summary.push(s);
    console.log('  ' + (r.name + (r.alias ? ' = ' + r.alias : '')).padEnd(22) +
      [1,2,3,4].map(k => r.t[k]).join(':').padStart(10) + ' |' +
      (s.meanGap*100).toFixed(1).padStart(9) + (s.worstGap*100).toFixed(1).padStart(11) + ' |' +
      pc(s.meanLeak).padStart(10) + pc(s.worstLeak).padStart(11));
  }
  const ship = summary.find(s => s.name === 'SHIPPED');
  console.log('\n  gap  = flawless p50 minus sloppy p50. Higher is a rung that rewards triage.');
  console.log('  leak = with the bar at THIS table\'s own flawless p25, the share of SLOPPY');
  console.log('         seeds that still clear it. Lower is a rung a bar can actually sit on.');
  console.log('\n  per-rung gap, points:');
  console.log('    ' + 'table'.padEnd(22) + ship.rungs.map(x => x.id.slice(0,7).padStart(8)).join(''));
  for (const s of summary)
    console.log('    ' + s.name.padEnd(22) +
      s.rungs.map(x => (x.gap*100).toFixed(0).padStart(8)).join(''));

  const better = summary.filter(s => s.name !== 'SHIPPED' &&
    s.meanGap > ship.meanGap && s.meanLeak <= ship.meanLeak);
  console.log('');
  if (!better.length){
    console.log('NO TABLE BEATS THE SHIPPED ONE on both gap and leak.');
  } else {
    better.sort((a,b) => (b.meanGap - b.meanLeak) - (a.meanGap - a.meanLeak));
    console.log('CANDIDATES THAT BEAT THE SHIPPED TABLE ON BOTH: ' +
      better.map(b => b.name).join(', '));
    console.log('  best on gap-minus-leak: ' + better[0].name +
      '  {' + [1,2,3,4].map(k => better[0].t[k]).join(', ') + '}');
    console.log('  meta.js is the harness of record — confirm before shipping any of these.');
  }
  await browser.close();
})();

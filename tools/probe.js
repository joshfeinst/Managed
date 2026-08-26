/* Managed procurement probe: WHAT does good triage actually close?
 *
 * bars.js says procure separates good triage from bad by 8 points where every
 * other rung manages 11-16, and five hypotheses about the queue's shape were
 * measured and eliminated (BUILD_PLAN.md). The one thing that did differ was
 * realisation: good triage captures 76% more value per closed ticket at T3 and
 * only 40% more at procure. That is a statement about the tickets themselves,
 * so this dumps them — every close, ticket by ticket, with what it was worth,
 * what it scored, and how long it took, for both triage rules side by side.
 *
 *   node tools/probe.js /abs/path/index.html [seeds=6]
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
const SEEDS = +(process.argv[3] || 6);
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
  await page.waitForFunction(() => typeof simDay === 'function' && typeof ROLES !== 'undefined');

  const out = await page.evaluate(({ SEEDS }) => {
    SAVE_SUSPEND = true; QUIET = true;
    const REC = [];
    const realResolve = resolveTicket;
    /* wrap, don't reimplement: the scoring is the thing under test, so read it
       off the run's own accumulators rather than recomputing it here and
       measuring my own arithmetic instead of the game's */
    window.resolveTicket = function(t){
      const before = { e: run.earned||0, s: run.stakesDone||0, n: run.resolved||0 };
      const T = TICKETS[t.id], at = run.clock, left = t.deadline - run.clock;
      realResolve(t);
      if ((run.resolved||0) === before.n) return;              // breached, not closed
      REC.push({ id:t.id, pri:T.pri||2, work:ticketWork(T), sla:t.sla,
                 stakes:(run.stakesDone||0)-before.s,
                 earned:(run.earned||0)-before.e, left, at });
    };
    const play = (seed, rung, order, days) => {
      QUIET = true; rngInit(seed); runInit(seed);
      if (run) run.rung = rung;
      for (let d = 0; d < days && run && !run.pendingEnd; d++){
        rollDay(); simDay(1.0, { order }); if (!run) break;
        if (run.pendingEnd) break; startCommute();
      }
      const burned = run ? (run.burnedStakes||0) : 0;
      run = null; return burned;
    };
    const rungIx = id => ROLES.findIndex(r => r.id === id);
    const res = {};
    for (const rid of ['t3','procure']){
      for (const order of ['pridead','worstpri']){
        REC.length = 0; let burn = 0;
        for (let i = 0; i < SEEDS; i++) burn += play('PROBE-'+i, rungIx(rid), order, 6);
        const by = {};
        for (const r of REC){
          const k = r.id;
          (by[k] = by[k] || { id:k, pri:r.pri, work:r.work, sla:r.sla, n:0, stakes:0, earned:0, left:0 });
          by[k].n++; by[k].stakes += r.stakes; by[k].earned += r.earned; by[k].left += r.left;
        }
        res[rid+'/'+order] = {
          closes: REC.length, burned: burn,
          stakes: REC.reduce((a,c)=>a+c.stakes,0),
          earned: REC.reduce((a,c)=>a+c.earned,0),
          work:   REC.reduce((a,c)=>a+c.work,0),
          rows: Object.values(by).sort((a,b)=>b.earned-a.earned)
        };
      }
    }
    window.resolveTicket = realResolve;
    /* the other half of the answer is the POOL, not the play: what is on
       offer at each tier, and what it costs to take */
    const pools = {};
    for (const rid of ['t3','procure']){
      const tier = rungIx(rid);
      const rows = [];
      for (const k in TICKETS){
        const T = TICKETS[k];
        if (!T.tiers || T.tiers.indexOf(tier) < 0) continue;
        rows.push({ id:k, pri:T.pri||2, work:ticketWork(T), stakes:STAKES[T.pri||2] });
      }
      const band = p => { const b = rows.filter(r => r.pri === p);
        if (!b.length) return null;
        const w = b.map(r=>r.work).sort((a,c)=>a-c);
        return { n:b.length, med:w[w.length>>1], min:w[0], max:w[w.length-1],
                 rate:+(STAKES[p] / (w.reduce((a,c)=>a+c,0)/w.length)).toFixed(3),
                 cheap:b.filter(r=>r.work<=30).length };
      };
      /* counts lie: a template dealt at weight 1 next to one at weight 6 is not
         half the queue, it is a seventh of it. Share of ARRIVALS is the number
         that decides what good triage has to be good about. */
      let wt = 0; const wb = {1:0,2:0,3:0,4:0};
      for (const k in TICKETS){
        const T = TICKETS[k];
        if (!T.tiers || T.tiers[0] > tier || tier > T.tiers[1]) continue;
        const w = T.weight || 1; wt += w; wb[T.pri||2] += w;
      }
      pools[rid] = { total:rows.length, p1:band(4), p2:band(3), p3:band(2), p4:band(1),
        wshare: [4,3,2,1].map(p => +(wb[p]/wt*100).toFixed(1)) };
    }
    return { res, pools };
  }, { SEEDS });

  const { res: R, pools } = out;
  for (const key of Object.keys(R)){
    const d = R[key];
    const rate = d.stakes ? d.earned / d.stakes : 0;
    console.log('\n=== ' + key + '  closes=' + d.closes + '  stakes=' + d.stakes.toFixed(0) +
                '  earned=' + d.earned.toFixed(1) + '  burned=' + d.burned.toFixed(0) +
                '  realise=' + (rate*100).toFixed(0) + '%' +
                '  share=' + (d.earned/(d.stakes+d.burned)*100).toFixed(1) + '%');
    console.log('    work=' + d.work + 'min  avgWork=' + (d.work/d.closes).toFixed(0) +
                '  avgStakes=' + (d.stakes/d.closes).toFixed(2) +
                '  STAKES PER WORK-MINUTE=' + (d.stakes/d.work).toFixed(3));
    console.log('  ' + 'ticket'.padEnd(26) + 'P  work sla   n  stakes  earned  real%  slackLeft');
    for (const r of d.rows.slice(0, 14))
      console.log('  ' + r.id.padEnd(26) + (5-r.pri) + '  ' + String(r.work).padStart(4) +
        String(r.sla).padStart(5) + String(r.n).padStart(4) +
        r.stakes.toFixed(0).padStart(8) + r.earned.toFixed(1).padStart(8) +
        (r.earned/r.stakes*100).toFixed(0).padStart(7) + (r.left/r.n).toFixed(0).padStart(11));
  }
  console.log('\n--- what each tier OFFERS (pri band: count, median work, stakes-per-minute) ---');
  for (const rid in pools){
    const P = pools[rid];
    console.log('  ' + rid.padEnd(9) + ' pool=' + P.total +
      '   arrival share P1/P2/P3/P4 = ' + P.wshare.join('% / ') + '%');
    for (const b of ['p1','p2','p3','p4']){
      const d = P[b]; if (!d) { console.log('    ' + b + '  none'); continue; }
      console.log('    ' + b + '  n=' + String(d.n).padStart(3) + '  med=' + String(d.med).padStart(4) +
        'min  range=' + d.min + '-' + d.max + '  cheap(<=30min)=' + d.cheap +
        '  stakes/min=' + d.rate);
    }
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

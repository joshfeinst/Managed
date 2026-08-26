/* Managed bar-setter: where SHOULD each promotion bar sit?
 *
 * gate.js answers "does the current bar hold?" — pass or fail against a number
 * already in the file. It cannot answer "what number should be there", so
 * every time the scoring changed underneath the ladder the bars were nudged by
 * hand until the ratchet went quiet, which is how you tune a game into a shape
 * nobody chose.
 *
 * This reports the DISTRIBUTION instead. For each gated rung it plays the same
 * two bots gate.js uses — flawless triage, and sloppy triage — over N seeds,
 * and prints the percentiles of the best rolling window each achieves. A bar
 * belongs between the two distributions: below flawless's 25th percentile (so
 * a good career promotes about three seeds in four) and above sloppy's 90th
 * (so a bad one does not). If those two numbers cross, no bar works and the
 * problem is the scoring, not the gate.
 *
 *   node tools/bars.js /abs/path/index.html [seeds=16] [days=8]
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
const SEEDS = +(process.argv[3] || 16);
const DAYS  = +(process.argv[4] || 8);
const SWEEP = process.argv.includes('--sweep');
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

  if (SWEEP){
    /* Triage only matters when the day is oversubscribed. Too many tickets and
       nobody clears the bar; too few and bad triage costs nothing, because you
       get to everything anyway. The window between those is what this finds:
       for each rung, the deal rate that most separates good triage from bad. */
    const rows = await page.evaluate(({ SEEDS, DAYS }) => {
      SAVE_SUSPEND = true; QUIET = true;
      const play = (seed, skill, days, rung, order) => {
        const o = []; QUIET = true; rngInit(seed); runInit(seed);
        if (run) run.rung = rung;
        for (let d = 0; d < days && run && !run.pendingEnd; d++){
          rollDay(); simDay(skill, { order: order || 'pridead' });
          if (!run) break;
          o.push(run.perfHist[run.perfHist.length - 1]);
          if (run.pendingEnd) break; startCommute();
        }
        run = null; return o;
      };
      const pct = (a,p) => { const b=a.slice().sort((x,y)=>x-y);
        return b[Math.min(b.length-1, Math.floor(p/100*b.length))]; };
      const seeds = Array.from({length:SEEDS},(_,i)=>'GATE-'+i);
      const RATES = [0.7,1.1,1.6,2.2,3.0,4.0];
      const rows = [];
      for (let r = 0; r < ROLES.length; r++){
        const gate = ROLES[r].gates.nextAt; if (!gate) continue;
        const keep = ROLES[r].queue.ratePerHr;
        const best = ds => { let b=0;
          for (let i=0;i+gate.days<=ds.length;i++)
            b=Math.max(b, ds.slice(i,i+gate.days).reduce((a,c)=>a+c,0)/gate.days);
          return b; };
        const tried = [];
        for (const rate of RATES){
          ROLES[r].queue.ratePerHr = rate;
          const t = seeds.map(s => best(play(s,1.0,DAYS,r,'pridead')));
          const l = seeds.map(s => best(play(s,0.35,DAYS,r,'worstpri')));
          tried.push({ rate, tp25:pct(t,25), tp50:pct(t,50), lp90:pct(l,90),
                       gap:pct(t,25)-pct(l,90) });
        }
        ROLES[r].queue.ratePerHr = keep;
        rows.push({ id:ROLES[r].id, now:keep, tried });
      }
      return rows;
    }, { SEEDS, DAYS });
    const p = v => (v*100).toFixed(0).padStart(3) + '%';
    console.log('DEAL-RATE SWEEP — ' + SEEDS + ' seeds x ' + DAYS + ' days\n');
    for (const r of rows){
      const win = r.tried.filter(t => t.gap > 0).sort((a,b)=>b.gap-a.gap)[0];
      console.log('  ' + r.id.toUpperCase() + '  (now ' + r.now + ')');
      for (const t of r.tried)
        console.log('    rate ' + String(t.rate).padStart(4) + '  flawless p25 ' + p(t.tp25) +
          '  sloppy p90 ' + p(t.lp90) + '  gap ' + (t.gap*100).toFixed(0).padStart(4) +
          (win && t.rate === win.rate ? '   <-- widest' : ''));
      console.log(win ? '    BEST rate ' + win.rate + ', bar between ' +
          p(win.lp90).trim() + ' and ' + p(win.tp25).trim() + '\n'
        : '    no rate separates good triage from bad\n');
    }
    await browser.close(); process.exit(0);
  }

  const out = await page.evaluate(({ SEEDS, DAYS }) => {
    SAVE_SUSPEND = true; QUIET = true;
    /* identical to gate.js's play() — same bot, so the two harnesses can never
       disagree about what a flawless career scores */
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
    const rows = [];
    for (let r = 0; r < ROLES.length; r++){
      const bar = ROLES[r].gates.nextAt; if (!bar) continue;
      const best = ds => { let b = 0;
        for (let i = 0; i + bar.days <= ds.length; i++)
          b = Math.max(b, ds.slice(i, i + bar.days).reduce((a,c)=>a+c,0) / bar.days);
        return b; };
      const tight = seeds.map(s => best(play(s, 1.0,  DAYS, r, 'pridead' )));
      const loose = seeds.map(s => best(play(s, 0.35, DAYS, r, 'worstpri')));
      rows.push({ id:ROLES[r].id, bar:bar.perf, days:bar.days,
        tp10:pct(tight,10), tp25:pct(tight,25), tp50:pct(tight,50), tp90:pct(tight,90),
        lp50:pct(loose,50), lp90:pct(loose,90), lmax:Math.max.apply(null, loose) });
    }
    return rows;
  }, { SEEDS, DAYS });

  const p = v => (v*100).toFixed(0).padStart(3) + '%';
  console.log('BAR PLACEMENT — ' + SEEDS + ' seeds x ' + DAYS + ' days per rung\n');
  console.log('  rung        bar |  flawless p10  p25  p50  p90 | sloppy p50  p90  max | window');
  let bad = 0;
  for (const r of rows0(out)){
    const ceiling = r.tp25, floor = r.lp90;
    const fits = ceiling > floor;
    const verdict = !fits ? '  NO BAR FITS'
      : r.bar > ceiling ? '  bar too high (want <=' + p(ceiling).trim() + ')'
      : r.bar <= floor  ? '  bar too low (want >' + p(floor).trim() + ')' : '';
    if (verdict) bad++;
    console.log('  ' + r.id.padEnd(10) + p(r.bar) + ' | ' +
      ['tp10','tp25','tp50','tp90'].map(k=>p(r[k])).join(' ') + ' | ' +
      ['lp50','lp90','lmax'].map(k=>p(r[k])).join(' ') + ' | ' +
      r.days + 'd' + verdict);
  }
  console.log('\n  A bar wants to sit in (sloppy p90, flawless p25]: high enough that bad');
  console.log('  triage fails it, low enough that good triage usually clears it.');
  console.log(bad ? '\n' + bad + ' RUNG(S) MISPLACED' : '\nALL BARS WELL PLACED');
  await browser.close();
  process.exit(0);
})();
function rows0(x){ return x; }

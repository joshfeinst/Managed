/* Managed score autopsy: WHICH TERM of dayPerf separates good triage from bad?
 *
 * dayPerf = earned / (stakesDone + burnedStakes), and burnedStakes forgives the
 * CHEAPEST casualties up to a tolerance of 20% of arrivals. So good triage can
 * win in exactly three ways: close more stakes, realise more of what it closes,
 * or burn cheaper things. bars.js reports the number those three produce and
 * cannot say which one moved, which is how three consecutive fixes to the
 * senior rungs each made the gap smaller.
 *
 *   node tools/score.js /abs/path/index.html [seeds=12] [days=6]
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
const SEEDS = +(process.argv[3] || 12);
const DAYS  = +(process.argv[4] || 6);
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

  const rows = await page.evaluate(({ SEEDS, DAYS }) => {
    SAVE_SUSPEND = true; QUIET = true;
    const play = (seed, skill, rung, order) => {
      QUIET = true; rngInit(seed); runInit(seed);
      if (run) run.rung = rung;
      const acc = { closed:0, earned:0, burned:0, costly:0, forgiven:0,
                    arrived:0, breaches:0, days:0, perf:0 };
      for (let d = 0; d < DAYS && run && !run.pendingEnd; d++){
        rollDay(); simDay(skill, { order }); if (!run) break;
        /* endDay() has already folded the day into lastScore — read its own
           accounting rather than a second one written here, or the autopsy
           measures the autopsy */
        const L = run.lastScore;
        if (L){
          acc.closed += L.closed; acc.earned += L.earned; acc.burned += L.burned;
          acc.costly += L.costly; acc.forgiven += L.forgiven; acc.days++;
          acc.perf += run.perfHist[run.perfHist.length - 1];
        }
        acc.breaches += run.breaches; acc.arrived += run.resolved + run.breaches;
        if (run.pendingEnd) break; startCommute();
      }
      run = null; return acc;
    };
    const out = [];
    for (let r = 0; r < ROLES.length; r++){
      const line = { id: ROLES[r].id };
      for (const [tag, skill, order] of [['good',1.0,'pridead'], ['bad',0.35,'worstpri']]){
        const A = { closed:0, earned:0, burned:0, costly:0, forgiven:0,
                    arrived:0, breaches:0, days:0, perf:0 };
        for (let i = 0; i < SEEDS; i++){
          const a = play('SC-'+i, skill, r, order);
          for (const k in A) A[k] += a[k];
        }
        const d = Math.max(1, A.days);
        line[tag] = { perf:+(A.perf/d).toFixed(3), closed:+(A.closed/d).toFixed(1),
          earned:+(A.earned/d).toFixed(1), burned:+(A.burned/d).toFixed(1),
          realise:+(A.earned/Math.max(1,A.closed)).toFixed(3),
          costly:+(A.costly/d).toFixed(1), breach:+(A.breaches/d).toFixed(1),
          arrived:+(A.arrived/d).toFixed(1) };
      }
      out.push(line);
    }
    return out;
  }, { SEEDS, DAYS });

  console.log('SCORE AUTOPSY — ' + SEEDS + ' seeds x ' + DAYS + ' days, per day\n');
  console.log('                    perf  closed  earned  burned  realise  costly  breach  arrived');
  const f = (o) => String(o.perf).padStart(8) + String(o.closed).padStart(8) +
    String(o.earned).padStart(8) + String(o.burned).padStart(8) +
    String(o.realise).padStart(9) + String(o.costly).padStart(8) +
    String(o.breach).padStart(8) + String(o.arrived).padStart(9);
  for (const r of rows){
    console.log('  ' + r.id.toUpperCase());
    console.log('    good  ' + f(r.good));
    console.log('    bad   ' + f(r.bad));
    /* which term carries the gap: closed-stakes, realisation, or burn */
    const dClosed = r.good.closed - r.bad.closed;
    const dReal   = r.good.realise - r.bad.realise;
    const dBurn   = r.bad.burned - r.good.burned;
    console.log('    gap ' + ((r.good.perf - r.bad.perf)*100).toFixed(1).padStart(5) +
      'pts  <-  closed +' + dClosed.toFixed(1) +
      '  realise ' + (dReal>=0?'+':'') + (dReal*100).toFixed(1) + '%' +
      '  bad burns +' + dBurn.toFixed(1) + '\n');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

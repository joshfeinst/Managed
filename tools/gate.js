/* Managed gate sweep: what share of seeds does each skill profile promote on?
 *
 * The promotion bar has been set twice from a table pasted into a source
 * comment, and both times the table went stale the moment the scoring changed
 * underneath it — the second time it claimed a flawless player clears every
 * seed, months after that stopped being true. A number nobody can re-measure
 * is a number nobody should trust, so this is the thing that measures it.
 *
 * It plays whole careers headlessly through the game's own simDay at a range
 * of skill dials, takes the BEST rolling window of the length the gate
 * actually asks for, and reports the share of seeds that clear the bar. That
 * is precisely the quantity the gate decides on, and nothing else here
 * approximates it.
 *
 *   node tools/gate.js /abs/path/index.html [seeds=12] [days=8] [rung=0]
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
const SEEDS = +(process.argv[3] || 12);
const DAYS  = +(process.argv[4] || 8);
const RUNG  = +(process.argv[5] || 0);
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
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(target.startsWith('http') ? target : 'file://' + target);
  await page.waitForFunction(() => typeof simDay === 'function' && typeof ROLES !== 'undefined',
                             { timeout:20000 });

  const out = await page.evaluate(({ SEEDS, DAYS, RUNG }) => {
    const bar = ROLES[RUNG].gates.nextAt;
    if (!bar) return { none:true, rung:ROLES[RUNG].id };
    const play = (seed, skill) => {
      const o = [];
      QUIET = true; rngInit(seed); runInit(seed);
      if (run) run.rung = RUNG;
      for (let d = 0; d < DAYS && run && !run.pendingEnd; d++){
        rollDay(); simDay(skill, { order:'pridead' });
        if (!run) break;
        o.push(run.perfHist[run.perfHist.length - 1]);
        if (run.pendingEnd) break;
        startCommute();
      }
      run = null; return o;
    };
    const best = ds => {
      let b = 0;
      for (let i = 0; i + bar.days <= ds.length; i++)
        b = Math.max(b, ds.slice(i, i + bar.days).reduce((a,c)=>a+c,0) / bar.days);
      return b;
    };
    const seeds = Array.from({ length:SEEDS }, (_, i) => 'GATE-' + i);
    const rows = [];
    for (const [label, skill] of [['flawless',1.0],['good',0.85],['mediocre',0.6],['sloppy',0.35]]){
      const wins = seeds.map(s => best(play(s, skill)));
      rows.push({ label, skill,
        wins: wins.map(w => Math.round(w*100)),
        clears: wins.filter(w => w >= bar.perf).length });
    }
    /* steady state: once day one's half load is behind you and the queue has
       saturated, which is the state a career actually lives in */
    const ss = skill => {
      const all = [];
      for (const s of seeds) all.push(...play(s, skill).slice(2));
      return all.length ? all.reduce((a,b)=>a+b,0) / all.length : 0;
    };
    return { rung:ROLES[RUNG].id, bar:bar.perf, days:bar.days, seeds:seeds.length, rows,
             sep: Math.round((ss(1.0) - ss(0.6)) * 100) };
  }, { SEEDS, DAYS, RUNG });

  if (out.none){ console.log(out.rung + ' has no promotion gate'); await browser.close(); process.exit(0); }
  console.log('GATE ' + out.rung.toUpperCase() + ' — bar ' + Math.round(out.bar*100) +
              '% over a ' + out.days + '-day window · ' + out.seeds + ' seeds × ' + DAYS + ' days\n');
  console.log('  profile     best 3-day window per seed'.padEnd(58) + 'clears');
  for (const r of out.rows)
    console.log('  ' + r.label.padEnd(11) + r.wins.join(' ').padEnd(45) +
                String(r.clears).padStart(3) + '/' + out.seeds);
  console.log('\n  skill separation at steady state: ' + out.sep + ' points (flawless vs mediocre)');
  if (errs.length) console.log('\npage errors:\n  ' + errs.join('\n  '));
  const flawless = out.rows[0], sloppy = out.rows[3];
  const ok = flawless.clears >= Math.ceil(out.seeds * 0.8) && sloppy.clears <= Math.floor(out.seeds * 0.25);
  console.log('\n' + (ok ? 'GATE SHAPE OK — good play mostly promotes, bad play mostly does not'
                         : 'GATE SHAPE OFF — flawless ' + flawless.clears + '/' + out.seeds +
                           ', sloppy ' + sloppy.clears + '/' + out.seeds));
  await browser.close();
  process.exit(errs.length || !ok ? 1 : 0);
})();

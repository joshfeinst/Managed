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
 *   node tools/gate.js /abs/path/index.html --ladder    (every gated rung,
 *     checked against the GATE_DEBT recorded in the game — may only improve)
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
const LADDER = process.argv.includes('--ladder');

/* Every gated rung, twelve seeds each, checked against the GATE_DEBT the game
   records. Both rows may only come down: a flawless career that cannot promote
   makes the rung decoration, and a sloppy one that can makes it a formality. */
async function ladder(page){
  const out = await page.evaluate(() => {
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
    const seeds = Array.from({ length:12 }, (_, i) => 'GATE-' + i);
    const rows = [];
    for (let r = 0; r < ROLES.length; r++){
      const bar = ROLES[r].gates.nextAt; if (!bar) continue;
      const best = ds => { let b = 0;
        for (let i = 0; i + bar.days <= ds.length; i++)
          b = Math.max(b, ds.slice(i, i + bar.days).reduce((a,c)=>a+c,0) / bar.days);
        return b; };
      rows.push({ id:ROLES[r].id, bar:bar.perf,
        /* sloppy = bad TRIAGE. Measured at skill .35 with correct priority
           order it scores 52% and clears everything, which says nothing about
           the gate and everything about craft not mattering: the same bot
           playing worst-first scores 28%. Triage is the axis this game has. */
        tight: seeds.map(s => best(play(s, 1.0,  8, r, 'pridead' ))).filter(w => w <  bar.perf).length,
        loose: seeds.map(s => best(play(s, 0.35, 8, r, 'worstpri'))).filter(w => w >= bar.perf).length });
    }
    return { rows, debt:GATE_DEBT, budget:GATE_DEBT_BUDGET };
  });

  console.log('LADDER GATE HEALTH — 12 seeds x 8 days per rung\n');
  console.log('  rung       bar   flawless misses      sloppy clears');
  let worse = [], sum = 0;
  for (const r of out.rows){
    const wantT = out.debt.tight[r.id] || 0, wantL = out.debt.loose[r.id] || 0;
    sum += r.tight + r.loose;
    const mark = (got, want) => got > want ? ' WORSE (was ' + want + ')'
                              : got < want ? ' better (was ' + want + ')' : '';
    if (r.tight > wantT) worse.push(r.id + ' tight ' + r.tight + '>' + wantT);
    if (r.loose > wantL) worse.push(r.id + ' loose ' + r.loose + '>' + wantL);
    console.log('  ' + r.id.padEnd(10) + (r.bar*100).toFixed(0) + '%   ' +
      (r.tight + '/12' + mark(r.tight, wantT)).padEnd(21) +
      r.loose + '/12' + mark(r.loose, wantL));
  }
  console.log('\n  total ' + sum + ' against a recorded budget of ' + out.budget);
  if (worse.length){ console.log('\nGATE DEBT GREW: ' + worse.join(', ')); return 1; }
  console.log('\nGATE DEBT HELD' + (sum < out.budget
    ? ' — and IMPROVED to ' + sum + '. Lower GATE_DEBT_BUDGET and the rows that moved.' : '.'));
  return 0;
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(target.startsWith('http') ? target : 'file://' + target);
  await page.waitForFunction(() => typeof simDay === 'function' && typeof ROLES !== 'undefined',
                             { timeout:20000 });

  if (LADDER){
    const code = await ladder(page);
    if (errs.length) console.log('\npage errors:\n  ' + errs.join('\n  '));
    await browser.close();
    process.exit(code || (errs.length ? 1 : 0));
  }

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

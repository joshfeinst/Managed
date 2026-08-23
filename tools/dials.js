/* Managed dial-check: does the day respond to SKILL and to TRIAGE?
   Uses the game's own simDay with the policy.order hook. Reports per-policy
   day-1..N mean perf, the spread across policies, and the skill gradient.
   Usage: node mdial.js /abs/index.html [seeds=24] [days=5] */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
const SEEDS = +(process.argv[3] || 24);
const DAYS  = +(process.argv[4] || 5);
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x=>x.startsWith('chromium'))){
    const p = path.join(base,d,'chrome-linux','chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({executablePath:p}); } catch(_){} } }
  throw e; } }
(async()=>{
  const b = await launch(); const page = await b.newPage();
  page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await page.goto('file://' + target);
  await page.waitForFunction(()=>typeof G!=='undefined' && typeof simDay==='function');

  const res = await page.evaluate(({SEEDS, DAYS})=>{
    SAVE_SUSPEND = true; QUIET = true; A.sfxVol = 0;
    /* one measurement: mean day perf over DAYS days, freezing the rung so the
       comparison is apples-to-apples (promotion would change the queue) */
    function measure(skill, order){
      const perfs = [], loads = [], brs = [], resd = [];
      for (let i = 0; i < SEEDS; i++){
        runInit('DIAL-' + (9000 + i * 91));
        let guard = 0;
        for (let d = 0; d < DAYS && run && guard++ < 40; d++){
          startCommute(); if (!run) break;
          const before = run.clock;
          simDay(skill, { order });
          if (!run) break;
          perfs.push(run.perfHist[run.perfHist.length-1]);
          brs.push(run.breaches); resd.push(run.resolved);
          run.rung = 0;                      // freeze the rung: same job all week
          if (run.pendingEnd){ run.pendingEnd = null; }
          run.burnout = 0; run.firedStreak = 0;   // isolate the day, not the career
        }
        run = null;
      }
      const mean = a => a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
      return { perf:+mean(perfs).toFixed(3), br:+mean(brs).toFixed(2), res:+mean(resd).toFixed(2) };
    }
    const ORDERS = ['deadline','newest','oldest','shortest','longest','slack','pri','pridead','deadpri','worstpri'];
    const triage = {}; for (const o of ORDERS) triage[o] = measure(.75, o);
    const skill = {};  for (const s of [.35,.55,.75,.95]) skill['s'+s] = measure(s, 'deadline');
    SAVE_SUSPEND = false; QUIET = false;
    return { triage, skill };
  }, {SEEDS, DAYS});

  const tv = Object.entries(res.triage);
  console.log('TRIAGE (skill .75)');
  tv.forEach(([k,v]) => console.log(`  ${k.padEnd(9)} perf ${v.perf.toFixed(3)}  resolved ${v.res}  breached ${v.br}`));
  const ps = tv.map(([,v])=>v.perf);
  console.log(`  spread ${(Math.max(...ps)-Math.min(...ps)).toFixed(3)}  best=${tv[ps.indexOf(Math.max(...ps))][0]}  worst=${tv[ps.indexOf(Math.min(...ps))][0]}`);
  console.log('SKILL (order deadline)');
  const sv = Object.entries(res.skill);
  sv.forEach(([k,v]) => console.log(`  ${k.padEnd(9)} perf ${v.perf.toFixed(3)}  resolved ${v.res}  breached ${v.br}`));
  const ss = sv.map(([,v])=>v.perf);
  console.log(`  spread ${(Math.max(...ss)-Math.min(...ss)).toFixed(3)}`);
  await b.close();
})().catch(e=>{ console.error('HARNESS ERROR', e); process.exit(2); });

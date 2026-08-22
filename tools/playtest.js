/* Managed: career playtest. Three personas play whole seeded careers through
   the game's own headless day bot (simDay). Measures pacing: days survived,
   promotion days, breach rates, burnout curves, endings.
   Usage: node tools/playtest.js /abs/path/index.html [careers=12] */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const target = process.argv[2];
const N = +(process.argv[3] || 12);
async function launch() {
  try { return await chromium.launch(); }
  catch (e) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    for (const dir of fs.readdirSync(base).filter(d => d.startsWith('chromium'))) {
      const p = path.join(base, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) { try { return await chromium.launch({ executablePath: p }); } catch (_) {} }
    }
    throw e;
  }
}
(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('file://' + target);
  await page.waitForFunction(() => typeof G !== 'undefined' && typeof simDay === 'function');
  await page.waitForTimeout(300);

  const PERSONAS = {
    diligent: { skill:.8, policy:{} },
    slacker: { skill:.5, policy:{ slack:true } },
    overcaffeinated: { skill:.75, policy:{ coffeeAt:30 } },
  };
  for (const [name, cfg] of Object.entries(PERSONAS)) {
    const rows = [];
    for (let i = 0; i < N; i++) {
      const r = await page.evaluate(({ seed, skill, policy }) => {
        SAVE_SUSPEND = true; QUIET = true; A.sfxVol = 0;
        runInit(seed);
        const days = [];
        let guard = 0, promos = [];
        while (run && guard++ < 70) {
          startCommute();
          const rungBefore = run.rung;
          simDay(skill, policy);
          if (!run) break;
          days.push({ perf: +run.perfHist[run.perfHist.length-1].toFixed(2),
                      burn: Math.round(run.burnout), br: run.breaches, res: run.resolved });
          if (run.rung > rungBefore) promos.push({ day: run.day - 1, to: ROLES[run.rung].id });
        }
        const ending = run ? 'timeout' :
          document.getElementById('o-title').textContent.includes('BURNED') ? 'burnout' :
          document.getElementById('o-title').textContent.includes('LET GO') ? 'fired' : 'retired';
        const out = { ending, days: days.length, promos,
          avgPerf: +(days.reduce((a,d)=>a+d.perf,0)/Math.max(1,days.length)).toFixed(2),
          totRes: days.reduce((a,d)=>a+d.res,0), totBr: days.reduce((a,d)=>a+d.br,0),
          finalBurn: days.length ? days[days.length-1].burn : 0 };
        run = null; SAVE_SUSPEND = false; QUIET = false;
        return out;
      }, { seed: 'JOB-' + name.slice(0,3).toUpperCase() + (5000 + i * 137), ...cfg });
      rows.push(r);
    }
    const endings = {};
    rows.forEach(r => endings[r.ending] = (endings[r.ending]||0)+1);
    const t1days = rows.map(r => (r.promos.find(p=>p.to==='t1')||{}).day).filter(Boolean);
    const topRungs = rows.map(r => r.promos.length ? r.promos[r.promos.length-1].to : 'intern');
    const brRate = rows.reduce((a,r)=>a+r.totBr,0) / Math.max(1, rows.reduce((a,r)=>a+r.totBr+r.totRes,0));
    console.log(`${name}: endings=${JSON.stringify(endings)} | days avg ${(rows.reduce((a,r)=>a+r.days,0)/rows.length).toFixed(1)}` +
      ` | T1 by day ${t1days.length ? (t1days.reduce((a,b)=>a+b,0)/t1days.length).toFixed(1) : 'never'} (${t1days.length}/${rows.length})` +
      ` | breach rate ${(brRate*100).toFixed(0)}% | top rung reached: ${[...new Set(topRungs)].join(',')}`);
  }
  await browser.close();
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });

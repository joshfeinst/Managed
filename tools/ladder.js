/* Managed ladder dump: the shipped numbers, as markdown, read out of the file.
 *
 * docs/BALANCE.md carried a ladder table that was hand-copied forward from its
 * own previous version. It drifted: Procurement and Relationship Manager kept
 * bars that had been re-bisected away, and Solutions Architect was listed at a
 * deal rate it had not had for hours — an error that reached a commit message
 * too. A balance document that misstates the shipped build is worse than none,
 * because the next session tunes against a ladder that does not exist.
 *
 * So the table is generated now. Paste the output; never retype it.
 *
 *   node tools/ladder.js /abs/path/index.html            # just the ladder
 *   node tools/ladder.js /abs/path/index.html --measure  # ...with bars.js columns
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
const MEASURE = process.argv.includes('--measure');
const SEEDS = 30, DAYS = 8;
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
  await page.waitForFunction(() => typeof ROLES !== 'undefined' && typeof simDay === 'function');

  const rows = await page.evaluate(({ MEASURE, SEEDS, DAYS }) => {
    const out = ROLES.map(R => ({
      id: R.id, rate: R.queue.ratePerHr, meet: R.queue.meetingMin,
      bar: R.gates.nextAt ? R.gates.nextAt.perf : null,
      floor: R.gates.firedBelow
    }));
    if (!MEASURE) return out;
    SAVE_SUSPEND = true; QUIET = true;
    const play = (seed, skill, rung, order) => {
      const o = []; QUIET = true; rngInit(seed); runInit(seed);
      if (run) run.rung = rung;
      for (let d = 0; d < DAYS && run && !run.pendingEnd; d++){
        rollDay(); simDay(skill, { order }); if (!run) break;
        o.push(run.perfHist[run.perfHist.length - 1]);
        if (run.pendingEnd) break; startCommute();
      }
      run = null; return o;
    };
    const pct = (a,p) => { const b=a.slice().sort((x,y)=>x-y);
      return b[Math.min(b.length-1, Math.floor(p/100*b.length))]; };
    const seeds = Array.from({length:SEEDS},(_,i)=>'GATE-'+i);
    for (let r = 0; r < ROLES.length; r++){
      const gate = ROLES[r].gates.nextAt; if (!gate) continue;
      const best = ds => { let b = 0;
        for (let i = 0; i + gate.days <= ds.length; i++)
          b = Math.max(b, ds.slice(i, i+gate.days).reduce((a,c)=>a+c,0)/gate.days);
        return b; };
      const t = seeds.map(s => best(play(s, 1.0,  r, 'pridead' )));
      const l = seeds.map(s => best(play(s, 0.35, r, 'worstpri')));
      out[r].flaw = pct(t,50); out[r].slop = pct(l,50);
      out[r].goodClears = t.filter(v => v >= gate.perf).length / t.length;
      out[r].badClears  = l.filter(v => v >= gate.perf).length / l.length;
    }
    QUIET = false; SAVE_SUSPEND = false;
    return out;
  }, { MEASURE, SEEDS, DAYS });

  const p = v => v === undefined || v === null ? '—' : (v*100).toFixed(0) + '%';
  const hdr = MEASURE
    ? '| rung | rate | meetings | bar | floor | flawless p50 | sloppy p50 | gap | good clears | bad clears |'
    : '| rung | rate | meetings | bar | floor |';
  const sep = '|' + '---|'.repeat(hdr.split('|').length - 2);
  console.log(hdr); console.log(sep);
  for (const r of rows){
    const base = '| ' + r.id + ' | ' + r.rate + ' | ' + r.meet + ' | ' +
      (r.bar === null ? '—' : r.bar.toFixed(3)) + ' | ' + r.floor.toFixed(3) + ' |';
    if (!MEASURE){ console.log(base); continue; }
    const gap = (r.flaw !== undefined) ? Math.round((r.flaw - r.slop)*100) : null;
    console.log(base + ' ' + p(r.flaw) + ' | ' + p(r.slop) + ' | ' +
      (gap === null ? '—' : gap) + ' | ' + p(r.goodClears) + ' | ' + p(r.badClears) + ' |');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

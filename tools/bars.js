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
const WINDOW = process.argv.includes('--window');
const CAREERS = process.argv.includes('--careers');
const TARGET = +((process.argv.find(a => a.startsWith('--target=')) || '--target=0.75').split('=')[1]);
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

  if (WINDOW){
    /* The other dial. Senior rungs deal few, heavy tickets, so a single unlucky
       P1 swings the day's share enormously — seed noise drowns skill. Averaging
       more days shrinks that noise by sqrt(n) without touching the queue. This
       asks how many days each gate needs before good triage outruns bad. */
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
      const rows = [];
      for (let r = 0; r < ROLES.length; r++){
        if (!ROLES[r].gates.nextAt) continue;
        /* play each career ONCE, then re-window the same day series — the
           window is a reading of the days, not a different game */
        const T = seeds.map(s => play(s, 1.0,  DAYS, r, 'pridead' ));
        const L = seeds.map(s => play(s, 0.35, DAYS, r, 'worstpri'));
        const best = (ds, w) => { let b = 0;
          for (let i = 0; i + w <= ds.length; i++)
            b = Math.max(b, ds.slice(i, i+w).reduce((a,c)=>a+c,0)/w);
          return b; };
        const tried = [];
        for (const w of [3,4,5,6,8,10]){
          if (w > DAYS) continue;
          const t = T.map(ds => best(ds,w)), l = L.map(ds => best(ds,w));
          tried.push({ w, tp25:pct(t,25), tp50:pct(t,50), lp50:pct(l,50),
                       lp90:pct(l,90), gap:pct(t,25)-pct(l,90) });
        }
        rows.push({ id:ROLES[r].id, now:ROLES[r].gates.nextAt.days, tried });
      }
      return rows;
    }, { SEEDS, DAYS });
    const p = v => (v*100).toFixed(0).padStart(3) + '%';
    console.log('GATE-WINDOW SWEEP — ' + SEEDS + ' seeds x ' + DAYS + ' days\n');
    console.log('  rung      win | flaw p25  p50 | sloppy p50  p90 |  gap');
    for (const r of rows){
      const win = r.tried.filter(t=>t.gap>0).sort((a,b)=>b.gap-a.gap)[0];
      for (const t of r.tried)
        console.log('  ' + (t.w===r.tried[0].w ? r.id.padEnd(9) : ' '.repeat(9)) +
          String(t.w).padStart(3) + 'd |' + p(t.tp25) + ' ' + p(t.tp50) + ' |' +
          p(t.lp50) + ' ' + p(t.lp90) + ' |' + (t.gap*100).toFixed(0).padStart(5) +
          (win && t.w===win.w ? '  <-- widest' : ''));
      console.log(win ? '            -> ' + win.w + 'd, bar between ' + p(win.lp90).trim() +
        ' and ' + p(win.tp25).trim() + ' (now ' + r.now + 'd)\n'
        : '            -> no window separates good triage from bad (now ' + r.now + 'd)\n');
    }
    await browser.close(); process.exit(0);
  }

  if (CAREERS){
    /* WHERE THE BAR BELONGS IS A QUESTION ABOUT CAREERS, NOT ABOUT DAYS.
       This file places a bar at flawless p25, which is the right answer for one
       eight-day stretch and too generous once a whole career is in view — a
       career gets many three-day windows, not one. On 2026-08-26 that gap cost
       four rounds of hand-bisection: p25 retired 24 players out of 24 in 5.3
       careers, p50 retired 7, and the answer was somewhere in between.

       So the bisection is the tool now. Each rung's bar is placed at the same
       FRACTION f of the way from its own flawless p25 to its own p50, and f is
       bisected until the share of players reaching retirement hits --target.
       One dial, nine bars, each still measured against its own distribution. */
    const target = Math.min(0.95, Math.max(0.2, TARGET));
    console.log('BAR BISECTION — target ' + (target*100).toFixed(0) +
                '% of careers reaching retirement\n');
    const dist = await page.evaluate(({ SEEDS, DAYS }) => {
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
      const out = [];
      for (let r = 0; r < ROLES.length; r++){
        const gate = ROLES[r].gates.nextAt; if (!gate) continue;
        const best = ds => { let b = 0;
          for (let i = 0; i + gate.days <= ds.length; i++)
            b = Math.max(b, ds.slice(i, i+gate.days).reduce((a,c)=>a+c,0)/gate.days);
          return b; };
        const t = seeds.map(s => best(play(s, 1.0, r, 'pridead')));
        out.push({ ix:r, id:ROLES[r].id, p25:pct(t,25), p50:pct(t,50) });
      }
      return out;
    }, { SEEDS, DAYS });
    for (const d of dist)
      console.log('  ' + d.id.padEnd(10) + ' p25 ' + (d.p25*100).toFixed(0) +
                  '%  p50 ' + (d.p50*100).toFixed(0) + '%');
    /* careers at a given fraction — the same loop meta.js runs, so the two
       harnesses cannot drift apart on what "a career" means */
    const at = async f => page.evaluate(({ dist, f, PLAYERS }) => {
      SAVE_SUSPEND = true; QUIET = true; A.sfxVol = 0;
      for (const d of dist){
        const bar = Math.max(.05, Math.min(.98, d.p25 + (d.p50 - d.p25) * f));
        ROLES[d.ix].gates.nextAt.perf = bar;
        ROLES[d.ix].gates.firedBelow = bar * 0.45;
      }
      let won = 0; const lens = [];
      for (let pl = 0; pl < PLAYERS; pl++){
        meta = { certs:[], rep:0, conn:0, runsPlayed:0, best:{ days:0, rung:0 } };
        let retired = false, n = 0;
        for (let c = 0; c < 14 && !retired; c++){
          runInit('META-'+pl+'-'+c); n++;
          let g = 0, ending = 'timeout';
          while (run && g++ < 80){
            startCommute(); if (!run) break;
            simDay(0.85, { order:'pridead', pick:'best' }); if (!run) break;
            if (run.pendingEnd){ ending = run.pendingEnd; startCommute(); break; }
          }
          if (run) run = null;
          if (ending === 'retired') retired = true;
        }
        if (retired){ won++; lens.push(n); }
      }
      QUIET = false; SAVE_SUSPEND = false;
      return { rate: won/PLAYERS, avg: lens.length ? lens.reduce((a,c)=>a+c,0)/lens.length : 0 };
    }, { dist, f, PLAYERS: 20 });
    /* THE SEARCH HAS TO BE ABLE TO LOOK BELOW p25. The first version bisected f
       over [0,1] — p25 to p50 — on the reasoning that a bar below p25 promotes
       more than three careers in four and is therefore too generous to be the
       answer. It is not: a bar is cleared by the best three-day WINDOW of a
       career, and a long career gets many windows, so the number that gives a
       sane retirement rate over fourteen careers routinely sits below p25.

       When the true answer was below the floor the search reported a best of
       40% against a 75% target and went non-monotonic on the way — every lower
       f giving the same 35% — which reads like "the bar is not the binding
       constraint" and is really "the tool cannot see the answer". meta.js
       caught it: the bars already in the file scored 83% where the tool's own
       recommendation scored 40%.

       f now runs from -2 (a full two spans BELOW p25) to 1. */
    let lo = -2, hi = 1, best = null;
    console.log('');
    for (let i = 0; i < 8; i++){
      const f = (lo + hi) / 2;
      const r = await at(f);
      console.log('  f=' + f.toFixed(3) + '  retired ' + (r.rate*100).toFixed(0) +
                  '%  in ' + r.avg.toFixed(1) + ' careers');
      if (!best || Math.abs(r.rate - target) < Math.abs(best.rate - target))
        best = { f, rate:r.rate, avg:r.avg };
      /* a HIGHER bar retires FEWER players, so the search runs backwards */
      if (r.rate > target) lo = f; else hi = f;
    }
    console.log('\n  best f=' + best.f.toFixed(3) + ' -> ' + (best.rate*100).toFixed(0) +
                '% retire in ' + best.avg.toFixed(1) + ' careers\n');
    console.log('  put these in ROLES:');
    for (const d of dist){
      const bar = Math.max(.05, Math.min(.98, d.p25 + (d.p50 - d.p25) * best.f));
      console.log('    ' + d.id.padEnd(10) + ' nextAt:{perf:' + bar.toFixed(3) +
                  '}, firedBelow:' + (bar*0.45).toFixed(3));
    }
    await browser.close(); process.exit(0);
  }

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
      /* THE QUANTITY THE GATE ACTUALLY DECIDES ON. An earlier version of this
         tool asked whether flawless's 25th percentile beat sloppy's 90th, and
         called every rung in the game misplaced — but that is asking whether a
         good player's bad career beats a bad player's best one, which no game
         with seed variance survives. What a bar is FOR is a clear-rate: good
         triage should get through most seeds, bad triage should not. */
      const clears = (arr, at) => arr.filter(v => v >= at).length / arr.length;
      const cand = pct(tight, 25);      // a bar here lets flawless clear ~75%
      rows.push({ id:ROLES[r].id, bar:bar.perf, days:bar.days,
        tp10:pct(tight,10), tp25:pct(tight,25), tp50:pct(tight,50), tp90:pct(tight,90),
        lp50:pct(loose,50), lp90:pct(loose,90), lmax:Math.max.apply(null, loose),
        cand, candLoose:clears(loose, cand),
        nowTight:clears(tight, bar.perf), nowLoose:clears(loose, bar.perf) });
    }
    return rows;
  }, { SEEDS, DAYS });

  const p = v => (v*100).toFixed(0).padStart(3) + '%';
  console.log('BAR PLACEMENT — ' + SEEDS + ' seeds x ' + DAYS + ' days per rung\n');
  console.log('  rung        bar | flaw p50 slop p50 gap | clears now: good/bad |' +
              ' suggested bar -> bad clears');
  let bad = 0;
  for (const r of rows0(out)){
    /* A healthy gate: good triage gets through most seeds, bad triage rarely.
       Judged at the bar in the file, not at a hypothetical one. */
    const healthy = r.nowTight >= .6 && r.nowLoose <= .3;
    if (!healthy) bad++;
    console.log('  ' + r.id.padEnd(10) + p(r.bar) + ' |' + p(r.tp50) + '   ' + p(r.lp50) +
      '  ' + ((r.tp50 - r.lp50)*100).toFixed(0).padStart(3) + ' |      ' +
      p(r.nowTight) + ' / ' + p(r.nowLoose) + '     |  ' + p(r.cand) + ' -> ' +
      p(r.candLoose) + (healthy ? '' : '   <-- MISPLACED'));
  }
  console.log('\n  healthy = good triage clears >=60% of seeds, bad triage <=30%.');
  console.log('  "suggested bar" is flawless p25 (good triage clears ~75% there);');
  console.log('  the number after it is what share of SLOPPY seeds also clear it —');
  console.log('  if that is not low, no bar fixes the rung and the rung needs content.');
  /* AND THE DOCUMENT HAS TO NAME THE RIGHT RUNGS. docs/DESIGN.md says which
     rung is narrowest and which is widest, and a sentence like that is true on
     the day it is written and then quietly stops being. The README carried one
     naming Relationship Manager as the weakest rung for two content passes
     after Project Team took the title. These numbers are already here, so the
     claim is checked here rather than believed. */
  const doc = path.join(path.dirname(path.resolve(target)), 'docs', 'DESIGN.md');
  if (fs.existsSync(doc)){
    const md = fs.readFileSync(doc, 'utf8').replace(/\s+/g, ' ');
    const gaps = rows0(out).map(r => ({ id:r.id, gap:(r.tp50 - r.lp50) * 100 }));
    const lo = gaps.reduce((a, b) => b.gap < a.gap ? b : a);
    const hi = gaps.reduce((a, b) => b.gap > a.gap ? b : a);
    const said = (re, what) => { const m = re.exec(md);
      if (!m) return '  docs/DESIGN.md no longer names the ' + what + ' rung';
      const name = m[1].toLowerCase().replace(/[^a-z]/g, '');
      const want = (what === 'narrowest' ? lo : hi);
      const alias = { projectteam:'project', procurement:'procure',
                      relationshipmanager:'relmgr', solutionsarchitect:'solarch' };
      const got = alias[name] || name;
      return got === want.id && Math.abs(+m[2] - want.gap) <= 2 ? ''
        : '  docs/DESIGN.md says the ' + what + ' rung is ' + m[1] + ' at ' + m[2] +
          '; measured it is ' + want.id + ' at ' + want.gap.toFixed(0);
    };
    const wrong = [ said(/\*\*([A-Za-z ]+?) is the narrowest rung at (\d+) points\*\*/, 'narrowest'),
                    said(/\*\*([A-Za-z ]+?) is the widest at (\d+)\*\*/, 'widest') ].filter(Boolean);
    if (wrong.length){ bad += wrong.length; console.log('\n' + wrong.join('\n')); }
    else console.log('\n  docs/DESIGN.md names the right narrowest and widest rungs.');
  }
  console.log(bad ? '\n' + bad + ' RUNG(S) MISPLACED' : '\nALL BARS WELL PLACED');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
function rows0(x){ return x; }

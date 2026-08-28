/* WHAT A CAREER ACTUALLY BANKS.
 *
 * REP_PER_CAREER is the number the whole certificate shelf is priced against:
 * eight certificates were said to total "about eight careers of good play".
 * If the constant is wrong the shelf is mispriced by exactly that factor, and
 * nothing else in the repo would notice — meta.js plays careers but never
 * reports what they earned.
 *
 * The constant used to be measured from a BARE PROFILE every time: twelve
 * careers, each starting at intern, each a sixteen-day climb, median 161. A
 * player plays exactly one career like that. From the second one on they are
 * re-hired above intern off the back of the last, the climb is half as long,
 * and the career banks about a hundred. Pricing a shelf against the first
 * career and selling it to the other seven put the shelf at thirteen careers
 * when the page said eight.
 *
 * So the number this reports, and the number the source holds, is what a
 * career banks IN A SEQUENCE. It also plays sequences to retirement, buying
 * cheapest-first the way a player does, and reports how much of the shelf a
 * winning playthrough actually gets to hold — the claim the price exists to
 * make.
 *
 *   node tools/rep.js [/abs/path/index.html] [careers=12] [skill=.85]
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target  = process.argv[2] || '/home/user/managed/index.html';
const CAREERS = +(process.argv[3] || 12);
const SKILL   = +(process.argv[4] || 0.85);
const TOL     = 0.15;

async function launch(){ try { return await chromium.launch(); } catch(e){
  const base='/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x=>x.startsWith('chromium'))){
    const p=path.join(base,d,'chrome-linux','chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({executablePath:p}); } catch(_){} } }
  throw e; } }

const median = a => { const s=[...a].sort((x,y)=>x-y);
  return s.length % 2 ? s[(s.length-1)/2] : (s[s.length/2-1]+s[s.length/2])/2; };

(async()=>{
  const b = await launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('file://' + target);
  await p.waitForFunction(()=>typeof G!=='undefined' && typeof simDay==='function');

  const out = await p.evaluate(({CAREERS, SKILL})=>{
    SAVE_SUSPEND = true; QUIET = true; A.sfxVol = 0;
    const bare = () => ({ certs:[], rep:0, conn:0, runsPlayed:0, best:{ days:0, rung:0 } });
    /* One career, on whatever profile is already loaded. */
    const career = (seed, pick) => {
      const before = meta.rep;
      runInit(seed);
      const startRung = run.rung;
      let g = 0, ending = 'timeout', days = 0, endRung = startRung;
      while (run && g++ < 80){
        startCommute(); if (!run) break;
        simDay(SKILL, { order:'pridead', pick }); if (!run) break;
        days = run.day; endRung = run.rung;
        if (run.pendingEnd){ ending = run.pendingEnd; startCommute(); break; }
      }
      return { rep: meta.rep - before, days, startRung, endRung, ending };
    };
    const study = () => { for(;;){
      const afford = Object.keys(CERTS)
        .filter(k => !meta.certs.includes(k) && CERTS[k].cost.rep <= meta.rep)
        .sort((a,b) => CERTS[a].cost.rep - CERTS[b].cost.rep);
      if (!afford.length) return;
      meta.certs.push(afford[0]); meta.rep -= CERTS[afford[0]].cost.rep; } };

    /* Arm 1 — from scratch, the way the old constant was measured. */
    const scratch = [], worst = [];
    for (let i = 0; i < CAREERS; i++){
      meta = bare(); scratch.push(career('REP-' + i, 'best'));
      meta = bare(); worst.push(career('REP-' + i, 'worst'));
    }
    /* Arm 2 — a career inside a sequence, which is every career but the first. */
    const seq = [];
    meta = bare();
    for (let i = 0; i < CAREERS; i++) seq.push(career('SEQ-' + i, 'best'));

    /* Arm 3 — play to retirement, studying between careers, and see how much
       of the shelf a whole winning playthrough gets to hold. */
    const wins = [];
    for (let pl = 0; pl < 6; pl++){
      meta = bare();
      let n = 0, retired = false, earned = 0;
      while (n < 16 && !retired){
        const c = career('WIN-' + pl + '-' + n, 'best');
        earned += c.rep; n++;
        if (c.ending === 'retired') retired = true;
        study();
      }
      wins.push({ careers:n, retired, certs: meta.certs.length, earned,
                  shelf: Object.keys(CERTS).length });
    }
    return { scratch, worst, seq, wins, said: REP_PER_CAREER,
             shelfCost: Object.values(CERTS).reduce((a,c)=>a+c.cost.rep, 0),
             shelfN: Object.keys(CERTS).length };
  }, { CAREERS, SKILL });

  const NAMES = ['intern','T1','T2','T3','project','procure','relmgr','solarch','vCIO','DIRECTOR'];
  const show = (label, rows) => {
    const reps = rows.map(r => r.rep);
    console.log('  ' + label.padEnd(14) + 'median ' + String(median(reps)).padStart(5) +
      '   min ' + String(Math.min(...reps)).padStart(4) + '  max ' + String(Math.max(...reps)).padStart(4) +
      '   median days ' + median(rows.map(r=>r.days)));
    return median(reps);
  };
  console.log('WHAT A CAREER BANKS — ' + CAREERS + ' careers, skill ' + SKILL + '\n');
  const mScratch = show('from scratch', out.scratch);
  const mWorst   = show('worst option', out.worst);
  const mSeq     = show('in a sequence', out.seq);
  console.log('  in a sequence starts at: ' + out.seq.map(r=>NAMES[r.startRung]).join(', '));

  console.log('\nPLAYING TO RETIREMENT, STUDYING BETWEEN CAREERS');
  out.wins.forEach((w,i)=>console.log('  player ' + i + ': ' +
    (w.retired ? 'retired after ' + w.careers : 'gave up after ' + w.careers) +
    ' careers, earned ' + w.earned + ', ended holding ' + w.certs + '/' + w.shelf + ' certificates'));
  const held = median(out.wins.map(w=>w.certs));
  const wCar = median(out.wins.map(w=>w.careers));

  console.log('\nREP_PER_CAREER = ' + out.said + ', a career in a sequence banks ' + mSeq +
    ' (' + (Math.abs(out.said-mSeq)/Math.max(1,mSeq)*100).toFixed(0) + '% off, tolerance ' + (TOL*100) + '%)');
  console.log('the shelf costs ' + out.shelfCost + ' = ' +
    (out.shelfCost / Math.max(1, mSeq)).toFixed(1) + ' careers of good play' +
    '; a winning playthrough is ' + wCar + ' careers and ends holding ' + held + '/' + out.shelfN);

  let bad = 0;
  if (Math.abs(out.said - mSeq) / Math.max(1, mSeq) > TOL){
    console.log('FAIL  REP_PER_CAREER is not what a career banks'); bad++; }
  /* The claim beside the constant is that reputation answers to how you treat
     people, not to craft. If worst-option play banked the same, there is no
     axis and the number above measures nothing. */
  if (mWorst >= mScratch * 0.5){
    console.log('FAIL  worst-option play banks ' + mWorst + ' against ' + mScratch +
      ' — reputation is not a social axis'); bad++; }
  /* The price exists to make the shelf a choice. Hold none of it across a
     winning playthrough and it is decoration; hold all of it and there was
     never a decision. */
  if (held < 2){ console.log('FAIL  a winning playthrough ends holding ' + held +
    ' certificates — the shelf is decoration'); bad++; }
  if (held >= out.shelfN){ console.log('FAIL  a winning playthrough holds the whole shelf — no choice'); bad++; }

  console.log(bad ? '\nREP MISPRICED' : '\nREP OK');
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e=>{console.error('HARNESS ERROR', e); process.exit(2);});

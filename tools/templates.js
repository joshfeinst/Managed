/* Does WHICH TEMPLATE you were dealt still decide your score? Measures the
   per-template average resolved score across many simulated days, and the
   spread between the luckiest and unluckiest ticket in the table. */
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base='/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x=>x.startsWith('chromium'))){
    const p=path.join(base,d,'chrome-linux','chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({executablePath:p}); } catch(_){} } }
  throw e; } }
(async()=>{
  const b=await launch(); const p=await b.newPage();
  p.on('pageerror',e=>console.log('PAGEERROR',e.message));
  await p.goto('file://'+(process.argv[2]||'/home/user/managed/index.html'));
  await p.waitForFunction(()=>typeof G!=='undefined'&&typeof simDay==='function');
  const r = await p.evaluate(({N})=>{
    SAVE_SUSPEND=true; QUIET=true; A.sfxVol=0;
    const by={};
    const orig = window.resolveTicket;
    window.resolveTicket = function(t){
      const before = run.scores.length;
      const res = orig.apply(this, arguments);
      if (run && run.scores.length > before){
        const sc = run.scores[run.scores.length-1];
        (by[t.id] = by[t.id] || []).push(sc);
      }
      return res;
    };
    for (let i=0;i<N;i++){
      runInit('TPL-'+(200+i*29)); let g=0;
      while (run && g++<12){
        startCommute(); if (!run) break;
        run.rung = 0;
        simDay(.8,{order:'pridead',pick:'best'}); if (!run) break;
        run.rung=0; run.burnout=0; run.firedStreak=0;
        if (run.pendingEnd) run.pendingEnd=null;
      }
      run=null;
    }
    window.resolveTicket = orig;
    SAVE_SUSPEND=false; QUIET=false;
    const out={};
    for (const id in by){ const a=by[id];
      out[id]={ n:a.length, avg:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(3),
                pri:5-(TICKETS[id].pri||2), mult:TICKETS[id].slaMult }; }
    return out;
  },{N:+(process.argv[3]||14)});
  const rows=Object.entries(r).filter(([,v])=>v.n>=8).sort((a,b)=>b[1].avg-a[1].avg);
  rows.forEach(([id,v])=>console.log(`  ${id.padEnd(17)} P${v.pri} x${v.mult}  n=${String(v.n).padStart(3)}  avg ${v.avg.toFixed(3)}`));
  const avgs=rows.map(([,v])=>v.avg);
  console.log(`\ntemplates ${rows.length} · best ${Math.max(...avgs).toFixed(3)} · worst ${Math.min(...avgs).toFixed(3)} · SPREAD ${(Math.max(...avgs)-Math.min(...avgs)).toFixed(3)}`);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});

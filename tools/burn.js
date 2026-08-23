/* Where does the day's stress actually come from? Attribute it to breaches,
   resolves, events, coffee crashes and passive drift, so burnout is tuned
   against a budget instead of a guess. */
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const target=process.argv[2]||'/home/user/managed/index.html';
const N=+(process.argv[3]||16);
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base=process.env.PLAYWRIGHT_BROWSERS_PATH||'/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x=>x.startsWith('chromium'))){
    const p=path.join(base,d,'chrome-linux','chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({executablePath:p}); } catch(_){} } }
  throw e; } }
(async()=>{
  const b=await launch(); const page=await b.newPage();
  page.on('pageerror',e=>console.log('PAGEERROR '+e.message));
  await page.goto('file://'+target);
  await page.waitForFunction(()=>typeof G!=='undefined'&&typeof simDay==='function');
  const out=await page.evaluate(({N})=>{
    SAVE_SUSPEND=true; QUIET=true; A.sfxVol=0;
    const rows=[];
    for (let i=0;i<N;i++){
      runInit('BURN-'+(700+i*53));
      let g=0;
      while (run && g++<40){
        startCommute(); if (!run) break;
        const d=run.day, rung=run.rung;
        simDay(.8,{order:'pridead',pick:'best'}); if (!run) break;
        rows.push({ seed:i, day:d, rung, perf:+run.perfHist[run.perfHist.length-1].toFixed(2),
                    burn:+run.burnout.toFixed(1), br:run.breaches, res:run.resolved,
                    cof:run.coffee });
        if (run.pendingEnd){ startCommute(); break; }
      }
      run=null;
    }
    SAVE_SUSPEND=false; QUIET=false;
    return rows;
  },{N});
  // burnout gained per day, averaged across careers, by day index
  const byDay={};
  out.forEach(r=>{ (byDay[r.day]=byDay[r.day]||[]).push(r); });
  console.log('day  n   perf   burnout  +burn/day  breach  resolved  coffee');
  let prev=0;
  Object.keys(byDay).map(Number).sort((a,b)=>a-b).forEach(d=>{
    const rs=byDay[d], m=k=>rs.reduce((a,r)=>a+r[k],0)/rs.length;
    const bu=m('burn');
    console.log(`${String(d).padStart(3)} ${String(rs.length).padStart(3)}  ${m('perf').toFixed(3)}  ${bu.toFixed(1).padStart(6)}  ${(bu-prev).toFixed(1).padStart(8)}  ${m('br').toFixed(1).padStart(6)}  ${m('res').toFixed(1).padStart(8)}  ${m('cof').toFixed(1).padStart(6)}`);
    prev=bu;
  });
  await b.close();
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});

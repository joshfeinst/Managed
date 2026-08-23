/* Is the roguelite actually winnable? Plays a SEQUENCE of careers the way a
   real player does — meta carries between them — and reports how many careers
   it takes to reach Director and retire, if ever. */
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const target=process.argv[2]||'/home/user/managed/index.html';
const PLAYERS=+(process.argv[3]||8), MAXCAREERS=+(process.argv[4]||14);
const SKILL=+(process.argv[5]||0.85);
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base='/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x=>x.startsWith('chromium'))){
    const p=path.join(base,d,'chrome-linux','chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({executablePath:p}); } catch(_){} } }
  throw e; } }
(async()=>{
  const b=await launch(); const p=await b.newPage();
  p.on('pageerror',e=>console.log('PAGEERROR',e.message));
  await p.goto('file://'+target);
  await p.waitForFunction(()=>typeof G!=='undefined'&&typeof simDay==='function');
  const out=await p.evaluate(({PLAYERS,MAXCAREERS,SKILL})=>{
    SAVE_SUSPEND=true; QUIET=true; A.sfxVol=0;
    const players=[];
    for (let pl=0; pl<PLAYERS; pl++){
      meta = { certs:[], rep:0, conn:0, runsPlayed:0, best:{ days:0, rung:0 } };
      const careers=[];
      let retired=false;
      for (let c=0; c<MAXCAREERS && !retired; c++){
        runInit('META-'+pl+'-'+c);
        const startRung = run.rung;
        let g=0, ending='timeout';
        while (run && g++<80){
          startCommute(); if (!run) break;
          simDay(SKILL,{order:'pridead',pick:'best'}); if (!run) break;
          if (run.pendingEnd){ ending=run.pendingEnd; const d=run.day, r=run.rung;
            startCommute(); careers.push({start:startRung,end:r,days:d,ending}); break; }
        }
        if (ending==='timeout' && run){ careers.push({start:startRung,end:run.rung,days:run.day,ending}); run=null; }
        if (ending==='retired') retired=true;
      }
      players.push({ careers, retired, bestRung: meta.best.rung, runs: meta.runsPlayed });
    }
    SAVE_SUSPEND=false; QUIET=false;
    return players;
  },{PLAYERS,MAXCAREERS,SKILL});
  const NAMES=['intern','T1','T2','T3','project','procure','relmgr','solarch','vCIO','DIRECTOR'];
  out.forEach((pl,i)=>{
    const arc = pl.careers.map(c=>`${NAMES[c.start]}->${NAMES[c.end]}(${c.days}d,${c.ending[0]})`).join(' · ');
    console.log(`player ${i}: ${pl.retired ? 'RETIRED after '+pl.careers.length+' careers' : 'best '+NAMES[pl.bestRung]+' in '+pl.careers.length}`);
    console.log('   ' + arc);
  });
  const won = out.filter(x=>x.retired).length;
  const bestRungs = out.map(x=>x.bestRung);
  console.log(`\n${won}/${out.length} reached retirement · best rung reached: min ${NAMES[Math.min(...bestRungs)]}, max ${NAMES[Math.max(...bestRungs)]}`);
  const careersToWin = out.filter(x=>x.retired).map(x=>x.careers.length);
  if (careersToWin.length) console.log('careers to win: ' + careersToWin.join(',') +
    ' (avg ' + (careersToWin.reduce((a,c)=>a+c,0)/careersToWin.length).toFixed(1) + ')');
  await b.close();
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});

/* Is the roguelite actually winnable? Plays a SEQUENCE of careers the way a
   real player does — meta carries between them — and reports how many careers
   it takes to reach Director and retire, if ever. */
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const target=process.argv[2]||__dirname+'/../index.html';
const PLAYERS=+(process.argv[3]||8), MAXCAREERS=+(process.argv[4]||14);
const SKILL=+(process.argv[5]||0.85);
/* TRIAGE IS THE AXIS THIS GAME HAS, AND THIS HARNESS COULD NOT VARY IT. Every
   player it has ever simulated ran order:'pridead' with pick:'best' -- perfect
   triage, best option every time -- and differed only in the craft dial. So
   "40 of 40 reach retirement" was never a statement about whether the game can
   say no; it was a statement about one kind of player, repeated forty times.
   gate.js had the same hole in its main sweep and says so in its own --ladder
   comment: at .35 with correct priority order the bot clears everything, which
   says nothing about the gate and everything about craft not mattering.
   Now a parameter, so the bad player can be asked the same question:
     node tools/meta.js <file> [players=40] [maxCareers=14] [skill=.85]
                               [order=pridead] [pick=best]                */
const ORDER=process.argv[6]||'pridead', PICK=process.argv[7]||'best';
/* Does the player book leave when the evening card offers it? A mechanic no
   harness can exercise is a mechanic whose balance nobody knows. Off by
   default so every number recorded before annual leave existed still
   reproduces; pass 'leave' to ask the other question. */
const TAKELEAVE = process.argv[8] === 'leave';
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
  const out=await p.evaluate(({PLAYERS,MAXCAREERS,SKILL,ORDER,PICK,TAKELEAVE})=>{
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
          simDay(SKILL,{order:ORDER,pick:PICK}); if (!run) break;
          if (TAKELEAVE && typeof canTakeLeave === 'function' && canTakeLeave()) takeLeave();
          if (run.pendingEnd){ ending=run.pendingEnd; const d=run.day, r=run.rung;
            startCommute(); careers.push({start:startRung,end:r,days:d,ending}); break; }
        }
        if (ending==='timeout' && run){ careers.push({start:startRung,end:run.rung,days:run.day,ending}); run=null; }
        if (ending==='retired') retired=true;
        /* STUDY BETWEEN CAREERS, WHICH THIS HARNESS NEVER DID. It started every
           player on certs:[] and left them there, so the reputation banked at
           the end of each career — 780 of it over six careers — was never spent
           on anything, and the meta-progression has never once been part of the
           model this project calls its harness of record. That mattered most
           when the shelf cost 31 in total: a real player held every certificate
           from career two onward and was permanently playing an easier game
           than any number here described.
           A player buys what they can afford, cheapest first, and keeps buying
           while anything is still in reach. */
        for (;;){
          const afford = Object.keys(CERTS)
            .filter(k => !meta.certs.includes(k) && CERTS[k].cost.rep <= meta.rep)
            .sort((a,b) => CERTS[a].cost.rep - CERTS[b].cost.rep);
          if (!afford.length) break;
          meta.certs.push(afford[0]); meta.rep -= CERTS[afford[0]].cost.rep;
        }
      }
      players.push({ careers, retired, bestRung: meta.best.rung, runs: meta.runsPlayed,
                     certs: (meta.certs||[]).length, repLeft: meta.rep });
    }
    SAVE_SUSPEND=false; QUIET=false;
    return players;
  },{PLAYERS,MAXCAREERS,SKILL,ORDER,PICK,TAKELEAVE});
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

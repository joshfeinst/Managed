/* Save and resume through the REAL path (tools/save.js): play into a day, save, reload the
   page, continue, and check the day is the same day — every field the night
   added has to survive, or a player loses their afternoon. */
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base='/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x=>x.startsWith('chromium'))){
    const p=path.join(base,d,'chrome-linux','chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({executablePath:p}); } catch(_){} } }
  throw e; } }
(async()=>{
  const b=await launch();
  const ctx = await b.newContext({ viewport:{width:960,height:540} });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/user/managed/index.html');
  await p.waitForFunction(()=>typeof G!=='undefined'&&typeof selfTest==='function');
  await p.keyboard.press('Space'); await p.waitForTimeout(300);

  const before = await p.evaluate(()=>{
    newRun('JOB-SAVE'); run.introDone=true; clockIn();
    if (G.modal) closeModalToWork();
    run.clock = 210;
    /* skip the arrivals the jump flew past, or resume correctly delivers a
       backlog and the test measures catch-up instead of the round-trip */
    while (run.plan.ai < run.plan.arrivals.length && run.plan.arrivals[run.plan.ai].at <= 210) run.plan.ai++;
    while (run.plan.ei < run.plan.events.length && run.plan.events[run.plan.ei].at <= 210) run.plan.ei++;
    // a half-played day with every field the night added actually populated
    run.resolved = 7; run.stakesDone = 17; run.earned = 17*.74;
    run.scores = new Array(7).fill(.74); run.aces = 2;
    run.breaches = 3; run.burned = [STAKES[1],STAKES[2],STAKES[4]];
    run.speedSum = 7*.61; run.qualSum = 3*.83; run.qualN = 3;
    run.stress = 54; run.coffee = 2; run.rep = 5; run.rungSince = 0;
    run.warned = { standup:1 };
    const role = ROLES[run.rung], P = run.plan;
    run.queue.length = 0;
    const a = makeArrival(P.arrivals[P.ai].id, 210, role); P.ai++;
    run.queue.push({uid:a.uid,id:a.id,title:a.title,fills:a.fills,at:210,
      deadline:210+a.sla,sla:a.sla,stress:a.stress,si:1,bonus:1,gameScores:[.42],
      from:null,gameCap:.37});
    saveGame();
    return { day:run.day, resolved:run.resolved,
      stakesDone:run.stakesDone, earned:+run.earned.toFixed(3), breaches:run.breaches,
      burned:run.burned.slice(), speedSum:+run.speedSum.toFixed(3),
      qualSum:+run.qualSum.toFixed(3), qualN:run.qualN, rep:run.rep, coffee:run.coffee,
      rungSince:run.rungSince, queue:run.queue.map(t=>({id:t.id,si:t.si,bonus:t.bonus,
        gameCap:t.gameCap,gs:t.gameScores.slice()})) };
  });

  await p.reload();
  await p.waitForFunction(()=>typeof G!=='undefined'&&typeof selfTest==='function');
  await p.waitForTimeout(600);
  await p.evaluate(()=>{ const s=loadGame(); if (s && s!=='future') resumeRun(s); });
  await p.waitForTimeout(120);
  /* read the restored state before the clock has had time to move it */
  await p.evaluate(()=>{ G.state = 'pause'; });

  const after = await p.evaluate(()=>run ? ({ day:run.day,
    resolved:run.resolved, stakesDone:run.stakesDone, earned:+run.earned.toFixed(3),
    breaches:run.breaches, burned:run.burned.slice(), speedSum:+run.speedSum.toFixed(3),
    qualSum:+run.qualSum.toFixed(3), qualN:run.qualN, rep:run.rep, coffee:run.coffee,
    rungSince:run.rungSince, queue:run.queue.map(t=>({id:t.id,si:t.si,bonus:t.bonus,
      gameCap:t.gameCap,gs:t.gameScores.slice()})) }) : null);

  const diffs=[];
  if (!after) diffs.push('no run after resume');
  else for (const k of Object.keys(before))
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k]))
      diffs.push(`${k}: ${JSON.stringify(before[k])} -> ${JSON.stringify(after[k])}`);
  diffs.forEach(d=>console.log('  DIFF ' + d));
  console.log('page errors:', errs.length?errs.join(' | '):0);
  console.log(!diffs.length && !errs.length ? 'SAVE/RESUME OK — the afternoon survives a reload' : 'SAVE/RESUME ISSUES');
  await b.close();
  process.exit(!diffs.length && !errs.length ? 0 : 1);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});

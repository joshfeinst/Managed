/* Visual integrity sweep: for every DOM overlay the game shows, measure the
   RENDERED box of every element that holds text. Correct markup with correct
   colours can still paint nothing — a zero-height line box inside
   overflow:hidden ate every ticket title in the queue and no harness noticed,
   because none of them look at pixels. */
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base='/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x=>x.startsWith('chromium'))){
    const p=path.join(base,d,'chrome-linux','chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({executablePath:p}); } catch(_){} } }
  throw e; } }

(async()=>{
  const b=await launch(); const p=await b.newPage({viewport:{width:960,height:540}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+target);
  await p.waitForFunction(()=>typeof G!=='undefined'&&typeof selfTest==='function');
  await p.keyboard.press('Space'); await p.waitForTimeout(400);

  const audit = async (label) => {
    const bad = await p.evaluate(() => {
      const out = [];
      const vis = el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
        for (let a = el.parentElement; a; a = a.parentElement){
          const p = getComputedStyle(a);
          if (p.display === 'none' || p.visibility === 'hidden' || +p.opacity === 0) return false;
        }
        return true;
      };
      /* Where the GLYPHS actually are, not where the box is: a zero-height box
         still paints its text unless something clips it. Only the combination
         is a bug, which is what ate the queue titles. */
      const glyphRect = el => {
        const r = document.createRange();
        r.selectNodeContents(el);
        const rects = [...r.getClientRects()].filter(x => x.width > 0 || x.height > 0);
        if (!rects.length) return null;
        const x0 = Math.min(...rects.map(x=>x.left)), y0 = Math.min(...rects.map(x=>x.top));
        const x1 = Math.max(...rects.map(x=>x.right)), y1 = Math.max(...rects.map(x=>x.bottom));
        return { left:x0, top:y0, right:x1, bottom:y1, w:x1-x0, h:y1-y0 };
      };
      for (const el of document.querySelectorAll('body *')){
        const own = [...el.childNodes].filter(n => n.nodeType === 3)
                      .map(n => n.textContent.trim()).join('');
        if (own.length < 2) continue;
        if (!vis(el)) continue;
        const g = glyphRect(el);
        if (!g || g.w < 1 || g.h < 1){
          out.push({ tag:el.tagName.toLowerCase(), cls:String(el.className).slice(0,40), id:el.id,
                     text:own.slice(0,46), why:'no glyph box',
                     lh:getComputedStyle(el).lineHeight });
          continue;
        }
        /* clipped away by an ancestor that hides overflow? */
        for (let a = el; a; a = a.parentElement){
          const cs = getComputedStyle(a);
          if (!/hidden|clip|auto|scroll/.test(cs.overflowX + cs.overflowY)) continue;
          const c = a.getBoundingClientRect();
          const ix = Math.min(g.right, c.right) - Math.max(g.left, c.left);
          const iy = Math.min(g.bottom, c.bottom) - Math.max(g.top, c.top);
          const visibleArea = Math.max(0, ix) * Math.max(0, iy);
          if (visibleArea < g.w * g.h * 0.30){
            out.push({ tag:el.tagName.toLowerCase(), cls:String(el.className).slice(0,40), id:el.id,
                       text:own.slice(0,46),
                       why:'clipped by <' + a.tagName.toLowerCase() + (a.id?'#'+a.id:'') + '>',
                       lh:getComputedStyle(el).lineHeight });
            break;
          }
        }
      }
      return out;
    });
    if (bad.length) { console.log('  ' + label + ': ' + bad.length + ' invisible text element(s)');
      bad.slice(0,6).forEach(x=>console.log('    <' + x.tag + (x.id?'#'+x.id:'') + (x.cls?'.'+x.cls:'') +
        '> ' + x.why + ', line-height ' + x.lh + '  "' + x.text + '"')); }
    else console.log('  ' + label + ': ok');
    return bad.length;
  };

  let bad = 0;
  console.log('visual integrity by screen:');
  bad += await audit('title');
  await p.evaluate(()=>{ act('newrun'); });          await p.waitForTimeout(300);
  bad += await audit('setup / job posting');
  await p.evaluate(()=>{ newRun('JOB-VIS'); });      await p.waitForTimeout(300);
  bad += await audit('commute');
  await p.evaluate(()=>{ clockIn(); });              await p.waitForTimeout(400);
  for (let i=0;i<40 && await p.evaluate(()=>G.state!=='work');i++){ await p.keyboard.press('KeyE'); await p.waitForTimeout(90); }
  bad += await audit('world (HUD + toasts)');
  await p.evaluate(()=>{
    run.clock = 95; const role=ROLES[run.rung], P=run.plan;
    while (run.queue.length<5 && P.ai<P.arrivals.length){
      const a=makeArrival(P.arrivals[P.ai].id,95,role); P.ai++;
      run.queue.push({uid:a.uid,id:a.id,title:a.title,fills:a.fills,at:95,
        deadline:95+a.sla,sla:a.sla,stress:a.stress,si:0,bonus:0,gameScores:[],from:null}); }
    openQueue(); renderQueue();
  });
  await p.waitForTimeout(400);
  bad += await audit('queue panel');
  await p.evaluate(()=>{ closeModalToWork(); const n=Object.keys(DIALOGUE).find(k=>DIALOGUE[k].opts); openDlg(n,{},null); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>{ for(let i=0;i<400 && dlg && !dlg.optsShown;i++){ press.use=true; dlgTick(.2); press.use=false; } });
  await p.waitForTimeout(300);
  bad += await audit('dialogue with choices');
  await p.evaluate(()=>{
    if (G.modal) closeModalToWork();
    run.clock = DAY_MIN+1; run.resolved=12; run.stakesDone=26; run.earned=26*.66;
    run.scores=new Array(12).fill(.66); run.burned=[1,1,4,2]; run.breaches=4;
    run.speedSum=12*.3; run.qualSum=12*.77; run.aces=2; run.stress=70; run.coffee=3;
    run.queue.length=0; endDay();
  });
  await p.waitForTimeout(500);
  bad += await audit('daily review');
  await p.evaluate(()=>{ careerOver('burnout'); }); await p.waitForTimeout(400);
  bad += await audit('career over');

  /* the minigames and the pause menu draw their own overlays too */
  await p.evaluate(()=>{ newRun('JOB-VIS2'); clockIn(); if (G.modal) closeModalToWork(); });
  await p.waitForTimeout(300);
  for (const g of ['cable','pw','jargon']){
    await p.evaluate((k)=>{ if (G.modal) closeModalToWork(); openGame(k, 1, ()=>{}); }, g);
    await p.waitForTimeout(400);
    bad += await audit('minigame: ' + g);
  }
  await p.evaluate(()=>{ if (G.modal) closeModalToWork(); pauseGame ? pauseGame() : act('pause'); });
  await p.waitForTimeout(300);
  bad += await audit('pause');
  await p.evaluate(()=>{ G.state='work'; show(null); selfTest(); });
  await p.waitForTimeout(600);
  bad += await audit('self-test report');

  console.log('page errors:', errs.length ? errs.join(' | ') : 0);
  console.log(bad === 0 && !errs.length ? 'VISUAL OK' : 'VISUAL ISSUES: ' + bad);
  await b.close();
  process.exit(bad === 0 && !errs.length ? 0 : 1);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});

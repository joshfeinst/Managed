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
        /* Clipped away by an ancestor? How much of the glyph box survives every
           ancestor that clips, as a fraction of the whole. */
        const showing = (box) => {
          let worst = 1, by = null;
          for (let a = el; a; a = a.parentElement){
            const cs = getComputedStyle(a);
            if (!/hidden|clip|auto|scroll/.test(cs.overflowX + cs.overflowY)) continue;
            const c = a.getBoundingClientRect();
            const ix = Math.min(box.right, c.right) - Math.max(box.left, c.left);
            const iy = Math.min(box.bottom, c.bottom) - Math.max(box.top, c.top);
            const f = (Math.max(0, ix) * Math.max(0, iy)) / Math.max(1, box.w * box.h);
            if (f < worst){ worst = f; by = a; }
          }
          return { frac:worst, by };
        };
        /* Painted over where it actually sits? Two boxes in the same strip of
           pixels is the failure this file exists for and the one the scroll
           carve-out below would otherwise wave through: scrolling an element
           to the middle of the port moves it out from under whatever was
           covering it, so a covered element looks fine the moment you look for
           it. So ask here, before any scrolling, at the position the player is
           actually looking at. Ancestors and descendants are not occluders —
           only a box that is neither. */
        const coveredBy = (box) => {
          /* elementFromPoint answers "what would a click hit", and the HUD is
             pointer-events:none by design — it floats over the canvas and lets
             clicks through to the world. Hit-testing therefore names the canvas
             as the occluder of every clock digit and meter label on screen,
             which is not occlusion, it is the layer working. Where the element
             cannot be hit at all, hit-testing cannot answer the question, so
             do not let it pretend to. */
          for (let a = el; a; a = a.parentElement)
            if (getComputedStyle(a).pointerEvents === 'none') return null;
          const hit = document.elementFromPoint(Math.round((box.left + box.right) / 2),
                                                Math.round((box.top + box.bottom) / 2));
          if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return null;
          /* The action bar is the one box in the game designed to be drawn over
             other content: it is pinned so a mouse-only player always has a way
             off the screen, and scrolling slides whatever is under it out from
             under it. So text under the bar is not a bug — UNLESS that text is
             pinned as well, because then it does not slide. Two sticky boxes in
             one scroller can never be scrolled apart: whichever loses is
             covered at every scroll position there is, which is exactly how
             eight sticky certificate rows ended up sharing one strip of pixels
             with the buttons on top of them. Sticky is the word that separates
             "underneath for now" from "underneath for good". */
          if (hit.closest('.screen > .row:last-child')){
            let pinned = false;
            for (let a = el; a && a !== document.body; a = a.parentElement)
              if (getComputedStyle(a).position === 'sticky'){ pinned = true; break; }
            if (!pinned) return null;
          }
          return '<' + hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') +
                 (hit.className ? '.' + String(hit.className).slice(0, 24) : '') + '>';
        };
        let seen = showing(g);
        let over = seen.frac >= 0.30 ? coveredBy(g) : null;
        /* A SCROLLER IS NOT A CLIP. Text below the fold of something the player
           can scroll is not invisible text — it is the second half of a menu,
           and calling it a bug means a screen may never be taller than the
           smallest window we test at. So scroll to it and look again; only
           what stays hidden counts. What this must NOT do is wave through the
           thing it was written for, so the second look also asks whether the
           text is actually PAINTED: the certificate shelf's rows were fully
           inside the scrollport and still unreadable, because eight sticky
           opaque bars were stacked on top of one another. In view but not on
           top is the same bug as out of view, and elementFromPoint knows the
           difference. */
        /* A SCROLLER IS NOT A CLIP, AND A PINNED BAR IS NOT A LID. Text below
           the fold of something the player can scroll is not invisible text —
           it is the second half of a menu — and neither is text under the
           action bar that scrolling slides out from under it. Calling either a
           bug means no screen may ever be taller than the smallest window we
           test at. So when the first look is bad, scroll to it and look again,
           and report only what is STILL clipped or still covered. The first
           look is not wasted: it is the only one that can see two things drawn
           into the same strip of pixels, because scrolling a box to the middle
           of the port is exactly what moves it out from under whatever was on
           top of it. */
        const scrollable = seen.by && /auto|scroll/.test(
              getComputedStyle(seen.by).overflowX + getComputedStyle(seen.by).overflowY);
        if (seen.frac < 0.30 && scrollable){
          const keep = [];
          for (let a = el.parentElement; a; a = a.parentElement) keep.push([a, a.scrollTop]);
          el.scrollIntoView({ block:'center', inline:'nearest' });
          const g2 = glyphRect(el);
          if (g2) seen = showing(g2);
          for (const [a, t] of keep) a.scrollTop = t;
        }
        if (seen.frac < 0.30 || over){
          const a = seen.by;
          out.push({ tag:el.tagName.toLowerCase(), cls:String(el.className).slice(0,40), id:el.id,
                     text:own.slice(0,46),
                     why: over ? 'painted over by ' + over + ', at every scroll position'
                        : 'clipped by <' + (a ? a.tagName.toLowerCase() + (a.id?'#'+a.id:'') : '?') + '>',
                     lh:getComputedStyle(el).lineHeight });
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
  /* every board the game can open, not a hand-kept subset — a new board that
     draws nothing would otherwise sail through this harness */
  const boards = await p.evaluate(() => Object.keys(GAMES));
  for (const g of boards){
    await p.evaluate((k)=>{ if (G.modal) closeModalToWork(); openGame(k, 2, ()=>{}); }, g);
    await p.waitForTimeout(400);
    bad += await audit('minigame: ' + g + ' (card)');
    /* and again with the how-to-play card dismissed, which is the state the
       player spends the whole board in */
    await p.evaluate(()=>{ if (MG) MG.brief = null; });
    await p.waitForTimeout(300);
    bad += await audit('minigame: ' + g);
  }
  /* SMALL WINDOWS. Every panel in this game is drawn on the CANVAS between y26
     and y240 of 270, while the HUD, the objective banner and the toasts are DOM
     anchored to the VIEWPORT. On a short window the two coordinate systems meet
     and DOM text lands on top of a panel — which is how an SLA toast ended up
     printed across a rules card's title, and how the objective banner ended up
     across the words HOW THIS ONE WORKS at 400x300. Neither was visible at the
     960x540 this harness used to test at, so neither was ever caught here. */
  for (const [w, h] of [[400,300],[640,360],[900,420],[1280,720]]){
    await p.setViewportSize({ width:w, height:h });
    await p.waitForTimeout(350);
    await p.evaluate(()=>{ if (G.modal) closeModalToWork(); openGame('jargon', 1, ()=>{});
                           QUIET = false; clearToasts();
                           toast('SLA BREACH P2 - SOMEBODY IS LOCKED OUT', 'alert', 6000); });
    await p.waitForTimeout(350);
    const over = await p.evaluate(() => {
      const cb = view.getBoundingClientRect(), sc = cb.height / 270;
      const band = { top: cb.top + 26*sc, bottom: cb.top + 240*sc, left: cb.left, right: cb.right };
      const hits = [];
      document.querySelectorAll('body *').forEach(el => {
        if (el.children.length) return;                       // leaf text only
        const t = (el.textContent || '').trim();
        if (!t || t.length > 90) return;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) return;
        if (b.bottom > band.top && b.top < band.bottom && b.right > band.left && b.left < band.right)
          hits.push((el.id || el.className || el.tagName) + ' "' + t.slice(0, 40) + '"');
      });
      return hits;
    });
    if (over.length){ bad++; console.log('  small window ' + w + 'x' + h + ': FAIL — DOM text over the panel: ' + over.join(' | ')); }
    else console.log('  small window ' + w + 'x' + h + ': ok');
    await p.evaluate(()=>{ clearToasts(); if (G.modal) closeModalToWork(); });
  }
  await p.setViewportSize({ width:960, height:540 });
  await p.waitForTimeout(300);

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

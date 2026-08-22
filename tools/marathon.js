/* Managed marathon: drives the REAL rAF loop and REAL input path (not simDay)
   through many in-game days, with a scripted player that walks, opens the
   queue, works tickets, drinks coffee, pauses, and clicks through reviews.
   Catches what the headless day-bot structurally cannot: modal traps, screens
   that never advance, faults in render, state that stops progressing.
   Usage: node tools/marathon.js /abs/path/index.html [days=8] */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const target = process.argv[2];
const DAYS = +(process.argv[3] || 8);

async function launch() {
  try { return await chromium.launch(); }
  catch (e) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    for (const dir of fs.readdirSync(base).filter(d => d.startsWith('chromium'))) {
      const p = path.join(base, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) { try { return await chromium.launch({ executablePath: p }); } catch (_) {} }
    }
    throw e;
  }
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (!/Failed to load resource|net::ERR|self-test/.test(t)) errors.push('console: ' + t);
  });
  await page.goto('file://' + target + '?speed=' + (process.env.MSPEED || 40));
  await page.waitForFunction(() => typeof G !== 'undefined' && typeof selfTest === 'function');
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);

  /* Install an in-page scripted player that runs on the real loop: it feeds
     the same held[]/press[] latches the keyboard does, and it deliberately
     never touches sim internals except to read them. */
  await page.evaluate(() => {
    window.__M = { log: [], daysSeen: 0, stallTicks: 0, lastSig: '', reviews: 0, modalTicks: 0,
                   speed: +(new URLSearchParams(location.search).get('speed') || 40) };
    window.__drive = function(){
      const M = window.__M;
      const sig = G.state + '|' + (G.modal ? G.modal.kind : '-') + '|' +
                  (run ? Math.floor(run.clock) + '|' + run.day + '|' + run.queue.length : 'norun');
      if (sig === M.lastSig) M.stallTicks++; else { M.stallTicks = 0; M.lastSig = sig; }
      if (G.modal) M.modalTicks++; else M.modalTicks = 0;

      // get hired first
      if (G.state === 'title'){ act('newrun'); return; }
      if (G.state === 'setup'){ act('start'); return; }   // twice if a career is armed
      // screens: click the primary button to advance
      if (G.state === 'commute' || G.state === 'review'){
        const b = document.querySelector('#r-actions .btn:not(.ghost)');
        if (b){ M.reviews++; b.click(); }
        return;
      }
      if (G.state === 'over'){ M.log.push('career ended day ' + M.daysSeen); return; }
      if (G.state === 'pause'){ resumeWork(); return; }
      if (!run) return;

      // modal handling through the real latches
      if (G.state === 'modal'){
        const k = G.modal.kind;
        if (k === 'dlg'){
          press.use = true;
          if (dlg && dlg.optsShown) press.one = true;
        } else if (k === 'tix'){
          if (run.queue.length) press.use = true; else press.queue = true;
        } else if (k === 'game'){
          // play the minigames legitimately, if imperfectly
          const g = MG;
          if (!g) return;
          if (g.kind === 'cable'){
            if (g.side === 0){
              // walk the cursor to an unlinked left port, then confirm
              const want = g.left.findIndex(l => g.linked[l.i] < 0);
              if (want < 0) return;
              if (g.cur !== want) press.down = true; else press.use = true;
            } else {
              const L = g.left[g.pickL];
              const want = g.right.findIndex((r, j) => r.i === L.i && !g.linked.includes(j));
              if (want < 0) { press.use = true; return; }
              if (g.cur !== want) press.down = true; else press.use = true;
            }
          } else if (g.kind === 'pw'){
            const it = g.items[g.at];
            if (it) { if (it.ok) press.one = true; else press.two = true; }
          } else if (g.kind === 'jargon'){
            const r = g.rounds[g.at];
            if (r){ const i = r.opts.findIndex(o => o.ok); [press.one, press.two, press.three][0];
              if (i === 0) press.one = true; else if (i === 1) press.two = true; else press.three = true; }
          }
        }
        return;
      }

      // world: coffee when stressed, else drive the active ticket / queue
      if (G.state === 'work'){
        if (run.day !== M.daysSeen){ M.daysSeen = run.day; }
        // teleport-free navigation: walk toward marker or terminal via held keys
        const goal = run.marker || (run.queue.length ? (W2.anchors.TERMINAL || null) : null);
        if (run.stress > 70 && run.coffee < 3 && !run.marker){
          const c = W2.anchors.COFFEE;
          if (c) return walkToward(c);
        }
        if (goal){
          const near = Math.abs(player.tx - goal[0]) + Math.abs(player.ty - goal[1]) <= 1;
          if (!near) return walkToward(goal);
          if (run.marker) return;                 // gotoCheck will fire
          press.use = true;                       // terminal -> queue
          return;
        }
        // idle: wander a little so NPC pathing gets exercised
        const dirs = ['up','down','left','right'];
        const d = dirs[(Math.floor(run.clock) + player.tx) % 4];
        for (const k of dirs) held[k] = false;
        held[d] = true;
      }
    };
    window.walkToward = function(goal){
      for (const k of ['up','down','left','right']) held[k] = false;
      const dx = goal[0] - player.tx, dy = goal[1] - player.ty;
      // greedy with a wall-slide fallback
      const tryDirs = Math.abs(dx) > Math.abs(dy)
        ? [dx > 0 ? 'right' : 'left', dy > 0 ? 'down' : 'up']
        : [dy > 0 ? 'down' : 'up', dx > 0 ? 'right' : 'left'];
      const DV = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
      for (const d of tryDirs){
        const [ux, uy] = DV[d];
        if (!solidAt(player.tx + ux, player.ty + uy)){ held[d] = true; return; }
      }
      held[tryDirs[0]] = true;
    };
    // hook the driver into the real frame loop, and run extra fixed timesteps
    // per frame so a whole career fits in a test run. Same STEP, same sim —
    // just more of them, exactly as the accumulator does on a slow frame.
    const origLoop = window.loop;
    let n = 0;
    window.loop = function(t){
      try { if (++n % 3 === 0) window.__drive(); } catch(e){ window.__M.log.push('driver: ' + e.message); }
      const r = origLoop(t);
      const extra = (window.__M.speed || 1) - 1;
      for (let i = 0; i < extra; i++){
        try { sim(STEP); } catch(e){ window.__M.log.push('sim: ' + e.message); G.faults = (G.faults||0)+1; }
      }
      return r;
    };
  });

  // let it play: DAYS in-game days at 480 game-min each (1 min/sec) — but the
  // driver resolves tickets fast, so cap by wall clock too.
  const started = Date.now();
  let last = { day: 0, state: '' };
  while (Date.now() - started < DAYS * 30000) {
    await page.waitForTimeout(1000);
    const st = await page.evaluate(() => ({
      state: G.state, faults: G.faults || 0, day: run ? run.day : null,
      clock: run ? Math.round(run.clock) : null, q: run ? run.queue.length : null,
      stall: window.__M.stallTicks, modalTicks: window.__M.modalTicks,
      reviews: window.__M.reviews, log: window.__M.log.slice(),
      burn: run ? Math.round(run.burnout) : null
    }));
    if (st.day !== last.day || st.state !== last.state) {
      console.log(`  day ${st.day} ${st.state} clock=${st.clock} queue=${st.q} burnout=${st.burn}`);
      last = { day: st.day, state: st.state };
    }
    if (st.faults) { console.log('FAULTS', st.faults); break; }
    if (st.stall > 400) { console.log('STALL: state signature frozen for 400 driver ticks —', st.state); break; }
    if (st.modalTicks > 900) { console.log('MODAL TRAP: stuck in a modal for 900 driver ticks'); break; }
    if (st.state === 'over') { console.log('career over:', st.log.join(' ')); break; }
  }

  const fin = await page.evaluate(() => ({
    faults: G.faults || 0, state: G.state, day: run ? run.day : null,
    reviews: window.__M.reviews, log: window.__M.log,
    stall: window.__M.stallTicks, modalTicks: window.__M.modalTicks,
    // occupancy integrity: no two bodies in one cell, every body reserved
    occOk: (() => {
      if (!player) return 'no player';
      const seen = new Set(); let dup = 0, missing = 0;
      const bodies = [player, ...Object.values(npcs).filter(e => !e.hidden)];
      for (const b of bodies){
        const k = okey(b.tx, b.ty);
        if (seen.has(k)) dup++;
        seen.add(k);
        if (!occ.has(k)) missing++;
      }
      return { dup, missing, bodies: bodies.length, occSize: occ.size };
    })()
  }));
  console.log('FINAL', JSON.stringify(fin));
  console.log('page errors:', errors.length ? errors.join(' | ') : 0);
  const clean = !fin.faults && !errors.length && fin.stall <= 400 && fin.modalTicks <= 900 &&
                fin.occOk && !fin.occOk.dup && !fin.occOk.missing;
  console.log(clean ? 'MARATHON OK' : 'MARATHON ISSUES');
  await browser.close();
  process.exit(clean ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });

/* How long does a ticket ACTUALLY take at human pace? Drives real time (1
   game-min per real sec) through the real input path, with a player who reads
   every line, walks the office and plays the minigames properly — then checks
   the answer against the ticket's SLA.
   Usage: node tools/timing.js <index.html> [ticket-id,ticket-id,...]
   Exit 1 if any ticket cannot be finished inside its window. */
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base='/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x=>x.startsWith('chromium'))){
    const p=path.join(base,d,'chrome-linux','chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({executablePath:p}); } catch(_){} } }
  throw e; } }
(async()=>{
  const b=await launch(); const p=await b.newPage({viewport:{width:960,height:540}});
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('file://' + (process.argv[2] || '/home/user/managed/index.html'));
  await p.waitForFunction(()=>typeof G!=='undefined'&&typeof selfTest==='function');
  await p.keyboard.press('Space'); await p.waitForTimeout(200);

  const IDS = process.argv[3] ? process.argv[3].split(',')
    : ['coffee-derek','printer-jam','password-reset','conference-tv','quick-question',
       'shared-drive','fax-machine','onboard-newhire','cable-bin','label-printer'];
  const verdicts = [];
  for (const id of IDS){
    const res = await p.evaluate(async (tid) => {
      QUIET = true;
      newRun('JOB-TIME'); run.introDone = true; clockIn(); run.introDone = true;
      if (G.modal) closeModalToWork();
      run.pendingScenes = []; run.plan.events = [];
      const role = ROLES[run.rung];
      const a = makeArrival(tid, run.clock, role);
      run.queue.length = 0;
      run.queue.push({ uid:a.uid, id:a.id, title:a.title, fills:a.fills, at:run.clock,
        deadline: run.clock + a.sla, sla:a.sla, stress:a.stress, si:0, bonus:0,
        gameScores:[], from:TICKETS[tid].from || null });
      const t0 = run.clock, t = run.queue[0];
      startTicket(t);
      // a reasonably attentive player: reads each line, walks, plays properly
      const wait = ms => new Promise(r => setTimeout(r, ms));
      let guard = 0;
      while (run.queue.includes(t) && guard++ < 900){
        await wait(50);
        if (G.state === 'modal' && G.modal){
          /* a player lets go of the arrow keys when a panel opens */
          for (const kk of ['up','down','left','right']) held[kk] = false;
          const k = G.modal && G.modal.kind; if (!k) continue;
          if (k === 'dlg'){
            if (dlg && dlg.reveal < dlg.lines[dlg.li].length) continue;   // let it type out
            await wait(650);                                             // read it
            if (!dlg || !G.modal) continue;
            if (dlg.optsShown) press.one = true; else press.use = true;
          } else if (k === "game" && MG){
            await wait(220);                                             // think
            if (!MG || !G.modal) continue;
            if (MG.kind === 'cable'){
              if (MG.side === 0){
                const want = MG.left.findIndex(l => MG.linked[l.i] < 0);
                if (want < 0) continue;
                if (MG.cur !== want) press.down = true; else press.use = true;
              } else {
                const L = MG.left[MG.pickL];
                const want = MG.right.findIndex((r,j) => r.i === L.i && !MG.linked.includes(j));
                if (MG.cur !== want) press.down = true; else press.use = true;
              }
            } else if (MG.kind === 'pw'){
              const it = MG.items[MG.at]; if (it) (it.ok ? press.one = true : press.two = true);
            } else if (MG.kind === 'jargon'){
              const r = MG.rounds[MG.at];
              if (r){ const i = r.opts.findIndex(o=>o.ok); [press.one,press.two,press.three]; 
                if (i===0) press.one=true; else if (i===1) press.two=true; else press.three=true; }
            }
          }
        } else if (G.state === 'work' && run.marker){
          /* Walk the game's OWN A* path, one step at a time, through the real
             held-key latches. A greedy walker wedges on the office furniture
             and every goto ticket timed out at the guard instead of being
             measured — this models a player who knows the floor, which is who
             the SLA is for. */
          const [mx,my] = run.marker;
          for (const kk of ['up','down','left','right']) held[kk] = false;
          if (player.tx === mx && player.ty === my) continue;
          /* The game's A* ignores entity occupancy, so it happily routes
             through a coworker who is sitting at their desk all morning and
             will never move. A player walks AROUND them. BFS that treats
             occupied cells as walls, and only fall back to the raw A* step if
             no clear route exists at all. */
          const key = (x,y) => x + ',' + y;
          const goalAdj = (x,y) => Math.abs(x-mx) + Math.abs(y-my) <= 1;
          const seen = new Set([key(player.tx, player.ty)]);
          let frontier = [[player.tx, player.ty, null]], found = null;
          for (let d = 0; d < 900 && frontier.length && !found; d++){
            const [cx, cy, first] = frontier.shift();
            for (const [ddx,ddy] of [[1,0],[-1,0],[0,1],[0,-1]]){
              const nx2 = cx+ddx, ny2 = cy+ddy, k2 = key(nx2,ny2);
              if (seen.has(k2)) continue;
              if (solidAt(nx2,ny2)) continue;
              if (entAt(nx2,ny2) && !(nx2===player.tx && ny2===player.ty)) continue;
              seen.add(k2);
              const step0 = first || [nx2,ny2];
              if (goalAdj(nx2,ny2)){ found = step0; break; }
              frontier.push([nx2,ny2,step0]);
            }
          }
          let next = found;
          if (!next){
            const path = astar(player.tx, player.ty, mx, my);
            next = path && path.length && !entAt(path[0][0], path[0][1]) ? path[0] : null;
          }
          if (!next) continue;
          const dx = next[0] - player.tx, dy = next[1] - player.ty;
          if (dx > 0) held.right = true; else if (dx < 0) held.left = true;
          else if (dy > 0) held.down = true; else if (dy < 0) held.up = true;
        }
      }
      for (const kk of ['up','down','left','right']) held[kk] = false;
      QUIET = false;
      return { id: tid, sla: t.sla, took: Math.round(run.clock - t0), done: !run.queue.includes(t) };
    }, id);
    const pct = Math.round(res.took / res.sla * 100);
    console.log(`${res.id.padEnd(16)} SLA ${String(res.sla).padStart(3)}m · took ${String(res.took).padStart(3)}m` +
      ` = ${String(pct).padStart(3)}% of the window ` +
      (!res.done ? 'DID NOT FINISH' : pct < 70 ? 'OK' : pct < 100 ? 'TIGHT' : 'IMPOSSIBLE'));
    verdicts.push({ id: res.id, pct, done: res.done });
  }
  const broken = verdicts.filter(v => !v.done || v.pct >= 100);
  const tight  = verdicts.filter(v => v.done && v.pct >= 70 && v.pct < 100);
  console.log(`\n${verdicts.length} tickets · ${broken.length} unplayable · ${tight.length} tight`);
  console.log(broken.length ? 'TIMING FAILED: ' + broken.map(v=>v.id).join(', ') : 'TIMING OK');
  await b.close();
  process.exit(broken.length ? 1 : 0);
})().catch(e=>{ console.error('HARNESS ERROR', e); process.exit(2); });

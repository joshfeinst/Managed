/* Managed board-difficulty sweep: what does each minigame actually SCORE?
 *
 * The career bots never play a board — simDay synthesises a craft score from
 * the skill dial — so six new boards shipped with no difficulty data at all.
 * Every invariant on them proves perfect play scores 1.0, which says nothing
 * about whether a person can get there.
 *
 * This drives each board through three policies and reports the spread:
 *   PERFECT   plays the known-right answer every time
 *   CARELESS  plays the first legal move, always
 *   RANDOM    picks uniformly from what is on offer
 *
 * A board where CARELESS scores near PERFECT has no game in it. One where
 * PERFECT cannot reach 1.0 is broken. RANDOM is the floor a player who has not
 * read the card starts from.
 *
 *   node tools/boards.js /abs/path/index.html [rounds=40]
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
const N = +(process.argv[3] || 40);
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium'))){
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)) { try { return await chromium.launch({ executablePath:p }); } catch(_){} }
  }
  throw e; } }

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await page.goto('file://' + target);
  await page.waitForFunction(() => typeof GAMES !== 'undefined');

  const out = await page.evaluate(({ N }) => {
    SAVE_SUSPEND = true; QUIET = true;
    /* Each board gets a driver per policy. A driver takes the live state and
       performs ONE move; the runner loops it until the board finishes. */
    const DRIVE = {
      /* ---- the five original boards ---------------------------------------
         Added after the sweep found a shallow-copy bug in one of the six new
         ones. These have been through human playtest waves, which is why they
         were not first, and is not a reason to leave them unmeasured. */
      cable: {
        /* the cursor has to STEP PAST a cable it has already plugged, or the
           driver picks the same one forever and the board never terminates —
           which is what happened, 0 of 40 finished, and it was the harness
           that was wrong, not the board */
        perfect: g => {
          if (g.side === 0){
            let i = g.left.findIndex(l => g.linked[l.i] < 0);
            if (i < 0) return;
            g.cur = i; g.pickL = i; g.side = 1; g.cur = 0; return;
          }
          const Lc = g.left[g.pickL];
          const want = g.right.findIndex(r => r.i === Lc.i);
          g.cur = want;
          if (!g.linked.includes(want)){
            g.linked[Lc.i] = want; g.side = 0; g.cur = g.pickL; g.pickL = -1;
          }
        },
        /* plugs the first free port it sees, whether or not it is the right one */
        careless: g => {
          if (g.side === 0){
            let i = g.left.findIndex(l => g.linked[l.i] < 0);
            if (i < 0) return;
            g.pickL = i; g.side = 1; g.cur = 0; return;
          }
          const Lc = g.left[g.pickL];
          let port = -1;
          for (let i = 0; i < g.n; i++) if (!g.linked.includes(i)){ port = i; break; }
          if (port < 0) return;
          if (Lc.i !== g.right[port].i) g.mistakes++;
          /* it is still holding the cable after a wrong port, so it takes the
             right one next — the mistake is already on the board */
          const want = g.right.findIndex(r => r.i === Lc.i);
          g.linked[Lc.i] = want; g.side = 0; g.cur = g.pickL; g.pickL = -1;
        },
        random: g => {
          if (g.side === 0){
            let i = g.left.findIndex(l => g.linked[l.i] < 0);
            if (i < 0) return;
            g.pickL = i; g.side = 1; g.cur = 0; return;
          }
          const Lc = g.left[g.pickL];
          const port = Ri('game', g.n);
          if (g.linked.includes(port) || Lc.i !== g.right[port].i) g.mistakes++;
          const want = g.right.findIndex(r => r.i === Lc.i);
          g.linked[Lc.i] = want; g.side = 0; g.cur = g.pickL; g.pickL = -1;
        }
      },
      pw: {
        /* PERFECT is judging each one correctly — approving the clean ones AND
           rejecting the broken ones. Crediting only the approvals made the
           perfect driver into the careless one, and the board read 47/47/53
           as though it had no game in it. */
        perfect:  g => { g.right++; g.at++; },
        careless: g => { if (g.items[g.at].ok) g.right++; g.at++; },   // approves everything
        random:   g => { const guess = Ri('game', 2) === 0;
          if (guess === g.items[g.at].ok) g.right++; g.at++; }
      },
      jargon: {
        perfect:  g => { g.right++; g.at++; },
        careless: g => { if (g.rounds[g.at].opts[0].ok) g.right++; g.at++; },   // always the first
        random:   g => { const j = Ri('game', 3);
          if (g.rounds[g.at].opts[j].ok) g.right++; g.at++; }
      },
      blast: {
        perfect:  g => { g.all.forEach(nd => { if (nd.hits && !nd.group) nd.marked = true; });
          g.applied = true; },
        careless: g => { g.all.forEach(nd => { if (!nd.group) nd.marked = true; });
          g.applied = true; },
        random:   g => { g.all.forEach(nd => { if (!nd.group && Ri('game',2)) nd.marked = true; });
          g.applied = true; }
      },
      script: {
        /* driven through the board's own cards() and play(), not by poking its
           state — the scoring reads turns, lies and resolved together, and a
           driver that sets them by hand is measuring itself */
        /* Half the marks are the script and half are the call, so firing the
           fix the moment it arms throws away every box still unbanked — which
           is what the first driver did, and it read 76% as if the board were
           unwinnable. Bank everything first, then resolve. A box the caller
           has already answered still counts as banked and costs one lie, and
           with four boxes that trade is worth taking: +0.125 of the script
           half against -0.075 of the call half. */
        perfect: g => {
          const cs = g.cards();
          const j = cs.findIndex(c => c.k === 'qa');
          if (j >= 0){ g.play(j); return; }
          g.play(cs[3].armed ? 3 : 2);       // stall until it arms, then say it
        },
        careless: g => { g.play(0); },
        random: g => { g.play(Ri('game', 4)); }
      },
      subnet: {
        perfect: g => { const s = g.sites[g.at]; if (s) g.cur = SUBNET_PREFIXES.indexOf(s.want); g.take(); },
        careless: g => { g.cur = 0; g.take(); },
        random: g => { g.cur = Ri('game', SUBNET_PREFIXES.length); g.take(); }
      },
      quote: {
        /* exact, not greedy: the board now scores against the best quote that
           fits, so the driver has to find that quote or it measures itself */
        perfect: g => {
          let best = -1, bestPick = null;
          (function search(i, spend, val, pick){
            if (spend > g.budget) return;
            if (i === g.rows.length){ if (val > best){ best = val; bestPick = pick.slice(); } return; }
            for (let t = 0; t < 3; t++){
              g.rows[i].pick = t;
              search(i + 1, spend + g.rows[i].cost[t], val + quoteLineValue(g.rows[i]), pick.concat(t));
            }
          })(0, 0, 0, []);
          if (bestPick) g.rows.forEach((r, i) => r.pick = bestPick[i]);
          g.send(); },
        careless: g => { g.rows.forEach(r => r.pick = 0); g.send();
          if (!g.submitted){ g.rows.forEach(r => r.pick = 2); g.send(); } },
        random: g => { g.rows.forEach(r => r.pick = Ri('game', 3)); g.send();
          if (!g.submitted){ g.rows.forEach(r => r.pick = 2); g.send(); } }
      },
      keep: {
        perfect: g => {
          /* search for a selection that gets all three home, then play it */
          if (!g._plan){
            const out2 = [];
            const walk = (i, ch) => { if (out2.length) return;
              if (ch.length === g.picks){ let c=5,t=5,m=5;
                for (const k of ch){ c+=g.hand[k].fx.c; t+=g.hand[k].fx.t; m+=g.hand[k].fx.m; }
                if (c>=g.goal&&t>=g.goal&&m>=g.goal) out2.push(ch.slice()); return; }
              if (i >= g.hand.length) return;
              walk(i+1, ch.concat(i)); walk(i+1, ch); };
            walk(0, []); g._plan = out2[0] || [];
          }
          const j = g._plan.shift(); if (j === undefined){ g.left = 0; return; }
          g.cur = j; g.play();
        },
        careless: g => { const j = g.hand.findIndex(h => !h.done);
          if (j < 0){ g.left = 0; return; } g.cur = j; g.play(); },
        random: g => { const live = g.hand.map((h,i)=>h.done?-1:i).filter(i=>i>=0);
          if (!live.length){ g.left = 0; return; }
          g.cur = live[Ri('game', live.length)]; g.play(); }
      },
      diagram: {
        perfect: g => { g.spofs.forEach(i => g.marked.add(i)); g.submitted = true; },
        careless: g => { for (let i=1;i<g.nodes.length;i++) g.marked.add(i); g.submitted = true; },
        random: g => { for (let i=1;i<g.nodes.length;i++) if (Ri('game',2)) g.marked.add(i);
          g.submitted = true; }
      },
      paper: {
        perfect: g => { const q = g.qs[g.at];
          const j = g.hand.findIndex(c => !c.used && q.ev && c.t === q.ev);
          if (j < 0) g.concede(); else { g.cur = j; g.cite(); } },
        careless: g => { const j = g.hand.findIndex(c => !c.used);
          if (j < 0) g.concede(); else { g.cur = j; g.cite(); } },
        random: g => { if (Ri('game',3) === 0){ g.concede(); return; }
          const live = g.hand.map((h,i)=>h.used?-1:i).filter(i=>i>=0);
          if (!live.length){ g.concede(); return; }
          g.cur = live[Ri('game', live.length)]; g.cite(); }
      },
      weekend: {
        perfect: g => {
          const load = g.staff.map(()=>0);
          const walk = at => { if (at >= g.tasks.length) return true;
            for (let p=0;p<g.staff.length;p++){
              if (!g.staff[p].skills.includes(g.tasks[at].s)) continue;
              if (load[p] + g.tasks[at].w > g.staff[p].cap) continue;
              load[p] += g.tasks[at].w; g.tasks[at].to = p;
              if (walk(at+1)) return true;
              load[p] -= g.tasks[at].w; g.tasks[at].to = -1; }
            return false; };
          if (!walk(0)) g.tasks.forEach(t => { if (t.to < 0) t.to = g.staff.length; });
          g.send(); },
        careless: g => { g.tasks.forEach(t => t.to = 0); g.send(); },
        random: g => { g.tasks.forEach(t => t.to = Ri('game', g.staff.length + 1)); g.send(); }
      }
    };
    const rows = [];
    for (const id of Object.keys(DRIVE)){
      const res = {};
      for (const pol of ['perfect','careless','random']){
        let sum = 0, done = 0;
        for (let i = 0; i < N; i++){
          rngInit('BD-' + id + '-' + i);
          const g = GAMES[id].init(2);
          for (let step = 0; step < 60 && !g.finished; step++){
            DRIVE[id][pol](g);
            g.flash = 0; g.step(0);
          }
          if (g.finished){ sum += g.score; done++; }
        }
        res[pol] = done ? sum / done : null;
        res[pol + 'N'] = done;
      }
      rows.push({ id, ...res });
    }
    return rows;
  }, { N });

  const p = v => v === null ? '  --' : (v*100).toFixed(0).padStart(3) + '%';
  console.log('BOARD DIFFICULTY — ' + N + ' rounds each, difficulty 2\n');
  console.log('  board      perfect  careless  random |  gap  | finished');
  let bad = 0;
  for (const r of out){
    const gap = (r.perfect !== null && r.careless !== null)
      ? Math.round((r.perfect - r.careless) * 100) : 0;
    const flat = gap < 20;
    const unwinnable = r.perfect === null || r.perfect < .95;
    if (flat || unwinnable) bad++;
    console.log('  ' + r.id.padEnd(10) + p(r.perfect) + '    ' + p(r.careless) +
      '     ' + p(r.random) + ' | ' + String(gap).padStart(4) + '  | ' +
      r.perfectN + '/' + N +
      (unwinnable ? '   PERFECT PLAY CANNOT FINISH IT' : flat ? '   CARELESS PLAY IS TOO CLOSE' : ''));
  }
  console.log('\n  perfect play must reach ~100%. careless must not come within 20 points of it,');
  console.log('  or the board has no game in it. random is where an unread card starts you.');
  console.log(bad ? '\n' + bad + ' BOARD(S) NEED WORK' : '\nALL BOARDS DISCRIMINATE');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();

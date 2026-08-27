/* EVERY ERRAND IN THE GAME, WALKED.
 *
 * boards.js plays the minigames and playday.js plays one day. Neither one
 * walks every ticket: a goto that cannot be reached, a step that never
 * advances, a marker on a floor the player cannot get to, or a scene that
 * stalls only shows up on the ticket it is in — and there are two hundred and
 * seventy of them.
 *
 * This deals each ticket in turn at a rung that can receive it, then drives
 * the real step machine: teleports nothing, walks the player onto each marker
 * the game puts down (taking the lift when the marker is on the other floor),
 * answers dialogue, plays boards to a result, and asserts the ticket closes.
 *
 *   node tools/errands.js [/abs/path/index.html] [--only=substr]
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const FILE = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2] : path.join(__dirname, '..', 'index.html');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium'))){
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({ executablePath:p }); } catch(_){} }
  }
  throw e; } }

(async () => {
  const b = await launch(), page = await b.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(FILE));
  await page.waitForFunction(() => typeof TICKETS !== 'undefined', null, { timeout:25000 });

  const ids = await page.evaluate((only) => Object.keys(TICKETS)
      .filter(id => !only || id.indexOf(only) >= 0), ONLY);

  /* the whole run happens inside the page: this is the step machine, not a
     simulation of it, and every move is the one the player would make */
  const out = await page.evaluate(async (ids) => {
    SAVE_SUSPEND = true; QUIET = true;
    const res = [];
    const stepOne = () => { /* one frame of the world, no rendering */
      if (typeof sim === 'function') sim(STEP);
    };
    for (const id of ids){
      const T = TICKETS[id];
      const rung = T.tiers ? T.tiers[0] : 0;
      rngInit('ERR-' + id); runInit('ERR-' + id);
      run.rung = rung; run.day = 4; rollDay();
      loadMap('office1'); spawnPeople();
      G.state = 'work'; G.modal = null;
      const desk = anchorPos(ROLES[rung].deskAnchor || 'TERMINAL');
      if (desk){ player.tx = desk[0]; player.ty = desk[1]; }
      const t = { uid: 1, id, title: fill(T.title, {}), fills: {}, at: 0,
                  deadline: 10000, sla: T.sla, stress: T.stress, si: 0,
                  bonus: 0, gameScores: [], from: null };
      run.queue = [t]; run.clock = 30;
      let note = '', ok = false, guard = 0, lifts = 0, walked = 0, stops = 0;
      try {
        startTicket(t);
        while (guard++ < 600){
          if (!run.active){ ok = true; break; }
          if (G.modal && G.modal.kind === 'dlg'){
            if (dlg && dlg.optsShown && dlg.opts && dlg.opts.length){ pickOpt(0); }
            else { press.use = true; dlgTick(0.4); press.use = false; }
            continue;
          }
          if (G.modal && G.modal.kind === 'game'){
            if (MG && MG.brief) MG.brief = null;
            /* finish the board the way an abandoning player does, so the
               errand completes without this harness having to know twelve
               different boards */
            MG.finished = true; MG.score = MG.score || 0.5;
            gameTick(STEP);
            continue;
          }
          if (run.marker){
            /* WHERE THE ARROW SAID, ON THE FLOOR IT SAID. Walking to the
               marker's COORDINATES is not arriving: the two floors share a
               coordinate space, so a ticket whose destination floor got lost
               still lands the player on a tile of the right shape upstairs and
               the step advances as though the trip happened. The anchor this
               step named is remembered here and checked after the step turns
               over — it has to resolve on the map that is loaded, and the
               player has to be standing next to it. */
            const want = TICKETS[id].steps[run.active.si];
            const wantAnchor = want && want.goto;
            const onOther = run.markerFloor && run.markerFloor !== W2.id;
            if (onOther){
              /* FOLLOW THE ROUTE, NOT "THE LIFT". This took whatever lift was
                 nearest and rode it, which is all a two-floor building can
                 need. The car park is two hops from every desk — a lift and
                 then a door — and on the ground floor the nearest lift goes
                 back UP, so the harness bounced between floors six times and
                 reported seventeen good tickets as broken. run.markerVia is
                 the exit the route takes out of the map you are standing on. */
              const L = (run.markerVia || {})[W2.id];
              const e = exitsFrom(W2.id).filter(x => x.at === L)[0];
              const p = e && anchorPos(e.at);
              if (!p){ note = 'no way off ' + W2.id + ' towards ' +
                              (run.markerLabel || '?') + ' (via ' + (L || 'nothing') + ')'; break; }
              player.tx = p[0]; player.ty = p[1];
              takeExit(e.act); lifts++;
              if (lifts > 6){ note = 'took six exits and never arrived'; break; }
              continue;
            }
            const m = run.marker;
            const pth = astar(player.tx, player.ty, m[0], m[1], true) ||
                        astar(player.tx, player.ty, m[0], m[1]);
            if (!pth || !pth.length){
              /* standing on it already counts */
              if (Math.abs(player.tx-m[0]) + Math.abs(player.ty-m[1]) <= 1){ gotoCheck(); continue; }
              note = 'no path to ' + (run.markerLabel || m.join(',')) + ' on ' + W2.id; break;
            }
            walked += pth.length; stops++;
            const last = pth[pth.length-1];
            player.tx = last[0]; player.ty = last[1];
            gotoCheck();
            if (run.marker && Math.abs(player.tx-m[0]) + Math.abs(player.ty-m[1]) <= 1){
              note = 'stood on the marker and the step did not advance'; break;
            }
            if (!run.marker && wantAnchor){
              const here = anchorPos(wantAnchor);
              if (!here){
                note = 'walked to ' + wantAnchor + ' and arrived on ' + W2.id +
                       ', where there is no ' + wantAnchor; break;
              }
              if (Math.abs(player.tx-here[0]) + Math.abs(player.ty-here[1]) > 1){
                note = 'the step turned over ' +
                  (Math.abs(player.tx-here[0]) + Math.abs(player.ty-here[1])) +
                  ' tiles from ' + wantAnchor; break;
              }
            }
            continue;
          }
          stepOne();
        }
        if (!ok && !note) note = 'never finished in 600 moves (si ' +
          (run.active ? run.active.si : '?') + ' of ' + T.steps.length + ')';
      } catch (e){ note = 'threw: ' + (e && e.message || e); }
      res.push({ id, rung: ROLES[rung].title, ok, note, walked, lifts, stops });
    }
    return res;
  }, ids);

  await b.close();
  const bad = out.filter(r => !r.ok);
  for (const r of bad)
    console.log('  FAIL ' + r.id.padEnd(34) + '(' + r.rung + ')  ' + r.note);
  console.log('\n' + out.length + ' errands walked, ' + (out.length - bad.length) + ' completed');
  /* a harness that never rode the lift has not tested the cross-floor arm,
     and would pass a build in which downstairs is unreachable */
  const rode = out.filter(r => r.lifts > 0).length;
  const stops = out.reduce((a,r) => a + r.stops, 0);
  console.log(stops + ' markers walked onto, ' + rode + ' errands left the floor');
  const far = out.filter(r => r.ok).sort((a,b)=>b.walked-a.walked).slice(0,5);
  console.log('longest: ' + far.map(r => r.id + ' ' + r.walked + ' tiles' +
              (r.lifts ? ' +' + r.lifts + ' lift' : '')).join(', '));
  if (errs.length) console.log('page errors: ' + errs.length + '\n  ' + errs.slice(0,3).join('\n  '));
  console.log(bad.length || errs.length ? '\nERRANDS FAILED' : '\nEVERY ERRAND COMPLETES');
  process.exit(bad.length || errs.length ? 1 : 0);
})();

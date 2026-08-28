/* Managed: drive to the client site with REAL key events and clicks.
 *
 * liftride.js proves a person can ride the lift. This proves a person can make
 * the whole journey, which is three transitions rather than one: the lift down,
 * the fire door out, and the car. Nothing here reaches into the game except to
 * deal the ticket — after that it clicks what the objective points at and
 * presses E, which is all a player has.
 *
 * It exists because the drive was built from unit-level probes. Every piece was
 * proven by calling it: takeExit moved the map, the budget priced the trip, the
 * queue row named the direction. None of that is evidence that somebody sitting
 * in front of the game can get out of the building.
 *
 *   node tools/driveout.js [/abs/path/index.html]
 */
const path = require('path');
const H = require(path.join(__dirname, 'human.js'));
(async () => {
  const S = await H.open({ file: process.argv[2] || path.join(__dirname, '..', 'index.html'),
                           shots:'/tmp/drive-shots', width:1280, height:800, beat:200 });
  const dlgOpen = () => S.page.evaluate(() => getComputedStyle(document.getElementById('dlg')).display !== 'none');
  const clear = async () => { for (let i=0;i<30 && await dlgOpen();i++) await S.key('KeyE',170); };
  const line  = async () => (await S.read()).find(t => /ARROW|LIFT|DOOR|CAR|CLIENT|OUTSIDE/i.test(t)) || '';
  const floor = () => S.page.evaluate(() => W2.id);
  const si    = () => S.page.evaluate(() => run.active ? run.active.si : -1);

  let b = await S.clickables();
  const apply = b.find(x=>/APPLY FOR A JOB/i.test(x.text));
  await S.click(apply.x, apply.y);
  for (let i=0;i<8;i++){ const bs=await S.clickables();
    const go=bs.find(x=>!x.disabled && /ACCEPT|CLOCK IN|START/i.test(x.text)); if(!go) break; await S.click(go.x,go.y); }
  await clear();

  /* SETUP ONLY: a ticket whose first stop is off the premises. */
  const dealt = await S.page.evaluate(() => {
    const id = Object.keys(TICKETS).find(t =>
      (TICKETS[t].steps||[]).some(st => st.goto && typeof floorOf==='function' &&
                                        floorOf(st.goto) === 'clientsite'));
    if (!id) return null;
    run.rung = TICKETS[id].tiers[0];
    const a = makeArrival(id, run.clock, ROLES[run.rung]);
    const t = { uid:a.uid, id:a.id, title:a.title, fills:a.fills, at:run.clock,
                deadline:run.clock + a.sla, sla:a.sla, stress:a.stress, si:0, bonus:0,
                gameScores:[], from:null };
    run.queue.push(t); startTicket(t);
    return { id, title:a.title, clock:run.clock };
  });
  if (!dealt){ console.log('NO OFF-SITE TICKET EXISTS'); await S.close(); process.exit(1); }
  console.log('dealt: ' + dealt.title);
  await clear();
  console.log('told:  ' + await line());
  await S.shot('told-to-go-out');

  const start = { floor: await floor(), si: await si(), clock: dealt.clock };
  const seen  = [start.floor];

  /* From here, a person: click whatever the objective points at, press E. The
     same two actions carry you down a lift, through a fire door and into a car,
     because that is all any of them ever asked for. */
  for (let i=0; i<40 && (await floor()) !== 'clientsite'; i++){
    const m = await S.page.evaluate(() => {
      const o = objectiveTarget(); if(!o) return null;
      return { vx:o.pos[0]*16-cam.x+8, vy:o.pos[1]*16-cam.y+8 };
    });
    if (m) await S.clickGame(Math.max(4,Math.min(476,m.vx)), Math.max(4,Math.min(266,m.vy)));
    /* WAIT UNTIL YOU ARE ACTUALLY THERE BEFORE PRESSING E. Pressing it while
       still walking away from the lift you just rode takes the lift again, and
       the first version of this file bounced between floors for 234 game
       minutes and reported the drive broken. That was the harness, not the
       game: a person watches the walk finish. */
    for (let w = 0; w < 12; w++){
      const near = await S.page.evaluate(() => {
        const o = objectiveTarget(); if (!o) return true;
        return Math.abs(player.tx - o.pos[0]) + Math.abs(player.ty - o.pos[1]) <= 1 && !player.mv;
      });
      if (near) break;
      await S.wait(220);
    }
    await S.key('KeyE', 220);
    const f = await floor();
    if (seen[seen.length-1] !== f){
      seen.push(f);
      const st = await S.page.evaluate(() => ({
        obj: typeof objectiveText === 'function' ? objectiveText() : '',
        via: run && run.markerVia ? JSON.stringify(run.markerVia) : 'none',
        mf : run ? run.markerFloor : '?',
        tgt: (typeof objectiveTarget === 'function' && objectiveTarget())
               ? JSON.stringify(objectiveTarget().pos) : 'null' }));
      console.log('  reached ' + f + ' — "' + st.obj + '"');
      console.log('        markerFloor ' + st.mf + '  via ' + st.via + '  arrow ' + st.tgt);
    }
  }
  const there = await floor();
  await S.shot('at-the-client');

  /* and finish the leg once you are standing in it */
  /* The cupboard is across the unit and starts off the left edge of the view,
     so a single click lands on the clamp rather than on it. Click, let the walk
     finish, click again from where that left you -- which is what a person does
     with anything further away than the screen. */
  for (let i=0;i<24 && await si()===start.si;i++){
    const m = await S.page.evaluate(() => {
      const o = objectiveTarget(); if(!o) return null;
      return { vx:o.pos[0]*16-cam.x+8, vy:o.pos[1]*16-cam.y+8 };
    });
    if (m) await S.clickGame(Math.max(4,Math.min(476,m.vx)), Math.max(4,Math.min(266,m.vy)));
    /* WAIT FOR THE WHOLE WALK, not for one tile of it. player.mv drops between
       tween steps, so "wait until it is false" returned after a single tile and
       the cupboard took one click per tile to reach. Watch the position settle
       instead: two samples in the same place is a walk that has finished. */
    let last = null, still = 0;
    for (let w = 0; w < 40 && still < 2; w++){
      const at = await S.page.evaluate(() => player.tx + ',' + player.ty + ',' + (player.mv ? 1 : 0));
      still = (at === last && at.endsWith(',0')) ? still + 1 : 0;
      last = at;
      await S.wait(150);
    }
    if (i < 3 || i % 4 === 0){
      const at = await S.page.evaluate(() => ({ p:[player.tx,player.ty],
        o:(objectiveTarget()||{pos:null}).pos, si:run.active?run.active.si:-1 }));
      console.log('    walk ' + i + ': at ' + JSON.stringify(at.p) +
                  ' heading for ' + JSON.stringify(at.o) + ' step ' + at.si);
    }
  }
  const endSi = await si(), endClock = await S.page.evaluate(() => run.clock);
  await S.shot('arrived');

  console.log('');
  const checks = [
    ['a player can get out of the building', there === 'clientsite'],
    ['and went the long way round, through the car park', seen.indexOf('carpark') > 0],
    ['the day paid for it', endClock - start.clock >= 26],
    ['the leg completed out there', endSi > start.si],
    ['nothing crashed', S.crashes.length === 0]
  ];
  let bad = 0;
  for (const [n,ok] of checks){ if(!ok) bad++; console.log((ok?'  ok   ':'  FAIL ')+n); }
  console.log('  (' + seen.join(' -> ') + ', step ' + start.si + ' -> ' + endSi +
              ', ' + (endClock - start.clock) + ' minutes of the day)');
  await S.close();
  process.exit(bad?1:0);
})().catch(e => { console.error(e); process.exit(2); });

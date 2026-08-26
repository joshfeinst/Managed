/* Managed: ride the lift with REAL key events and clicks.
 *
 * The self-test proves the pieces are wired to each other by calling them.
 * This proves a person can do it: it deals a ticket whose first stop is
 * downstairs (setup, scripted) and then does nothing but click and press keys.
 *
 * It exists because pressing E at the lift used to do nothing unless you had
 * walked in facing the doors, and every harness in this repo was blind to it —
 * the marker was right, the objective line was right, and the ride never
 * happened. Reverting that fix makes this file click the lift twelve times,
 * press E twelve times, and stay on floor two, which is exactly what a player
 * would have done.
 *
 *   node tools/liftride.js
 */
const path = require('path');
const H = require(path.join(__dirname, 'human.js'));
(async () => {
  const S = await H.open({ file: process.argv[2] || path.join(__dirname, '..', 'index.html'), shots:'/tmp/lift-shots',
                           width:1280, height:800, beat:200 });
  const dlgOpen = () => S.page.evaluate(() => getComputedStyle(document.getElementById('dlg')).display !== 'none');
  const clear = async () => { for (let i=0;i<30 && await dlgOpen();i++) await S.key('KeyE',170); };
  const line = async () => (await S.read()).find(t => /ARROW|LIFT|PRESS|WAITING/i.test(t)) || '';

  let b = await S.clickables();
  await S.click(b.find(x=>/APPLY FOR A JOB/i.test(x.text)).x, b.find(x=>/APPLY FOR A JOB/i.test(x.text)).y);
  for (let i=0;i<8;i++){ const bs=await S.clickables();
    const go=bs.find(x=>!x.disabled && /ACCEPT|CLOCK IN|START/i.test(x.text)); if(!go) break; await S.click(go.x,go.y); }
  await clear();

  /* SETUP ONLY: hand the player a ticket whose first stop is downstairs. */
  const dealt = await S.page.evaluate(() => {
    const id = Object.keys(TICKETS).find(t =>
      (TICKETS[t].steps||[]).some(st => st.goto && typeof floorOf==='function' && floorOf(st.goto) === 'ground'));
    if (!id) return null;
    run.rung = TICKETS[id].tiers[0];
    const a = makeArrival(id, run.clock, ROLES[run.rung]);
    const t = { uid:a.uid, id:a.id, title:a.title, fills:a.fills, at:run.clock,
                deadline:run.clock + a.sla, sla:a.sla, stress:a.stress, si:0, bonus:0,
                gameScores:[], from:null };
    run.queue.push(t); startTicket(t);
    return { id, title:a.title };
  });
  if (!dealt){ console.log('NO CROSS-FLOOR TICKET EXISTS'); await S.close(); process.exit(1); }
  console.log('dealt: ' + dealt.title);
  await clear();
  console.log('objective: ' + await line());
  await S.shot('told-to-take-the-lift');

  /* From here, a person. Click the lift, then press E — whatever way we ended
     up facing, which is the whole point. */
  const floor = () => S.page.evaluate(() => W2.id);
  const si    = () => S.page.evaluate(() => run.active ? run.active.si : -1);
  const before = { floor: await floor(), si: await si() };

  for (let i=0;i<12 && await floor()===before.floor;i++){
    const m = await S.page.evaluate(() => {
      const o = objectiveTarget(); if(!o) return null;
      return { vx:o.pos[0]*16-cam.x+8, vy:o.pos[1]*16-cam.y+8 };
    });
    if (m) await S.clickGame(Math.max(4,Math.min(476,m.vx)), Math.max(4,Math.min(266,m.vy)));
    await S.wait(700);
    await S.key('KeyE', 250);
  }
  const afterFloor = await floor();
  console.log('objective now: ' + await line());
  await S.shot('after-the-lift');

  /* walk to the marker down there and finish the leg */
  for (let i=0;i<12 && await si()===before.si;i++){
    const m = await S.page.evaluate(() => {
      const o = objectiveTarget(); if(!o) return null;
      return { vx:o.pos[0]*16-cam.x+8, vy:o.pos[1]*16-cam.y+8 };
    });
    if (m) await S.clickGame(Math.max(4,Math.min(476,m.vx)), Math.max(4,Math.min(266,m.vy)));
    await S.wait(700);
  }
  const afterSi = await si();
  await S.shot('arrived');
  console.log('');
  const checks = [
    ['the lift actually changed floor', before.floor==='office1' && afterFloor==='ground'],
    ['and the leg completed down there', afterSi > before.si],
    ['nothing crashed', S.crashes.length===0]
  ];
  let bad=0;
  for (const [n,ok] of checks){ if(!ok) bad++; console.log((ok?'  ok   ':'  FAIL ')+n); }
  console.log('  (floor ' + before.floor + ' -> ' + afterFloor + ', step ' + before.si + ' -> ' + afterSi + ')');
  await S.close();
  process.exit(bad?1:0);
})().catch(e => { console.error(e); process.exit(2); });

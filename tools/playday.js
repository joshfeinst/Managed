/* Managed: play a whole day, and look at every screen it puts up.
 *
 * firstday.js proves the first ninety seconds hang together. This goes past
 * them: it takes the ticket, follows the marker to wherever the ticket sends
 * it, answers the dialogue, plays whatever board appears, and keeps going
 * until the day ends — screenshotting each beat and printing only what a
 * person could actually read.
 *
 * It follows the objective ARROW rather than a route, by clicking on the
 * marker the way a player does, so it goes wherever the game points instead
 * of wherever I assumed.
 *
 *   node tools/playday.js [/abs/path/index.html] [seconds]
 */
const H = require('./human.js');
const path = require('path');

const target = process.argv[2] || path.join(__dirname, '..', 'index.html');
const BUDGET = +(process.argv[3] || 240) * 1000;

(async () => {
  const S = await H.open({ file: target, shots: '/tmp/playday-shots',
                           width: 1280, height: 800, beat: 160 });
  const notes = [];
  const say = (s) => { console.log(s); notes.push(s); };

  const dlgOpen  = () => S.page.evaluate(() => getComputedStyle(document.getElementById('dlg')).display !== 'none');
  const tixOpen  = () => S.page.evaluate(() => getComputedStyle(document.getElementById('tix')).display !== 'none');
  /* the objective line and the marker toast are the game's instructions */
  const objLine  = async () => (await S.read()).find(t => /ARROW|PRESS|TAKE THE LIFT|WAITING|QUEUE CLEAR|YOUR DESK/i.test(t)) || '';
  /* THE CLOCK BELONGS ON EVERY BEAT. Without it the log says the banner read
     "NOTHING IN IT YET" for fifteen beats and cannot say whether that was
     fifteen seconds or an hour of the player's morning — which is exactly the
     question a beat log exists to answer. */
  const clockNow = async () => {
    const r = await S.read();
    const i = r.findIndex(t => /^\d+:\d\d$/.test(t));
    return i < 0 ? '--:--' : r[i] + (/^(AM|PM)$/.test(r[i+1] || '') ? r[i+1] : '');
  };
  const amber    = () => S.page.evaluate(() => {
    const c = document.getElementById('view');
    const g = c.getContext('2d', { willReadFrequently:true });
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4)
      if (d[i] > 235 && d[i+1] > 155 && d[i+1] < 200 && d[i+2] < 90) n++;
    return n;
  });
  /* where the marker is on screen, if it is on screen: the driver is allowed
     to SEE the arrow, because the player can */
  const markerView = () => S.page.evaluate(() => {
    if (typeof run === 'undefined' || !run) return null;
    const o = (typeof objectiveTarget === 'function') ? objectiveTarget() : null;
    if (!o) return null;
    return { vx: o.pos[0]*16 - cam.x + 8, vy: o.pos[1]*16 - cam.y + 8, label:o.label };
  });

  /* A dialogue with CHOICES does not advance on E — the box says "Press 1-3
     or click" and hides its E indicator. Pressing E at one forever is how the
     first version of this driver spent ten minutes of a day standing still. */
  const optButtons = () => S.page.evaluate(() =>
    [...document.querySelectorAll('#d-opts .opt')].map(el => {
      const r = el.getBoundingClientRect();
      return { x:Math.round(r.left + r.width/2), y:Math.round(r.top + r.height/2) };
    }));
  const clear = async () => {
    for (let i = 0; i < 40 && await dlgOpen(); i++){
      const opts = await optButtons();
      if (opts.length){ await S.click(opts[0].x, opts[0].y); await S.wait(220); }
      else await S.key('KeyE', 150);
    }
  };

  /* --- get into the day ------------------------------------------------- */
  let b = await S.clickables();
  const apply = b.find(x => /APPLY FOR A JOB/i.test(x.text));
  if (!apply){ say('NO APPLY BUTTON'); await S.close(); process.exit(1); }
  await S.click(apply.x, apply.y);
  for (let i = 0; i < 8; i++){
    const bs = await S.clickables();
    const go = bs.find(x => !x.disabled && /ACCEPT|CLOCK IN|START|BEGIN/i.test(x.text));
    if (!go) break;
    await S.click(go.x, go.y);
  }
  await clear();
  /* CRUNCH pace. Options promises the shift is the same eight hours at every
     setting — same tickets, same deadlines, same score — and only how fast
     they pass in the real world changes, which is exactly what a driver on a
     budget wants. At RELAXED a day is a thirteen-minute shift and the driver
     was still at 11:55am when its time ran out. */
  await S.page.evaluate(() => { meta.pace = 'crunch'; if (typeof applySettings === 'function') applySettings(); });
  say('\n== on the floor ==  ' + await objLine());
  await S.shot('floor');

  /* --- play --------------------------------------------------------------- */
  const t0 = Date.now();
  let step = 0, lastObj = '', stuck = 0, shots = 0;
  while (Date.now() - t0 < BUDGET){
    step++;
    if (await dlgOpen()){ await clear(); continue; }

    const txt = await S.read();
    /* a board is up if the game is asking for number keys or a click */
    const board = txt.find(t => /pick|match|drag|choose|order|click|1–|1-/i.test(t) && t.length < 90);

    /* end of day / review / gate: take whatever button it offers */
    const bs = await S.clickables();
    const go = bs.find(x => !x.disabled &&
      /CONTINUE|NEXT|CLOCK IN|ACCEPT|GO ON|FINISH|SIGN|DONE|OK|LEAVE IT/i.test(x.text));
    if (go && !(await tixOpen())){
      say('\n== a screen: "' + go.text.slice(0,40) + '" ==');
      for (const t of txt.slice(0, 10)) say('   | ' + t);
      await S.shot('screen-' + (++shots));
      await S.click(go.x, go.y);
      await clear();
      continue;
    }

    const obj = await objLine();
    if (obj !== lastObj){
      say('  [' + step + '] ' + (await clockNow()).padEnd(8) + obj);
      lastObj = obj; stuck = 0;
    } else stuck++;

    /* no ticket in hand: open the queue and take the top one */
    if (/WAITING/i.test(obj) && !(await tixOpen())){
      await S.key('Tab', 300);
      await S.shot('queue-' + (++shots));
      await S.key('Enter', 500);
      await clear();
      continue;
    }
    /* An EMPTY queue takes Escape, not Enter. The panel's own legend says
       "Enter work · Esc close" and with no rows there is nothing to work — so
       hammering Enter held the panel open, and the shift clock stops behind a
       panel, which is exactly what the handbook promises. One run sat at 9:03
       for ten real minutes doing that. */
    if (await tixOpen()){
      const rows = await S.page.evaluate(() =>
        document.querySelectorAll('#tix-list .row').length);
      await S.key(rows ? 'Enter' : 'Escape', 400);
      await clear();
      continue;
    }

    /* an arrow: click it, which is what following it looks like */
    const m = await markerView();
    if (m){
      await S.clickGame(Math.max(4, Math.min(476, m.vx)), Math.max(4, Math.min(266, m.vy)));
      await S.wait(900);
      /* arrived and facing it? use it */
      await S.key('KeyE', 200);
      continue;
    }

    /* A BOARD IS CANVAS. read() sees DOM, so the driver cannot read the card
       telling it "1 - 3 OR CLICK" and sat on the jargon board pressing E for a
       minute. When nothing is responding, do what a person does: try the keys
       the game has ever asked for, and then click things. */
    if (board || stuck > 6){
      for (const k of ['Digit1','Digit2','Digit3','Digit4','Space','Enter']){
        await S.key(k, 130);
        if (!(await dlgOpen()) && (await amber()) === 0) continue;
      }
      await S.clickGame(240, 190);
      await S.key('KeyE', 150);
    }

    /* A board you cannot solve is left through the pause card, which is what
       it says on it. Without this the driver sat on a five-cable rack logging
       530 mistakes — the same thing a tester did, for the same reason. */
    if (stuck > 20){
      await S.key('Escape', 320);
      const ps = await S.clickables();
      const out = ps.find(x => !x.disabled && /PUT IT DOWN|BACK TO WORK|LEAVE|RESUME/i.test(x.text));
      if (out) await S.click(out.x, out.y);
      else await S.key('Escape', 260);
      stuck = 0;
    }
    if (stuck > 26){ say('  !! STUCK: "' + obj + '" (clock keeps running)');
                     await S.shot('stuck-' + (++shots)); stuck = 0; }
    await S.key('KeyE', 150);
  }

  say('\n== where it ended ==');
  for (const t of (await S.read()).slice(0, 12)) say('   | ' + t);
  await S.shot('end');
  say('\ncrashes ' + S.crashes.length);
  for (const c of S.crashes.slice(0, 6)) say('  ' + c);
  await S.close();
  process.exit(S.crashes.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

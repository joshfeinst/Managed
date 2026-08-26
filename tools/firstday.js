/* Managed: play the first day the way a person plays it.
 *
 * human.js proves the title screen boots and nothing crashes. It has never
 * played a day. A player reported two bugs inside ninety seconds of a real
 * game that every harness in this repo was blind to — an arrow that never
 * went out, and a line of dialogue whose clock disagreed with the HUD's —
 * because nothing here had ever sat down and played.
 *
 * This drives real key events through the title screen, the briefing, and the
 * morning, and prints ONLY what is on screen at each beat. Read it like a
 * player: if two lines contradict each other, that is the bug.
 *
 *   node tools/firstday.js [/abs/path/index.html]
 */
const H = require('./human.js');
const path = require('path');

const target = process.argv[2] || path.join(__dirname, '..', 'index.html');

(async () => {
  const S = await H.open({ file: target, shots: '/tmp/firstday-shots',
                           width: 1280, height: 800, beat: 240 });
  const seen = [];
  /* THE ARROW IS CANVAS. read() sees DOM only, so the first version of this
     driver "checked" the arrow by reading the objective line — and passed
     with the shipped bug put back, because the line was right and the arrow
     was the thing that was wrong. Count its pixels instead: #ffb02e, the
     colour drawmap fills the objective marker with. */
  const arrowOnScreen = () => S.page.evaluate(() => {
    const c = document.getElementById('view');
    const g = c.getContext('2d', { willReadFrequently:true });
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4)
      if (d[i] > 235 && d[i+1] > 155 && d[i+1] < 200 && d[i+2] < 90) n++;
    return n;
  });

  const beat = async (tag) => {
    const txt = await S.read();
    /* the objective line and the key hint are the two things a player is
       actually being instructed by; everything else is scenery */
    const obj = txt.find(t => /ARROW|PRESS|TAKE THE LIFT|QUEUE|WAITING|TERMINAL/i.test(t)) || '';
    /* The WHOLE screen is what the checks below run against; the slice is only
       what gets printed. Recording the first fourteen lines meant two new
       buttons in the HUD and the queue header pushed the ticket row off the
       end of the record, and this harness reported that the queue was empty
       while a screenshot of the same frame showed the ticket in it. */
    seen.push({ tag, obj, text: txt });
    console.log('\n== ' + tag + ' ==');
    for (const t of txt.slice(0, 16)) console.log('   | ' + t);
    if (txt.length > 16) console.log('   | ...and ' + (txt.length - 16) + ' more lines');
  };

  await beat('title');
  const btns = await S.clickables();
  const apply = btns.find(b => /APPLY FOR A JOB/i.test(b.text));
  if (!apply){ console.log('NO APPLY BUTTON — cannot start a career'); await S.close(); process.exit(1); }
  await S.click(apply.x, apply.y);
  await beat('job posting');

  /* take whatever the posting screen offers to start */
  for (let i = 0; i < 8; i++){
    const bs = await S.clickables();
    const go = bs.find(b => !b.disabled && /ACCEPT|START|TAKE|SIGN|BEGIN|CLOCK IN|CONTINUE ▶/i.test(b.text));
    if (!go) break;
    await S.click(go.x, go.y);
    await beat('after "' + go.text.slice(0, 28) + '"');
  }

  /* the commute card and the briefing: a player presses the key it tells them */
  /* Advance the briefing until the dialogue box is actually GONE. Matching on
     its text stopped on the line that says "the amber arrow" — the briefing
     talking about the arrow, not the floor showing one — and left the driver
     sitting in a modal for the whole morning thinking it was playing. */
  const dlgOpen = () => S.page.evaluate(() =>
    getComputedStyle(document.getElementById('dlg')).display !== 'none');
  for (let i = 0; i < 40 && await dlgOpen(); i++) await S.key('KeyE', 200);
  await beat('the floor, first look');
  await S.shot('floor');

  /* Follow the arrow by clicking on it, which is a thing the game supports and
     a thing people do: walkToClick pathfinds. Holding a direction and hoping
     walked into a colleague instead and spent the morning talking to him.
     The player is drawn at the centre of the view and the arrow is thirteen
     tiles east and two down, which is what somebody LOOKING at it can see. */
  let arrived = false;
  for (let i = 0; i < 10 && !arrived; i++){
    await S.clickGame(240 + 13 * 16, 135 + 2 * 16);
    await S.wait(1400);
    const txt = await S.read();
    arrived = txt.some(t => /THIS IS YOUR DESK/i.test(t));
  }
  const arrowAfterArriving = await arrowOnScreen();
  await beat(arrived ? 'arrived at the desk' : 'GAVE UP looking for the desk');
  await S.shot('at-desk');
  if (!arrived) console.log('   !! the arrow never resolved for a player who followed it');

  /* the thing the arrow was for. Tap up first: use is facing-based, and a
     player who walked in from the west is facing away from the machine. */
  await S.key('KeyW', 220);
  await S.key('KeyE', 600);
  await beat('faced the terminal and pressed E');
  await S.shot('queue-via-E');
  const panelOpen = () => S.page.evaluate(() =>
    getComputedStyle(document.getElementById('tix')).display !== 'none');
  if (await panelOpen()) await S.key('Escape', 400);

  /* let the morning run: the first ticket lands at 9:20 */
  for (let i = 0; i < 6; i++) await S.wait(6000);
  const dlgOpen2 = () => S.page.evaluate(() =>
    getComputedStyle(document.getElementById('dlg')).display !== 'none');
  for (let i = 0; i < 12 && await dlgOpen2(); i++) await S.key('KeyE', 220);
  await beat('first ticket has landed');
  await S.shot('first-ticket');

  /* open the queue and take it, the way the game just told them to */
  await S.key('Tab', 500);
  await beat('queue with a ticket in it');
  await S.shot('queue-with-ticket');
  await S.key('Enter', 700);
  for (let i = 0; i < 12 && await dlgOpen2(); i++) await S.key('KeyE', 220);
  await beat('after taking the first ticket');
  await S.shot('ticket-taken');

  /* What a first day has to do. Each of these was true of the build a player
     actually opened, or it was not and they told me about it. */
  const said = t => seen.some(b => b.text.some(x => t.test(x)));
  const checks = [
    ['a career can be started at all',        said(/DAY 1|INTERN/)],
    ['the briefing hands over to the floor',  said(/FIND YOUR DESK/)],
    ['you can reach the desk by following it', arrived],
    ['and the arrow goes out when you do',    arrived && arrowAfterArriving < 6],
    ['and the line stops promising an arrow', said(/THIS IS YOUR DESK/)],
    ['the first ticket arrives',              said(/TICKET WAITING/)],
    ['the queue shows it',                    said(/Coffee for DEREK|#100/)],
    ['taking it sends you somewhere',         said(/GO TO/)],
    ['nothing crashed',                       S.crashes.length === 0]
  ];
  console.log('\n  (amber pixels left on screen after arriving: ' + arrowAfterArriving + ')');
  let bad = 0;
  for (const [name, ok] of checks){
    if (!ok) bad++;
    console.log((ok ? '  ok   ' : '  FAIL ') + name);
  }
  for (const c of S.crashes.slice(0, 5)) console.log('  ' + c);
  console.log('\n' + (bad ? bad + ' PROBLEM(S)' : 'FIRST DAY PLAYS'));
  await S.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

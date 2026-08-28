/* MANAGED — can a mouse play the whole game?
 *
 * The handbook's first line is "The mouse plays the whole game. ... Nothing
 * needs the keyboard except typing a job posting ID." Every other harness in
 * here presses keys, so nothing had ever checked it. This one never touches
 * the keyboard: title, job posting, clock in, walk, queue, ticket, dialogue,
 * board, clock out, review, next morning — all of it with real clicks at real
 * screen coordinates.
 *
 *   node tools/mouseonly.js [/abs/path/index.html]
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const FILE = process.argv[2] || path.join(__dirname, '..', 'index.html');
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
  await page.setViewportSize({ width:1280, height:800 });
  await page.goto('file://' + path.resolve(FILE));
  await page.waitForFunction(() => typeof G !== 'undefined' && G.state === 'title', null, { timeout:20000 });
  await page.evaluate(() => { SAVE_SUSPEND = true; QUIET = true; });

  const fails = [];
  const step = (what, ok, detail) => {
    console.log('  ' + (ok ? 'ok  ' : 'NO  ') + what + (detail ? '   ' + detail : ''));
    if (!ok) fails.push(what);
  };
  const shown = () => page.evaluate(() =>
    [...document.querySelectorAll('.screen')].filter(s => !s.hidden).map(s => s.id)[0] || '(world)');
  /* click a DOM element by its own on-screen box */
  const clickEl = async (sel) => {
    const box = await page.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return r.width && r.height ? { x:r.left + r.width/2, y:r.top + r.height/2 } : null;
    }, sel);
    if (!box) return false;
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(220);
    return true;
  };
  /* click a CANVAS point given in the game's own 480x270 space */
  const clickView = async (vx, vy) => {
    const p = await page.evaluate(([x, y]) => {
      const c = document.getElementById('view'), r = c.getBoundingClientRect();
      return { x: r.left + (x / c.width) * r.width, y: r.top + (y / c.height) * r.height };
    }, [vx, vy]);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(200);
  };

  console.log('MOUSE ONLY — no key is pressed anywhere below\n');

  step('the title screen offers a career', await clickEl('#titlemenu [data-act="newrun"]'));
  step('...and it opens the job posting', (await shown()) === 's-setup', await shown());
  step('the offer can be accepted without typing', await clickEl('#s-setup [data-act="start"]'));
  await page.waitForTimeout(500);
  step('...and the morning card comes up', (await shown()) === 's-review', await shown());
  step('you can clock in', await clickEl('#r-actions button'));
  await page.waitForTimeout(900);
  /* day one opens on Linda; click the dialogue box to advance it */
  let guard = 0;
  while (await page.evaluate(() => typeof dlg !== 'undefined' && !!dlg) && guard++ < 40){
    const opt = await page.evaluate(() => !!document.querySelector('#d-opts .opt'));
    if (!(await clickEl(opt ? '#d-opts .opt' : '#dlg'))) break;
  }
  step('a conversation can be advanced by clicking it',
       !(await page.evaluate(() => typeof dlg !== 'undefined' && !!dlg)), 'clicks ' + guard);

  /* The green screen itself, not the tile you stand on to use it: the TERMINAL
     anchor is the standing square and the act is on the desk beside it, which
     is what a player actually clicks. */
  const termTile = await page.evaluate(() => {
    for (let y = 0; y < W2.H; y++) for (let x = 0; x < W2.W; x++)
      if (W2.act[cellIx(x, y)] === 'terminal') return [x, y];
    return null;
  });
  const near = async () => page.evaluate((t) =>
    t ? Math.abs(player.tx - t[0]) + Math.abs(player.ty - t[1]) : 99, termTile);
  for (let i = 0; i < 30 && await near() > 1; i++){
    const p = await page.evaluate((t) =>
      ({ x: t[0] * TILE + TILE/2 - cam.x, y: t[1] * TILE + TILE/2 - cam.y }), termTile);
    await clickView(p.x, p.y);
    await page.waitForTimeout(400);
  }
  step('clicking the floor walks you to your desk', await near() <= 1, 'distance ' + await near());

  /* the terminal opens the queue when you click it */
  const openQ = async () => page.evaluate(() =>
    getComputedStyle(document.getElementById('tix')).display !== 'none');
  for (let i = 0; i < 6 && !(await openQ()); i++){
    const p = await page.evaluate((t) =>
      ({ x: t[0]*TILE + TILE/2 - cam.x, y: t[1]*TILE + TILE/2 - cam.y }), termTile);
    await clickView(p.x, p.y);
    await page.waitForTimeout(500);
  }
  step('clicking the terminal opens the service queue', await openQ());

  /* and it can be CLOSED again with the mouse — the rule line says Esc */
  if (await openQ()){
    await page.mouse.click(20, 20);                       // outside the panel
    await page.waitForTimeout(300);
    let closed = !(await openQ());
    if (!closed){
      const x = await clickEl('#tix .close, #tix [data-act="close"], #tix header');
      await page.waitForTimeout(300);
      closed = !(await openQ());
    }
    step('...and closed again with the mouse', closed);
    if (!closed) await page.evaluate(() => closeModalToWork());
  }

  /* wait for a ticket, take it by clicking the row */
  /* A first career runs at RELAXED — 0.62 game-minutes a second — so the first
     ticket is a real minute away. Wait for it the way a player does, out on the
     floor, because the clock does not move behind the panel. */
  for (let i = 0; i < 200 && !(await page.evaluate(() => run && run.queue.length)); i++)
    await page.waitForTimeout(500);
  for (let i = 0; i < 8 && !(await openQ()); i++){
    const p = await page.evaluate((t) =>
      ({ x: t[0]*TILE + TILE/2 - cam.x, y: t[1]*TILE + TILE/2 - cam.y }), termTile);
    await clickView(p.x, p.y);
    await page.waitForTimeout(400);
  }
  step('...and the terminal opens the queue again to show it', await openQ());
  const q = await page.evaluate(() => ({
    queue: run ? run.queue.length : -1,
    rows: document.querySelectorAll('#tix-list .row').length,
    open: getComputedStyle(document.getElementById('tix')).display !== 'none',
    clock: run ? run.clock : -1 }));
  step('a ticket arrives while you are out on the floor', q.queue > 0,
       q.queue + ' in the queue at ' + Math.round(q.clock) + ' minutes past nine');
  step('a ticket row can be taken by clicking it',
       q.rows > 0 && await clickEl('#tix-list .row'),
       q.rows + ' rows drawn, panel open ' + q.open);
  await page.waitForTimeout(700);

  /* From here the ticket runs itself: it points somewhere, you click the floor
     to get there, you click to talk, and a board may open. All of it by mouse. */
  const tileView = (tx, ty) => page.evaluate(([x, y]) =>
    ({ x: x * TILE + TILE/2 - cam.x, y: y * TILE + TILE/2 - cam.y }), [tx, ty]);
  let sawBoard = false, briefStuck = false, boardMoved = false;
  let walked = false, talked = 0, finished = false;
  for (let i = 0; i < 260; i++){
    const st = await page.evaluate(() => ({
      dlg: typeof dlg !== 'undefined' && !!dlg,
      opt: !!document.querySelector('#d-opts .opt'),
      game: !!(typeof MG !== 'undefined' && MG),
      brief: !!(typeof MG !== 'undefined' && MG && MG.brief),
      marker: (typeof run !== 'undefined' && run && run.marker) ? run.marker.slice() : null,
      onFloor: (typeof run !== 'undefined' && run && run.markerFloor) === (typeof W2 !== 'undefined' && W2.id),
      active: !!(typeof run !== 'undefined' && run && run.active),
      me: (typeof player !== 'undefined' && player) ? [player.tx, player.ty] : null
    }));
    if (st.game){
      sawBoard = true;
      if (st.brief){
        for (let k = 0; k < 8 && await page.evaluate(() => !!(MG && MG.brief)); k++)
          await clickView(240, 135);
        if (await page.evaluate(() => !!(MG && MG.brief))){ briefStuck = true; break; }
      }
      /* one real move on the board, by clicking where the board draws itself */
      const before = await page.evaluate(() => JSON.stringify(MG, (k, v) =>
        (typeof v === 'function' || k === 'onDone' || k === 'brief') ? undefined
        : v instanceof Set ? [...v] : v));
      for (const [x, y] of [[120,110],[120,130],[240,150],[360,110],[240,190]]){
        await clickView(x, y);
        if (await page.evaluate(() => !MG)) { boardMoved = true; break; }
        const now = await page.evaluate(() => JSON.stringify(MG, (k, v) =>
          (typeof v === 'function' || k === 'onDone' || k === 'brief') ? undefined
          : v instanceof Set ? [...v] : v));
        if (now !== before){ boardMoved = true; break; }
      }
      break;
    }
    if (st.dlg){ await clickEl(st.opt ? '#d-opts .opt' : '#dlg'); talked++; continue; }
    if (!st.active){ finished = true; break; }
    if (st.marker && st.onFloor && st.me){
      const d = Math.abs(st.me[0]-st.marker[0]) + Math.abs(st.me[1]-st.marker[1]);
      if (d <= 1){ await page.waitForTimeout(300); continue; }
      walked = true;
      const p = await tileView(st.marker[0], st.marker[1]);
      await clickView(p.x, p.y);
      await page.waitForTimeout(500);
      continue;
    }
    await page.waitForTimeout(300);
  }
  step('the ticket\'s errand can be walked by clicking the floor', walked || finished || sawBoard,
       'walked ' + walked + ', talked ' + talked + ', board ' + sawBoard);
  if (sawBoard){
    step('a minigame\'s how-to card can be dismissed with the mouse', !briefStuck,
         briefStuck ? 'eight clicks on the card and it is still up' : '');
    step('...and the board itself answers a click', boardMoved);
  } else console.log('  --  this ticket opened no board (nothing to test here)');
  /* Every board's how-to card, not just whichever one this ticket happened to
     open: the card is modal and holds the whole game behind it, so one that
     only a key can dismiss is a mouse-only dead end. */
  const stuck = [];
  const boards = await page.evaluate(() => Object.keys(GAMES));
  for (const g of boards){
    await page.evaluate((k) => {
      if (G.modal) closeModalToWork();
      meta.seenGames = {}; openGame(k, 2, () => {}); G.state = 'modal';
    }, g);
    await page.waitForTimeout(250);
    for (let i = 0; i < 6 && await page.evaluate(() => !!(MG && MG.brief)); i++)
      await clickView(240, 135);
    if (await page.evaluate(() => !!(MG && MG.brief))) stuck.push(g);
  }
  await page.evaluate(() => { if (G.modal) closeModalToWork(); });
  step('every how-to-play card can be dismissed with the mouse', !stuck.length,
       stuck.length ? stuck.join(' ') : boards.length + ' boards');

  /* A CLICK THAT LANDS ON NOTHING DOES NOTHING. Every pointer press on a
     board also latched press.use -- E, which is the irreversible action on
     most of these boards -- so a click on blank canvas performed it. On THE
     DIAGRAM it inverted the board: step() reads `press.one ? 'mark' :
     press.use ? 'probe'` BEFORE the hit test, so a click arrived already
     meaning 'probe', the `k = k || 'mark'` under the node test could never
     fire, and clicking a box spent one of three outage windows instead of
     marking it -- on a board whose own card says a click marks.

     It has to be a REAL click. A self test that sets MG.click by hand cannot
     see this at all: the bug is in the handler that latches the key on the way
     in, not in the board that reads it, and a probe that skips the handler
     passes on the broken build. Which it did, first time out. */
  const commits = [];
  for (const g of boards){
    const snap = () => page.evaluate(() => {
      if (!MG) return 'gone';
      const skip = new Set(['flash','flashTxt','flashOk','buzz','t','click','hint',
                            'brief','gid','onDone','dark','darkOf','_plan']);
      const seen = new WeakSet();
      const walk = v => {
        if (v instanceof Set) return [...v].sort().join(',');
        if (Array.isArray(v)) return v.map(walk).join('|');
        if (v && typeof v === 'object'){
          if (seen.has(v)) return '<c>'; seen.add(v);
          return Object.keys(v).filter(k => !skip.has(k) && typeof v[k] !== 'function')
                 .map(k => k + ':' + walk(v[k])).join(',');
        }
        return String(v);
      };
      return walk(MG);
    });
    await page.evaluate((k) => { if (G.modal) closeModalToWork();
      openGame(k, 2, () => {}); G.state = 'modal'; if (MG) MG.brief = null; }, g);
    await page.waitForTimeout(250);
    const before = await snap();
    await clickView(64, 30);                    // inside the panel, on nothing
    await page.waitForTimeout(250);
    if (await snap() !== before) commits.push(g);
  }
  await page.evaluate(() => { if (G.modal) closeModalToWork(); });
  step('a click on empty panel does not act for you', !commits.length,
       commits.length ? commits.join(' ') : boards.length + ' boards');

  /* AND THE WAY BACK TO THE RULES OF THE BOARD YOU ARE STUCK ON. briefReopen
     was bound to KeyH and to nothing else, and mgPanel prints "H = RULES" in
     the corner with no hit target behind it -- so on the one screen where a
     player is most likely to be confused, the only way to re-read the rules
     needed a keyboard. This file exists to catch exactly that and did not,
     because it only ever dismissed the card and never asked for it back. */
  const noRules = [];
  for (const g of boards){
    await page.evaluate((k) => { if (G.modal) closeModalToWork();
      openGame(k, 2, () => {}); G.state = 'modal'; if (MG) MG.brief = null; }, g);
    await page.waitForTimeout(200);
    await clickView(408, 35);                       // where H = RULES is printed
    await page.waitForTimeout(200);
    if (!await page.evaluate(() => !!(MG && MG.brief))) noRules.push(g);
  }
  await page.evaluate(() => { if (G.modal) closeModalToWork(); });
  step('the rules of a board can be re-opened with the mouse', !noRules.length,
       noRules.length ? noRules.join(' ') : boards.length + ' boards');

  /* and the pause menu — which is where SAVE & QUIT lives */
  await page.evaluate(() => { G.state = 'work'; });
  const pauseBtn = await clickEl('#h-pause');
  await page.waitForTimeout(300);
  step('the pause menu can be opened with the mouse',
       pauseBtn && (await shown()) === 's-pause', await shown());
  step('...and SAVE & QUIT is a button on it',
       await page.evaluate(() => !!document.querySelector('#s-pause [data-act="quitsave"]')));

  console.log('');
  if (errs.length) console.log('page errors: ' + errs.length + '\n  ' + errs[0] + '\n');
  console.log(fails.length
    ? 'MOUSE ONLY FAILED — ' + fails.length + ' thing(s) a mouse cannot do:\n  ' + fails.join('\n  ')
    : 'MOUSE ONLY OK — everything tested here works without the keyboard');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();

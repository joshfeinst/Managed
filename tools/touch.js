/* MANAGED ON A PHONE — can a finger play it?
 *
 * A real mobile context: 390x844 at dpr 3, isMobile, hasTouch, no mouse and no
 * keyboard. Everything below is page.tap(), which dispatches touchstart/end the
 * way a finger does. It reports what a phone player can reach and what they
 * cannot, and it measures the things a phone makes hard: how much of the screen
 * the game actually uses, and whether the controls are big enough to hit.
 *
 *   node tools/touch.js [/abs/path/index.html] [--landscape]
 */
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const FILE = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2] : path.join(__dirname, '..', 'index.html');
const LANDSCAPE = process.argv.includes('--landscape');
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium'))){
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({ executablePath:p }); } catch(_){} }
  }
  throw e; } }

/* the tap target a person can reliably hit; 44 is the number both platform
   guidelines landed on, from the same research */
const MIN_TAP = 44;

(async () => {
  const browser = await launch();
  const ctx = await browser.newContext({
    viewport: LANDSCAPE ? { width:844, height:390 } : { width:390, height:844 },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
               '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(FILE));
  await page.waitForFunction(() => typeof G !== 'undefined' && G.state === 'title', null, { timeout:25000 });
  await page.evaluate(() => { SAVE_SUSPEND = true; QUIET = true; });

  const fails = [];
  const step = (what, ok, detail) => {
    console.log('  ' + (ok ? 'ok  ' : 'NO  ') + what + (detail ? '   ' + detail : ''));
    if (!ok) fails.push(what);
  };
  const shown = () => page.evaluate(() =>
    [...document.querySelectorAll('.screen')].filter(s => !s.hidden).map(s => s.id)[0] || '(world)');
  const tapEl = async (sel) => {
    const box = await page.evaluate((s) => {
      const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return r.width && r.height ? { x:r.left + r.width/2, y:r.top + r.height/2 } : null;
    }, sel);
    if (!box) return false;
    await page.touchscreen.tap(box.x, box.y);
    await page.waitForTimeout(240);
    return true;
  };
  const tapView = async (vx, vy) => {
    const p = await page.evaluate(([x, y]) => {
      const c = document.getElementById('view'), r = c.getBoundingClientRect();
      return { x: r.left + (x / c.width) * r.width, y: r.top + (y / c.height) * r.height };
    }, [vx, vy]);
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForTimeout(220);
  };

  console.log('MANAGED ON A PHONE — ' + (LANDSCAPE ? '844x390 landscape' : '390x844 portrait') +
              ', taps only, no keyboard\n');

  /* 1. does the game know it is on a phone, and does it still tell you to leave? */
  const sniff = await page.evaluate(() => ({
    coarse: matchMedia('(hover:none) and (pointer:coarse)').matches,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    viewportMeta: !!document.querySelector('meta[name=viewport]'),
    touchAction: getComputedStyle(document.getElementById('view')).touchAction,
    boot: (document.getElementById('bootline') || {}).textContent || '',
    toast: (document.getElementById('toast') || {}).textContent || ''
  }));
  step('the page knows it is on a touch device', sniff.coarse && sniff.touch,
       'coarse ' + sniff.coarse + ', touch ' + sniff.touch);
  step('...and does not tell the player to go away',
       !/keyboard/i.test(sniff.boot) && !/KEYBOARD/.test(sniff.toast),
       (sniff.boot + ' / ' + sniff.toast).slice(0, 70));
  step('double-tap zoom is off on the game surface',
       /manipulation|none/.test(sniff.touchAction), 'touch-action: ' + sniff.touchAction);

  /* 3. start a career with taps */
  step('a career can be started', await tapEl('#titlemenu [data-act="newrun"]'));
  step('...the posting screen accepts a tap', await tapEl('#s-setup [data-act="start"]'));
  await page.waitForTimeout(500);
  step('...and the morning card comes up', (await shown()) === 's-review', await shown());
  step('you can clock in', await tapEl('#r-actions button'));
  await page.waitForTimeout(900);

  /* 4. the briefing, by tapping it */
  let taps = 0;
  while (await page.evaluate(() => typeof dlg !== 'undefined' && !!dlg) && taps++ < 40){
    const opt = await page.evaluate(() => !!document.querySelector('#d-opts .opt'));
    if (!(await tapEl(opt ? '#d-opts .opt' : '#dlg'))) break;
  }
  step('a conversation advances on a tap',
       !(await page.evaluate(() => typeof dlg !== 'undefined' && !!dlg)), taps + ' taps');

  /* 5. walking */
  const termTile = await page.evaluate(() => {
    for (let y = 0; y < W2.H; y++) for (let x = 0; x < W2.W; x++)
      if (W2.act[cellIx(x, y)] === 'terminal') return [x, y];
    return null;
  });
  const near = async () => page.evaluate((t) =>
    t ? Math.abs(player.tx - t[0]) + Math.abs(player.ty - t[1]) : 99, termTile);
  for (let i = 0; i < 30 && await near() > 1; i++){
    const p = await page.evaluate((t) =>
      ({ x: t[0]*TILE + TILE/2 - cam.x, y: t[1]*TILE + TILE/2 - cam.y }), termTile);
    await tapView(p.x, p.y);
    await page.waitForTimeout(380);
  }
  step('tapping the floor walks you there', await near() <= 1, 'distance ' + await near());

  /* HOW MUCH OF THE PHONE DOES IT USE, and is what it does not use a
     failure? The canvas is a fixed sixteen-by-nine, so in portrait its height
     is decided the moment its width is: 390 wide is 219 tall and no layout can
     change that. What CAN be wrong is failing to use the width, or putting the
     controls somewhere a thumb cannot reach. So: landscape is measured on
     area, portrait on whether it takes the whole width and whether the things
     you tap are in the bottom third of the screen. */
  const fit = await page.evaluate(() => {
    const r = document.getElementById('frame').getBoundingClientRect();
    const v = document.getElementById('view').getBoundingClientRect();
    const btns = ['#h-queue-btn', '#h-pause'].map(sel => {
      const e = document.querySelector(sel); if (!e) return null;
      const b = e.getBoundingClientRect(); return { sel, mid: b.top + b.height/2 };
    }).filter(Boolean);
    return { w: Math.round(r.width), h: Math.round(r.height),
             vw: innerWidth, vh: innerHeight,
             pct: Math.round((r.width * r.height) / (innerWidth * innerHeight) * 100),
             widthUsed: Math.round(v.width / innerWidth * 100),
             thumb: btns.length === 2 && btns.every(b => b.mid > innerHeight * 0.66),
             btns: btns.map(b => b.sel + '@' + Math.round(b.mid)).join(' ') };
  });
  if (LANDSCAPE)
    step('the game fills the screen in landscape', fit.pct >= 60,
         fit.w + 'x' + fit.h + ' of ' + fit.vw + 'x' + fit.vh + ' = ' + fit.pct + '%');
  else {
    step('the canvas takes the whole width in portrait', fit.widthUsed >= 98,
         fit.widthUsed + '% of ' + fit.vw + 'px (16:9 makes it ' + Math.round(fit.w*9/16) +
         ' tall, and no layout can change that)');
    step('...and what you tap is in the bottom third, where a thumb is',
         fit.thumb, fit.btns + ' of ' + fit.vh);
  }

  /* 6. the queue, from anywhere — Tab has no finger */
  const qOpen = () => page.evaluate(() =>
    getComputedStyle(document.getElementById('tix')).display !== 'none');
  /* walking to the terminal means tapping the terminal, which opens the queue
     by itself — start from closed, or the QUEUE button is measured toggling it
     shut and the harness reports a working control as broken */
  await page.evaluate(() => { if (G.modal) closeModalToWork(); });
  await page.waitForTimeout(200);
  const qBtn = await page.evaluate(() => !!document.querySelector('#h-queue-btn, [data-act="queue"]'));
  step('there is a way to open the queue that is not a key', qBtn,
       qBtn ? '' : 'TAB only — a finger cannot reach the queue away from the terminal');
  if (qBtn) await tapEl('#h-queue-btn, [data-act="queue"]');
  else { for (let i = 0; i < 5 && !(await qOpen()); i++){
           const p = await page.evaluate((t) =>
             ({ x: t[0]*TILE + TILE/2 - cam.x, y: t[1]*TILE + TILE/2 - cam.y }), termTile);
           await tapView(p.x, p.y); await page.waitForTimeout(380); } }
  step('the queue opens', await qOpen());

  /* 7. can a finger hit the things it has to hit? */
  const small = await page.evaluate((min) => {
    const out = [];
    for (const el of document.querySelectorAll(
        '#tix .row, #tix header .x, #hud #h-pause, .btn, .mi, .opt')){
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.height < min || r.width < min)
        out.push((el.id || el.className || el.tagName) + ' ' +
                 Math.round(r.width) + 'x' + Math.round(r.height));
    }
    return out;
  }, MIN_TAP);
  step('every control is big enough for a finger', !small.length,
       small.length ? small.slice(0, 4).join(', ') + (small.length > 4 ? ' +' + (small.length-4) : '') : '');

  /* a ticket can land while this is running and open a scene over the panel;
     clear it first, or the close button is measured through a dialogue box */
  for (let i = 0; i < 20 && await page.evaluate(() => typeof dlg !== 'undefined' && !!dlg); i++)
    await tapEl('#d-opts .opt') || await tapEl('#dlg');
  if (!(await qOpen())) await tapEl('#h-queue-btn, [data-act="queue"]');
  if (await qOpen()) await tapEl('#tix header .x');
  step('the queue closes with a tap', !(await qOpen()));

  /* 8. THE BOARDS. Every check above is DOM: buttons, panels, the queue. The
     minigames are the one layer drawn on the canvas, and this harness had
     never opened one — so "PHONE OK" was a claim about the menus. WHOSE
     SATURDAY, the board a Director's last Friday turns on, could not be
     played with a pointer at all and nothing here noticed.
     Each board is opened and finished with real taps at real pixels, through
     the same touch -> click -> canvasPoint path a thumb uses. */
  await page.evaluate(() => { if (G.modal) closeModalToWork(); });
  const boards = await page.evaluate(() => Object.keys(GAMES));
  const unplayable = [];
  for (const gid of boards){
    const opened = await page.evaluate((id) => {
      window.__done = false;
      openGame(id, 2, () => { window.__done = true; });
      return !!MG;
    }, gid);
    if (!opened){ unplayable.push(gid + ' would not open'); continue; }
    /* the how-to card is dismissed by tapping it, like anything else */
    for (let i = 0; i < 4 && await page.evaluate(() => !!(MG && MG.brief)); i++)
      await tapView(240, 200);
    for (let pass = 0; pass < 12; pass++){
      if (await page.evaluate(() => window.__done || !MG)) break;
      const rs = await page.evaluate(() => {
        const g = MG; if (!g) return null;
        const n = (g.rows && g.rows.length) || (g.tasks && g.tasks.length) ||
                  (g.hand && g.hand.length) || (g.sites && g.sites.length) ||
                  (g.qs && g.qs.length) || (g.steps && g.steps.length) ||
                  (g.items && g.items.length) || 0;
        const pick = [], act = [], btn = [];
        if (g.leftRect) for (let i = 0; i < (g.n||0); i++) pick.push(g.leftRect(i));
        if (g.rowRect)  for (let i = 0; i < n; i++) pick.push(g.rowRect(i));
        if (g.cardRect) for (let i = 0; i < 4; i++) pick.push(g.cardRect(i));
        if (g.nodeRect && g.nodes) for (let i = 0; i < g.nodes.length; i++) pick.push(g.nodeRect(i));
        if (g.rightRect) for (let i = 0; i < (g.n||0); i++) act.push(g.rightRect(i));
        if (g.personRect) for (let i = 0; i <= (g.staff ? g.staff.length : 0); i++) act.push(g.personRect(i));
        if (g.tierRect) for (let i = 0; i < n; i++) for (let t = 0; t < 3; t++) act.push(g.tierRect(i,t));
        if (g.optRect)  for (let i = 0; i < 4; i++) act.push(g.optRect(i));
        for (const b of (g.btns||[])) btn.push([b.x - b.w/2, b.y, b.w, b.h]);
        return { pick, act, btn };
      });
      if (!rs) break;
      const seq = rs.pick.length && rs.act.length
        ? rs.pick.flatMap(p => [p, ...rs.act])
        : rs.pick.concat(rs.act);
      for (const [x,y,w,h] of seq.concat(rs.btn)){
        if (await page.evaluate(() => window.__done || !MG)) break;
        await tapView(x + w/2, y + h/2);
      }
      await page.waitForTimeout(400);
    }
    if (!(await page.evaluate(() => window.__done))) unplayable.push(gid);
    await page.evaluate(() => { MG = null; window.__done = false; if (G.modal) closeModalToWork(); });
  }
  step('every minigame can be finished with taps alone', !unplayable.length,
       unplayable.length ? unplayable.join(', ') : boards.length + ' boards played to a result');

  console.log('');
  if (errs.length) console.log('page errors: ' + errs.length + '\n  ' + errs[0] + '\n');
  console.log(fails.length
    ? 'PHONE: ' + fails.length + ' thing(s) a finger cannot do:\n  ' + fails.join('\n  ')
    : 'PHONE OK — everything tested here works with taps alone');
  await browser.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();

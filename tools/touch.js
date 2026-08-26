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

  /* 2. how much of the phone does the game use? */
  const fit = await page.evaluate(() => {
    const r = document.getElementById('frame').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height),
             vw: innerWidth, vh: innerHeight,
             pct: Math.round((r.width * r.height) / (innerWidth * innerHeight) * 100) };
  });
  step('the game fills a reasonable share of the screen', fit.pct >= 45,
       fit.w + 'x' + fit.h + ' of ' + fit.vw + 'x' + fit.vh + ' = ' + fit.pct + '%');

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

  /* 6. the queue, from anywhere — Tab has no finger */
  const qOpen = () => page.evaluate(() =>
    getComputedStyle(document.getElementById('tix')).display !== 'none');
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

  if (await qOpen()) await tapEl('#tix header .x');
  step('the queue closes with a tap', !(await qOpen()));

  console.log('');
  if (errs.length) console.log('page errors: ' + errs.length + '\n  ' + errs[0] + '\n');
  console.log(fails.length
    ? 'PHONE: ' + fails.length + ' thing(s) a finger cannot do:\n  ' + fails.join('\n  ')
    : 'PHONE OK — everything tested here works with taps alone');
  await browser.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();

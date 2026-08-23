/* Managed: play it the way a person does.
 *
 * Every other harness in here drives press[]/held[] straight into the sim and
 * reads run.* back out to decide whether something worked. That is why they
 * have never once caught what a player catches in the first ten seconds: they
 * cannot see the screen, they never touch the mouse, they already know the
 * rules, and they read at infinite speed.
 *
 * This one has what a person has and nothing else:
 *   - a window of a real size
 *   - real mouse clicks at real pixels
 *   - real key events
 *   - screenshots, which are the ONLY way it learns what happened
 *   - whatever DOM text is actually visible on screen
 *
 * It deliberately exposes no way to read game state. If a thing cannot be
 * seen, it does not exist, because that is the player's situation.
 *
 *   const H = require('./tools/human.js');
 *   const s = await H.open({ file:'index.html', shots:'/tmp/shots' });
 *   await s.key('Enter'); await s.shot('after-enter');
 *   console.log(await s.read());
 *   await s.close();
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function launch(opts){
  try { return await chromium.launch(opts); }
  catch (e) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    for (const dir of fs.readdirSync(base).filter(d => d.startsWith('chromium'))){
      const p = path.join(base, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)){
        try { return await chromium.launch({ ...(opts||{}), executablePath:p }); } catch (_) {}
      }
    }
    throw e;
  }
}

/* The game's internal resolution. A human does not know this number, but the
   driver needs it to turn "that button on screen" into a real pixel. */
const VW = 480, VH = 270;

async function open(o){
  o = o || {};
  const width = o.width || 1440, height = o.height || 900;
  const shots = o.shots || '/tmp/human-shots';
  fs.mkdirSync(shots, { recursive:true });
  /* o.profile: a directory. One browser profile = one person's browser — their
     localStorage save survives closing the process, exactly like a returning
     player. Without it every launch is a first-time player on a clean machine. */
  let browser, page;
  if (o.profile){
    fs.mkdirSync(o.profile, { recursive:true });
    const ctxOpts = { viewport:{ width, height }, deviceScaleFactor:1,
                      args:['--force-device-scale-factor=1'] };
    try { browser = await chromium.launchPersistentContext(o.profile, ctxOpts); }
    catch (e) {
      const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
      let ok = null;
      for (const dir of fs.readdirSync(base).filter(d => d.startsWith('chromium'))){
        const px = path.join(base, dir, 'chrome-linux', 'chrome');
        if (fs.existsSync(px)){
          try { ok = await chromium.launchPersistentContext(o.profile, { ...ctxOpts, executablePath:px }); break; }
          catch (_) {}
        }
      }
      if (!ok) throw e;
      browser = ok;
    }
    page = browser.pages()[0] || await browser.newPage();
    await page.setViewportSize({ width, height });
  } else {
    browser = await launch({ args:['--force-device-scale-factor=1'] });
    page = await browser.newPage({ viewport:{ width, height }, deviceScaleFactor:1 });
  }

  /* Crashes are things a player experiences, so they are collected as evidence
     rather than thrown. */
  const crashes = [];
  page.on('pageerror', e => crashes.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') crashes.push('console: ' + m.text()); });

  const target = o.url || ('file://' + path.resolve(o.file || 'index.html'));
  await page.goto(target, { waitUntil:'load' });
  /* the boot animation runs about 2.4s; arriving earlier means staring at the
     boot line and reporting that there are no buttons — measured, not guessed */
  await page.waitForTimeout(o.settle == null ? 3200 : o.settle);

  let n = 0;
  const S = {
    page, browser, crashes, dir: shots, width, height,

    /* Look at the screen. Returns the file path — READ IT WITH THE Read TOOL.
       A screenshot you did not open is not evidence. */
    async shot(name){
      const p = path.join(shots, String(++n).padStart(2,'0') + '-' + (name||'shot') + '.png');
      await page.screenshot({ path:p });
      return p;
    },

    /* Every scrap of text a person can actually read right now: visible DOM
       only, in reading order. Canvas text does not appear here — that is what
       shot() is for, and the difference between the two has been a bug source. */
    async read(){
      return page.evaluate(() => {
        const out = [];
        const walk = el => {
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) return;
          if (el.hasAttribute && el.hasAttribute('hidden')) return;
          for (const c of el.childNodes){
            if (c.nodeType === 3){ const t = c.textContent.trim(); if (t) out.push(t); }
            else if (c.nodeType === 1) walk(c);
          }
        };
        walk(document.body);
        return out;
      });
    },

    /* What a person could click: buttons and rows, with where they are. */
    async clickables(){
      return page.evaluate(() => {
        const SEL = 'button,[data-act],.opt,a,input';
        const out = [];
        for (const el of document.querySelectorAll(SEL + ',.row')){
          /* leaves only: a container row's center is the dead gap BETWEEN its
             buttons — clicking it does nothing, which cost a harness run 42
             seconds of clicking the space between ACCEPT and BACK */
          if (el.querySelector && el.querySelector(SEL)) continue;
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          out.push({ text:(el.textContent||el.value||'').trim().slice(0,70),
                     x:Math.round(r.left + r.width/2), y:Math.round(r.top + r.height/2),
                     disabled: !!el.disabled });
        }
        return out;
      });
    },

    async click(x, y){ await page.mouse.click(x, y); await page.waitForTimeout(o.beat || 260); },

    /* Click a point in the game's own 480x270 world, wherever the canvas
       happens to be letterboxed to. */
    async clickGame(vx, vy){
      const b = await page.evaluate(() => {
        const r = document.getElementById('view').getBoundingClientRect();
        return { l:r.left, t:r.top, w:r.width, h:r.height };
      });
      await S.click(b.l + vx * b.w / VW, b.t + vy * b.h / VH);
    },

    /* Where the canvas actually is, and how big the world is drawn. */
    async canvasBox(){
      return page.evaluate(() => {
        const r = document.getElementById('view').getBoundingClientRect();
        return { left:Math.round(r.left), top:Math.round(r.top),
                 width:Math.round(r.width), height:Math.round(r.height) };
      });
    },

    async key(code, ms){ await page.keyboard.press(code); await page.waitForTimeout(ms || o.beat || 260); },
    async hold(code, ms){
      await page.keyboard.down(code); await page.waitForTimeout(ms || 500);
      await page.keyboard.up(code); await page.waitForTimeout(120);
    },
    async type(text){ await page.keyboard.type(text, { delay:60 }); },
    async wait(ms){ await page.waitForTimeout(ms); },

    /* The things people do that bots never do. */
    async lookAway(ms){                       // alt-tab
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await page.waitForTimeout(ms || 1500);
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.waitForTimeout(300);
    },
    async hide(ms){                           // minimise / switch tab
      await page.evaluate(() => { Object.defineProperty(document,'hidden',{value:true,configurable:true});
        document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(ms || 1500);
      await page.evaluate(() => { Object.defineProperty(document,'hidden',{value:false,configurable:true});
        document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(300);
    },
    async reload(){ await page.reload({ waitUntil:'load' }); await page.waitForTimeout(1400); },
    async resize(w, h){ await page.setViewportSize({ width:w, height:h }); await page.waitForTimeout(400); },

    async close(){ await browser.close(); }
  };
  return S;
}

module.exports = { open, launch, VW, VH };

/* Run directly for a smoke check that the driver itself works. */
if (require.main === module){
  (async () => {
    const s = await open({ file: process.argv[2] || 'index.html',
                           shots: process.argv[3] || '/tmp/human-shots' });
    console.log('canvas', JSON.stringify(await s.canvasBox()));
    console.log('shot  ', await s.shot('title'));
    console.log('text  ', JSON.stringify((await s.read()).slice(0, 12)));
    console.log('click ', JSON.stringify((await s.clickables()).slice(0, 8)));
    console.log('crashes', s.crashes.length);
    await s.close();
    console.log('HUMAN DRIVER OK');
  })();
}

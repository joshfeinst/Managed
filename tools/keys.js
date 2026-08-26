/* Managed dead-key sweep: does every key a board PROMISES actually do anything?
 *
 * tools/boards.js drives the boards by calling their methods, and tools/visual.js
 * only looks at them. Neither presses a key. Six boards shipped with input
 * written straight against `press.one`..`press.four` and never once driven
 * through the real keydown layer — and a key that is bound in the how-to-play
 * card and dead in the handler is indistinguishable, to a player, from a game
 * that has crashed.
 *
 * For each board this opens the real modal, dismisses the card, and presses
 * each documented key, asserting the board's own state moves. State is hashed
 * with the cosmetic fields (flash, timers, cursors that only animate) removed,
 * so a key that merely re-renders does not count as alive.
 *
 *   node tools/keys.js /abs/path/index.html
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium'))){
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)) { try { return await chromium.launch({ executablePath:p }); } catch(_){} }
  }
  throw e; } }

/* what each board's card claims, as real key codes */
const CLAIMS = {
  cable:   ['ArrowUp', 'ArrowDown', 'KeyE'],
  pw:      ['Digit1', 'Digit2'],
  jargon:  ['Digit1', 'Digit2', 'Digit3'],
  script:  ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'ArrowUp', 'ArrowDown', 'KeyE'],
  blast:   ['ArrowUp', 'ArrowDown', 'KeyE', 'Digit1', 'Digit2'],
  subnet:  ['ArrowUp', 'ArrowDown', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyE'],
  quote:   ['ArrowUp', 'ArrowDown', 'Digit1', 'Digit2', 'Digit3', 'KeyE'],
  keep:    ['ArrowUp', 'ArrowDown', 'KeyE'],
  diagram: ['ArrowUp', 'ArrowDown', 'Digit1', 'Digit2', 'KeyE'],
  paper:   ['ArrowUp', 'ArrowDown', 'KeyE', 'Digit1', 'Digit2'],
  weekend: ['ArrowUp', 'ArrowDown', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyE']
};

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + target);
  await page.waitForFunction(() => typeof GAMES !== 'undefined');

  /* a stable hash of what the board IS, minus what merely animates */
  const snap = () => page.evaluate(() => {
    if (!MG) return 'no-board';
    /* flashTxt STAYS. A key that refuses and says why is not dead — "that is a
       person, not a group" is the game answering you, and stripping it made
       three boards report a dead key for behaving correctly. Only the decaying
       timer itself is cosmetic. */
    const skip = new Set(['flash','flashOk','buzz','t','click','hint',
                          'brief','gid','onDone','dark','darkOf','_plan']);
    const seen = new WeakSet();
    const walk = v => {
      if (v instanceof Set) return [...v].sort().join(',');
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object'){
        if (seen.has(v)) return '<cycle>'; seen.add(v);
        const o = {};
        for (const k of Object.keys(v)) if (!skip.has(k) && typeof v[k] !== 'function') o[k] = walk(v[k]);
        return o;
      }
      return v;
    };
    return JSON.stringify(walk(MG));
  });

  /* ---- CLICK RECTS -----------------------------------------------------
     Every board declares its own hit rectangles — rowRect, optRect, tierRect,
     nodeRect, cardRect, btns — and this pokes MG.click at the centre of each
     one and asserts the board notices.

     WHAT IT CATCHES: a rect that is declared and never wired into the click
     handler. The board goes dead under the mouse with no tell at all, which
     has happened here before — see the note above cable's port handling.
     Deleting diagram's node hit-test is reported as exactly node1 node2 node3.

     WHAT IT CANNOT CATCH, and this was checked rather than assumed: a rect in
     the WRONG PLACE. The click point is computed from the same function the
     handler tests against, so moving quote's tier rects 900px off the panel
     moves the probe with them and everything still reports live. Position is
     visual.js's job — it draws from those same numbers, which is why a
     misplaced rect is at least visible.

     It sets MG.click directly rather than dispatching a real mouse event: the
     page-to-canvas transform is shared by every board and already exercised by
     ordinary play, while the rectangle is per board and can rot per board. */
  const clickResults = [];
  for (const id of Object.keys(CLAIMS)){
    const r = await page.evaluate(async id => {
      const out = { id, dead: [], tested: 0 };
      /* BUTTONS LAST. Clicking SUBMIT first ends the board, and every rect
         tested afterwards then reports dead because step() returns early on a
         submitted board — which is exactly what the first run of this said
         about quote and diagram. Both were fine. */
      const rects = g => {
        const list = [];
        const n = (g.rows && g.rows.length) || (g.tasks && g.tasks.length) ||
                  (g.hand && g.hand.length) || (g.sites && g.sites.length) ||
                  (g.qs && g.qs.length) || 0;
        if (g.rowRect) for (let i = 0; i < Math.min(n, 4); i++)
          list.push(['row' + i, ...g.rowRect(i)]);
        if (g.optRect) for (let i = 0; i < 3; i++) list.push(['opt' + i, ...g.optRect(i)]);
        if (g.tierRect) for (let t = 0; t < 3; t++) list.push(['tier' + t, ...g.tierRect(0, t)]);
        if (g.nodeRect && g.nodes) for (let i = 1; i < Math.min(g.nodes.length, 4); i++)
          list.push(['node' + i, ...g.nodeRect(i)]);
        if (g.cardRect) for (let i = 0; i < 4; i++) list.push(['opt' + i, ...g.cardRect(i)]);
        if (g.btns) g.btns.forEach((b, i) =>
          list.push(['btn:' + (b.k || i), b.x - b.w/2, b.y, b.w, b.h]));
        return list;
      };
      const hash = () => {
        const skip = new Set(['flash','flashOk','buzz','t','click','hint','brief',
                              'gid','onDone','dark','darkOf','_plan']);
        const seen = new WeakSet();
        const walk = v => {
          if (v instanceof Set) return [...v].sort().join(',');
          if (Array.isArray(v)) return v.map(walk);
          if (v && typeof v === 'object'){
            if (seen.has(v)) return '<c>'; seen.add(v);
            const o = {};
            for (const k of Object.keys(v)) if (!skip.has(k) && typeof v[k] !== 'function') o[k] = walk(v[k]);
            return o;
          }
          return v;
        };
        return JSON.stringify(walk(MG));
      };
      SAVE_SUSPEND = true; QUIET = true;
      rngInit('CLK-' + id); runInit('CLK-' + id); rollDay();
      openGame(id, 2, () => {});
      if (!MG) return { id, dead:['could not open'], tested:0 };
      if (MG.brief) MG.brief = null;
      const rs = rects(MG);
      for (const [label, x, y, w, h] of rs){
        if (!MG || MG.finished || MG.submitted || MG.applied) break;
        clearInput(); MG.step(1/30);
        /* A click that lands on what is already selected changes nothing and
           is perfectly alive, so park the cursor somewhere else first. */
        const idx = /^(?:row|node|opt)(\d+)$/.exec(label);
        if (idx && typeof MG.cur === 'number'){
          /* park AWAY from the rect under test — parking on it is how row1
             reported dead while being perfectly alive */
          const want = +idx[1];
          MG.cur = want === 0 ? Math.max(1, want + 1) : 0;
        }
        const before = hash();
        MG.click = { x: x + w/2, y: y + h/2 };
        MG.step(1/30);
        out.tested++;
        if (hash() === before) out.dead.push(label);
        clearInput();
      }
      return out;
    }, id);
    clickResults.push(r);
  }

  const results = [];
  for (const id of Object.keys(CLAIMS)){
    const dead = [];
    for (const key of CLAIMS[id]){
      /* a fresh board per key, so an earlier press cannot mask a later one */
      const opened = await page.evaluate(id => {
        try {
          SAVE_SUSPEND = true; QUIET = true;
          rngInit('KEYS-' + id); runInit('KEYS-' + id); rollDay();
          openGame(id, 2, () => {});
          if (MG && MG.brief) MG.brief = null;    // the card is not the board
          return !!MG;
        } catch(e){ return 'ERR ' + e.message; }
      }, id);
      if (opened !== true){ dead.push(key + '(open:' + opened + ')'); continue; }
      /* The real frame loop clears `press` every tick; this harness steps the
         board by hand, so without an explicit clear a flag set by the PREVIOUS
         key survives into the next board and is consumed by its first step.
         That produced dead-key reports on boards nothing had been done to, and
         a different set of them on every run. */
      await page.evaluate(() => { clearInput(); if (MG) MG.step(1/30); });
      const busy = await page.evaluate(() => !MG || !!MG.finished);
      if (busy){ dead.push(key + '(board-gone)'); continue; }
      const before = await snap();
      await page.keyboard.press(key);
      /* one fixed step, exactly as the loop would give it */
      await page.evaluate(() => { if (MG) MG.step(1/30); });
      let after = await snap();
      await page.evaluate(() => clearInput());
      if (before !== after) continue;
      /* A key can land on what is already SET — every quote line starts at
         ADEQUATE, so 2 sets what is already there, and moving the cursor does
         not help because the next line starts there too. So perturb with the
         board's own sibling keys until the key under test has somewhere to go,
         and only then call it dead. */
      let alive = false;
      for (const poke of ['ArrowDown', 'Digit1', 'Digit3', 'KeyE']){
        if (poke === key) continue;
        await page.keyboard.press(poke);
        await page.evaluate(() => { if (MG) MG.step(1/30); clearInput(); });
        if (await page.evaluate(() => !MG || !!MG.finished)) break;
        const mid = await snap();
        await page.keyboard.press(key);
        await page.evaluate(() => { if (MG) MG.step(1/30); });
        after = await snap();
        await page.evaluate(() => clearInput());
        if (mid !== after){ alive = true; break; }
      }
      if (!alive) dead.push(key);
    }
    results.push({ id, dead });
  }

  console.log('DEAD-KEY SWEEP — every key each how-to-play card promises\n');
  let bad = 0;
  for (const r of results){
    if (r.dead.length) bad++;
    console.log('  ' + r.id.padEnd(10) + (r.dead.length
      ? 'DEAD: ' + r.dead.join(' ')
      : CLAIMS[r.id].length + ' keys, all live'));
  }
  console.log('\nCLICK-RECT SWEEP — every rectangle each board declares\n');
  let cbad = 0;
  for (const r of clickResults){
    if (r.dead.length) cbad++;
    console.log('  ' + r.id.padEnd(10) + (r.dead.length
      ? 'DEAD: ' + r.dead.join(' ')
      : r.tested
      ? r.tested + ' rects, all live'
      : 'no declared rects — hit-tests inline, NOT COVERED HERE'));
  }
  if (errs.length) console.log('\npage errors: ' + errs.length + '\n  ' + errs.slice(0,4).join('\n  '));
  console.log(bad ? '\n' + bad + ' BOARD(S) WITH A DEAD KEY' : '\nNO DEAD KEYS');
  console.log(cbad ? cbad + ' BOARD(S) WITH A DEAD CLICK RECT' : 'NO DEAD CLICK RECTS');
  bad += cbad;
  await browser.close();
  process.exit(bad || errs.length ? 1 : 0);
})();

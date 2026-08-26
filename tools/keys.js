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
  if (errs.length) console.log('\npage errors: ' + errs.length + '\n  ' + errs.slice(0,4).join('\n  '));
  console.log(bad ? '\n' + bad + ' BOARD(S) WITH A DEAD KEY' : '\nNO DEAD KEYS');
  await browser.close();
  process.exit(bad || errs.length ? 1 : 0);
})();

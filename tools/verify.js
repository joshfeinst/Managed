/* Managed: boot + self-test + smoke checks, headless. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
async function launch() {
  try { return await chromium.launch(); }
  catch (e) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    for (const dir of fs.readdirSync(base).filter(d => d.startsWith('chromium'))) {
      const p = path.join(base, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) { try { return await chromium.launch({ executablePath: p }); } catch (_) {} }
    }
    throw e;
  }
}
(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (!/Failed to load resource|net::ERR/.test(t)) errors.push('console: ' + t);
  });
  await page.goto('file://' + process.argv[2]);
  await page.waitForFunction(() => typeof G !== 'undefined' && typeof selfTest === 'function', { timeout: 15000 });
  await page.waitForTimeout(400);

  /* NO TIMED WALK CHECK HERE, DELIBERATELY. The walk is mispriced — the queue
     promised 0.30 min/tile against a real 1.05, and simDay charged a bot 0.238
     — and I tried three ways to guard it. Inside F4 a tight sim() loop races
     the shift clock past a tween that waits on real time: 5.38 min/tile. Out
     here, headless Chromium throttles requestAnimationFrame, and the clock and
     the tween both ride it and distort differently: 0.39 min/tile on the same
     build that measures 1.05 through real key events in a real career.
     Three attempts, three different answers, none reproducible. A check that
     reports a new number every run is worse than no check, because it gets
     ignored and then it gets deleted. The constant is set from the two
     measurements that agree and were taken under real play — a tester's 13
     tiles in 13 game-minutes, and 6 tiles in 3.91 minutes at RELAXED — and
     what IS guarded, exactly and cheaply in F4, is that the bot and the player
     are priced off one constant instead of two. */
  const tests = await page.evaluate(() => selfTest(true).map(r => ({ name:r.name, pass:r.pass, detail:r.detail })));
  const fails = tests.filter(t => !t.pass);
  console.log('SELFTEST ' + (tests.length - fails.length) + '/' + tests.length + ' passed');
  fails.forEach(f => console.log('  FAIL ' + f.name + '  ' + f.detail));

  /* DUPLICATE KEYS IN THE DATA TABLES. A repeated key in an object literal is
     not an error in JavaScript — the later one silently wins and everything
     written under the earlier one is discarded. This file is twelve thousand
     lines of object literals and has been bitten three times: `worst` in
     run.lastScore, which made a whole branch dead code from the day it was
     written; a `const dealt` collision that stopped the page parsing; and a
     CHAT table where three people were given rung-aware lines that were thrown
     away, in silence, because entries for them already existed further down.
     The self-test cannot see this — by the time it runs, the object has
     already collapsed — so it is checked here, against the source text. */
  const src = fs.readFileSync(process.argv[2], 'utf8');
  const dupes = [];
  for (const m of src.matchAll(/\nconst ([A-Z_][A-Z0-9_]*) = \{\n([\s\S]*?)\n\};/g)){
    const table = m[1], body = m[2];
    const keys = [...body.matchAll(/^  '?([\w.$-]+)'?\s*:/gm)].map(x => x[1]);
    const seen = new Map();
    for (const k of keys) seen.set(k, (seen.get(k) || 0) + 1);
    for (const [k, n] of seen) if (n > 1) dupes.push(table + '.' + k + ' x' + n);
  }
  if (dupes.length) console.log('DUPLICATE KEYS ' + dupes.length + '\n  ' + dupes.join('\n  '));
  else console.log('DUPLICATE KEYS 0');

  console.log('PAGE ERRORS ' + errors.length + (errors.length ? '\n  ' + errors.join('\n  ') : ''));
  const clean = fails.length === 0 && errors.length === 0 && dupes.length === 0;
  console.log(clean ? 'VERIFY OK' : 'VERIFY FAILED');
  await browser.close();
  process.exit(clean ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });

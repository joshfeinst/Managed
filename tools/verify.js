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

  const tests = await page.evaluate(() => selfTest(true).map(r => ({ name:r.name, pass:r.pass, detail:r.detail })));
  const fails = tests.filter(t => !t.pass);
  console.log('SELFTEST ' + (tests.length - fails.length) + '/' + tests.length + ' passed');
  fails.forEach(f => console.log('  FAIL ' + f.name + '  ' + f.detail));

  console.log('PAGE ERRORS ' + errors.length + (errors.length ? '\n  ' + errors.join('\n  ') : ''));
  console.log(fails.length === 0 && errors.length === 0 ? 'VERIFY OK' : 'VERIFY FAILED');
  await browser.close();
  process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });

/* THE README MAKES QUANTITATIVE CLAIMS. THIS RE-DERIVES THEM FROM THE GAME.
 *
 * Everything else in this repo is guarded against the game contradicting
 * itself. The README was not, and it had drifted: it said about EIGHTEEN
 * tickets arrive a day when the ladder mean is fourteen and the busiest day
 * the roller can produce is seventeen; it said a day you can work EIGHT OR
 * NINE of when a flawless triager averages six; it said "the ratio holds as
 * you climb" when it goes from nine-of-fifteen at intern to five-of-fifteen
 * at Procurement; and it said a vCIO spends A THIRD of the week in rooms when
 * the number is sixteen per cent. Four wrong numbers on the page a player
 * reads before they ever open the game.
 *
 * The self-test suite cannot reach a markdown file, so this does. Every claim
 * below is the exact sentence from the README, the value re-measured from the
 * built game, and the tolerance the claim is allowed — stated, not implied.
 *
 *   node tools/claims.js [/abs/path/index.html] [/abs/path/README.md]
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');

const target = process.argv[2] || '/home/user/managed/index.html';
/* THE PROSE MOVED AND THE CLAIMS MOVED WITH IT. README.md is the player's
   document -- what the game is, how to play it, what a day is like -- and the
   measured design numbers now live in docs/DESIGN.md, which is where somebody
   who wants to know how it works goes. A claim is a claim wherever it is
   written, so this reads both and checks the pair. Pass a path to check just
   one of them. */
const docsOf = t => { const dir = path.dirname(path.resolve(t));
  return [path.join(dir, 'README.md'), path.join(dir, 'docs', 'DESIGN.md')]; };
const sources = process.argv[3] ? [process.argv[3]] : docsOf(target);

const WORDS = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9,
                ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15,
                sixteen:16, seventeen:17, eighteen:18, nineteen:19, twenty:20,
                thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80,
                ninety:90, hundred:100 };
const num = w => (WORDS[String(w).toLowerCase()] !== undefined
  ? WORDS[String(w).toLowerCase()] : Number(w));

async function launch(){
  try { return await chromium.launch(); } catch (e) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium'))){
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)){ try { return await chromium.launch({ executablePath:p }); } catch (_) {} }
    }
    throw e;
  }
}

(async () => {
  const md = sources.filter(f => fs.existsSync(f))
                    .map(f => fs.readFileSync(f, 'utf8')).join('\n\n')
                    .replace(/\s+/g, ' ');
  const browser = await launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(target));
  await page.waitForFunction(() => typeof simDay === 'function' && typeof ROLES !== 'undefined',
                             null, { timeout: 30000 });

  /* one pass of the ladder, fixed seeds, so the numbers are the same every run */
  const M = await page.evaluate(() => {
    SAVE_SUSPEND = true; QUIET = true; loadMap('office1');
    const per = [];
    for (let r = 0; r < ROLES.length; r++){
      let arr = 0, res = 0, mtg = 0, c = 0;
      for (let s = 0; s < 16; s++){
        rngInit('CLAIM-' + r + '-' + s); runInit('CLAIM-' + r + '-' + s);
        run.rung = r; run.day = 3; rollDay();
        const a = run.plan.arrivals.length;
        for (const e of run.plan.events) mtg += (EVENTS[e.id].fx && EVENTS[e.id].fx.time) || 0;
        simDay(1.0, { order:'pridead' });
        if (!run) continue;
        arr += a; res += run.resolved; c++;
      }
      per.push({ id:ROLES[r].id, arr:arr/c, res:res/c, mtgPct:100*(mtg/c)/DAY_MIN });
    }
    const mean = k => per.reduce((x, p) => x + p[k], 0) / per.length;
    const of = id => per.find(p => p.id === id);
    return {
      per, arrivals:mean('arr'), worked:mean('res'),
      intern:of('intern'), procure:of('procure'), vcio:of('vcio'),
      stakeRatio: STAKES[4] / STAKES[1],
      paceMins: PACES.map(p => DAY_MIN / p.rate / 60),
      tests: (typeof selfTest === 'function') ? null : null
    };
  });

  /* the strategy table: five careers per rule, same seeds, boards played
     perfectly so the ONLY difference is which ticket the bot picks next */
  const T = await page.evaluate(() => {
    SAVE_SUSPEND = true; QUIET = true; loadMap('office1');
    const play = (seed, order, skill) => {
      const o = []; rngInit(seed); runInit(seed);
      for (let d = 0; d < 6 && run && !run.pendingEnd; d++){
        rollDay(); simDay(skill, { order }); if (!run) break;
        o.push(run.perfHist[run.perfHist.length - 1]);
        if (run.pendingEnd) break; startCommute();
      }
      run = null; return o;
    };
    const runAll = (order, skill) => {
      const all = [];
      for (let i = 0; i < 16; i++) all.push.apply(all, play('ORD-' + i, order, skill));
      return 100 * all.reduce((x, y) => x + y, 0) / all.length;
    };
    const best = runAll('pridead', 1);
    return { pridead:best, shortest:runAll('shortest', 1), oldest:runAll('oldest', 1),
             worstpri:runAll('worstpri', 1), noHands:runAll('pridead', 0) };
  });

  /* the suite count is its own claim and its own run */
  const tests = await page.evaluate(() => selfTest(true).length);

  await browser.close();

  const checks = [];
  const claim = (name, re, check) => {
    const m = md.match(re);
    if (!m) return checks.push({ name, ok:false, why:'neither README.md nor docs/DESIGN.md says this any more' });
    const r = check(m);
    checks.push({ name, ok:r.ok, why:r.why });
  };

  claim('the suite count', /runs the (\d+) in-game self-tests/,
    m => ({ ok: +m[1] === tests, why: 'README ' + m[1] + ', suite has ' + tests }));

  claim('tickets arriving in a day', /about (\w+) tickets arrive/,
    m => { const said = num(m[1]);
      return { ok: Math.abs(said - M.arrivals) <= 1,
               why: 'README ' + said + ', measured ' + M.arrivals.toFixed(1) + ' (±1)' }; });

  claim('what a flawless triager gets through',
    /a flawless triager gets through (\w+) or (\w+) of/,
    m => { const lo = num(m[1]), hi = num(m[2]);
      return { ok: M.worked >= lo - 0.5 && M.worked <= hi + 0.5,
               why: 'README ' + lo + '-' + hi + ', measured ' + M.worked.toFixed(1) }; });

  claim('an intern works nine of fifteen', /an intern\s*works (\w+) of (\w+)/,
    m => { const w = num(m[1]), a = num(m[2]);
      return { ok: Math.abs(w - M.intern.res) <= 1 && Math.abs(a - M.intern.arr) <= 1,
               why: 'README ' + w + '/' + a + ', measured ' +
                    M.intern.res.toFixed(1) + '/' + M.intern.arr.toFixed(1) + ' (±1)' }; });

  claim('a Procurement Specialist five of fifteen',
    /a Procurement Specialist (\w+) of (\w+)/,
    m => { const w = num(m[1]), a = num(m[2]);
      return { ok: Math.abs(w - M.procure.res) <= 1 && Math.abs(a - M.procure.arr) <= 1,
               why: 'README ' + w + '/' + a + ', measured ' +
                    M.procure.res.toFixed(1) + '/' + M.procure.arr.toFixed(1) + ' (±1)' }; });

  claim('the day lost to meetings, bottom and top',
    /An intern loses (\w+) per cent of the day to meetings; a vCIO loses (\w+)/,
    m => { const a = num(m[1]), b = num(m[2]);
      return { ok: Math.abs(a - M.intern.mtgPct) <= 2 && Math.abs(b - M.vcio.mtgPct) <= 2,
               why: 'README ' + a + '%/' + b + '%, measured ' +
                    M.intern.mtgPct.toFixed(1) + '%/' + M.vcio.mtgPct.toFixed(1) + '% (±2)' }; });

  claim('what a P1 is worth', /A P1 is worth (\w+) times a P4/,
    m => ({ ok: num(m[1]) === M.stakeRatio,
            why: 'README ' + num(m[1]) + ', STAKES says ' + M.stakeRatio }));

  const near = (said, got, tol) => ({ ok: Math.abs(said - got) <= tol,
    why: 'README ' + said + ', measured ' + got.toFixed(1) + ' (±' + tol + ')' });

  claim('protect the big ones', /\*protect the big\s*ones\* \((\d+(?:\.\d+)?)%\)/,
    m => near(+m[1], T.pridead, 1.5));
  claim('close what you can actually finish',
    /close what you can actually finish\*\s*\((\d+(?:\.\d+)?)%\)/,
    m => near(+m[1], T.shortest, 1.5));
  claim('doing the least important thing first',
    /doing the least important thing first\s*\((\d+(?:\.\d+)?)%\)/,
    m => near(+m[1], T.worstpri, 1.5));
  claim('working the queue in the order it arrived',
    /the queue in the order it arrived\*\* \((\d+(?:\.\d+)?)%\)/,
    m => near(+m[1], T.oldest, 1.5));
  /* THE GAP BETWEEN THE TWO WINNING RULES IS A CLAIM TOO. The README said "two
     points apart, so there is no single right answer" — a sentence whose whole
     meaning is the number in front of it. Steepening STAKES took the gap to
     four and left the sentence behind, saying the opposite of what the table
     above it now shows. */
  claim('how far apart the two winning rules are',
    /\((\d+(?:\.\d+)?)%\) — (\w+) points apart/,
    m => { const W = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7 };
           const said = W[m[2].toLowerCase()], got = T.pridead - T.shortest;
           /* tighter than the percentage claims on purpose: this one is
              spelled as a WORD, so it can only ever be an integer, and a ±1.5
              window let "two" pass against a measured 3.5 — which is the exact
              sentence this check exists to catch. */
           return { ok: said != null && Math.abs(said - got) <= 0.75,
                    why: 'README ' + m[2] + ', measured ' + got.toFixed(1) + ' (±0.75)' }; });
  claim('what hands are worth', /acing them is (\d+(?:\.\d+)?) points/,
    m => near(+m[1], T.pridead - T.noHands, 1.5));
  claim('what judgement is worth', /the best triage rule against the\s*worst is (\d+(?:\.\d+)?)/,
    m => near(+m[1], T.pridead - T.worstpri, 1.5));
  claim('and judgement is worth more than hands',
    /judgement matters more/,
    () => ({ ok: (T.pridead - T.worstpri) > (T.pridead - T.noHands),
             why: 'triage ' + (T.pridead - T.worstpri).toFixed(1) +
                  ' vs hands ' + (T.pridead - T.noHands).toFixed(1) }));

  claim('the pace dial',
    /about (\w+) minutes on Relaxed, (\w+) on Standard, (\w+) on Crunch/,
    m => { const said = [num(m[1]), num(m[2]), num(m[3])];
      const bad = said.map((v, i) => Math.abs(v - M.paceMins[i]) <= 0.6 ? null :
        said[i] + ' vs ' + M.paceMins[i].toFixed(1)).filter(Boolean);
      return { ok: !bad.length, why: bad.length ? bad.join(', ')
               : said.join('/') + ' vs ' + M.paceMins.map(x => x.toFixed(1)).join('/') }; });

  console.log('DOCUMENTED CLAIMS, RE-DERIVED FROM THE GAME — README.md + docs/DESIGN.md\n');
  for (const p of M.per)
    console.log('  ' + p.id.padEnd(9) + String(p.arr.toFixed(1)).padStart(5) + ' arrive  ' +
                String(p.res.toFixed(1)).padStart(5) + ' worked  ' +
                String(p.mtgPct.toFixed(0)).padStart(3) + '% in rooms');
  console.log('');
  let bad = 0;
  for (const c of checks){
    if (!c.ok) bad++;
    console.log('  ' + (c.ok ? ' ok ' : 'FAIL') + '  ' + c.name.padEnd(42) + c.why);
  }
  if (errs.length) console.log('\npage errors: ' + errs.length + '\n  ' + errs.join('\n  '));
  console.log('');
  console.log(bad || errs.length
    ? bad + ' CLAIM(S) THE GAME DOES NOT BACK'
    : 'EVERY NUMBER IN THE DOCS IS ONE THE GAME PRODUCES');
  process.exit(bad || errs.length ? 1 : 0);
})();

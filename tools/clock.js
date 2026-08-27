/* Managed clock lint: an option that says how long it takes has to take that long.
 *
 * The game charges an option's cost in game-minutes and shows the clock moving,
 * so a choice whose own words state a duration is making a promise the player
 * can watch it break. Three of these shipped and were found by reading:
 * "ninety minutes each way" over an option charging sixty-six, "an hour each
 * way" over one charging twenty-six, and "Rebuild it. It takes an hour" over
 * one charging twelve.
 *
 * MOST QUOTED DURATIONS ARE NOT ABOUT YOUR TIME, which is why this is a lint
 * with a list rather than an assertion. "the tills go down for eleven minutes",
 * "what it would cost to hit two hours", "log 0.25 hours" and "an hour a week
 * sitting with T1" are all durations belonging to the world, the contract or
 * the future, and the game is right to charge something else for them. Those
 * are named in ABOUT_THE_WORLD. Everything else has to be within TOLERANCE of
 * what it charges, or be added to the list with a reason.
 *
 *   node tools/clock.js /abs/path/index.html
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '/home/user/managed/index.html';
const TOLERANCE = 0.45;          // a fifth of an hour either way reads as "about"

/* node id -> why its number is not a claim about the player's clock */
const ABOUT_THE_WORLD = {
  'pw.vlan.c':  'the tills are down for eleven minutes; your evening is not',
  'big.dr.c':   'two hours is the recovery objective being quoted at somebody',
  'e.hd2.matrix':'an hour a WEEK, from next week, not this afternoon',
  't.mouse.b':  '0.25 hours is what you put on the timesheet, not what it took',
  'pw.back.c':  'the video is five minutes long; recording it is not',
  'h.line.b':   'ten minutes is when you promise to ring back',
  'r.bye.b':    'an hour with them, booked before the 30th, not spent now',
  'r.esc.b':    'within the hour is a deadline you are agreeing to',
  'vx.buss.b':  'two hours booked in Derek\'s calendar, not taken out of yours',
  'pa.less.b':  'twenty minutes is what you promise the room it will take them',
  'j.inbox.b':  'twenty minutes of showing them, charged at twenty-two',
  'vx.strat.c': 'the twenty minutes is the slot you are given, not the work',
  'dx.dir9clock.c':'twenty-four hours is what you give forensics; you spend 26 minutes',
  'gs.room.b':  'forty minutes is how long the meeting then runs, not your handling of it'
};

async function launch(){ try { return await chromium.launch(); } catch(e){
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium'))){
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({ executablePath:p }); } catch(_){} }
  }
  throw e; } }

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + target);
  await page.waitForFunction(() => typeof DIALOGUE !== 'undefined');
  const rows = await page.evaluate(() => {
    const W = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
      eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,twenty:20,thirty:30,
      forty:40,fifty:50,sixty:60,ninety:90 };
    const out = [];
    for (const nid in DIALOGUE)
      for (const o of DIALOGUE[nid].opts || []){
        /* TENS-AND-UNITS, or the lint quotes its own wrong number. "twenty-four
           hours" matched \w+ at "four" and was reported as four hours. */
        const m = /\b([a-z]+-[a-z]+|\w+|\d+)[ -](minute|minutes|hour|hours)\b|\bhalf an hour\b|\ban hour\b/i.exec(o.t);
        if (!m) continue;
        const words = t => t.toLowerCase().split('-')
          .reduce((a, w) => a === null || W[w] === undefined ? null : a + W[w], 0);
        let said = null;
        if (/half an hour/i.test(m[0])) said = 30;
        else if (/^an hour/i.test(m[0])) said = 60;
        else { const n = /^\d+$/.test(m[1]) ? +m[1] : words(m[1]);
               if (n) said = /hour/i.test(m[2]) ? n * 60 : n; }
        if (said === null) continue;
        out.push({ node:nid, text:o.t, said, charged:(o.fx && o.fx.time) || 0 });
      }
    return out;
  });
  await browser.close();

  const bad = [], excused = [];
  for (const r of rows){
    if (ABOUT_THE_WORLD[r.node]){ excused.push(r); continue; }
    const off = Math.abs(r.charged - r.said) / Math.max(1, r.said);
    if (off > TOLERANCE) bad.push(Object.assign({ off }, r));
  }
  console.log('OPTIONS THAT SAY HOW LONG THEY TAKE — ' + rows.length + ' found\n');
  for (const r of rows.filter(x => !ABOUT_THE_WORLD[x.node]))
    console.log('  ' + String(r.said).padStart(4) + ' said  ' + String(r.charged).padStart(4) +
                ' charged   ' + r.node.padEnd(15) + r.text.slice(0, 46));
  console.log('\n  excused as not about your clock: ' + excused.length +
              (excused.length ? ' (' + excused.map(x => x.node).join(' ') + ')' : ''));
  if (errs.length) console.log('\npage errors:\n  ' + errs.join('\n  '));
  if (bad.length){
    console.log('\n' + bad.length + ' OPTION(S) PROMISE A CLOCK THE GAME DOES NOT CHARGE');
    for (const r of bad)
      console.log('  ' + r.node + ': says ' + r.said + ', charges ' + r.charged +
                  ' — "' + r.text.slice(0, 50) + '"');
    process.exit(1);
  }
  console.log('\nEVERY OPTION THAT NAMES A DURATION CHARGES IT');
  process.exit(errs.length ? 1 : 0);
})();

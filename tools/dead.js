/* WHAT IN HERE IS WRITTEN AND NEVER READ.
 *
 * Three bugs in one night came from the same shape: a field that looks like it
 * configures something and does not.
 *
 *   run.cancelled   counted the meetings that would not fit a rung's calendar,
 *                   and nothing read it. The handbook promised the player that
 *                   joke and the game never told it. It was never reset either,
 *                   so by Friday it held the week.
 *   gates.cert      sat as `cert:null` on all ten rungs under a note saying
 *                   "plus the cert, once certs exist". Certificates exist.
 *                   Nothing has ever read gates.cert; an author writing
 *                   cert:'itil' would have gated nothing.
 *   TICKETS.sla     an authored deadline on 323 templates that makeArrival
 *                   stopped reading when slack became a multiple of the work.
 *   nearestLift()   a function whose own comment named a caller that had
 *                   stopped calling it.
 *
 * None of those is a crash, so nothing catches them. This does: it reads the
 * shipped data structures out of the running game, then asks the source text
 * whether anything ever reads each key back.
 *
 *   node tools/dead.js [/abs/path/index.html]
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const target = process.argv[2] || '/home/user/managed/index.html';

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
  const src = fs.readFileSync(path.resolve(target), 'utf8');
  /* THE SCRIPT BLOCKS ONLY. The page's own markup is full of prose with
     apostrophes in it — "anyone's week" — and a lone quote in HTML text
     desynchronises the string scanner below, which then blanks half the file
     and reports every key in it as dead. */
  const js = (src.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [])
    .map(b2 => b2.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')).join('\n');
  /* comments are prose about the code, not code: a key mentioned only in a
     note explaining that it is dead must still count as dead */
  let code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  /* AND NOT THE SUITE. A field the game never reads but its own self-test
     does is still dead to the player — run.cancelled was read by nothing but
     the guard written for it, and that has to count as nothing. */
  {
    /* Brace counting does not survive this file — the suite is full of string
       literals and regexes containing braces — so the body runs to the next
       thing declared at column zero. */
    const at = code.indexOf('\nfunction selfTest(');
    if (at >= 0){
      const nxt = /\n(?:function|const|let|var|addEventListener)\b/g;
      nxt.lastIndex = at + 1;
      const m2 = nxt.exec(code);
      const end = m2 ? m2.index : code.length;
      code = code.slice(0, at) + code.slice(end);
    }
  }
  /* ...and a property access has to be a property access. Dialogue ids look
     like ones: 'h.cert.a' contains ".cert", which made gates.cert read as
     live. Strings are blanked for the `.key` pass and kept for the 'key' one. */

  const browser = await launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(target));
  await page.waitForFunction(() => typeof TICKETS !== 'undefined' && typeof ROLES !== 'undefined',
                             null, { timeout: 30000 });

  const D = await page.evaluate(() => {
    const keys = o => Object.keys(o || {});
    const union = (arr, pick) => {
      const s = new Set();
      for (const x of arr) for (const k of keys(pick ? pick(x) : x)) s.add(k);
      return [...s];
    };
    const tix = Object.keys(TICKETS).map(id => TICKETS[id]);
    return {
      roleKeys:  union(ROLES),
      gateKeys:  union(ROLES, r => r.gates),
      queueKeys: union(ROLES, r => r.queue),
      tixKeys:   union(tix),
      stepKeys:  union(tix.flatMap(t => t.steps || [])),
      npcKeys:   union(Object.keys(NPCS).map(k => NPCS[k])),
      evKeys:    union(Object.keys(EVENTS).map(k => EVENTS[k])),
      certKeys:  union(Object.keys(CERTS).map(k => CERTS[k])),
      fxKeys:    union(Object.keys(CERTS).map(k => CERTS[k].fx)
                  .concat(Object.keys(PERKS).map(k => PERKS[k].fx))),
      dialogue:  Object.keys(DIALOGUE),
      pointedAt: (() => {
        const s = new Set();
        for (const id in TICKETS) for (const st of TICKETS[id].steps || []){
          if (st.say) s.add(st.say); if (st.choice) s.add(st.choice);
        }
        for (const n in NPCS) if (NPCS[n].talk) s.add(NPCS[n].talk);
        for (const e in EVENTS) if (EVENTS[e].scene) s.add(EVENTS[e].scene);
        return [...s];
      })()
    };
  });
  await browser.close();

  /* a key is READ if the source ever names it outside the literal that
     declares it: `.key`, `['key']`, or a destructure */
  /* A PROPERTY READ, NOT A DIALOGUE ID THAT LOOKS LIKE ONE. 'h.cert.a'
     contains ".cert", which made the dead gates.cert field read as live.
     Blanking every string first was the obvious fix and is worse: one
     apostrophe in a trailing line comment or inside a regex character class
     desynchronises the scanner and it eats thousands of lines, which is how
     eleven real reads of `.sched` came back as none. So the match is kept and
     the ones sitting inside a quoted dotted id are dropped instead. */
  const readsIt = k => {
    const re = new RegExp('\\.' + k + '\\b', 'g');
    let m;
    while ((m = re.exec(code))){
      const before = code.slice(Math.max(0, m.index - 40), m.index);
      if (/['"][\w.]*$/.test(before)) continue;          // inside 'a.dotted.id'
      return true;
    }
    /* ...or the key as a bare string: metaFx('meeting') reads a cert's fx by
       name and never writes `.meeting` anywhere */
    return (code.match(new RegExp('[\'"]' + k + '[\'"]', 'g')) || []).length > 0;
  };

  const groups = [
    ['ROLES entry',        D.roleKeys],
    ['ROLES .gates',       D.gateKeys],
    ['ROLES .queue',       D.queueKeys],
    ['TICKETS entry',      D.tixKeys],
    ['a ticket step',      D.stepKeys],
    ['NPCS entry',         D.npcKeys],
    ['EVENTS entry',       D.evKeys],
    ['CERTS entry',        D.certKeys],
    ['a cert/perk fx',     D.fxKeys]
  ];
  const deadKeys = [];
  for (const [what, ks] of groups)
    for (const k of ks) if (!readsIt(k)) deadKeys.push(what + ': ' + k);

  /* fields on `run` and `meta` whose every mention is an assignment */
  /* A LINE THAT ASSIGNS THE FIELD IS A WRITE, WHOLE. `x = (x || 0) + 1` reads
     x, and counting that as a consumer is how run.cancelled — incremented in
     one place, printed nowhere — looked alive for the whole life of the bug. */
  const stateDead = [];
  const lines = code.split('\n');
  for (const root of ['run', 'meta', 'G', 'W2']){
    const wrote = new Set(), read = new Set();
    const assign = new RegExp('\\b' + root + '\\.(\\w+)\\s*(\\+\\+|--|[-+*/]?=(?!=))');
    const any = new RegExp('\\b' + root + '\\.(\\w+)', 'g');
    for (const line of lines){
      const a2 = assign.exec(line);
      for (const m of line.matchAll(any)){
        if (a2 && m[1] === a2[1]) wrote.add(m[1]);
        else read.add(m[1]);
      }
    }
    for (const k of wrote) if (!read.has(k)) stateDead.push(root + '.' + k);
  }

  /* functions nothing ever names again — in the game OR in the harnesses next
     door, which is where simDay is called from and nowhere else */
  const toolsDir = path.dirname(path.resolve(__filename));
  const tools = fs.readdirSync(toolsDir).filter(f => f.endsWith('.js'))
    .map(f => fs.readFileSync(path.join(toolsDir, f), 'utf8')).join('\n');
  const fnDead = [];
  /* DECLARATIONS only, at the start of a line. A named function EXPRESSION —
     addEventListener('keydown', function bootSkip(e){...}) — carries its name
     for the stack trace and nothing is meant to call it again. */
  for (const m of code.matchAll(/^function\s+(\w+)\s*\(/gm)){
    const name = m[1];
    const inGame = (code.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length;
    const inTools = (tools.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length;
    if (inGame <= 1 && !inTools) fnDead.push(name + '()');
  }

  /* dialogue nodes nothing points at, in data or in code */
  const pointed = new Set(D.pointedAt);
  /* its own declaration is one mention, so a node nothing else names appears
     exactly once */
  const namedTimes = id => (code.match(new RegExp("['\"]" + id.replace(/\./g, '\\.') + "['\"]", 'g')) || []).length;
  /* and a node can be reached by a key the code BUILDS: the promotion scenes
     are looked up as 'promo.' + ROLES[rung].id and their literal never appears */
  const builtPrefix = id => {
    const cut = id.lastIndexOf('.');
    if (cut < 0) return false;
    const pre = id.slice(0, cut + 1);
    return code.indexOf("'" + pre + "'") >= 0 || code.indexOf('"' + pre + '"') >= 0;
  };
  const orphanNodes = D.dialogue.filter(id =>
    !pointed.has(id) && namedTimes(id) <= 1 && !builtPrefix(id));

  const say = (title, rows) => {
    console.log('\n' + title + ': ' + (rows.length || 'none'));
    for (const r of rows.slice(0, 20)) console.log('  ' + r);
    if (rows.length > 20) console.log('  ...and ' + (rows.length - 20) + ' more');
  };
  console.log('WRITTEN AND NEVER READ — ' + path.basename(target));
  say('data keys nothing reads back', deadKeys);
  say('state fields whose every mention is a write', stateDead);
  say('functions nothing calls', fnDead);
  say('dialogue nodes nothing points at', orphanNodes);

  const total = deadKeys.length + stateDead.length + fnDead.length + orphanNodes.length;
  console.log('\n' + (total ? total + ' THING(S) WRITTEN AND NEVER READ'
                            : 'NOTHING IN HERE IS WRITTEN AND NEVER READ'));
  process.exit(total ? 1 : 0);
})();

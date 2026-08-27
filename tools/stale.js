/* A COMMENT THAT QUOTES A BALANCE NUMBER MUST QUOTE THE LIVE ONE.
 *
 * This file justifies every tuned number in prose beside it, which is most of
 * why it can be changed safely — and that only works while the prose is true.
 * Two comments had rotted when this was written:
 *
 *   "Why the INTERN bar is 0.70 and not the 0.76 it shipped at"   (it is 0.73)
 *   "firedBelow is live at rung 9 — it is 0.38"                   (it is 0.31)
 *
 * The first is the worse of the two. It carries a measured promotion table
 * captioned "at the 70% bar", four profiles deep, recorded so that whoever
 * moved the bar next would be moving it against evidence — and the bar had
 * moved out from under it. A measurement recorded against a number the build
 * no longer has does not read as stale. It reads as evidence.
 *
 * The rule, deliberately loose enough not to fight the file's own habits:
 * a comment line that NAMES a tunable and quotes decimals must include the
 * live value among them. That leaves "0.706 -> 0.650" alone, because the
 * destination is live; it leaves "0.70 and not the 0.76 it shipped at" red,
 * because neither is. History is welcome as long as the present is in the
 * sentence too.
 *
 *   node tools/stale.js /abs/path/index.html
 */
const fs = require('fs');
const target = process.argv[2] || '/home/user/managed/index.html';
const src = fs.readFileSync(target, 'utf8');
const lines = src.split('\n');

/* ---- what the game actually holds ---------------------------------------- */
const live = {};                       // name -> Set of live values (as numbers)
const add = (k, v) => (live[k] = live[k] || new Set()).add(+v);

/* Every rung's gate, read from ROLES. SPLIT ON THE RECORDS, don't pattern-match
   across them: an `id:'x', title:..., pay:N, gates:{...}` regex needs those
   four to be adjacent, and three rungs carry a paragraph of tuning history
   between pay and gates. It silently read 7 of the 10 and reported the other
   three as though they did not exist. */
/* ...and only the ROLES array, not the rest of the file after it. */
const roleStart = src.indexOf('const ROLES = [');
const roleBody = src.slice(roleStart, src.indexOf('\n];', roleStart));
const recs = roleBody.split(/\{\s*id:'/).slice(1);
const ratios = [];
for (const rec of recs){
  const id = (/^(\w+)'/.exec(rec) || [])[1];
  if (!id) continue;
  /* up to `queue:`, which every rung has directly after its gate — a
     non-greedy match to the first `}` stops inside nextAt:{perf,days} and
     loses firedBelow on the nine rungs that have a nextAt at all. */
  const gates = /gates:\s*\{([\s\S]*?)\}?,?\s*\n?\s*queue:/.exec(rec);
  if (!gates) continue;
  const g = gates[1];
  const perf = /perf:\s*([\d.]+)/.exec(g);
  const fb   = /firedBelow:\s*([\d.]+)/.exec(g);
  if (perf && fb) ratios.push(+(+fb[1] / +perf[1]).toFixed(2));
  /* "bar" HAS TO BE QUALIFIED AND firedBelow DOES NOT. A bare "bar" matched
     "lowers the PROMOTION BAR by 7.0 points", which is a delta and not a bar.
     firedBelow is a code identifier English never writes, and the comment that
     started this tool says "firedBelow is live at rung 9" without naming the
     rung — qualifying it would have left exactly that line unchecked. */
  if (perf) add(id + ' bar', perf[1]);
  if (fb){ add('firedBelow', fb[1]); add(id + ' firedBelow', fb[1]); }
}
/* THE RATIO IS A CLAIM TOO, AND IT IS A CLAIM ABOUT EVERY RUNG. Three separate
   comments say "firedBelow stays 0.45x the bar, the ratio every rung uses", so
   the derived ratio is verified rather than suppressed — and it is added ONLY
   if every rung agrees. Adding each rung's own ratio let nine rungs vouch for a
   tenth that had been retuned out of line, which is the opposite of what those
   three sentences promise. */
if (ratios.length && ratios.every(r => r === ratios[0])) add('firedBelow', ratios[0].toFixed(2));

/* and the top-level dials */
for (const m of src.matchAll(/^const ([A-Z][A-Z0-9_]{2,})\s*=\s*(-?[\d.]+)\s*[;,]/gm))
  add(m[1], m[2]);
/* ...including the ones that live inside a single record */
/* NAMED FIELDS ONLY, AND NEVER A WORD ENGLISH ALSO USES. A bare `rate` bound
   BURN.rate (0.35) and the pace dials (0.62/1/1.5) to a comment that says "the
   rate" and means ratePerHr, so the generic ones are out and the specific one
   is in. A name that cannot be quoted unambiguously is not worth checking.

   slaScale and slaMult went the same way, and they are the clearest statement
   of this tool's limit: a comment line can NAME one thing and quote a number
   about another. "every slaScale on the ladder, against a work*1.15 threshold"
   names slaScale and quotes a threshold; "corr(pri, slaMult) was -0.28" names
   slaMult and quotes a correlation. Neither is stale and both were reported.
   A lint that cries wolf gets ignored, which is worse than no lint, so the set
   is only names that cannot plausibly sit beside a number that is not theirs.
   It is deliberately narrow rather than deliberately thorough. */
for (const m of src.matchAll(/\b(perPoint|maxHelp|freeCups|sleepDebt|entropy|ratePerHr|night|weekend|frayed|wrecked|crashStress):\s*(-?[\d.]+)/g))
  add(m[1], m[2]);

/* ---- which lines are comment ---------------------------------------------- */
const isComment = new Array(lines.length).fill(false);
{
  let block = false;
  for (let i = 0; i < lines.length; i++){
    const t = lines[i];
    if (block){ isComment[i] = true; if (t.includes('*/')) block = false; continue; }
    const open = t.indexOf('/*');
    if (open >= 0 && !t.includes('*/', open)){ isComment[i] = true; block = true; continue; }
    if (open >= 0 || t.trim().startsWith('//')) isComment[i] = true;
  }
}

/* ---- the check ------------------------------------------------------------ */
/* BLOCKS, NOT LINES. A comment is a paragraph and its sentences share a
   subject: "copy-pasted down the ladder: ratePerHr 3.0 on eight consecutive
   rungs" is a true sentence about the bug that was fixed, and the live 1.9 is
   four lines further down in the same note. Checking line by line called that
   stale. The rule is per block: somewhere in this comment, the number the game
   holds has to appear. */
const blockOf = new Array(lines.length).fill(-1);
const blocks = [];
for (let i = 0; i < lines.length; i++){
  if (!isComment[i]) continue;
  if (i > 0 && isComment[i - 1]) blockOf[i] = blockOf[i - 1];
  else { blockOf[i] = blocks.length; blocks.push([]); }
  blocks[blockOf[i]].push(i);
}
const blockNums = blocks.map(idx => {
  const out = new Set();
  for (const i of idx)
    for (const m of lines[i].matchAll(/(?<![\w.])(\d*\.\d+)(?!\d)/g)) out.add(+m[1]);
  return out;
});

const names = Object.keys(live).sort((a, b) => b.length - a.length);
const hits = [];
for (let i = 0; i < lines.length; i++){
  if (!isComment[i]) continue;
  const L = lines[i];
  /* a trailing full stop is punctuation, not part of the number — excluding it
     made "the bar is 0.73." read as quoting nothing at all */
  const nums = [...L.matchAll(/(?<![\w.])(\d*\.\d+)(?!\d)/g)].map(m => +m[1]);
  if (!nums.length) continue;
  /* CONSTANTS ARE MATCHED CASE-SENSITIVELY, because they are written in
     SCREAMING_CASE and English is not: a case-blind \bTILE\b matched "a real
     player walks a tile in about", and reported the 16-pixel tile size as a
     stale walking speed. Rung-qualified names are prose and stay case-blind. */
  const name = names.find(n => n.includes(' ')
    ? new RegExp('\\b' + n.replace(' ', '\\s+') + '\\b', 'i').test(L)
    : new RegExp('\\b' + n + '\\b').test(L));
  if (!name) continue;
  const want = live[name];
  /* the present has to be somewhere in this comment, not necessarily this line */
  if ([...blockNums[blockOf[i]]].some(v => want.has(v))) continue;
  if (hits.some(h => h.block === blockOf[i] && h.name === name)) continue;
  hits.push({ block: blockOf[i], line: i + 1, name, quoted: nums.join(', '),
              want: [...want].join(' or '), text: L.trim().slice(0, 96) });
}

console.log('COMMENTS THAT QUOTE A TUNED NUMBER, CHECKED AGAINST THE GAME\n');
console.log('  tunables read from the source: ' + Object.keys(live).length);
console.log('');
for (const h of hits){
  console.log('  FAIL  line ' + h.line + '  [' + h.name + '] quotes ' + h.quoted +
              ', the game holds ' + h.want);
  console.log('        ' + h.text);
}
console.log(hits.length
  ? '\n' + hits.length + ' COMMENT(S) QUOTE A NUMBER THE GAME DOES NOT HOLD'
  : '\nEVERY NUMBER QUOTED IN A COMMENT IS ONE THE GAME HOLDS');
process.exit(hits.length ? 1 : 0);

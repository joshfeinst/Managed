/* EVERY MAP IN THE BUILDING, READ AS A LEVEL.
 *
 * The self-test suite proves the maps are CORRECT: every anchor reachable,
 * every ticket destination inside the walk budget, no NPC teleport-fallbacks.
 * It has nothing to say about whether they are any good, and nothing at all
 * to say about the thing that turned out to be wrong with them.
 *
 * The ground floor ships with two doors at (8,16) and (9,16) that open north
 * into reception and onto nothing at all in every other direction. They are
 * the front doors of the building. A player walks up to them, presses E, and
 * the game does nothing — LEGEND gives 'D' no act, and interact() has carried
 * `case 'door': break;` since the first build. Meanwhile five onsite-* tickets
 * narrate a ninety-minute drive to a client site and then send the player to
 * the lift, and elevatorLine() holds a line about the car park that no player
 * can ever read, because takeLift() only reaches it when the destination map
 * is missing and both maps always exist.
 *
 * So: read each map as a level.
 *   - a door has to be a way THROUGH (walkable on both sides) or a way OUT
 *     (an act that changes the map). A door that is neither is a promise the
 *     building does not keep.
 *   - the walkable floor has to be ONE region. An island is a room nobody can
 *     reach and the reachability lint only checks anchors, not floor.
 *   - every glyph LEGEND defines should be somewhere, or it is art nobody sees.
 *   - every act should be reachable from a walkable tile beside it.
 *
 *   node tools/levels.js [/abs/path/index.html]
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const FILE = process.argv[2] || path.join(__dirname, '..', 'index.html');
async function launch(){ try { return await chromium.launch(); } catch(e){
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium'))){
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)){ try { return await chromium.launch({ executablePath:p }); } catch(_){} }
  }
  throw e; } }

(async () => {
  const b = await launch(), page = await b.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(FILE));
  await page.waitForFunction(() => typeof MAPS !== 'undefined', null, { timeout:25000 });

  const out = await page.evaluate(() => {
    /* which acts actually take you somewhere else. Read off the dispatcher's
       behaviour rather than hard-coded, so a new transition act is covered the
       day it is added: an act is a way out if using it changes W2.id. */
    const transitions = new Set();
    const probe = act => {
      const was = W2.id, savedRun = run, savedState = G.state;
      try {
        SAVE_SUSPEND = true; QUIET = true;
        if (!run){ rngInit('LVL'); runInit('LVL'); }
        G.state = 'work';
        interact(act);
        if (W2.id !== was){ transitions.add(act); loadMap(was); }
      } catch (_) { /* an act that throws is not a way out */ }
      run = savedRun; G.state = savedState;
      if (W2.id !== was) loadMap(was);
    };

    const report = [];
    const fails = [];
    for (const mid in MAPS){
      loadMap(mid);
      const acts = new Set();
      for (let i = 0; i < W2.W * W2.H; i++) if (W2.act[i]) acts.add(W2.act[i]);
      for (const a of acts) if (!transitions.has(a)) probe(a);
      loadMap(mid);

      const walk = (x, y) => x >= 0 && y >= 0 && x < W2.W && y < W2.H && !W2.solid[y*W2.W + x];
      const rows = MAPS[mid].map;
      const broken = [];
      for (let y = 0; y < rows.length; y++){
        for (let x = 0; x < rows[y].length; x++){
          if (rows[y][x] !== 'D') continue;
          const n = walk(x, y-1), s = walk(x, y+1), w = walk(x-1, y), e = walk(x+1, y);
          if ((n && s) || (w && e)) continue;              // a way through
          const act = W2.act[y*W2.W + x];
          if (act && transitions.has(act)) continue;       // a way out
          broken.push('(' + x + ',' + y + ')' +
            (act ? ' act:' + act + ' which goes nowhere' : ' no act at all'));
        }
      }
      if (broken.length) fails.push(mid + ': ' + broken.length +
        ' door(s) that are neither a way through nor a way out — ' + broken.join(' '));

      /* one region of floor, or somewhere is unreachable */
      const seen = new Uint8Array(W2.W * W2.H); const regions = [];
      for (let y = 0; y < W2.H; y++) for (let x = 0; x < W2.W; x++){
        const i = y*W2.W + x; if (W2.solid[i] || seen[i]) continue;
        let n = 0; const st = [[x,y]]; seen[i] = 1;
        while (st.length){
          const [cx, cy] = st.pop(); n++;
          for (const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
            const nx = cx+dx, ny = cy+dy;
            if (nx < 0 || ny < 0 || nx >= W2.W || ny >= W2.H) continue;
            const j = ny*W2.W + nx; if (W2.solid[j] || seen[j]) continue;
            seen[j] = 1; st.push([nx, ny]);
          }
        }
        regions.push(n + '@' + x + ',' + y);
      }
      if (regions.length > 1) fails.push(mid + ': floor is in ' + regions.length +
        ' unconnected pieces — ' + regions.join(' '));

      /* an act you cannot stand next to is an act nobody can use */
      const stranded = [];
      for (let y = 0; y < W2.H; y++) for (let x = 0; x < W2.W; x++){
        if (!W2.act[y*W2.W + x]) continue;
        if (![[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy]) => walk(x+dx, y+dy)))
          stranded.push(W2.act[y*W2.W + x] + '(' + x + ',' + y + ')');
      }
      if (stranded.length) fails.push(mid + ': ' + stranded.length +
        ' act(s) with no walkable tile beside them — ' + stranded.slice(0,6).join(' '));

      report.push('  ' + mid.padEnd(9) + W2.W + 'x' + W2.H +
        '   floor ' + regions[0] +
        '   doors ' + rows.join('').split('D').length +
        '   acts ' + [...acts].length +
        (broken.length ? '   ' + broken.length + ' DOOR(S) TO NOWHERE' : ''));
    }

    const used = new Set();
    for (const mid in MAPS) for (const r of MAPS[mid].map) for (const ch of r) used.add(ch);
    const unused = Object.keys(LEGEND).filter(g => !used.has(g));
    if (unused.length) fails.push('LEGEND defines ' + unused.length +
      ' glyph(s) no map uses: ' + unused.join(' '));

    return { report, fails, transitions: [...transitions] };
  });

  console.log('EVERY MAP, READ AS A LEVEL\n');
  console.log(out.report.join('\n'));
  console.log('\nacts that change the map: ' +
              (out.transitions.length ? out.transitions.join(' ') : 'none'));
  if (out.fails.length){
    console.log('');
    for (const f of out.fails) console.log('  ' + f);
  }
  if (errs.length) console.log('\npage errors: ' + errs.length + '\n  ' + errs[0]);
  console.log(out.fails.length || errs.length
    ? '\n' + out.fails.length + ' LEVEL PROBLEM(S)'
    : '\nEVERY DOOR GOES SOMEWHERE');
  await b.close();
  process.exit(out.fails.length || errs.length ? 1 : 0);
})();

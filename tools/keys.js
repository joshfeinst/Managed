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

/* WHAT EACH BOARD'S CARD CLAIMS, READ OFF THE CARD.
   This was a hand-kept table, and it did not list `starter` — the one board
   that shipped with a dead key. It tested `press.act`, a flag the input layer
   has never had, so E, SPACE and ENTER did nothing on the new-starter
   checklist while its card said "E or CLICK — do the step you are on"; a
   keyboard player moved a highlight nothing could act on. A sweep with a
   hand-kept subset reports "all live" for the boards somebody remembered.
   Derived from GAME_BRIEF now, so a new board cannot be missing from it. */
const NAMED = [['ArrowUp',   String.raw`\bUP\b`],
               ['ArrowDown', String.raw`\bDOWN\b`],
               ['KeyE',      String.raw`(^|[^A-Z])E([^A-Z]|$)|SPACE|ENTER`],
               ['Digit1',    String.raw`\b1\b`],
               ['Digit2',    String.raw`\b2\b`],
               ['Digit3',    String.raw`\b3\b`],
               ['Digit4',    String.raw`\b4\b`]];

/* Dialogue nodes hold their prose in `t` and their branches in `opts`; the
   live `dlg` object renames them to `lines`. Picking the node by the wrong
   field silently opens nothing and reports every advance key dead. */
const OPEN_LINES = `const n = Object.keys(DIALOGUE).find(k => DIALOGUE[k].t && DIALOGUE[k].t.length > 1);
                    openDlg(n, {}, null);`;
const DLG_LINE   = `dlg ? dlg.li + '/' + Math.round(dlg.reveal * 10) : 'none'`;
const OPEN_OPTS  = `const n = Object.keys(DIALOGUE).find(k => DIALOGUE[k].opts && DIALOGUE[k].opts.length >= 3);
                    openDlg(n, {}, null);
                    for (let i = 0; i < 400 && dlg && !dlg.optsShown; i++){
                      press.use = true; dlgTick(.2); press.use = false; }`;

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + target);
  await page.waitForFunction(() => typeof GAMES !== 'undefined');

  const CLAIMS = await page.evaluate((named) => {
    const out = {};
    for (const g in GAMES){
      const seen = [];
      for (const [k] of (GAME_BRIEF[g] || {}).keys || []){
        const K = String(k).toUpperCase();
        for (const [code, re] of named)
          if (new RegExp(re).test(K) && seen.indexOf(code) < 0) seen.push(code);
      }
      out[g] = seen;
    }
    return out;
  }, NAMED);
  const uncovered = await page.evaluate(() => Object.keys(GAMES).filter(g => !GAME_BRIEF[g]));
  if (uncovered.length) console.log('boards with no card at all: ' + uncovered.join(' ') + '\n');

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
        /* `steps` was missing, so the new-starter checklist declared rowRect
           and reported "no declared rects" — covered by name, tested by none */
        const n = (g.rows && g.rows.length) || (g.tasks && g.tasks.length) ||
                  (g.hand && g.hand.length) || (g.sites && g.sites.length) ||
                  (g.qs && g.qs.length) || (g.steps && g.steps.length) ||
                  /* and the pit's four: the write-up's lines and the restore
                     points, which reported "no declared rects" while declaring
                     rowRect — the same hole `steps` fell down */
                  (g.lines && g.lines.length) || (g.pts && g.pts.length) || 0;
        /* the rack's ports were two literals inside step() until the pointer
           invariant went in; now they are named, so they are testable */
        if (g.leftRect)  for (let i = 0; i < Math.min(g.n || 0, 3); i++)
          list.push(['cable' + i, ...g.leftRect(i)]);
        if (g.rightRect) for (let i = 0; i < Math.min(g.n || 0, 3); i++)
          list.push(['port' + i, ...g.rightRect(i)]);
        /* WHOSE SATURDAY declared rows and a SUBMIT button and nothing that
           handed a job to a person — the whole reason a pointer could not
           play the Big Migration */
        if (g.personRect) for (let i = 0; i <= (g.staff ? g.staff.length : 0); i++)
          list.push(['who' + i, ...g.personRect(i)]);
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
        /* EVERY WAY A BOARD SAYS IT IS OVER. `done` was missing, so WHICH
           RESTORE POINT — one decision, taken on the first click, and then a
           board that correctly ignores everything after it — reported its
           remaining rows dead for doing exactly the right thing. */
        if (!MG || MG.finished || MG.submitted || MG.applied || MG.done) break;
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

  /* ---- THE HANDBOOK'S OWN PROMISES ------------------------------------
     The two sweeps above cover the minigame boards, which is where the dead
     key was found that started this file. Nothing covered the OTHER key list
     in the game: the eleven rows of the employee handbook, repeated in the
     pause card, which are the keys a player actually uses all day. They are
     bound in three different places -- KEYMAP, the keydown listener's latches,
     and onKey -- and documented in two hand-written HTML tables that no test
     has ever read. A row promising a key that moved is indistinguishable, to a
     player, from a game that has stopped responding.

     Every probe drives the REAL listener with a REAL key event and asserts the
     game's own state moved. Setup never presses a key it is about to test, so
     a dead key fails one row rather than cascading.

     A note on why each probe re-enters WORK from Node rather than in one
     evaluate: clockIn() opens the morning dialogue a tick later, so a
     synchronous "close every modal" loop runs before the modal exists, breaks
     out, and leaves the world paused behind a panel that appears immediately
     afterwards. Every key then reads as dead, because during a modal the world
     genuinely does not move -- which is the game working. Poll from out here. */
  const globalResults = [];
  {
    const page2 = page;
    await page2.goto('file://' + target);
    await page2.waitForFunction(() => typeof G !== 'undefined' && typeof selfTest === 'function');
    await page2.keyboard.press('Space');
    await page2.waitForTimeout(400);

    const toWork = async () => {
      await page2.evaluate(() => {
        SAVE_SUSPEND = true; QUIET = true;
        if (!run) { newRun('KEY-GLOBAL'); clockIn(); }
        if (G.showLog || G.showTests){
          G.showLog = G.showTests = false;
          if (G.overlayPaused){ G.overlayPaused = false; resumeWork(); } else show(null);
        }
      });
      /* WORK HAS TO HOLD, NOT MERELY HAPPEN. The morning dialogue opens on the
         first tick of the first work frame, so a loop that stops the instant
         it sees 'work' hands the probe a world that is about to pause behind
         a panel -- and during a panel the world genuinely does not move, so
         the first key tested reads as dead while the same key a probe later
         is fine. Require two consecutive clean samples. */
      let clean = 0;
      for (let i = 0; i < 60 && clean < 2; i++){
        const st = await page2.evaluate(() => {
          if (G.state === 'pause') resumeWork();
          else if (G.modal) closeModalToWork();
          return G.state;
        });
        clean = st === 'work' ? clean + 1 : 0;
        await page2.waitForTimeout(120);
      }
      await page2.evaluate(() => { clearToasts(); clearInput(); });
    };

    /* one probe: set the world up, press the key for real, look again */
    const probe = async (row, key, setupJs, checkJs, holdMs) => {
      await toWork();
      if (setupJs) await page2.evaluate(setupJs);
      await page2.waitForTimeout(120);
      const before = await page2.evaluate(checkJs);
      /* what the world was actually in when the key landed: a probe that could
         not reach its own precondition must say so rather than blame the key */
      const at = await page2.evaluate(() => G.state + (G.modal ? '/' + G.modal.kind : ''));
      if (holdMs){ await page2.keyboard.down(key); await page2.waitForTimeout(holdMs);
                   await page2.keyboard.up(key); }
      else await page2.keyboard.press(key);
      await page2.waitForTimeout(250);
      const after = await page2.evaluate(checkJs);
      globalResults.push({ row, key, at, alive: JSON.stringify(before) !== JSON.stringify(after),
                           before, after });
    };

    /* WALK. Each direction starts the player facing the opposite way on a known
       open tile, so a key that only turns still registers -- turning IS the
       documented behaviour of a tap -- while a key wired to nothing does not. */
    const POS = `player ? player.dir + ':' + Math.round(player.x*100)/100 + ',' +
                          Math.round(player.y*100)/100 : 'none'`;
    for (const [k, d] of [['KeyW','up'], ['ArrowUp','up'], ['KeyS','down'], ['ArrowDown','down'],
                          ['KeyA','left'], ['ArrowLeft','left'], ['KeyD','right'], ['ArrowRight','right']])
      await probe('Walk', k,
        `player.x=15; player.y=7; player.t=1; player.dir='${d === 'up' ? 'down' : 'up'}';`,
        POS, 420);

    /* RUN. The row says "you will be running", so the claim under test is
       SPEED, not a flag: walk a fixed wall-clock with and without Shift held
       and require the sprint to cover meaningfully more ground. A Shift bound
       to a sprint flag nothing reads would pass a flag check and fail this. */
    {
      const walked = async (sprint) => {
        await toWork();
        await page2.evaluate(() => { player.x=15; player.y=7; player.t=1; player.dir='up'; clearInput(); });
        await page2.waitForTimeout(120);
        const y0 = await page2.evaluate(() => player.y);
        if (sprint) await page2.keyboard.down('ShiftLeft');
        await page2.keyboard.down('KeyW');
        await page2.waitForTimeout(700);
        await page2.keyboard.up('KeyW');
        if (sprint) await page2.keyboard.up('ShiftLeft');
        await page2.waitForTimeout(150);
        const y1 = await page2.evaluate(() => player.y);
        return Math.abs(y0 - y1);
      };
      const slow = await walked(false), fast = await walked(true);
      globalResults.push({ row:'Run (you will be running)', key:'ShiftLeft',
        alive: fast > slow + 0.4, before:'walk ' + slow + ' tiles', after:'sprint ' + fast + ' tiles' });
    }

    await probe('Talk / use / advance', 'KeyE', OPEN_LINES, DLG_LINE);
    await probe('Talk / use / advance', 'Space', OPEN_LINES, DLG_LINE);
    await probe('Talk / use / advance', 'Enter', OPEN_LINES, DLG_LINE);
    for (const k of ['Digit1','Digit2','Digit3'])
      await probe('Dialogue choices', k, OPEN_OPTS, `dlg ? 'open:' + dlg.optsShown : 'closed'`);
    await probe('Service queue', 'Tab', null, `G.modal ? G.modal.kind : 'none'`);
    await probe('Service queue: Esc closes it', 'Escape',
      `openQueue(); renderQueue();`, `G.state + '/' + (G.modal ? G.modal.kind : '-')`);
    await probe('How to play this minigame', 'KeyH',
      `openGame(Object.keys(GAMES)[0], 2, ()=>{}); if (MG) MG.brief = null;`,
      `!!(MG && MG.brief)`);
    await probe('Pause · save and quit', 'Escape', null, `G.state`);
    await probe('Mute music', 'KeyM', null, `A.musOn`);
    await probe('Session log (for feedback)', 'F1', null, `!!G.showLog`);
    await probe('Run self test', 'F4', null, `!!G.showTests`);
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
  console.log('\nGLOBAL-KEY SWEEP — every key the employee handbook promises\n');
  let gbad = 0;
  for (const r of globalResults){
    if (!r.alive) gbad++;
    console.log('  ' + (r.alive ? 'live  ' : 'DEAD  ') + String(r.key).padEnd(11) +
                r.row.padEnd(32) + JSON.stringify(r.before) + ' -> ' + JSON.stringify(r.after) +
                (r.alive || !r.at ? '' : '   [pressed in ' + r.at + ']'));
  }
  if (errs.length) console.log('\npage errors: ' + errs.length + '\n  ' + errs.slice(0,4).join('\n  '));
  console.log(bad ? '\n' + bad + ' BOARD(S) WITH A DEAD KEY' : '\nNO DEAD KEYS');
  console.log(cbad ? cbad + ' BOARD(S) WITH A DEAD CLICK RECT' : 'NO DEAD CLICK RECTS');
  console.log(gbad ? gbad + ' DEAD KEY(S) THE HANDBOOK PROMISES' : 'NO DEAD GLOBAL KEYS');
  bad += cbad + gbad;
  await browser.close();
  process.exit(bad || errs.length ? 1 : 0);
})();

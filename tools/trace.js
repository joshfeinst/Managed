/* Managed: play-trace. Runs seeded careers through the REAL systems and emits
   a readable transcript of what a player experiences, plus the aggregates a
   designer needs (score drivers, time budget, breach causes, minigame spread,
   promotion pacing). Written for review agents to critique play, not code.
   Usage: node tools/trace.js <index.html> [careers=3] [skill=.75] [pick] [order]
     pick  : 'best' | 'worst' | a 0-based option index (default 0)
     order : triage rule — deadline|newest|oldest|shortest|longest|slack|
             pri|pridead|deadpri|worstpri (default pridead) */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const target = process.argv[2];
const N = +(process.argv[3] || 3);
const SKILL = +(process.argv[4] || 0.75);
/* 'best'/'worst' are named policies, not indices — coercing them with + made
   the header read "choicePolicy=optionNaN" and quietly sent undefined through */
const RAW = process.argv[5] === undefined ? '0' : process.argv[5];
const PICK = /^\d+$/.test(RAW) ? +RAW : RAW;
const ORDER = process.argv[6] || 'pridead';

async function launch() {
  try { return await chromium.launch(); }
  catch (e) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    for (const d of fs.readdirSync(base).filter(x => x.startsWith('chromium'))) {
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) { try { return await chromium.launch({ executablePath: p }); } catch (_) {} }
    }
    throw e;
  }
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await page.goto('file://' + target);
  await page.waitForFunction(() => typeof G !== 'undefined' && typeof simDay === 'function');

  const out = await page.evaluate(({ N, SKILL, PICK, ORDER }) => {
    SAVE_SUSPEND = true; QUIET = true; A.sfxVol = 0;
    const careers = [];
    const agg = { tickets:0, breaches:0, scores:[], speeds:[], crafts:[], games:{},
                  choices:{}, events:{}, coffee:0, days:0, promoDays:[], endings:{},
                  ticketSeen:{}, ticketScore:{}, stressEod:[], burnPerDay:[],
                  burnedBy:{}, burnedWhat:{} };

    for (let c = 0; c < N; c++){
      const seed = 'TRACE-' + (100 + c * 37);
      runInit(seed);
      const lines = [], perDay = [];
      let guard = 0;
      while (run && guard++ < 60){
        startCommute();
        if (!run) break;
        const day = run.day, rung = ROLES[run.rung].title;
        const mark = SLOG_TOTAL;   // absolute: SLOG itself shifts at 400
        simDay(SKILL, { pick: PICK, order: ORDER });
        if (!run){ break; }
        const dayLog = SLOG.slice(Math.max(0, SLOG.length - (SLOG_TOTAL - mark)));
        const perf = run.perfHist[run.perfHist.length-1];
        perDay.push({ day, rung, perf:+perf.toFixed(2), resolved:run.resolved,
                      breaches:run.breaches, stress:Math.round(run.stress),
                      burnout:Math.round(run.burnout), coffee:run.coffee,
                      speed: run.resolved ? +(run.speedSum/run.resolved).toFixed(2) : null,
                      craft: run.resolved ? +(run.qualSum/run.resolved).toFixed(2) : null,
                      log: dayLog });
        agg.days++; agg.tickets += run.resolved; agg.breaches += run.breaches;
        agg.coffee += run.coffee; agg.stressEod.push(Math.round(run.stress));
        agg.burnPerDay.push(Math.round(run.burnout));
        if (run.speedSum && run.resolved) agg.speeds.push(run.speedSum/run.resolved);
        if (run.qualSum && run.resolved) agg.crafts.push(run.qualSum/run.resolved);
        agg.scores.push(perf);
        for (const l of dayLog){
          const m = l.match(/resolved (\d+)% \(P(\d)\): (.*?)(?: \(craft|$)/);
          if (m){ const t = 'P' + m[2] + ' ' + m[3].slice(0,40);
                  agg.ticketSeen[t]=(agg.ticketSeen[t]||0)+1;
                  (agg.ticketScore[t] = agg.ticketScore[t] || []).push(+m[1]); }
          /* which stakes actually get dropped is the whole triage question */
          const b = l.match(/BREACHED \(P(\d)\): (.*)/);
          if (b){ agg.burnedBy['P'+b[1]] = (agg.burnedBy['P'+b[1]]||0)+1;
                  const t = 'P' + b[1] + ' ' + b[2].slice(0,40);
                  agg.burnedWhat[t] = (agg.burnedWhat[t]||0)+1; }
          const e = l.match(/event: (\w+)/); if (e) agg.events[e[1]] = (agg.events[e[1]]||0)+1;
          const ch = l.match(/chose: "(.*)"/); if (ch) agg.choices[ch[1].slice(0,46)] = (agg.choices[ch[1].slice(0,46)]||0)+1;
        }
        if (run.pendingEnd){ const end = run.pendingEnd; startCommute();
          agg.endings[end] = (agg.endings[end]||0)+1; break; }
      }
      careers.push({ seed, days: perDay });
    }
    SAVE_SUSPEND = false; QUIET = false;
    return { careers, agg };
  }, { N, SKILL, PICK, ORDER });

  const A = out.agg;
  const avg = a => a.length ? (a.reduce((x,y)=>x+y,0)/a.length) : 0;
  console.log('=== MANAGED PLAY TRACE ===  careers=' + N + ' skill=' + SKILL +
    ' triage=' + ORDER + ' choices=' + (typeof PICK === 'number' ? 'option ' + (PICK+1) : PICK));
  console.log('days played ' + A.days + ' · tickets resolved ' + A.tickets +
    ' · breaches ' + A.breaches + ' · coffees ' + A.coffee);
  console.log('day performance: avg ' + avg(A.scores).toFixed(2) +
    ' · min ' + Math.min(...A.scores).toFixed(2) + ' · max ' + Math.max(...A.scores).toFixed(2));
  console.log('score drivers: speed(avg SLA left) ' + avg(A.speeds).toFixed(2) +
    ' · craft(minigames) ' + avg(A.crafts).toFixed(2));
  console.log('end-of-day stress avg ' + avg(A.stressEod).toFixed(0) +
    ' · burnout curve ' + A.burnPerDay.slice(0,14).join(',') );
  console.log('endings: ' + JSON.stringify(A.endings));
  console.log('\n--- ticket frequency and average score ---');
  Object.entries(A.ticketSeen).sort((a,b)=>b[1]-a[1]).slice(0,24).forEach(([t,n])=>{
    const sc = A.ticketScore[t]; console.log('  ' + String(n).padStart(2) + 'x  ' +
      String(Math.round(sc.reduce((a,b)=>a+b,0)/sc.length)).padStart(3) + '%  ' + t);
  });
  console.log('\n--- what got dropped (the triage decision, in practice) ---');
  console.log('  by priority: ' + (JSON.stringify(A.burnedBy) || '{}'));
  Object.entries(A.burnedWhat).sort((a,b)=>b[1]-a[1]).slice(0,12)
    .forEach(([t,n])=>console.log('  ' + String(n).padStart(2) + 'x  ' + t));
  console.log('\n--- choices taken ---');
  Object.entries(A.choices).sort((a,b)=>b[1]-a[1]).slice(0,14).forEach(([t,n])=>console.log('  ' + n + 'x  ' + t));
  console.log('\n--- events fired ---', JSON.stringify(A.events));
  console.log('\n=== CAREER TRANSCRIPTS ===');
  for (const c of out.careers){
    console.log('\n### ' + c.seed);
    for (const d of c.days){
      console.log(`\n-- day ${d.day} (${d.rung}) perf ${Math.round(d.perf*100)}% · ${d.resolved} resolved, ${d.breaches} breached` +
        ` · speed ${d.speed} craft ${d.craft} · stress ${d.stress} burnout ${d.burnout} · ${d.coffee} coffees`);
      d.log.forEach(l => console.log('   ' + l));
    }
  }
  await browser.close();
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });

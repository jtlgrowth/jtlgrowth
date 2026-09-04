// Refuter for qa/hero-v7-hint.html: three type-here hints on the round 5 hero, checked from disk.
// node qa/probe-hero-hint.mjs [--shots DIR]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 8119;
const URL_ = `http://127.0.0.1:${PORT}/qa/hero-v7-hint.html`;
const si = process.argv.indexOf('--shots');
const SHOTS = si > -1 ? process.argv[si + 1] : path.join(ROOT, 'qa', '.shots-hint');
mkdirSync(SHOTS, { recursive: true });
const fails = [];
const ok = (c, m) => { if (c) console.log('  ok   ' + m); else { fails.push(m); console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

let server = null;
try { const r = await fetch(URL_); if (!r.ok) throw 0; } catch { server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await sleep(700); }
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
try {
  for (const vp of [{ w: 2000, h: 1100 }, { w: 1440, h: 900 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, timezoneId: 'Asia/Manila' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(URL_, { waitUntil: 'networkidle' });
    await page.evaluate(() => { window.JTLTerm.navigate = () => {}; });
    console.log(`viewport ${vp.w}x${vp.h}`);
    ok(await page.locator('section.variant').count() === 3, '3 samples present');
    for (let i = 1; i <= 3; i++) {
      const v = page.locator(`#v${i}`);
      await page.evaluate(n => document.querySelector(`#v${n} .hero-stage`).scrollIntoView({ block: 'start', behavior: 'instant' }), i);
      await sleep(3200); // greeting, arrow draw, coach delay, first placeholder
      console.log(`sample 0${i}`);
      const g = await page.evaluate(n => { const q = s => document.querySelector(`#v${n} ` + s).getBoundingClientRect(); const st = q('.hero-stage'), l = q('.kb-laptop'), c = q('.kb-copy'), inp = q('.kb-input'), dots = q('.hs-dots'); return { lap: [Math.round(l.left), Math.round(l.right), Math.round(l.top - st.top), Math.round(l.bottom - st.top)], copy: [Math.round(c.left), Math.round(c.right), Math.round(c.bottom - st.top)], inpCy: Math.round(inp.top - st.top + inp.height / 2), dotsTop: Math.round(dots.top - st.top) }; }, i);
      ok(g.lap[2] >= 60 && g.lap[3] <= g.dotsTop - 4 && g.copy[0] >= g.lap[1] - 2 && g.copy[1] <= vp.w, `hero fits: laptop y ${g.lap[2]} to ${g.lap[3]}, copy x ${g.copy[0]} to ${g.copy[1]}, dots at ${g.dotsTop}`);
      if (i === 1) {
        // the svg is drawn in the .hs box's frame (position:relative), so measure there
        const a = await page.evaluate(n => { const p = document.querySelector(`#v${n} .kb-arrow-path`); const hs = document.querySelector(`#v${n} [data-arrow]`).getBoundingClientRect(); const lap = document.querySelector(`#v${n} .kb-laptop`).getBoundingClientRect(); const inp = document.querySelector(`#v${n} .kb-input`).getBoundingClientRect(); const hint = document.querySelector(`#v${n} [data-hint]`).getBoundingClientRect(); const L = p.getTotalLength(); const end = p.getPointAtLength(L); const start = p.getPointAtLength(0); return { L: Math.round(L), end: [Math.round(end.x), Math.round(end.y)], start: [Math.round(start.x), Math.round(start.y)], wantEnd: [Math.round(lap.right - hs.left + 10), Math.round(inp.top - hs.top + inp.height / 2)], hintL: Math.round(hint.left - hs.left), hintCy: Math.round(hint.top - hs.top + hint.height / 2), off: parseFloat(getComputedStyle(p).strokeDashoffset), head: getComputedStyle(document.querySelector(`#v${n} .kb-arrow-head`)).opacity }; }, i);
        ok(a.L > 60, `arrow drawn, ${a.L}px long`);
        ok(Math.abs(a.end[0] - a.wantEnd[0]) <= 3 && Math.abs(a.end[1] - a.wantEnd[1]) <= 3, `arrow lands on the laptop edge at the prompt line (end ${a.end}, want ${a.wantEnd})`);
        ok(Math.abs(a.start[0] - (a.hintL - 12)) <= 3 && Math.abs(a.start[1] - a.hintCy) <= 3, `arrow starts at the hint line (start ${a.start}, hint at ${a.hintL - 12},${a.hintCy})`);
        ok(a.off === 0 && a.head === '1', `arrow fully drawn and headed (offset ${a.off}, head ${a.head})`);
      }
      if (i === 2) {
        ok(await v.locator('.kb-coach.show').count() === 1, 'coach mark visible after the greeting');
        const cb = await v.locator('.kb-coach').boundingBox(); const ib = await v.locator('.kb-prompt').boundingBox(); const sb = await v.locator('.kb-screen').boundingBox();
        ok(cb && ib && cb.y + cb.height <= ib.y + 2 && cb.x >= sb.x && cb.x + cb.width <= sb.x + sb.width, `coach sits inside the screen above the prompt (tag bottom ${cb && Math.round(cb.y + cb.height)}, prompt top ${ib && Math.round(ib.y)})`);
        await page.screenshot({ path: path.join(SHOTS, `s2-${vp.w}-coach.png`) });
      }
      if (i === 3) {
        const ph = await v.locator('.kb-input').getAttribute('placeholder');
        ok(ph !== 'ask anything, or type: go to services' && ph.length > 0, `placeholder is asking (${JSON.stringify(ph)})`);
      }
      await page.screenshot({ path: path.join(SHOTS, `s${i}-${vp.w}.png`) });
      const input = v.locator('.kb-input');
      await v.locator('.kb-term').click();
      if (i === 2) { await sleep(400); ok(await v.locator('.kb-coach.show').count() === 0, 'coach mark gone on click'); }
      if (i === 3) { await sleep(100); ok((await input.getAttribute('placeholder')) === 'ask anything, or type: go to services', 'placeholder restored on focus'); }
      await input.fill('');
      await input.type('price', { delay: 60 });
      ok(await v.locator('.kb-mini.show').count() === 1, 'mini keyboard visible while typing');
      await input.press('Enter');
      let priced = false;
      try { await v.locator('.kb-line-ai', { hasText: 'Quote-based' }).waitFor({ timeout: 15000 }); priced = true; } catch {}
      ok(priced, 'terminal answers "price"');
    }
    ok(errors.length === 0, `0 console errors (got ${errors.length})${errors.length ? '\n    ' + errors.slice(0, 5).join('\n    ') : ''}`);
    await ctx.close();
  }
  // reduced motion: arrow present without animation, placeholder static
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  await rp.goto(URL_, { waitUntil: 'networkidle' });
  await rp.evaluate(() => document.querySelector('#v1 .hero-stage').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(900);
  const roff = await rp.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#v1 .kb-arrow-path')).strokeDashoffset));
  ok(roff === 0, `reduced motion: arrow simply there (offset ${roff})`);
  await rp.evaluate(() => document.querySelector('#v3 .hero-stage').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(2500);
  const rph = await rp.locator('#v3 .kb-input').getAttribute('placeholder');
  ok(rph === 'ask what we build, what it costs, how fast, or go to services', `reduced motion: placeholder static (${JSON.stringify(rph)})`);
  await rctx.close();
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  await mp.goto(URL_, { waitUntil: 'networkidle' });
  await sleep(600);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 1, `mobile: no horizontal overflow (${overflow}px)`);
  ok(await mp.locator('#v1 .kb-arrow').isHidden(), 'mobile: arrow hidden');
  await mp.locator('#v1 .hero-stage').screenshot({ path: path.join(SHOTS, 's1-mobile.png') });
  await mctx.close();
} finally {
  await browser.close();
  if (server) server.kill();
}
console.log(fails.length ? `\n${fails.length} FAIL` : '\nALL GREEN');
console.log('shots: ' + SHOTS);
process.exit(fails.length ? 1 : 0);

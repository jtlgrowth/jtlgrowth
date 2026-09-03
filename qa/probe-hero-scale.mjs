// Refuter for qa/hero-v7-scale.html: three scale proposals, each must stay inside one screen.
// node qa/probe-hero-scale.mjs [--shots DIR]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 8119;
const URL_ = `http://127.0.0.1:${PORT}/qa/hero-v7-scale.html`;
const si = process.argv.indexOf('--shots');
const SHOTS = si > -1 ? process.argv[si + 1] : path.join(ROOT, 'qa', '.shots-scale');
mkdirSync(SHOTS, { recursive: true });
const fails = [];
const ok = (c, m) => { if (c) console.log('  ok   ' + m); else { fails.push(m); console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DOTS = 52; // the real page keeps its dot row in the bottom 52px

let server = null;
try { const r = await fetch(URL_); if (!r.ok) throw 0; } catch { server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await sleep(700); }
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
try {
  for (const vp of [{ w: 2000, h: 1100 }, { w: 1920, h: 1080 }, { w: 1440, h: 900 }]) {
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
      await sleep(500);
      if (vp.w !== 1920) await page.screenshot({ path: path.join(SHOTS, `s${i}-${vp.w}.png`) });
      console.log(`sample 0${i}`);
      ok(await v.locator('.kb-eyebrow').count() === 0 && await v.locator('.kb-deck').count() === 0, 'no eyebrow, no deck');
      const g = await page.evaluate(n => { const q = s => document.querySelector(`#v${n} ` + s).getBoundingClientRect(); const st = q('.hero-stage'), l = q('.kb-laptop'), c = q('.kb-copy'), h1 = q('h1'), inp = q('.kb-input'), log = q('.kb-log'); const fs = Math.round(document.querySelector(`#v${n} .kb-chip`).getBoundingClientRect().height * 10) / 10; return { stH: Math.round(st.height), lap: [Math.round(l.left), Math.round(l.right), Math.round(l.top - st.top), Math.round(l.bottom - st.top)], copy: [Math.round(c.top - st.top), Math.round(c.bottom - st.top), Math.round(c.left), Math.round(c.right)], h1: [Math.round(h1.height), Math.round(parseFloat(getComputedStyle(document.querySelector(`#v${n} h1`)).fontSize))], inp: Math.round(inp.bottom - st.top), termFs: fs, logW: Math.round(log.width) }; }, i);
      ok(g.stH <= vp.h + 1, `stage is one screen tall (${g.stH} of ${vp.h})`);
      ok(g.lap[0] >= -40 && g.lap[1] <= vp.w + 1, `laptop inside the width (x ${g.lap[0]} to ${g.lap[1]})`);
      ok(g.lap[2] >= 60 && g.lap[3] <= vp.h - DOTS, `laptop clears the header and the dot row (y ${g.lap[2]} to ${g.lap[3]}, floor ${vp.h - DOTS})`);
      ok(g.inp <= vp.h - DOTS, `terminal input inside the screen (bottom ${g.inp})`);
      if (i !== 3) ok(g.copy[1] <= g.lap[2] && g.copy[0] >= 60, `copy sits above the laptop (y ${g.copy[0]} to ${g.copy[1]})`);
      else ok(g.copy[2] >= g.lap[1] - 2, `copy sits beside the laptop (copy left ${g.copy[2]}, laptop right ${g.lap[1]})`);
      ok(g.h1[1] >= 48 && g.h1[0] <= g.h1[1] * (i === 3 ? 2.1 : 1.15), `headline ${g.h1[1]}px, ${g.h1[0]}px tall`);
      ok(g.termFs >= 30, `interior zoomed: chip ${g.termFs}px tall (26 at 1x), log ${g.logW}px wide`);
      const input = v.locator('.kb-input');
      await v.locator('.kb-term').click();
      await input.fill('');
      await input.type('pri', { delay: 60 });
      ok(await v.locator('.kb-mini.show').count() === 1, 'mini keyboard visible while typing');
      const litA = await page.evaluate(async n => { const inp = document.querySelector(`#v${n} .kb-input`); inp.focus(); inp.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a', bubbles: true })); await new Promise(r => setTimeout(r, 30)); const on = document.querySelector(`#v${n} .kb-mini [data-code="KeyA"].on`) != null; inp.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a', bubbles: true })); return on; }, i);
      ok(litA, 'mini keyboard lights KeyA');
      const mb = await v.locator('.kb-mini').boundingBox();
      ok(mb && Math.round(mb.width) === 348 && Math.round(mb.height) === 129, `mini keyboard is jtlboard sized (${mb && Math.round(mb.width)}x${mb && Math.round(mb.height)})`);
      if (vp.w !== 1920) await page.screenshot({ path: path.join(SHOTS, `s${i}-${vp.w}-typing.png`) });
      await input.type('ce', { delay: 60 });
      await input.press('Enter');
      let priced = false;
      try { await v.locator('.kb-line-ai', { hasText: 'Quote-based' }).waitFor({ timeout: 15000 }); priced = true; } catch {}
      ok(priced, 'terminal answers "price"');
      await sleep(1900);
      ok(await v.locator('.kb-mini.show').count() === 0, 'mini keyboard gone 1.4 s after the last key');
    }
    ok(errors.length === 0, `0 console errors (got ${errors.length})${errors.length ? '\n    ' + errors.slice(0, 5).join('\n    ') : ''}`);
    await ctx.close();
  }
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  await mp.goto(URL_, { waitUntil: 'networkidle' });
  await sleep(600);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 1, `mobile: no horizontal overflow (${overflow}px)`);
  ok(await mp.locator('#v1 .kb-mini').isHidden(), 'mobile: mini keyboard never shows');
  await mp.locator('#v1 .hero-stage').screenshot({ path: path.join(SHOTS, 's1-mobile.png') });
  await mctx.close();
} finally {
  await browser.close();
  if (server) server.kill();
}
console.log(fails.length ? `\n${fails.length} FAIL` : '\nALL GREEN');
console.log('shots: ' + SHOTS);
process.exit(fails.length ? 1 : 0);

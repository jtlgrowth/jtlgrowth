// Refuter for qa/hero-v7-proposals.html: five live hero samples, checked from disk.
// node qa/probe-hero-proposals.mjs [--shots DIR]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 8119;
const URL_ = `http://127.0.0.1:${PORT}/qa/hero-v7-proposals.html`;
const si = process.argv.indexOf('--shots');
const SHOTS = si > -1 ? process.argv[si + 1] : path.join(ROOT, 'qa', '.shots-hero');
mkdirSync(SHOTS, { recursive: true });
const fails = [];
const ok = (c, m) => { if (c) console.log('  ok   ' + m); else { fails.push(m); console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await sleep(700);
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
    ok(await page.locator('section.variant').count() === 5, '5 samples present');
    for (let i = 1; i <= 5; i++) {
      const v = page.locator(`#v${i}`);
      const stage = v.locator('.hero-stage');
      await stage.scrollIntoViewIfNeeded();
      await page.evaluate(n => document.querySelector(`#v${n} .hero-stage`).scrollIntoView({ block: 'start' }), i);
      await sleep(500);
      console.log(`sample 0${i}`);
      ok(await v.locator('.kb-eyebrow').count() === 0, 'no eyebrow');
      const cta = await v.locator('.kb-cta').first().innerText();
      ok(!/gwen/i.test(cta) && cta.length > 4, `CTA reads "${cta.trim()}"`);
      ok(await v.locator('.kb-base .kb-key').count() === 0 && await v.locator('.kb-deck').count() === 0, 'no keyboard deck');
      // geometry: laptop inside the viewport horizontally, terminal input visible
      const g = await page.evaluate(n => { const l = document.querySelector(`#v${n} .kb-laptop`).getBoundingClientRect(); const inp = document.querySelector(`#v${n} .kb-input`).getBoundingClientRect(); const st = document.querySelector(`#v${n} .hero-stage`).getBoundingClientRect(); return { l: [Math.round(l.left), Math.round(l.right), Math.round(l.top - st.top), Math.round(l.bottom - st.top)], inp: [Math.round(inp.top - st.top), Math.round(inp.bottom - st.top)], stH: Math.round(st.height) }; }, i);
      ok(g.l[0] >= -60 && g.l[1] <= vp.w + 1, `laptop inside the width (left ${g.l[0]}, right ${g.l[1]})`);
      ok(g.inp[1] <= g.stH && g.inp[0] >= 60, `terminal input visible inside the stage (y ${g.inp[0]} to ${g.inp[1]} of ${g.stH})`);
      const ov = await page.evaluate(n => { const a = document.querySelector(`#v${n} .kb-laptop`).getBoundingClientRect(); const c = document.querySelector(`#v${n} .kb-copy`); if (!c) return 0; const b = c.getBoundingClientRect(); const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)); const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)); return Math.round(x * y); }, i);
      ok(ov === 0, `laptop and copy do not overlap (${ov}px²)`);
      // type: mini keyboard shows while typing, hides after
      const input = v.locator('.kb-input');
      await v.locator('.kb-term').click();
      await input.fill('');
      await input.type('pri', { delay: 60 });
      const shown = await v.locator('.kb-mini.show').count();
      ok(shown === 1, 'mini keyboard visible while typing');
      const litA = await page.evaluate(async n => { const inp = document.querySelector(`#v${n} .kb-input`); inp.focus(); inp.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a', bubbles: true })); await new Promise(r => setTimeout(r, 30)); const on = document.querySelector(`#v${n} .kb-mini [data-code="KeyA"].on`) != null; inp.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a', bubbles: true })); return on; }, i);
      ok(litA, 'mini keyboard lights KeyA');
      const mb = await v.locator('.kb-mini').boundingBox();
      ok(mb && Math.round(mb.width) === 348 && Math.round(mb.height) === 129, `mini keyboard is jtlboard sized (${mb && Math.round(mb.width)}x${mb && Math.round(mb.height)})`);
      await page.screenshot({ path: path.join(SHOTS, `s${i}-${vp.w}-typing.png`) });
      await input.type('ce', { delay: 60 });
      await input.press('Enter');
      let priced = false;
      try { await v.locator('.kb-line-ai', { hasText: 'Quote-based' }).waitFor({ timeout: 15000 }); priced = true; } catch {}
      ok(priced, 'terminal answers "price"');
      await sleep(1900);
      ok(await v.locator('.kb-mini.show').count() === 0, 'mini keyboard gone 1.4 s after the last key');
      await page.screenshot({ path: path.join(SHOTS, `s${i}-${vp.w}.png`) });
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
  server.kill();
}
console.log(fails.length ? `\n${fails.length} FAIL` : '\nALL GREEN');
console.log('shots: ' + SHOTS);
process.exit(fails.length ? 1 : 0);

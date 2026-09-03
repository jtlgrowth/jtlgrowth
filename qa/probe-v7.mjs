// Refuter for index-v7.html (staged home v7). Re-runs every claim from disk.
// node qa/probe-v7.mjs [--shots DIR]   serves the repo on 127.0.0.1:8119
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 8119;
const URL_ = `http://127.0.0.1:${PORT}/index-v7.html`;
const si = process.argv.indexOf('--shots');
const SHOTS = si > -1 ? process.argv[si + 1] : path.join(ROOT, 'qa', '.shots-v7');
mkdirSync(SHOTS, { recursive: true });
const fails = [];
const ok = (c, m) => { if (c) console.log('  ok   ' + m); else { fails.push(m); console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// wait until the terminal finished typing its current answer (no caret, queue idle)
const settle = async (page) => { for (let i = 0; i < 200; i++) { const busy = await page.evaluate(() => !!document.querySelector('#p1 .kb-caret') || (window.JTLTerm && window.JTLTerm.busy && window.JTLTerm.busy())); if (!busy) break; await sleep(150); } await sleep(200); };

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await sleep(700);
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Manila' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.evaluate(() => { const b = document.getElementById('boot'); if (b) b.remove(); });
  await sleep(600);

  // ---- panels, dots, labels ----
  const labels = await page.$$eval('#dots button', bs => bs.map(b => b.textContent.trim()));
  ok(labels.join(',') === 'Hero,About,Globe,Services,Contact', `dots: ${labels.join(', ')}`);
  ok(await page.locator('.panel:not(.panel-clone)').count() === 5, '5 real panels');
  ok(await page.locator('#p1clone[data-static]').count() === 1, 'clone panel present and static');
  ok(await page.locator('#p1 input.kb-input').count() === 1 && await page.locator('#p1clone input').count() === 0, 'one input in the hero, none in the clone');

  // ---- terminal ----
  const input = page.locator('#p1 .kb-input');
  await page.locator('#p1 .kb-term').click();
  await input.waitFor();
  // greeting typed once the laptop is in view
  let greeted = false;
  try { await page.locator('#p1 .kb-line-ai', { hasText: 'Venice here' }).waitFor({ timeout: 15000 }); greeted = true; } catch {}
  ok(greeted, 'greeting typed in the terminal');
  await page.evaluate(() => { window.__nav = []; window.JTLTerm.navigate = p => window.__nav.push(p); });
  const xu0 = await page.evaluate(() => window.__xu || 0);
  await input.fill('');
  await input.type('price', { delay: 40 });
  const plays0 = await page.evaluate(() => window.JTLSound.state.plays);
  const acState = await page.evaluate(() => window.JTLSound.state.ctx && window.JTLSound.state.ctx.state);
  ok(acState === 'running', `AudioContext running after typing (${acState})`);
  ok(plays0 > 0, `sound engine played ${plays0} samples while typing`);
  const litA = await page.evaluate(async () => {
    const inp = document.querySelector('#p1 .kb-input'); inp.focus();
    inp.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a', bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const on = document.querySelector('#p1 [data-deck] [data-code="KeyA"].on') != null;
    inp.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a', bubbles: true }));
    return on;
  });
  ok(litA, 'deck lights KeyA on keydown');
  const cloneLit = await page.locator('#p1clone [data-deck] .kb-key.on').count();
  ok(cloneLit === 0, 'clone deck stays dark');
  await input.press('Enter');
  let priced = false;
  try { await page.locator('#p1 .kb-line-ai', { hasText: 'Quote-based' }).waitFor({ timeout: 15000 }); priced = true; } catch {}
  ok(priced, 'typed "price" gets the quote-based answer');
  await input.type(' ', { delay: 20 });
  await sleep(400);
  const xu1 = await page.evaluate(() => window.__xu || 0);
  ok(Math.abs(xu1 - xu0) < 0.01, `space in the terminal does not slide the page (xu ${xu0} to ${xu1})`);
  await settle(page);
  await input.fill('');
  await input.type('go to services', { delay: 20 });
  await input.press('Enter');
  await sleep(1800);
  const nav = await page.evaluate(() => window.__nav);
  ok(nav[0] === '/services/', `"go to services" routes to /services/ (got ${JSON.stringify(nav)})`);
  await settle(page);
  await input.fill('services'); await input.press('Enter');
  await sleep(1200);
  const nav2 = await page.evaluate(() => window.__nav.length);
  ok(nav2 === 1, `bare "services" explains instead of navigating (nav calls ${nav2})`);
  await settle(page);
  await input.fill('help'); await input.press('Enter');
  let helped = false;
  try { await page.locator('#p1 .kb-line-ai', { hasText: 'Or navigate' }).waitFor({ timeout: 25000 }); helped = true; } catch {}
  ok(helped, 'help lists the commands');
  await settle(page);
  await page.locator('#p1 .kb-chip[data-cmd="ai employee"]').click();
  let chip = false;
  try { await page.locator('#p1 .kb-line-ai', { hasText: 'not an employee' }).waitFor({ timeout: 15000 }); chip = true; } catch {}
  ok(chip, 'chip "ai employee" answers');
  const mute = page.locator('#p1 [data-mute]');
  await mute.click();
  ok((await mute.getAttribute('aria-pressed')) === 'false', 'mute toggle turns sound off');
  await mute.click();
  ok((await mute.getAttribute('aria-pressed')) === 'true', 'mute toggle turns sound back on');
  await page.locator('#p1').screenshot({ path: path.join(SHOTS, 'p1-hero.png') });

  // ---- morph stops and dark chrome ----
  const rgb = s => s.replace(/\s/g, '');
  const expect = ['rgb(226,226,226)', 'rgb(219,219,219)', 'rgb(16,16,16)', 'rgb(226,226,226)', 'rgb(226,226,226)'];
  for (let i = 0; i < 5; i++) {
    await page.evaluate(n => window.__goTo(n), i);
    await sleep(1800);
    const bg = rgb(await page.evaluate(() => getComputedStyle(document.getElementById('viewport')).backgroundColor));
    ok(bg === expect[i], `panel ${i + 1} ground ${bg} (want ${expect[i]})`);
    const dark = await page.evaluate(() => document.getElementById('hdr').classList.contains('on-dark'));
    ok(dark === (i === 2), `panel ${i + 1} header chrome ${dark ? 'dark' : 'light'}`);
    await page.screenshot({ path: path.join(SHOTS, `panel-${i + 1}.png`) });
    if (i === 2) {
      let on = false;
      try { await page.locator('#globe .jp-globe canvas.on').waitFor({ timeout: 20000 }); on = true; } catch {}
      ok(on, 'globe booted (cobe)');
      await sleep(2500);
      const png = await page.locator('#globe .jp-globe').screenshot({ path: path.join(SHOTS, 'globe.png') });
      ok(png.length > 20000, `globe clip not blank (${png.length} B)`);
      ok(await page.locator('#globe .jp-ping svg').count() === 6, 'ping tiles carry the JTL mark');
      ok(await page.locator('#globe .jp-counter .digit').count() >= 3, 'counter digits rendered');
      const countNight = () => page.evaluate(() => { const c = document.querySelector('#globe .jp-night'); const d = c.getContext('2d').getImageData(0, 0, 96, 96).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; });
      const nightA = await countNight();
      await page.evaluate(() => { const g = document.querySelector('#globe .jp-globe').__globe; g.setPhi(g.getPhi() + Math.PI); });
      await sleep(400);
      const nightB = await countNight();
      ok(nightA > 0 || nightB > 0, `night shade painted (${nightA} px facing the visitor, ${nightB} px on the far side)`);
      ok(Math.abs(nightA - nightB) > 200, `night shade follows the rotation (delta ${Math.abs(nightA - nightB)} px)`);
      await page.evaluate(() => { const g = document.querySelector('#globe .jp-globe').__globe; g.setPhi(g.getPhi() - Math.PI); });
      const clock = await page.locator('#globe .jp-clock').evaluate(e => e.textContent);
      ok(/^It is \d\d:\d\d in Caloocan/i.test(clock), `clock caption: ${clock}`);
      const satPos = () => page.evaluate(() => document.querySelector('#globe .jp-sat').style.transform);
      const s1 = await satPos(); await sleep(600); const s2 = await satPos();
      const satBox = await page.locator('#globe .jp-sat').boundingBox();
      const gBox = await page.locator('#globe .jp-globe').boundingBox();
      ok(s1 && s1 !== s2 && !s1.includes('-999'), `satellite moves (${s1.slice(0, 40)} to ${s2.slice(0, 40)})`);
      ok(satBox && Math.abs((satBox.x + 9) - (gBox.x + gBox.width / 2)) < gBox.width * 0.62 && Math.abs((satBox.y + 9) - (gBox.y + gBox.height / 2)) < gBox.height * 0.62, 'satellite orbits within the globe box');
      const before = await page.evaluate(() => document.querySelector('#globe .jp-counter').textContent.replace(/\D/g, ''));
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('jtl-keydown', { detail: { code: 'KeyB', key: 'b' } })));
      await sleep(500);
      const after = await page.evaluate(() => document.querySelector('#globe .jp-counter').textContent.replace(/\D/g, ''));
      ok(parseInt(after, 10) === parseInt(before, 10) + 1, `keystroke bumps the counter (${before} to ${after})`);
      const city = await page.locator('#globe [data-city]').innerText();
      ok(city === 'Manila', `keystroke ping lands on the visitor city (${city})`);
      const box = await page.locator('#globe .jp-globe canvas.on').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
      const mv = page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 5 });
      await sleep(50);
      ok(await page.locator('#globe canvas.dragging').count() === 1, 'globe drag engages');
      await mv; await page.mouse.up();
    }
    if (i === 3) {
      ok(await page.locator('#services .jp-card').count() === 8, '8 service cards');
      const anims = await page.locator('#services .jp-cards').evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);
      ok(anims >= 8, `card loops running (${anims})`);
      const g = page.locator('#services [data-follow-grid]');
      const gb = await g.boundingBox();
      await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2, { steps: 4 });
      await sleep(250);
      ok((await g.locator('i.lit').count()) > 0, 'cursor-follow grid lights');
    }
  }
  // ---- loop wrap ----
  await page.evaluate(() => window.__goTo(5));
  await sleep(2600);
  const xuWrap = await page.evaluate(() => window.__xu);
  const idxWrap = await page.$$eval('#dots button', bs => bs.findIndex(b => b.classList.contains('active')));
  ok(xuWrap === 0 && idxWrap === 0, `loop wraps back to the hero (xu ${xuWrap}, dot ${idxWrap})`);
  ok(errors.length === 0, `0 console errors (got ${errors.length})${errors.length ? '\n    ' + errors.slice(0, 6).join('\n    ') : ''}`);
  await ctx.close();

  // ---- reduced motion ----
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Asia/Manila' });
  const rp = await rctx.newPage();
  await rp.goto(URL_, { waitUntil: 'networkidle' });
  await rp.evaluate(() => { const b = document.getElementById('boot'); if (b) b.remove(); });
  await sleep(800);
  const rSat1 = await rp.evaluate(() => { const s = document.querySelector('#globe .jp-sat'); return s ? s.style.transform : 'none'; });
  const runningList = await rp.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().duration > 1).map(a => (a.animationName || a.constructor.name) + ' on ' + (a.effect.target.id || a.effect.target.className || a.effect.target.tagName)));
  ok(runningList.length === 0, `reduced motion: 0 running animations (got ${runningList.length}${runningList.length ? ': ' + runningList.join('; ') : ''})`);
  const vertical = await rp.evaluate(() => getComputedStyle(document.getElementById('track')).display === 'block');
  ok(vertical, 'reduced motion: vertical static mode');
  await rctx.close();

  // ---- mobile ----
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Asia/Manila' });
  const mp = await mctx.newPage();
  await mp.goto(URL_, { waitUntil: 'networkidle' });
  await mp.evaluate(() => { const b = document.getElementById('boot'); if (b) b.remove(); });
  await sleep(800);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 1, `mobile: no horizontal overflow (${overflow}px)`);
  ok(await mp.locator('#p1 .kb-deck').isHidden(), 'mobile: deck hidden');
  await mp.locator('#p1 .kb-term').click();
  await mp.locator('#p1 .kb-input').fill('where');
  await mp.locator('#p1 .kb-input').press('Enter');
  let mob = false;
  try { await mp.locator('#p1 .kb-line-ai', { hasText: 'Caloocan' }).waitFor({ timeout: 15000 }); mob = true; } catch {}
  ok(mob, 'mobile: terminal answers');
  await mp.locator('#p1').screenshot({ path: path.join(SHOTS, 'mobile-hero.png') });
  await mp.locator('#globe').screenshot({ path: path.join(SHOTS, 'mobile-globe.png') });
  await mctx.close();
} finally {
  await browser.close();
  server.kill();
}
console.log(fails.length ? `\n${fails.length} FAIL` : '\nALL GREEN');
console.log('shots: ' + SHOTS);
process.exit(fails.length ? 1 : 0);

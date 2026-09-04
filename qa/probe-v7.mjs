// Refuter for the v7 home (index.html, promoted 2026-09-04). Re-runs every claim from disk, or live.
// node qa/probe-v7.mjs [--shots DIR] [--base https://jtlgrowth.com]   (no --base: serves the repo on 127.0.0.1:8119)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 8119;
const bi = process.argv.indexOf('--base');
const BASE = bi > -1 ? process.argv[bi + 1].replace(/\/$/, '') : `http://127.0.0.1:${PORT}`;
const URL_ = `${BASE}/index.html`;
const SERVICES = `${BASE}/services/index.html`;
const si = process.argv.indexOf('--shots');
const SHOTS = si > -1 ? process.argv[si + 1] : path.join(ROOT, 'qa', '.shots-v7');
mkdirSync(SHOTS, { recursive: true });
const fails = [];
const ok = (c, m) => { if (c) console.log('  ok   ' + m); else { fails.push(m); console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// wait until the terminal finished typing its current answer (no caret, queue idle)
const settle = async (page) => { for (let i = 0; i < 200; i++) { const busy = await page.evaluate(() => !!document.querySelector('#p1 .kb-caret') || (window.JTLTerm && window.JTLTerm.busy && window.JTLTerm.busy())); if (!busy) break; await sleep(150); } await sleep(200); };

const server = bi > -1 ? null : spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
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
  ok(await page.locator('meta[name="robots"][content*="noindex"]').count() === 0, 'no noindex on the home');
  ok(!/v7 staged/.test(await page.title()), `title reads "${await page.title()}"`);

  // ---- panels, dots, labels ----
  const labels = await page.$$eval('#dots button', bs => bs.map(b => b.textContent.trim()));
  ok(labels.join(',') === 'Hero,About,Globe,Contact', `dots: ${labels.join(', ')}`);
  ok(await page.locator('.panel:not(.panel-clone)').count() === 4, '4 real panels');
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
  // round 4: no deck under the laptop, a jtlboard-sized mini keyboard inside the screen while typing
  ok(await page.locator('.kb-deck').count() === 0 && await page.locator('.kb-base .kb-key').count() === 0, 'no keyboard deck under the laptop');
  ok(await page.locator('#p1 .kb-mini.show').count() === 1, 'mini keyboard visible while typing');
  const litA = await page.evaluate(async () => {
    const inp = document.querySelector('#p1 .kb-input'); inp.focus();
    inp.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a', bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const on = document.querySelector('#p1 .kb-mini [data-code="KeyA"].on') != null;
    inp.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a', bubbles: true }));
    return on;
  });
  ok(litA, 'mini keyboard lights KeyA on keydown');
  const mb = await page.locator('#p1 .kb-mini').boundingBox();
  ok(mb && Math.round(mb.width) === 348 && Math.round(mb.height) === 129, `mini keyboard is jtlboard sized (${mb && Math.round(mb.width)}x${mb && Math.round(mb.height)})`);
  const cloneLit = await page.locator('#p1clone .kb-mini .kb-key.on').count() + await page.locator('#p1clone .kb-mini.show').count();
  ok(cloneLit === 0, 'clone mini keyboard stays dark and hidden');
  await page.screenshot({ path: path.join(SHOTS, 'hero-typing.png') });
  await input.press('Enter');
  let priced = false;
  try { await page.locator('#p1 .kb-line-ai', { hasText: 'Quote-based' }).waitFor({ timeout: 15000 }); priced = true; } catch {}
  ok(priced, 'typed "price" gets the quote-based answer');
  await sleep(1900);
  ok(await page.locator('#p1 .kb-mini.show').count() === 0, 'mini keyboard gone 1.6 s after the last key');
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
  await input.fill('go to starter pack'); await input.press('Enter');
  await sleep(1800);
  const nav3 = await page.evaluate(() => window.__nav);
  ok(nav3.length === 2 && nav3[1] === '/starter-pack/', `"go to starter pack" routes to /starter-pack/ (got ${JSON.stringify(nav3)})`);
  ok(await page.locator('#menu a[href="/starter-pack/"], a[href="/starter-pack/"]').count() >= 1, 'menu overlay links the starter pack');
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
  ok(await page.locator('#p1 .kb-eyebrow, #p1clone .kb-eyebrow').count() === 0, 'hero: no eyebrow');
  const ctaText = await page.locator('#p1 .kb-cta').innerText();
  ok(!/gwen/i.test(ctaText) && ctaText.trim().length > 4, `hero: CTA reads "${ctaText.trim()}"`);
  const fit = async (pg, w, h) => { const g = await pg.evaluate(() => { const l = document.querySelector('#p1 .kb-laptop').getBoundingClientRect(); const c = document.querySelector('#p1 .kb-copy').getBoundingClientRect(); return { lapTop: Math.round(l.top), lapBottom: Math.round(l.bottom), lapLeft: Math.round(l.left), lapRight: Math.round(l.right), copyBottom: Math.round(c.bottom), copyTop: Math.round(c.top) }; }); const c2 = await pg.evaluate(() => { const c = document.querySelector('#p1 .kb-copy').getBoundingClientRect(); return [Math.round(c.left), Math.round(c.right)]; }); ok(g.lapBottom <= h - 60 && g.lapTop >= 80 && c2[0] >= g.lapRight - 2 && c2[1] <= w && g.lapLeft >= -24 && g.lapRight <= w, `fit ${w}x${h}: laptop ${g.lapTop} to ${g.lapBottom} (x ${g.lapLeft} to ${g.lapRight}), copy beside (x ${c2[0]} to ${c2[1]}), dots at ${h - 60}`); };
  await fit(page, 1440, 900);
  // round 5 hint: the mono line and the curve, measured in the .kb-hero frame (the svg's containing block)
  const arrow = async (pg, sel) => pg.evaluate(sel => { const hs = document.querySelector(sel); const p = hs.querySelector('.kb-arrow-path'); const d = p.getAttribute('d'); if (!d) return { d: '' }; const r = hs.getBoundingClientRect(), lap = hs.querySelector('.kb-laptop').getBoundingClientRect(), inp = hs.querySelector('.kb-input, .kb-input-static').getBoundingClientRect(), hint = hs.querySelector('[data-hint]').getBoundingClientRect(); const L = p.getTotalLength(), end = p.getPointAtLength(L), start = p.getPointAtLength(0); return { d, L: Math.round(L), end: [Math.round(end.x), Math.round(end.y)], wantEnd: [Math.round(lap.right - r.left + 10), Math.round(inp.top - r.top + inp.height / 2)], start: [Math.round(start.x), Math.round(start.y)], wantStart: [Math.round(hint.left - r.left - 12), Math.round(hint.top - r.top + hint.height / 2)], off: parseFloat(getComputedStyle(p).strokeDashoffset), head: getComputedStyle(hs.querySelector('.kb-arrow-head')).opacity }; }, sel);
  const hintText = await page.locator('#p1 .kb-hint').innerText();
  ok(/ask venice/i.test(hintText) && /what it costs/i.test(hintText), `hint line reads "${hintText.trim()}"`);
  const a1 = await arrow(page, '#p1 .kb-hero');
  ok(a1.L > 60 && Math.abs(a1.end[0] - a1.wantEnd[0]) <= 3 && Math.abs(a1.end[1] - a1.wantEnd[1]) <= 3, `arrow lands on the laptop edge at the prompt line (end ${a1.end}, want ${a1.wantEnd}, ${a1.L}px)`);
  ok(Math.abs(a1.start[0] - a1.wantStart[0]) <= 3 && Math.abs(a1.start[1] - a1.wantStart[1]) <= 3, `arrow starts at the hint line (start ${a1.start}, want ${a1.wantStart})`);
  ok(a1.off === 0 && a1.head === '1', `arrow fully drawn and headed (offset ${a1.off}, head ${a1.head})`);
  const lab = await page.evaluate(() => { const t = document.querySelector('#p1 .kb-arrow-label'); const cs = getComputedStyle(t); return { text: t.textContent, op: cs.opacity, font: cs.fontFamily, loaded: document.fonts.check('600 27px Caveat'), x: parseFloat(t.getAttribute('x')), rough: document.querySelectorAll('#p1 .kb-arrow g[filter]').length, ghost: !!document.querySelector('#p1 .kb-arrow-path.ghost').getAttribute('d') }; });
  ok(lab.text === 'type here' && lab.op === '1' && /Caveat/.test(lab.font) && lab.loaded && lab.x > 0, `handwritten label "${lab.text}" visible in ${lab.font.split(',')[0]} (loaded ${lab.loaded})`);
  ok(lab.rough === 2 && lab.ghost, `pen look: ${lab.rough} wobble passes, ghost stroke drawn`);
  const a2 = await arrow(page, '#p1clone .kb-hero');
  ok(a2.d && a2.off === 0 && Math.abs(a2.end[1] - a2.wantEnd[1]) <= 3, `clone carries the same curve, drawn without animation (end ${a2.end}, want ${a2.wantEnd})`);
  await page.locator('#p1').screenshot({ path: path.join(SHOTS, 'p1-hero.png') });

  // ---- morph stops and dark chrome ----
  const rgb = s => s.replace(/\s/g, '');
  const expect = ['rgb(226,226,226)', 'rgb(219,219,219)', 'rgb(16,16,16)', 'rgb(226,226,226)'];
  // the track lerps at .085 a frame; on a loaded machine 1.8 s is not always enough, so wait for it to settle
  const settled = async (pg, n) => { try { await pg.waitForFunction(t => Math.abs((window.__xu || 0) - t) < 0.002, n, { timeout: 9000 }); } catch {} await sleep(250); };
  for (let i = 0; i < 4; i++) {
    await page.evaluate(n => window.__goTo(n), i);
    await settled(page, i);
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
  }
  // ---- loop wrap ----
  await page.evaluate(() => window.__goTo(4));
  await settled(page, 0);
  const xuWrap = await page.evaluate(() => window.__xu);
  const idxWrap = await page.$$eval('#dots button', bs => bs.findIndex(b => b.classList.contains('active')));
  ok(xuWrap === 0 && idxWrap === 0, `loop wraps back to the hero (xu ${xuWrap}, dot ${idxWrap})`);
  ok(errors.length === 0, `0 console errors (got ${errors.length})${errors.length ? '\n    ' + errors.slice(0, 6).join('\n    ') : ''}`);
  // ---- services page v7: the card grid replaces the ladder ----
  const sp = await ctx.newPage();
  const serr = [];
  sp.on('pageerror', e => serr.push('pageerror: ' + e.message));
  sp.on('console', m => { if (m.type() === 'error') serr.push('console: ' + m.text()); });
  await sp.goto(SERVICES, { waitUntil: 'networkidle' });
  ok(await sp.locator('meta[name="robots"][content*="noindex"]').count() === 0, 'services: no noindex');
  ok(await sp.locator('#ladder').count() === 0, 'services: ladder gone');
  await sp.locator('#services').scrollIntoViewIfNeeded();
  await sleep(600);
  ok(await sp.locator('#services .jp-card').count() === 8, 'services: 8 cards');
  const sanims = await sp.locator('#services .jp-cards').evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);
  ok(sanims >= 8, `services: card loops running (${sanims})`);
  const sg = sp.locator('#services [data-follow-grid]');
  const sgb = await sg.boundingBox();
  await sp.mouse.move(sgb.x + sgb.width / 2, sgb.y + sgb.height / 2, { steps: 4 });
  await sleep(250);
  ok((await sg.locator('i.lit').count()) > 0, 'services: cursor-follow grid lights');
  ok(await sp.locator('#t1, #t2, #t3, #t4').count() === 4, 'services: the four tier sections stay');
  ok(serr.length === 0, `services: 0 console errors (got ${serr.length})${serr.length ? ' ' + serr.slice(0, 3).join(' | ') : ''}`);
  await sp.locator('#services').screenshot({ path: path.join(SHOTS, 'services-cards.png') });
  await ctx.close();

  // ---- wide screens: the whole hero fits one viewport, services clamped ----
  for (const [w, h] of [[1920, 1080], [2000, 1100]]) {
    const wctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Manila' });
    const wp = await wctx.newPage();
    await wp.goto(URL_, { waitUntil: 'networkidle' });
    await wp.evaluate(() => { const b = document.getElementById('boot'); if (b) b.remove(); });
    await sleep(3400);
    await fit(wp, w, h);
    const aw = await arrow(wp, '#p1 .kb-hero');
    ok(aw.L > 60 && Math.abs(aw.end[0] - aw.wantEnd[0]) <= 3 && Math.abs(aw.end[1] - aw.wantEnd[1]) <= 3 && aw.off === 0, `${w}: arrow on the prompt line (end ${aw.end}, want ${aw.wantEnd}, ${aw.L}px, offset ${aw.off})`);
    const h1r = await wp.evaluate(() => document.querySelector('#p1 .kb-copy h1').getBoundingClientRect());
    ok(h1r.right <= w && h1r.height <= 190 && h1r.height >= 120, `${w}: headline on two lines inside the viewport (right ${Math.round(h1r.right)}, ${Math.round(h1r.height)}px tall)`);
    const zoomed = await wp.evaluate(() => Math.round(document.querySelector('#p1 .kb-chip').getBoundingClientRect().height * 10) / 10);
    ok(zoomed >= 30, `${w}: app interior at 1.2x (chip ${zoomed}px tall, 26 at 1x)`);
    const ctaLines = await wp.evaluate(() => Math.round(document.querySelector('#p1 .kb-cta').getBoundingClientRect().height));
    ok(ctaLines <= 56, `${w}: CTA on one line (${ctaLines}px tall)`);
    await wp.screenshot({ path: path.join(SHOTS, `hero-${w}.png`) });
    if (w === 2000) {
      await wp.goto(SERVICES, { waitUntil: 'networkidle' });
      await wp.locator('#services').scrollIntoViewIfNeeded(); await sleep(900);
      const sw = await wp.evaluate(() => Math.round(document.querySelector('#services .kb-cards-inner').getBoundingClientRect().width));
      ok(sw <= 1240, `wide: services section clamped (${sw}px)`);
      await wp.locator('#services').screenshot({ path: path.join(SHOTS, 'wide-services.png') });
    }
    await wctx.close();
  }

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
  await sleep(1200);
  const ra = await arrow(rp, '#p1 .kb-hero');
  ok(ra.d && ra.off === 0, `reduced motion: arrow simply there (offset ${ra.off})`);
  await rctx.close();

  // ---- mobile: three phone widths, console errors captured, static mode, terminal answers ----
  for (const [mw, mh, name] of [[390, 844, 'iPhone 15'], [360, 780, 'Android'], [430, 932, 'iPhone Pro Max']]) {
    const mctx = await browser.newContext({ viewport: { width: mw, height: mh }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Asia/Manila' });
    const mp = await mctx.newPage();
    const merr = [];
    mp.on('pageerror', e => merr.push('pageerror: ' + e.message));
    mp.on('console', m => { if (m.type() === 'error') merr.push('console: ' + m.text()); });
    await mp.goto(URL_, { waitUntil: 'networkidle' });
    await mp.evaluate(() => { const b = document.getElementById('boot'); if (b) b.remove(); });
    await sleep(800);
    console.log(`mobile ${name} ${mw}x${mh}`);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(overflow <= 1, `mobile: no horizontal overflow (${overflow}px)`);
    ok(await mp.evaluate(() => getComputedStyle(document.getElementById('track')).display === 'block'), 'mobile: vertical static mode (media query active)');
    ok(await mp.locator('#p1 .kb-deck').count() === 0, 'mobile: no deck');
    ok(await mp.locator('#p1 .kb-mini').isHidden(), 'mobile: mini keyboard never shows');
    ok(await mp.locator('#p1 .kb-arrow').isHidden() && await mp.locator('#p1 .kb-hint').isVisible(), 'mobile: arrow hidden, hint line stays');
    const zoomed = await mp.evaluate(() => Math.round(document.querySelector('#p1 .kb-chip').getBoundingClientRect().height));
    ok(zoomed <= 27, `mobile: app interior at 1x (chip ${zoomed}px)`);
    const mcta = await mp.evaluate(() => { const r = document.querySelector('#p1 .kb-cta').getBoundingClientRect(); const l = document.querySelector('#p1 .kb-link').getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(l.left + l.width / 2), r.left >= 0, l.top >= r.bottom, r.right <= innerWidth]; });
    ok(Math.abs(mcta[0] - mw / 2) <= 4 && Math.abs(mcta[1] - mw / 2) <= 4 && mcta[2] && mcta[3] && mcta[4], `mobile: CTA and link centred and stacked (centres x ${mcta[0]}, ${mcta[1]} of ${mw})`);
    const lapW = await mp.evaluate(() => Math.round(document.querySelector('#p1 .kb-laptop').getBoundingClientRect().width));
    ok(lapW <= mw && lapW >= mw * 0.85, `mobile: laptop spans the width (${lapW} of ${mw})`);
    await mp.locator('#p1 .kb-term').tap();
    await mp.locator('#p1 .kb-input').fill('where');
    await mp.locator('#p1 .kb-input').press('Enter');
    let mob = false;
    try { await mp.locator('#p1 .kb-line-ai', { hasText: 'Caloocan' }).waitFor({ timeout: 15000 }); mob = true; } catch {}
    ok(mob, 'mobile: terminal answers');
    const inputFs = await mp.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#p1 .kb-input')).fontSize));
    ok(inputFs >= 16, `mobile: input at ${inputFs}px (16 floor, no iOS zoom-in)`);
    for (const sel of ['#about', '#globe', '#p5']) { await mp.locator(sel).scrollIntoViewIfNeeded(); await sleep(500); }
    ok(merr.length === 0, `mobile: 0 console errors across the page (got ${merr.length})${merr.length ? '\n    ' + merr.slice(0, 5).join('\n    ') : ''}`);
    if (mw === 390) { await mp.locator('#p1').screenshot({ path: path.join(SHOTS, 'mobile-hero.png') }); await mp.locator('#globe').screenshot({ path: path.join(SHOTS, 'mobile-globe.png') }); }
    await mctx.close();
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
console.log(fails.length ? `\n${fails.length} FAIL` : '\nALL GREEN');
console.log('shots: ' + SHOTS);
process.exit(fails.length ? 1 : 0);

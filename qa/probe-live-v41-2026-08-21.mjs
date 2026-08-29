// Live QA probe 2026-08-21 for jtlgrowth.com v4.1 (Lene, task front: presentation Sat 2026-08-22)
import { chromium } from 'playwright';
const BASE = 'https://jtlgrowth.com';
const out = [];
const ok = (name, pass, detail = '') => out.push({ name, pass: !!pass, detail: String(detail) });

const browser = await chromium.launch();

// ---------- viewports: home structure ----------
for (const [label, vw, vh] of [['1280', 1280, 800], ['768', 768, 1024], ['375', 375, 812]]) {
  const pg = await browser.newPage({ viewport: { width: vw, height: vh } });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await pg.goto(BASE + '/', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1200);
  const panelCount = await pg.$$eval('[id^="p"], .panel, section.hero, section', els => els.length);
  ok(`[${label}] loads no console errors`, errors.length === 0, errors.join(' | '));
  const menuBtn = await pg.$('#menu-btn, [aria-label*="menu" i], button:has-text("MENU")');
  ok(`[${label}] MENU button present`, !!menuBtn);
  if (menuBtn) {
    await menuBtn.click();
    await pg.waitForTimeout(400);
    const navLinks = await pg.$$eval('nav a, [role="menu"] a, .menu-panel a, .nav-drop a', as => as.map(a => a.textContent.trim()).filter(Boolean));
    ok(`[${label}] MENU dropdown has nav links`, navLinks.length > 0, navLinks.join(', '));
  }
  await pg.screenshot({ path: `/tmp/live-v41-${label}.png`, fullPage: false });
  await pg.close();
}

// ---------- reduced motion ----------
{
  const pg = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await pg.goto(BASE + '/', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1200);
  ok('reduced-motion: no console errors', errors.length === 0, errors.join(' | '));
  const anims = await pg.$$eval('*', els => els.filter(e => {
    const cs = getComputedStyle(e);
    return cs.animationName !== 'none' && cs.animationDuration !== '0s';
  }).length);
  ok('reduced-motion: no running CSS animations found', anims === 0, `count=${anims}`);
  await pg.close();
}

// ---------- /growth demo ----------
{
  const pg = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  const r = await pg.goto(BASE + '/growth/', { waitUntil: 'networkidle' });
  ok('/growth/ 200', r && r.status() === 200, r ? r.status() : 'no response');
  await pg.waitForTimeout(1500);
  ok('/growth/ no console errors', errors.length === 0, errors.join(' | '));
  const videos = await pg.$$eval('video', vs => vs.map(v => ({ src: v.currentSrc || v.src, paused: v.paused, readyState: v.readyState })));
  ok('/growth/ has video/clip elements', videos.length > 0, JSON.stringify(videos));
  const bodyText = await pg.evaluate(() => document.body.innerText);
  const sensitivePatterns = [/api[_-]?key/i, /secret/i, /password/i, /token/i, /\bssn\b/i, /localhost/i, /127\.0\.0\.1/, /internal/i];
  const hits = sensitivePatterns.filter(p => p.test(bodyText)).map(p => p.toString());
  ok('/growth/ no sensitive-looking strings in visible text', hits.length === 0, hits.join(', '));
  await pg.screenshot({ path: '/tmp/live-v41-growth.png', fullPage: true });
  await pg.close();
}

// ---------- /ai-employee ----------
{
  const pg = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  const r = await pg.goto(BASE + '/ai-employee/', { waitUntil: 'networkidle' });
  ok('/ai-employee/ 200', r && r.status() === 200, r ? r.status() : 'no response');
  await pg.waitForTimeout(1200);
  ok('/ai-employee/ no console errors', errors.length === 0, errors.join(' | '));
  const cards = await pg.$$eval('[class*="card" i]', els => els.length);
  ok('/ai-employee/ has framed cards', cards > 0, `count=${cards}`);
  const ctaContrast = await pg.evaluate(() => {
    const btns = [...document.querySelectorAll('a,button')].filter(b => /get started|book|contact|start|apply|talk/i.test(b.textContent || ''));
    return btns.map(b => {
      const cs = getComputedStyle(b);
      return { text: b.textContent.trim().slice(0, 30), bg: cs.backgroundColor, color: cs.color };
    });
  });
  ok('/ai-employee/ CTA(s) found', ctaContrast.length > 0, JSON.stringify(ctaContrast));
  await pg.screenshot({ path: '/tmp/live-v41-aiemployee.png', fullPage: true });
  await pg.close();
}

// axe sweep skipped: axe-core module not resolvable in this environment; not re-verified live.

await browser.close();

const fail = out.filter(o => !o.pass);
out.forEach(o => console.log(`${o.pass ? 'PASS' : 'FAIL'}  ${o.name}${o.detail ? '  — ' + o.detail : ''}`));
console.log(`\n${out.length - fail.length}/${out.length} pass`);

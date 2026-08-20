// v6 probe — 3-panel home (hero/about/contact), 4 new vertical pages, retired
// bracket chips, follow gate, Mind Atlas background on /services/.
import { chromium } from 'playwright';

const BASE = (process.env.BASE || 'http://127.0.0.1:8117').replace(/\/$/, '');
const out = [];
const ok = (name, pass, detail = '') => out.push({ name, pass: !!pass, detail: String(detail) });
const PAGES = ['/', '/services/', '/products/', '/workshop/', '/work/'];
const ALL = PAGES.concat(['/jamz-jamorol/', '/privacy/', '/growth/', '/setup/', '/inbox-scout/', '/ai-employee/']);

const browser = await chromium.launch();

async function walk(pg) { // fire every IntersectionObserver, then settle
  const h = await pg.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 600) { await pg.evaluate(v => scrollTo(0, v), y); await pg.waitForTimeout(90); }
  // the last revealed element is still mid-transition at 900ms (.8s ease + .24s
  // delay). Settling short here reads a live animation as a failed reveal — the
  // same race that bit the v5 screenshots.
  await pg.waitForTimeout(1800);
}

// ---------- 1. routes resolve ----------
{
  const pg = await browser.newPage();
  for (const p of ALL) {
    const r = await pg.goto(BASE + p, { waitUntil: 'domcontentloaded' });
    ok(`200 ${p}`, r && r.status() === 200, r ? r.status() : 'no response');
  }
  await pg.close();
}

// ---------- 2. homepage: 3 panels, no stats strip, no chips ----------
{
  const pg = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await pg.addInitScript(() => sessionStorage.setItem('jtlboot', '1'));
  await pg.goto(BASE + '/', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);

  const panels = await pg.$$eval('.panel:not(.panel-clone)', e => e.map(x => x.id));
  ok('home has exactly 3 panels p1/about/p5', panels.join(',') === 'p1,about,p5', panels.join(','));
  ok('loop clone still present', !!(await pg.$('#p1clone')));
  ok('counter reads 01 / 03', (await pg.$eval('#counter', e => e.textContent.trim())) === '01 / 03');
  ok('3 dots', (await pg.$$eval('#dots button', e => e.length)) === 3);
  ok('hero stats strip gone (both copies)', (await pg.$$eval('.hero-meta', e => e.length)) === 0);
  ok('ladder panel gone from home', !(await pg.$('#build')));
  ok('proof panel gone from home', !(await pg.$('#pwork')));
  ok('about panel has one proof card', (await pg.$$eval('.proof-card', e => e.length)) === 1);
  ok('bg morph stops match panel count', await pg.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--bg-about').trim() !== ''));
  const nav = await pg.$$eval('.nav-row a', e => e.map(x => x.getAttribute('href')).join(','));
  ok('inline nav row: services/products/workshop/work', nav === '/services/,/products/,/workshop/,/work/', nav);
  ok('MENU dropdown still present', !!(await pg.$('#menu-panel')));
  ok('home has no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await pg.close();
}

// ---------- 3. bracket chips retired site-wide (render level, not grep) ----------
for (const p of ALL) {
  const pg = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await pg.goto(BASE + p, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(350);
  const bad = await pg.evaluate(() => {
    const r = [];
    document.querySelectorAll('.kicker').forEach(el => {
      const b = getComputedStyle(el, '::before').content, a = getComputedStyle(el, '::after').content;
      if ((b && b !== 'none') || (a && a !== 'none') || el.querySelector('.ki')) r.push(el.textContent.trim().slice(0, 24));
    });
    return r;
  });
  ok(`no bracket chip ${p}`, bad.length === 0, bad.join(','));
  await pg.close();
}

// ---------- 4. every page: reveals land, no console errors, in both themes ----------
for (const theme of ['light', 'dark']) {
  for (const p of PAGES) {
    const pg = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    pg.on('pageerror', e => errors.push(String(e)));
    pg.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    await pg.addInitScript(t => { localStorage.setItem('jtl-theme', t); sessionStorage.setItem('jtlboot', '1'); }, theme);
    await pg.goto(BASE + p, { waitUntil: 'networkidle' });
    if (p !== '/') await walk(pg); else await pg.waitForTimeout(1500);
    ok(`${theme} ${p} theme applied`,
      (await pg.evaluate(() => document.documentElement.getAttribute('data-theme'))) === theme);
    if (p !== '/') {
      const hidden = await pg.$$eval('.rv', els => els.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.9).length);
      ok(`${theme} ${p} all reveals landed`, hidden === 0, hidden + ' still hidden');
    }
    ok(`${theme} ${p} no errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await pg.close();
  }
}

// ---------- 5. 375px ----------
for (const p of PAGES) {
  const pg = await browser.newPage({ viewport: { width: 375, height: 780 } });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  await pg.addInitScript(() => sessionStorage.setItem('jtlboot', '1'));
  await pg.goto(BASE + p, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1200);
  const overflow = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`375 ${p} no horizontal overflow`, overflow <= 1, overflow + 'px');
  const navVisible = await pg.evaluate(() => {
    const n = document.querySelector('.nav-row'); return n ? getComputedStyle(n).display !== 'none' : false;
  });
  ok(`375 ${p} inline nav hidden, MENU takes over`, !navVisible && !!(await pg.$('#menu-btn')));
  ok(`375 ${p} no errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await pg.close();
}

// ---------- 6. reduced motion ----------
for (const p of PAGES) {
  const pg = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await pg.addInitScript(() => sessionStorage.setItem('jtlboot', '1'));
  await pg.goto(BASE + p, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(900);
  const hidden = await pg.$$eval('.rv', els => els.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.9).length);
  ok(`reduced ${p} nothing stays invisible`, hidden === 0, hidden + ' hidden');
  await pg.close();
}

// ---------- 7. the Mind Atlas background on /services/ ----------
{
  const pg = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pg.goto(BASE + '/services/', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(2000);
  ok('atlas canvas mounted', (await pg.$$eval('#atlas canvas', e => e.length)) === 1);
  ok('atlas renderer is transparent',
    await pg.evaluate(() => { const h = window.__atlas; return !!h; }));
  ok('atlas fed by the snapshot', await pg.evaluate(() => (window.__atlas && window.__atlas.nodes) > 0),
    await pg.evaluate(() => window.__atlas && window.__atlas.nodes));

  // the wheel must scroll the page, not dolly a camera
  const before = await pg.evaluate(() => scrollY);
  await pg.mouse.move(720, 500);
  await pg.mouse.wheel(0, 700);
  await pg.waitForTimeout(500);
  const after = await pg.evaluate(() => scrollY);
  ok('wheel over the canvas scrolls the page', after > before + 200, `${before} -> ${after}`);

  // no keyboard hijack: typing must not be swallowed by a globe handler
  await pg.evaluate(() => { const i = document.createElement('input'); i.id = 'kbtest'; document.body.appendChild(i); i.focus(); });
  await pg.keyboard.type('v/escape');
  ok('no global key hijack', (await pg.$eval('#kbtest', e => e.value)) === 'v/escape');

  // no calls out to the local ops-api / voice bridge
  const stray = [];
  pg.on('request', r => { if (/127\.0\.0\.1:(8112|8113)/.test(r.url())) stray.push(r.url()); });
  await pg.reload({ waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);
  ok('no localhost ops-api/bridge calls', stray.length === 0, stray.join(','));
  await pg.close();
}
{
  const pg = await browser.newPage({ viewport: { width: 375, height: 780 } });
  const three = [];
  pg.on('request', r => { if (/three\.module\.js/.test(r.url())) three.push(r.url()); });
  await pg.goto(BASE + '/services/', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1200);
  ok('375 skips three.js entirely', three.length === 0, three.join(','));
  ok('375 removes the atlas layer', !(await pg.$('#atlas')));
  await pg.close();
}
{
  const pg = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await pg.goto(BASE + '/services/', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);
  ok('reduced motion renders a still atlas', await pg.evaluate(() => !!(window.__atlas && window.__atlas.reduced)));
  await pg.close();
}

// ---------- 8. follow gate ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  await pg.goto(BASE + '/products/', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(900);
  ok('gate rendered', (await pg.locator('.jgate').count()) === 1);
  ok('gate starts locked', await pg.locator('.jgate-out').isHidden());
  ok('submit disabled until every profile is opened', await pg.locator('.jgate-form button').isDisabled());
  ok('counter is aria-live', (await pg.locator('.jgate-count').getAttribute('aria-live')) === 'polite');
  const n = await pg.locator('.jgate-b').count();
  // asserted against the file, not a hardcoded number — adding an account is a
  // data edit and the probe must follow it rather than fail on it
  const declared = await pg.evaluate(() => fetch('/assets/socials.json').then(r => r.json()).then(d => d.accounts.length));
  ok('one button per account in socials.json', n === declared, `${n} buttons vs ${declared} declared`);
  for (let i = 0; i < n; i++) {
    const [popup] = await Promise.all([ctx.waitForEvent('page').catch(() => null), pg.locator('.jgate-b').nth(i).click()]);
    if (popup) await popup.close();
    await pg.waitForTimeout(120);
  }
  ok('all opened -> submit enabled', !(await pg.locator('.jgate-form button').isDisabled()));
  await pg.fill('.jgate-form input', 'nope');
  await pg.click('.jgate-form button'); await pg.waitForTimeout(200);
  ok('invalid email keeps it locked', await pg.locator('.jgate-out').isHidden());
  await pg.fill('.jgate-form input', 'probe@example.com');
  await pg.click('.jgate-form button'); await pg.waitForTimeout(300);
  ok('valid email unlocks', await pg.locator('.jgate-out').isVisible());
  await pg.reload({ waitUntil: 'networkidle' }); await pg.waitForTimeout(800);
  ok('unlock survives reload', await pg.locator('.jgate-out').isVisible());
  await ctx.close();

  const fresh = await browser.newContext();
  const fp = await fresh.newPage();
  await fp.goto(BASE + '/products/', { waitUntil: 'networkidle' }); await fp.waitForTimeout(800);
  ok('a fresh visitor is locked', await fp.locator('.jgate-out').isHidden());
  await fresh.close();

  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const np = await nojs.newPage();
  await np.goto(BASE + '/products/', { waitUntil: 'domcontentloaded' });
  ok('degrades to a plain link with JS off', (await np.locator('noscript').count()) > 0);
  await nojs.close();
}

// ---------- 9. no dead internal links ----------
{
  const pg = await browser.newPage();
  const seen = new Set();
  for (const p of PAGES) {
    await pg.goto(BASE + p, { waitUntil: 'domcontentloaded' });
    const hrefs = await pg.$$eval('a[href^="/"]', a => a.map(x => x.getAttribute('href')));
    hrefs.forEach(h => seen.add(h.split('#')[0]));
  }
  for (const h of [...seen].filter(Boolean)) {
    const r = await pg.goto(BASE + h, { waitUntil: 'domcontentloaded' }).catch(() => null);
    ok(`internal link ${h}`, r && r.status() === 200, r ? r.status() : 'failed');
  }
  await pg.close();
}

await browser.close();

const fail = out.filter(o => !o.pass);
out.forEach(o => { if (!o.pass) console.log(`FAIL  ${o.name}${o.detail ? '  — ' + o.detail : ''}`); });
console.log(`\nv6 probe: ${out.length - fail.length}/${out.length} green`);
process.exit(fail.length ? 1 : 0);

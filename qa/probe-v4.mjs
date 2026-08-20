// v4.1 quiet-hero probe — structure, scroll maps, half-pill, MENU, a11y basics
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8117/';
const out = [];
const ok = (name, pass, detail = '') => { out.push({ name, pass, detail }); };

const browser = await chromium.launch();

// ---------- desktop 1280 ----------
{
  const pg = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.evaluate(() => sessionStorage.setItem('jtlboot', '1'));
  await pg.waitForTimeout(1800);

  const panels = await pg.$$eval('.panel:not(.panel-clone)', els => els.map(e => e.id));
  ok('3 real panels p1/pwork/p5', panels.join(',') === 'p1,pwork,p5', panels.join(','));
  ok('deleted panels gone', await pg.$$eval('#p2,#p3,#p4,#pstack,#pfounders', els => els.length) === 0);
  ok('clone present', !!(await pg.$('#p1clone')));

  // v4.1: quiet hero
  ok('floaters gone', await pg.$$eval('.floaters,.fcard', els => els.length) === 0);
  ok('crystal gone', !(await pg.$('#crystal')));
  const drift = await pg.$eval('#p1 .hero-glow', e => getComputedStyle(e).animationName);
  ok('hero drift animating', drift === 'heroDrift', drift);

  // half-pill
  const pill = await pg.$eval('#greetpill', e => ({ tag: e.tagName, hidden: e.getAttribute('aria-hidden'), top: e.getBoundingClientRect().top, radius: getComputedStyle(e).borderRadius, txt: e.textContent }));
  ok('pill is decorative div', pill.tag === 'DIV' && pill.hidden === 'true');
  ok('pill flush with top edge', pill.top === 0, String(pill.top));
  ok('pill half-radius (flat top)', /^0px 0px 14px 14px$/.test(pill.radius), pill.radius);
  ok('pill greeting text', /GOOD|UP LATE/.test(pill.txt), pill.txt.slice(0, 40));
  ok('no ⌘K chip on pill', !pill.txt.includes('⌘K'));

  // MENU disclosure
  ok('menu button visible', !!(await pg.$('#menu-btn')));
  await pg.click('#menu-btn'); await pg.waitForTimeout(200);
  ok('menu opens', await pg.$eval('#menu-btn', e => e.getAttribute('aria-expanded')) === 'true');
  const links = await pg.$$eval('#menu-panel a', els => els.map(e => e.getAttribute('href')));
  ok('menu has 8 items', links.length === 8, String(links.length));
  ok('menu page hrefs', ['/growth/', '/ai-employee/', '/inbox-scout/', '/robots-and-coffee/', '/jamz-jamorol/'].every(h => links.includes(h)));
  ok('first item focused on open', await pg.evaluate(() => document.activeElement.closest('#menu-panel') !== null));
  await pg.keyboard.press('ArrowDown');
  ok('arrow moves focus', await pg.evaluate(() => document.activeElement.textContent.includes('Live proof')));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
  ok('Esc closes menu + focus returns', await pg.$eval('#menu-btn', e => e.getAttribute('aria-expanded')) === 'false' && await pg.evaluate(() => document.activeElement.id === 'menu-btn'));
  // section jump via menu
  await pg.click('#menu-btn'); await pg.waitForTimeout(150);
  await pg.click('#menu-panel a[data-go="1"]'); await pg.waitForTimeout(2200);
  ok('menu section jump works', (await pg.$eval('#counter', e => e.textContent.trim())) === '02 / 03');
  ok('menu closed after item click', await pg.$eval('#menu-panel', e => e.hidden));

  // island nav readout
  const pillNav = await pg.$eval('#greetpill .gp-txt', e => e.textContent);
  ok('pill section readout', /02 \/ PROOF/.test(pillNav), pillNav);
  await pg.waitForTimeout(2200);
  ok('pill settles to greeting', /GOOD|UP LATE/.test(await pg.$eval('#greetpill .gp-txt', e => e.textContent)));

  // word reveal scrub in hold
  await pg.mouse.wheel(0, 500); await pg.waitForTimeout(700);
  ok('word reveal scrubs in hold', (await pg.$$eval('.wreveal .w.on', els => els.length)) > 0);

  // contact
  await pg.evaluate(() => document.querySelectorAll('#dots button')[2].click());
  await pg.waitForTimeout(2200);
  ok('counter at contact', (await pg.$eval('#counter', e => e.textContent.trim())) === '03 / 03');
  ok('4 hub chips', (await pg.$$eval('.hub-chip', els => els.length)) === 4);
  ok('founder chips in p5', (await pg.$$eval('#p5 .fchip', els => els.length)) === 2);

  // ⌘K palette still functional (no visible affordance)
  await pg.keyboard.press('Meta+k'); await pg.waitForTimeout(250);
  ok('⌘K still opens palette', await pg.$eval('#pal', e => e.classList.contains('open')));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
  ok('Esc closes palette', await pg.$eval('#pal', e => !e.classList.contains('open')));

  ok('skip link present', !!(await pg.$('.skip-link')));
  ok('sections labelled', (await pg.$$eval('.panel:not(.panel-clone)[aria-label]', els => els.length)) === 3);
  ok('no console/page errors (1280)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await pg.screenshot({ path: 'qa/v41-1280-hero.png' });
  await pg.close();
}

// ---------- reduced motion ----------
{
  const pg = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(600);
  ok('reduced: vertical page', await pg.evaluate(() => document.documentElement.scrollHeight > innerHeight * 1.5));
  ok('reduced: pill hidden', await pg.$eval('#greetpill', e => getComputedStyle(e).display) === 'none');
  ok('reduced: drift off', await pg.$eval('#p1 .hero-glow', e => getComputedStyle(e).animationName) === 'none');
  ok('reduced: marquee off', await pg.$eval('.proof-strip .ptrack', e => getComputedStyle(e).animationName) === 'none');
  // menu still operable
  await pg.click('#menu-btn'); await pg.waitForTimeout(150);
  ok('reduced: menu opens', await pg.$eval('#menu-btn', e => e.getAttribute('aria-expanded')) === 'true');
  await pg.keyboard.press('Escape');
  ok('no errors (reduced)', errors.length === 0, errors.join(' | '));
  await pg.close();
}

// ---------- mobile 375 ----------
{
  const pg = await browser.newPage({ viewport: { width: 375, height: 720 } });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(600);
  ok('mobile: vertical page', await pg.evaluate(() => document.documentElement.scrollHeight > innerHeight * 1.5));
  ok('mobile: clone hidden', await pg.$eval('#p1clone', e => getComputedStyle(e).display) === 'none');
  ok('mobile: no horizontal overflow', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  await pg.click('#menu-btn'); await pg.waitForTimeout(150);
  const panelBox = await pg.$eval('#menu-panel', e => e.getBoundingClientRect());
  ok('mobile: menu opens on-screen', panelBox.left >= 0 && panelBox.right <= 377, JSON.stringify({ l: panelBox.left, r: panelBox.right }));
  ok('no errors (375)', errors.length === 0, errors.join(' | '));
  await pg.screenshot({ path: 'qa/v41-375.png', fullPage: true });
  await pg.close();
}

await browser.close();
const fails = out.filter(r => !r.pass);
for (const r of out) console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
console.log('\n' + (out.length - fails.length) + '/' + out.length + ' green');
process.exit(fails.length ? 1 : 0);

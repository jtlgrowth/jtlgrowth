// v5 probe — 4-panel filmstrip (build ladder added), dark mode toggle, mind-atlas canvas
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8117/';
const out = [];
const ok = (name, pass, detail = '') => { out.push({ name, pass, detail }); };

const browser = await chromium.launch();

// ---------- desktop 1280 · light ----------
{
  const pg = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.evaluate(() => sessionStorage.setItem('jtlboot', '1'));
  await pg.waitForTimeout(1800);

  const panels = await pg.$$eval('.panel:not(.panel-clone)', els => els.map(e => e.id));
  ok('4 real panels p1/build/pwork/p5', panels.join(',') === 'p1,build,pwork,p5', panels.join(','));
  ok('clone present', !!(await pg.$('#p1clone')));
  ok('crystal stone not ported', !(await pg.$('#crystal')));
  ok('counter starts 01 / 04', (await pg.$eval('#counter', e => e.textContent.trim())) === '01 / 04');
  ok('4 dots', (await pg.$$eval('#dots button', els => els.length)) === 4);

  // theme default light
  ok('default theme light', await pg.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'light');

  // mind-atlas canvas
  const cvs = await pg.$eval('#universe', e => ({ disp: getComputedStyle(e).display, w: e.width }));
  ok('atlas canvas rendered', cvs.disp !== 'none' && cvs.w > 0, JSON.stringify(cvs));

  // ladder panel content
  ok('ladder pyramid svg present', !!(await pg.$('.growth-ladder')));
  ok('4 tier cards', (await pg.$$eval('.tcard', els => els.length)) === 4);
  ok('4 ladder-key swatches', (await pg.$$eval('.ladder-key .sw', els => els.length)) === 4);
  const t4 = await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--t4').trim());
  ok('ramp is mono (t4 near-black)', t4.toUpperCase() === '#181818', t4);

  // MENU: 4 section links, 9 items total
  await pg.click('#menu-btn'); await pg.waitForTimeout(200);
  const links = await pg.$$eval('#menu-panel a', els => els.map(e => e.getAttribute('href')));
  ok('menu has 9 items', links.length === 9, String(links.length));
  ok('menu has 4 section jumps', (await pg.$$eval('#menu-panel a[data-go]', els => els.length)) === 4);
  await pg.click('#menu-panel a[data-go="1"]'); await pg.waitForTimeout(2200);
  ok('menu jump to build', (await pg.$eval('#counter', e => e.textContent.trim())) === '02 / 04');
  ok('build kicker is 02', await pg.$eval('#build .kicker .ki', e => e.textContent) === '02');
  await pg.screenshot({ path: 'qa/v5-1280-build.png' });

  // island readout names the new panel
  await pg.evaluate(() => document.querySelectorAll('#dots button')[2].click());
  await pg.waitForTimeout(400);
  const pillNav = await pg.$eval('#greetpill .gp-txt', e => e.textContent);
  ok('pill reads section (BUILD/PROOF)', /BUILD|PROOF/.test(pillNav), pillNav);
  await pg.waitForTimeout(2000);

  // word reveal scrubs in pwork hold (now panel index 2)
  await pg.mouse.wheel(0, 500); await pg.waitForTimeout(700);
  ok('word reveal scrubs in hold', (await pg.$$eval('.wreveal .w.on', els => els.length)) > 0);

  // contact
  await pg.evaluate(() => document.querySelectorAll('#dots button')[3].click());
  await pg.waitForTimeout(2200);
  ok('counter at contact 04 / 04', (await pg.$eval('#counter', e => e.textContent.trim())) === '04 / 04');
  ok('contact kicker is 04', await pg.$eval('#p5 .kicker .ki', e => e.textContent) === '04');

  // ⌘K has the ladder + theme entries
  await pg.keyboard.press('Meta+k'); await pg.waitForTimeout(250);
  const acts = await pg.$$eval('#pal-ls li', els => els.map(e => e.textContent));
  ok('palette lists ladder', acts.some(t => /ladder/i.test(t)));
  ok('palette lists theme toggle', acts.some(t => /dark \/ light/i.test(t)));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);

  ok('sections labelled', (await pg.$$eval('.panel:not(.panel-clone)[aria-label]', els => els.length)) === 4);
  ok('no console/page errors (light)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await pg.screenshot({ path: 'qa/v5-1280-contact.png' });
  await pg.close();
}

// ---------- desktop 1280 · dark toggle + persistence ----------
{
  const pg = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.evaluate(() => sessionStorage.setItem('jtlboot', '1'));
  await pg.waitForTimeout(1800);

  await pg.click('#tgl'); await pg.waitForTimeout(400);
  ok('toggle flips to dark', await pg.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark');
  const bg = await pg.$eval('#viewport', e => getComputedStyle(e).backgroundColor);
  ok('viewport ground goes dark', bg === 'rgb(18, 18, 18)', bg);
  const meta = await pg.$eval('meta[name="theme-color"]', e => e.getAttribute('content'));
  ok('meta theme-color dark', meta === '#121212', meta);
  const ink = await pg.evaluate(() => getComputedStyle(document.body).color);
  ok('body ink inverts', ink === 'rgb(226, 226, 226)', ink);
  await pg.screenshot({ path: 'qa/v5-1280-dark.png' });

  await pg.reload({ waitUntil: 'networkidle' }); await pg.waitForTimeout(600);
  ok('dark persists across reload', await pg.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark');
  const flash = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok('dark ground pre-paint', flash === 'rgb(18, 18, 18)', flash);

  await pg.click('#tgl'); await pg.waitForTimeout(300);
  ok('toggle returns to light', await pg.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'light');
  ok('no console/page errors (dark)', errors.length === 0, errors.slice(0, 3).join(' | '));
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
  ok('reduced: atlas canvas hidden', await pg.$eval('#universe', e => getComputedStyle(e).display) === 'none');
  ok('reduced: drift off', await pg.$eval('#p1 .hero-glow', e => getComputedStyle(e).animationName) === 'none');
  ok('reduced: marquee off', await pg.$eval('.proof-strip .ptrack', e => getComputedStyle(e).animationName) === 'none');
  ok('reduced: tiers visible without animation', await pg.$eval('.tier', e => getComputedStyle(e).opacity) === '1');
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
  ok('mobile: atlas canvas hidden', await pg.$eval('#universe', e => getComputedStyle(e).display) === 'none');
  ok('mobile: no horizontal overflow', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  ok('mobile: build panel present', !!(await pg.$('#build')));
  // dark toggle works on mobile too
  await pg.click('#tgl'); await pg.waitForTimeout(300);
  ok('mobile: toggle flips to dark', await pg.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark');
  await pg.click('#tgl');
  ok('no errors (375)', errors.length === 0, errors.join(' | '));
  await pg.screenshot({ path: 'qa/v5-375.png', fullPage: true });
  await pg.close();
}

await browser.close();
const fails = out.filter(r => !r.pass);
for (const r of out) console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
console.log('\n' + (out.length - fails.length) + '/' + out.length + ' green');
process.exit(fails.length ? 1 : 0);

// v4 clean-filmstrip probe — structure, scroll maps, island, palette, a11y basics
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
  await pg.waitForTimeout(1800); // boot screen clears

  const panels = await pg.$$eval('.panel:not(.panel-clone)', els => els.map(e => e.id));
  ok('3 real panels', panels.length === 3, panels.join(','));
  ok('panel order p1/pwork/p5', panels.join(',') === 'p1,pwork,p5', panels.join(','));
  ok('deleted panels gone', await pg.$$eval('#p2,#p3,#p4,#pstack,#pfounders', els => els.length) === 0);
  ok('clone present', !!(await pg.$('#p1clone')));

  const markers = await pg.$$eval('#dots button', els => els.map(e => e.textContent.trim()));
  ok('named markers', markers.join(',') === 'Hero,Proof,Contact', markers.join(','));
  const mh = await pg.$eval('#dots button', e => e.getBoundingClientRect().height);
  ok('marker target >=24px', mh >= 24, String(mh));
  ok('counter 01/03', (await pg.$eval('#counter', e => e.textContent.trim())) === '01 / 03');

  // island
  const pill = await pg.$eval('#greetpill', e => ({ tag: e.tagName, txt: e.textContent }));
  ok('island is a button', pill.tag === 'BUTTON');
  ok('island greeting text', /GOOD|UP LATE/.test(pill.txt), pill.txt.slice(0, 40));
  ok('island has ⌘K chip', pill.txt.includes('⌘K'));

  // hub chips
  const hubs = await pg.$$eval('.hub-chip', els => els.map(e => e.getAttribute('href')));
  ok('4 hub chips', hubs.length === 4, hubs.join(' '));
  ok('hub targets', ['/growth/', '/ai-employee/', '/inbox-scout/', '/jamz-jamorol/'].every(h => hubs.includes(h)));

  // founders folded into CTA
  ok('founder chips in p5', await pg.$$eval('#p5 .fchip', els => els.length) === 2);

  // proof strip
  ok('proof strip items', await pg.$$eval('.proof-strip .pi', els => els.length) >= 20);

  // scroll to proof: island nav mode + bg dark + word reveal scrub
  await pg.evaluate(() => document.querySelectorAll('#dots button')[1].click());
  await pg.waitForTimeout(700);
  const pillNav = await pg.$eval('#greetpill .gp-txt', e => e.textContent);
  ok('island nav mode while moving', /02 \/ PROOF|01 \/ HERO/.test(pillNav), pillNav);
  await pg.waitForTimeout(2500);
  const bg = await pg.$eval('#viewport', e => getComputedStyle(e).backgroundColor);
  ok('proof panel bg dark', /rgb\(1[0-9], ?1[0-9], ?1[0-9]\)/.test(bg), bg);
  const pillBack = await pg.$eval('#greetpill .gp-txt', e => e.textContent);
  ok('island settles back to greeting', /GOOD|UP LATE/.test(pillBack), pillBack);

  // hold zone: extra scroll scrubs word reveal
  await pg.mouse.wheel(0, 500); await pg.waitForTimeout(700);
  const onWords = await pg.$$eval('.wreveal .w.on', els => els.length);
  ok('word reveal scrubs in hold', onWords > 0, String(onWords));

  // continue to contact
  await pg.evaluate(() => document.querySelectorAll('#dots button')[2].click());
  await pg.waitForTimeout(2200);
  const counter3 = await pg.$eval('#counter', e => e.textContent.trim());
  ok('counter at contact 03/03', counter3 === '03 / 03', counter3);
  const bgLight = await pg.$eval('#viewport', e => getComputedStyle(e).backgroundColor);
  ok('contact bg light', bgLight === 'rgb(226, 226, 226)', bgLight);

  // palette open via keyboard + via island click, Esc closes + focus returns
  await pg.keyboard.press('Meta+k'); await pg.waitForTimeout(300);
  ok('⌘K opens palette', await pg.$eval('#pal', e => e.classList.contains('open')));
  const items = await pg.$$eval('#pal-ls li', els => els.map(e => e.textContent));
  ok('palette has growth entry', items.some(t => /Growth software/.test(t)));
  ok('palette has 3 sections only', !items.some(t => /How we work|Why trust us|The stack/.test(t)));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  ok('Esc closes palette', await pg.$eval('#pal', e => !e.classList.contains('open')));
  await pg.evaluate(() => document.getElementById('greetpill').click());
  await pg.waitForTimeout(300);
  ok('island click opens palette', await pg.$eval('#pal', e => e.classList.contains('open')));
  await pg.keyboard.press('Escape');

  // easter egg: typing leak triggers burst
  await pg.keyboard.type('leak'); await pg.waitForTimeout(400);
  const burst = await pg.evaluate(() => true); // burst is internal; verify no error thrown
  ok('typing leak throws no error', burst && errors.length === 0);

  // keyboard nav
  await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(1500);
  // skip link exists
  ok('skip link present', !!(await pg.$('.skip-link')));
  ok('canvas aria-hidden', (await pg.$eval('#crystal', e => e.getAttribute('aria-hidden'))) === 'true');
  ok('sections labelled', await pg.$$eval('.panel:not(.panel-clone)[aria-label]', els => els.length) === 3);

  ok('no console/page errors (1280)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await pg.screenshot({ path: 'qa/v4-1280-hero.png' });
  await pg.close();
}

// ---------- reduced motion ----------
{
  const pg = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(600);
  const scrollable = await pg.evaluate(() => document.documentElement.scrollHeight > innerHeight * 1.5);
  ok('reduced-motion: vertical page', scrollable);
  ok('reduced-motion: crystal hidden', await pg.$eval('#crystal', e => getComputedStyle(e).display) === 'none');
  ok('reduced-motion: pill hidden', await pg.$eval('#greetpill', e => getComputedStyle(e).display) === 'none');
  const anim = await pg.$eval('.proof-strip .ptrack', e => getComputedStyle(e).animationName);
  ok('reduced-motion: marquee off', anim === 'none', anim);
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
  const hWide = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2);
  ok('mobile: no horizontal overflow', hWide, String(await pg.evaluate(() => document.documentElement.scrollWidth)));
  ok('no errors (375)', errors.length === 0, errors.join(' | '));
  await pg.screenshot({ path: 'qa/v4-375.png', fullPage: true });
  await pg.close();
}

await browser.close();
const fails = out.filter(r => !r.pass);
for (const r of out) console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
console.log('\n' + (out.length - fails.length) + '/' + out.length + ' green');
process.exit(fails.length ? 1 : 0);

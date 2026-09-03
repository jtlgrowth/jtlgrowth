// Refuter for qa/keeby-redesign-proposals.html. Re-runs every claim from disk.
// Exit non-zero on any miss. Usage: node qa/probe-proposals.mjs [--shots DIR]
//   serves the repo on 127.0.0.1:8119, drives each of the five variants:
//   chat plays to its last line and the chips render, one chip answers,
//   the globe boots (cobe on) and its render loop positions a ping,
//   the globe clip is not blank (PNG byte floor), 0 console errors,
//   reduced-motion run has 0 running animations, mobile has no x-overflow.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 8119;
const URL_ = `http://127.0.0.1:${PORT}/qa/keeby-redesign-proposals.html`;
const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx > -1 ? process.argv[shotsIdx + 1] : path.join(ROOT, 'qa', '.shots-proposals');
mkdirSync(SHOTS, { recursive: true });

const fails = [];
const ok = (cond, msg) => { if (cond) console.log('  ok   ' + msg); else { fails.push(msg); console.log('  FAIL ' + msg); } };

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));

// the bundled headless shell may be missing on this box (disk is tight); fall back to installed Chrome
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
try {
  // ---------- desktop, full motion ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, timezoneId: 'Asia/Manila' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL_, { waitUntil: 'networkidle' });

  const n = await page.locator('section.variant').count();
  ok(n === 5, `5 variants present (got ${n})`);

  for (let i = 1; i <= 5; i++) {
    const v = page.locator(`#v${i}`);
    console.log(`variant 0${i}`);
    const hero = v.locator('.stage-hero');
    await hero.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const manual = await v.locator('.jp-chat[data-chat="manual"]').count();
    if (manual) {
      await v.locator('.jp-chat-gate button').click();
    }
    // transcript plays to its last line, then 4 chips render
    let chips = 0;
    try {
      await v.locator('.jp-chat-chips:not([hidden]) .jp-chip').nth(3).waitFor({ timeout: 45000 });
      chips = await v.locator('.jp-chat-chips .jp-chip').count();
    } catch {}
    const msgs = await v.locator('.jp-chat-log .jp-msg').count();
    ok(chips === 4, `chat played to the end, 4 chips (chips ${chips}, msgs on screen ${msgs})`);
    const lastAi = await v.locator('.jp-chat-log .jp-msg.ai').last().innerText().catch(() => '');
    ok(/tell you that on the call/.test(lastAi), 'last AI line is the transcript close');
    // one chip answers
    await v.locator('.jp-chat-chips button.jp-chip').first().click();
    let answered = false;
    try { await v.locator('.jp-chat-log .jp-msg.ai', { hasText: 'repetitive half' }).waitFor({ timeout: 15000 }); answered = true; } catch {}
    ok(answered, 'first chip produced its pre-written answer');
    const real = await v.locator('.jp-chip.real[href="#p5"]').count();
    ok(real === 1, 'the "Talk to the real one" chip links to #p5');
    await hero.screenshot({ path: path.join(SHOTS, `v${i}-hero-desktop.png`) });

    // globe(s): boot, render loop, painted pixels
    const globes = v.locator('.jp-globe[data-globe]');
    const gcount = await globes.count();
    for (let g = 0; g < gcount; g++) {
      const el = globes.nth(g);
      await el.scrollIntoViewIfNeeded();
      let on = false;
      try { await el.locator('canvas.on').waitFor({ timeout: 20000 }); on = true; } catch {}
      ok(on, `globe ${g + 1}/${gcount} booted (cobe loaded, canvas.on)`);
      await page.waitForTimeout(2600);
      const pinged = await el.evaluate(e => [...e.querySelectorAll('.jp-ping')].some(p => p.style.transform.includes('translate')));
      ok(pinged, `globe ${g + 1}: render loop positioned a ping`);
      const capText = await el.evaluate(e => (e.nextElementSibling && e.nextElementSibling.textContent) || '');
      ok(/Running in /.test(capText) || /pings since/.test(capText), `globe ${g + 1}: caption present ("${capText.trim().slice(0, 40)}")`);
      const png = await el.screenshot({ path: path.join(SHOTS, `v${i}-globe${g + 1}.png`) });
      ok(png.length > 20000, `globe ${g + 1}: clip is not blank (${png.length} B PNG, floor 20000)`);
      // drag moves phi: caption city may change, canvas gets dragging class during drag
      const box = await el.locator('canvas').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const mid = page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
      await page.waitForTimeout(60);
      const dragging = await el.locator('canvas.dragging').count();
      await mid; await page.mouse.up();
      ok(dragging === 1, `globe ${g + 1}: drag engages (canvas.dragging)`);
    }
    if (await v.locator('.jp-counter').count()) {
      const digits = await v.locator('.jp-counter .digit').count();
      ok(digits >= 3, `counter rendered ${digits} rolling digits`);
    }
    // cards
    const cards = v.locator('.stage-cards');
    await cards.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const cc = await v.locator('.jp-card').count();
    ok(cc === 8, `8 cards rendered (got ${cc})`);
    const anims = await v.locator('.stage-cards').evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);
    ok(anims >= 8, `card loops running (${anims} animations)`);
    if (await v.locator('[data-follow-grid]').count()) {
      const grid = v.locator('[data-follow-grid]');
      const gb = await grid.boundingBox();
      await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2, { steps: 4 });
      await page.waitForTimeout(250);
      const lit = await grid.locator('i.lit').count();
      ok(lit > 0, `cursor-follow grid lit ${lit} dots`);
    }
    await cards.screenshot({ path: path.join(SHOTS, `v${i}-cards-desktop.png`) });
  }
  // sound gate toggles without error
  const gate = page.locator('[data-sound-gate]').first();
  if (await gate.count()) {
    await gate.scrollIntoViewIfNeeded();
    await gate.click();
    ok((await gate.getAttribute('aria-pressed')) === 'true', 'sound gate turns on');
    await gate.click();
    ok((await gate.getAttribute('aria-pressed')) === 'false', 'sound gate turns off');
  }
  ok(errors.length === 0, `0 console errors (got ${errors.length})${errors.length ? '\n    ' + errors.slice(0, 5).join('\n    ') : ''}`);
  await ctx.close();

  // ---------- reduced motion ----------
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Asia/Manila' });
  const rp = await rctx.newPage();
  await rp.goto(URL_, { waitUntil: 'networkidle' });
  for (let i = 1; i <= 5; i++) {
    await rp.locator(`#v${i} .stage-hero`).scrollIntoViewIfNeeded();
    await rp.waitForTimeout(300);
    await rp.locator(`#v${i} .stage-cards`).scrollIntoViewIfNeeded();
    await rp.waitForTimeout(300);
  }
  const running = await rp.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().duration > 1).length);
  ok(running === 0, `reduced motion: 0 running CSS animations (got ${running})`);
  const rchips = await rp.locator('#v1 .jp-chat-chips .jp-chip').count();
  ok(rchips === 4, `reduced motion: chat resolves instantly (chips ${rchips})`);
  await rctx.close();

  // ---------- mobile ----------
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Asia/Manila' });
  const mp = await mctx.newPage();
  await mp.goto(URL_, { waitUntil: 'networkidle' });
  for (let i = 1; i <= 5; i++) {
    await mp.locator(`#v${i} .stage-hero`).scrollIntoViewIfNeeded();
    await mp.waitForTimeout(600);
    await mp.locator(`#v${i} .stage-hero`).screenshot({ path: path.join(SHOTS, `v${i}-hero-mobile.png`) });
  }
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 1, `mobile: no horizontal page overflow (${overflow}px)`);
  await mctx.close();
} finally {
  await browser.close();
  server.kill();
}
console.log(fails.length ? `\n${fails.length} FAIL` : '\nALL GREEN');
console.log('shots: ' + SHOTS);
process.exit(fails.length ? 1 : 0);

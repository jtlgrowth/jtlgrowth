// WebKit (Safari engine) phone check for the v7 home (index.html): what an iPhone runs. Chromium is qa/probe-v7.mjs.
// node qa/probe-v7-webkit.mjs   (needs: npx playwright install webkit)
import { webkit } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const bi = process.argv.indexOf('--base');
const URL_ = (bi > -1 ? process.argv[bi + 1].replace(/\/$/, '') : 'http://127.0.0.1:8119') + '/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let server = null;
try { const r = await fetch(URL_); if (!r.ok) throw 0; } catch { server = spawn('python3', ['-m', 'http.server', '8119', '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await sleep(700); }
const b = await webkit.launch(); const fails = [];
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails.push(m); };
try {
  for (const [w, h, name] of [[390, 844, 'iPhone 15'], [430, 932, 'iPhone Pro Max']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, timezoneId: 'Asia/Manila' });
    const p = await ctx.newPage(); const errs = []; const bad = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await p.goto(URL_, { waitUntil: 'networkidle' });
    await p.evaluate(() => { const b = document.getElementById('boot'); if (b) b.remove(); });
    await sleep(900);
    console.log(`webkit ${name} ${w}x${h}`);
    ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'no horizontal overflow');
    ok(await p.evaluate(() => getComputedStyle(document.getElementById('track')).display === 'block'), 'static mode via media query');
    ok(await p.locator('#p1 .kb-mini').isHidden() && await p.locator('#p1 .kb-arrow').isHidden() && await p.locator('#p1 .kb-hint').isVisible(), 'mini keyboard and arrow hidden, hint line stays');
    ok((await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#p1 .kb-input')).fontSize))) >= 16, 'input at 16px, no Safari zoom-in on focus');
    await p.locator('#p1 .kb-term').tap(); await p.locator('#p1 .kb-input').fill('price'); await p.locator('#p1 .kb-input').press('Enter');
    let priced = false; try { await p.locator('#p1 .kb-line-ai', { hasText: 'Quote-based' }).waitFor({ timeout: 15000 }); priced = true; } catch {}
    ok(priced, 'terminal answers');
    for (const sel of ['#about', '#globe', '#p5']) { await p.locator(sel).scrollIntoViewIfNeeded(); await sleep(700); }
    let globe = false; try { await p.locator('#globe .jp-globe canvas.on').waitFor({ timeout: 20000 }); globe = true; } catch {}
    ok(globe, 'globe boots from the vendored cobe');
    ok(errs.length === 0 && bad.length === 0, `0 console errors, 0 failed requests (got ${errs.length}, ${bad.length})${(errs.length || bad.length) ? '\n    ' + errs.concat(bad).slice(0, 5).join('\n    ') : ''}`);
    await ctx.close();
  }
} finally { await b.close(); if (server) server.kill(); }
console.log(fails.length ? `\n${fails.length} FAIL` : '\nWEBKIT GREEN');
process.exit(fails.length ? 1 : 0);

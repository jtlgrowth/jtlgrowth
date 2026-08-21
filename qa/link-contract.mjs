/* Link contract for jtlgrowth.com — the audit that would have caught the dead
   /work/ laptops, the 404 download, and the linkless GROWTH lock.
   Usage: node link-contract.mjs [BASE]   (default http://127.0.0.1:8117) */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8117';
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PAGES = ['/','/services/','/products/','/workshop/','/work/','/group/','/apps/','/apps/oras/',
               '/growth/','/ai-employee/','/inbox-scout/','/jamz-jamorol/','/setup/','/privacy/',
               '/404.html'];
let pass=0, fail=[];
const ok=(c,m)=>{ if(c) pass++; else fail.push(m); };

const b = await chromium.launch();
const externals = new Map();
for (const path of PAGES) {
  const p = await b.newPage({viewport:{width:1440,height:900}});
  const perr=[];
  p.on('pageerror',e=>perr.push(e.message));
  const resp = await p.goto(BASE+path,{waitUntil:'domcontentloaded'});
  ok(resp && resp.status()<400, `${path} returned ${resp&&resp.status()}`);
  await p.waitForTimeout(400);
  const links = await p.$$eval('a', as => as.map(a=>({
    href:a.getAttribute('href'), target:a.getAttribute('target'), rel:a.getAttribute('rel')||'',
    text:(a.textContent||'').trim().slice(0,50), hasImg:!!a.querySelector('img'),
  })));
  ok(perr.length===0, `${path} page errors: ${perr.join(' | ')}`);

  for (const l of links) {
    const h = l.href;
    ok(h!==null && h!=='', `${path}: <a> with no href ("${l.text}")`);
    if (!h) continue;
    if (h === '#') {
      // only allowed if JS binds it; homepage logo uses data-go
      const bound = await p.$eval(`a[href="#"]`, a=>a.hasAttribute('data-go')).catch(()=>false);
      ok(bound, `${path}: href="#" with no JS binding ("${l.text}")`);
    } else if (/^https?:\/\//.test(h)) {
      ok(l.target==='_blank', `${path}: external link missing target=_blank -> ${h}`);
      ok(/noopener/.test(l.rel), `${path}: external link missing rel=noopener -> ${h}`);
      externals.set(h.replace(/\/$/,''), path);
    } else if (h.startsWith('/') ) {
      const clean = h.split('#')[0].split('?')[0];
      if (clean === '/' ) continue;
      const asFile = ROOT + clean;
      const exists = fs.existsSync(asFile) || fs.existsSync(asFile.replace(/\/$/,'')+'/index.html') || fs.existsSync(asFile+'index.html');
      ok(exists, `${path}: internal link points at nothing -> ${h}`);
    } else if (h.startsWith('#')) {
      const found = await p.$(h.length>1?`${h}`:'body').catch(()=>null);
      ok(!!found, `${path}: in-page anchor with no target -> ${h}`);
    }
  }
  // shipped-work images must be inside a link
  if (path==='/work/'){
    const bad = await p.$$eval('.lap-card img', imgs => imgs.filter(i=>!i.closest('a')).length);
    ok(bad===0, `/work/: ${bad} shipped-work screenshots not inside a link`);
    const n = await p.$$eval('a.lap-card', a=>a.length);
    ok(n===5, `/work/: expected 5 linked cards, found ${n}`);
  }
  // footer standard
  const f = await p.$$eval('footer a, .footline a, .foot a', as=>as.map(a=>a.getAttribute('href')));
  ok(f.includes('/'), `${path}: footer has no home link`);
  ok(f.some(x=>x&&x.startsWith('mailto:')), `${path}: footer has no email link`);
  ok(f.includes('/group/'), `${path}: footer missing the group link`);
  await p.close();
}
// no page may still reference the removed gate or the dead download
for (const f of ['products/index.html','workshop/index.html']) {
  const src = fs.readFileSync(ROOT+'/'+f,'utf8');
  ok(!/follow-gate|\/downloads\//.test(src), `${f} still references the removed follow gate`);
}
// the R&C stub: a redirect we own, pointing at a site we do not. Assert the stub,
// never crawl through it, or the contract starts auditing someone else's markup.
{
  const src = fs.readFileSync(ROOT+'/robots-and-coffee/index.html','utf8');
  ok(/ayalavirtualassistance\.site\/robots-and-coffee/.test(src), 'R&C stub lost its destination');
  ok(/noindex/.test(src), 'R&C stub lost its noindex');
}
// every shot referenced by /work/ exists on disk
{
  const src = fs.readFileSync(ROOT+'/work/index.html','utf8');
  for (const m of src.matchAll(/src="(\/shots\/[^"]+)"/g))
    ok(fs.existsSync(ROOT+m[1]), `/work/ references a missing screenshot: ${m[1]}`);
}
await b.close();

// external reachability, deduped
for (const [url, from] of externals) {
  if (/calendly|instagram|facebook|linkedin/.test(url)) continue; // rate-limit friendly
  // upstream hosts hiccup: GitHub handed back a 504 once during a clean run.
  // Retry twice before calling a link dead, so the contract fails on OUR markup
  // and not on somebody else's bad minute.
  let last = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 1500 * attempt));
    try {
      const r = await fetch(url, {method:'GET', redirect:'follow', signal:AbortSignal.timeout(15000)});
      last = String(r.status);
      if (r.status < 400) break;
    } catch(e){ last = e.message; }
  }
  ok(last !== null && /^[123]/.test(last), `external ${url} returned ${last} after 3 tries (linked from ${from})`);
}
console.log(`link contract: ${pass}/${pass+fail.length} green`);
if (fail.length){ console.log('\nFAILURES:'); [...new Set(fail)].forEach(f=>console.log(' - '+f)); process.exit(1); }

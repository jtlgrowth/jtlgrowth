/* Contact widget (Owner 2026-11-03: "instead na chat bot ... book a call at socials"). A round button
   bottom right; once per tab a short teaser bubble; the card lists the channels and one primary
   "Book a free call". Waits for the intro (#boot) to finish. Config is the script tag's data-cw JSON.
   Own class prefix cw- (nothing else on either site uses it). No owner phone, ever (WhatsApp/Viber out).
   Source: HQ ops/runs/intro-ref-2026-11-03/ship/contact-widget.js (one copy per site, keep them equal). */
(function () {
  'use strict';
  var me = document.currentScript, C;
  try { C = JSON.parse(me.getAttribute('data-cw')); } catch (e) { return; }
  var T = C.theme;
  var I = {
    msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    ig: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/>',
    fb: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    li: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    ar: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    arr: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
  };
  function ic(k, cls) { return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[k] + '</svg>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var css = '.cw-w{position:fixed;z-index:' + (C.z || 100) + ';right:24px;bottom:24px;display:flex;flex-direction:column;align-items:flex-end;font-family:' + T.font + ';opacity:0;transform:translateY(10px);transition:opacity .45s cubic-bezier(.22,1,.36,1),transform .45s cubic-bezier(.22,1,.36,1);pointer-events:none}'
    + '.cw-w.cw-in{opacity:1;transform:none;pointer-events:auto}.cw-w.cw-in.cw-away{opacity:0;transform:translateY(10px);pointer-events:none}'
    + '.cw-fab{width:58px;height:58px;border-radius:50%;border:0;padding:0;display:grid;place-items:center;cursor:pointer;position:relative;background:' + T.dark + ';color:' + T.onDark + ';box-shadow:0 10px 30px rgba(0,0,0,.18);transition:transform .2s ease}'
    + '.cw-fab:active{transform:scale(.92)}.cw-fab:focus-visible{outline:2px solid ' + T.dark + ';outline-offset:3px}'
    + '.cw-fab>span{position:absolute;display:grid;place-items:center;transition:opacity .22s ease,transform .26s cubic-bezier(.22,1,.36,1)}'
    + '.cw-fab .cw-x{opacity:0;transform:rotate(-45deg) scale(.6)}.cw-fab .cw-x svg{width:24px;height:24px}'
    + '.cw-open .cw-fab .cw-m{opacity:0;transform:rotate(45deg) scale(.6)}.cw-open .cw-fab .cw-x{opacity:1;transform:none}'
    + '.cw-tease{position:absolute;right:0;bottom:72px;white-space:nowrap;padding:12px 16px;font-size:14px;line-height:1.35;background:' + T.teaseBg + ';color:' + T.teaseInk + ';border-radius:' + T.teaseRadius + ';border:1px solid ' + T.line + ';box-shadow:0 10px 30px rgba(0,0,0,.12);cursor:pointer;opacity:0;transform:translateY(8px) scale(.96);transform-origin:bottom right;transition:opacity .42s cubic-bezier(.22,1,.36,1),transform .42s cubic-bezier(.22,1,.36,1);pointer-events:none}'
    + '.cw-tease.cw-on{opacity:1;transform:none;pointer-events:auto}' + (T.teaseFont ? '.cw-tease{font-family:' + T.teaseFont + ';font-size:13px}' : '')
    + '.cw-card{position:absolute;right:0;bottom:72px;width:360px;overflow:hidden;background:' + T.card + ';color:' + T.ink + ';border-radius:' + T.radius + ';box-shadow:0 24px 60px rgba(0,0,0,.22);transform-origin:bottom right;opacity:0;transform:translateY(10px) scale(.96);visibility:hidden;transition:opacity .38s cubic-bezier(.22,1,.36,1),transform .38s cubic-bezier(.22,1,.36,1),visibility 0s .38s}'
    + '.cw-open .cw-card{opacity:1;transform:none;visibility:visible;transition-delay:0s}'
    + '.cw-hd{padding:20px 20px 18px;background:' + T.dark + ';color:' + T.onDark + '}'
    + '.cw-t{display:flex;align-items:center;gap:12px;font-size:17px;font-weight:600;margin:0' + (T.titleFont ? ';font-family:' + T.titleFont + ';font-size:15px;letter-spacing:.02em' : '') + '}'
    + '.cw-av{width:36px;height:36px;border-radius:' + T.avRadius + ';display:grid;place-items:center;flex:none;background:' + T.onDark + ';color:' + T.dark + '}'
    + '.cw-hd p{margin:10px 0 0;font-size:14px;line-height:1.5;opacity:.78}'
    + '.cw-rows{padding:6px 8px;margin:0;list-style:none}'
    + '.cw-r{display:flex;align-items:center;gap:14px;padding:12px;text-decoration:none;color:inherit;border-radius:' + T.rowRadius + ';transition:background .15s ease}'
    + '.cw-r:hover,.cw-r:focus-visible{background:' + T.hover + ';outline:none}'
    + '.cw-r .cw-ic{width:20px;height:20px;flex:none;color:' + T.icon + '}'
    + '.cw-l{flex:1;min-width:0}.cw-l b{display:block;font-size:15px;font-weight:500}'
    + '.cw-l small{display:block;font-size:12.5px;opacity:.6;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.cw-r .cw-ar{width:16px;height:16px;opacity:.55}'
    + '.cw-cta{display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 16px 16px;padding:15px 18px;text-decoration:none;font-weight:600;font-size:15px;background:' + T.cta + ';color:' + T.ctaInk + ';border-radius:' + T.ctaRadius + ';transition:background .15s ease}'
    + (T.ctaFont ? '.cw-cta{font-family:' + T.ctaFont + ';font-size:13px;letter-spacing:.08em;text-transform:uppercase}' : '')
    + '.cw-cta:hover,.cw-cta:focus-visible{background:' + T.ctaHover + '}.cw-cta svg{width:17px;height:17px}'
    + '@media (max-width:600px){.cw-w{left:16px;right:16px;bottom:16px}.cw-card{left:-4px;right:-4px;width:auto}.cw-tease{bottom:70px}}'
    + '@media (prefers-reduced-motion:reduce){.cw-w,.cw-tease,.cw-card,.cw-fab>span{transition:none}}';

  function build() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var w = document.createElement('div'); w.className = 'cw-w';
    var mark = '<span style="width:' + C.mark.w + 'px;height:' + C.mark.h + 'px;display:block">' + C.mark.svg + '</span>';
    w.innerHTML =
      '<div class="cw-card" id="cw-card" role="dialog" aria-modal="false" aria-labelledby="cw-title">'
      + '<div class="cw-hd"><p class="cw-t" id="cw-title"><span class="cw-av"><span style="width:' + C.mark.aw + 'px;height:' + C.mark.ah + 'px;display:block">' + C.mark.svg + '</span></span>' + esc(C.title) + '</p><p>' + esc(C.sub) + '</p></div>'
      + '<ul class="cw-rows">' + C.rows.map(function (r) {
          var ext = !/^mailto:/.test(r.href);
          return '<li><a class="cw-r" href="' + esc(r.href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + ' data-cw="' + esc(r.k) + '">' + ic(r.k, 'cw-ic') + '<span class="cw-l"><b>' + esc(r.label) + '</b><small>' + esc(r.handle) + '</small></span>' + ic('ar', 'cw-ar') + '</a></li>';
        }).join('') + '</ul>'
      + '<a class="cw-cta" href="' + esc(C.cta.href) + '" data-cw="book">' + esc(C.cta.label) + ' ' + ic('arr') + '</a></div>'
      + '<div class="cw-tease" role="button" tabindex="-1">' + esc(C.teaser) + '</div>'
      + '<button class="cw-fab" type="button" aria-label="' + esc(C.fabLabel) + '" aria-expanded="false" aria-controls="cw-card"><span class="cw-m">' + mark + '</span><span class="cw-x">' + ic('x') + '</span></button>';
    document.body.appendChild(w);
    var fab = w.querySelector('.cw-fab'), card = w.querySelector('.cw-card'), tease = w.querySelector('.cw-tease');
    function set(open) {
      w.classList.toggle('cw-open', open); fab.setAttribute('aria-expanded', open ? 'true' : 'false');
      tease.classList.remove('cw-on');
      if (open) { try { sessionStorage.setItem('cw-teased', '1'); } catch (e) {} var f = card.querySelector('a'); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 60); }
    }
    fab.addEventListener('click', function () { set(!w.classList.contains('cw-open')); });
    tease.addEventListener('click', function () { set(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && w.classList.contains('cw-open')) { set(false); fab.focus(); } });
    document.addEventListener('click', function (e) { if (w.classList.contains('cw-open') && !w.contains(e.target)) set(false); });
    requestAnimationFrame(function () { w.classList.add('cw-in'); });
    // another bottom prompt of the page (C.avoid, e.g. JTL's "See our work" toast) owns that corner while it shows
    function away() { return !!(C.avoid && document.querySelector(C.avoid)); }
    if (C.avoid) setInterval(function () {
      var a = away();
      if (a && !w.classList.contains('cw-away')) { set(false); w.classList.add('cw-away'); }
      else if (!a && w.classList.contains('cw-away')) w.classList.remove('cw-away');
    }, 400);
    var teased = false; try { teased = !!sessionStorage.getItem('cw-teased'); } catch (e) {}
    if (!teased) setTimeout(function () {
      if (w.classList.contains('cw-open') || away()) return;
      tease.classList.add('cw-on');
      try { sessionStorage.setItem('cw-teased', '1'); } catch (e) {}
      setTimeout(function () { tease.classList.remove('cw-on'); }, 9000);
    }, 1200);
  }
  function whenIntroDone(fn) {
    var boot = document.getElementById('boot');
    if (!boot || boot.classList.contains('off')) return fn();
    var mo = new MutationObserver(function () {
      if (!document.getElementById('boot') || boot.classList.contains('off')) { mo.disconnect(); fn(); }
    });
    mo.observe(boot, { attributes: true, attributeFilter: ['class'] });
    mo.observe(document.body, { childList: true });
    setTimeout(function () { mo.disconnect(); if (!document.querySelector('.cw-w')) fn(); }, 9500);
  }
  var started = false;
  function go() { if (started) return; started = true; whenIntroDone(build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

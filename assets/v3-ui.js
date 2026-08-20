/* JTL shared UI (subpages) — corner home link.
   v4.1 (Owner 2026-08-20): the spinning mini-crystal is retired with the
   homepage crystal; this is now a static JTL logomark chip linking home. */
(function(){
  'use strict';
  var css=document.createElement('style');
  css.textContent='#jtl-corner{position:fixed;right:16px;bottom:16px;z-index:60}'
    +'#jtl-corner a{display:flex;align-items:center;justify-content:center;width:52px;height:52px;background:#121212;border-radius:12px;opacity:.85;transition:opacity .25s}'
    +'#jtl-corner a:hover,#jtl-corner a:focus-visible{opacity:1}'
    +'#jtl-corner svg{width:30px;height:auto;color:#EDEDED}';
  document.head.appendChild(css);
  var box=document.createElement('div');box.id='jtl-corner';
  box.innerHTML='<a href="/" aria-label="JTL Growth home">'
    +'<svg viewBox="288 703 1315 626" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="141.5" stroke-linecap="butt">'
    +'<path d="M624 774H1267"/>'
    +'<path d="M846 706V1122A134.5 134.5 0 0 1 711.5 1256.5H494A134.5 134.5 0 0 1 359.5 1122"/>'
    +'<path d="M1195 706V1122A134.5 134.5 0 0 0 1329.5 1256.5H1602"/>'
    +'</g></svg></a>';
  document.body.appendChild(box);
})();

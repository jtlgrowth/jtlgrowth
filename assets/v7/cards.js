/* v7 services cards: the eight cards from the proposals engine (four tiers plus
   four proofs, copy from services/ and ai-employee/), CSS micro-loops from
   home.css, and the cursor-follow dot grid on the AI Employees card. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var CARDS = [
    { k: 'funnels', t: 'Funnels & Websites', d: 'Landing pages and full sites, hand-coded, no builder lock-in. Copy written against the offer, not around it.', ill: '<div class="jp-ill"><div class="ill-funnels"><i></i><i></i><i></i><b></b></div></div>' },
    { k: 'automation', t: 'Automation Systems', d: 'Your tools, wired together. A lead triggers the sequence, the calendar and the CRM without a human copying data.', ill: '<div class="jp-ill"><div class="ill-automation"><u></u><i></i><i></i><i></i><b></b></div></div>' },
    { k: 'ai', t: 'AI Employees', d: 'A seat with a job, a process and receipts. Runs the intake and the reporting; the humans handle the calls.', ill: '<div class="jp-ill"><div class="ill-ai"><i></i><u></u></div></div>' },
    { k: 'portal', t: 'Ops Portals', d: 'One dashboard for people, work in flight and revenue. Agent seats report into the same board your team reads.', ill: '<div class="jp-ill"><div class="ill-portal"><i></i><i></i><i></i><i></i></div></div>' },
    { k: 'clock', t: 'Runs while you sleep', d: 'The system stops being something you visit and becomes something that happens while you sleep.', ill: '<div class="jp-ill"><div class="ill-clock"><i></i><b></b></div></div>' },
    { k: 'stack', t: 'Hand-built stack', d: 'Claude, GPT-5, n8n, GoHighLevel, Supabase, FastAPI and Playwright. No template, no page builder, no drag-and-drop.', ill: '<div class="jp-ill"><div class="ill-stack"><i></i><i></i><i></i><i></i></div></div>' },
    { k: 'consent', t: 'Tracking behind consent', d: 'Analytics and conversion events wired at build time, behind consent. Speed, accessibility and search treated as requirements.', ill: '<div class="jp-ill"><div class="ill-consent"><i></i></div></div>' },
    { k: 'watch', t: 'Watched after launch', d: 'Runs in the wild, logs every miss, patched before you notice. This is where builds quietly die, so we do not leave.', ill: '<div class="jp-ill"><div class="ill-watch"><i></i><b></b></div></div>' }
  ];
  function cards(el) {
    if (el.__cardsInit) return; el.__cardsInit = true;
    var follow = el.getAttribute('data-follow') === '1';
    el.innerHTML = CARDS.map(function (c, i) {
      var ill = (follow && c.k === 'ai') ? '<div class="jp-ill"><div class="jp-follow" data-follow-grid>' + new Array(31).join('<i></i>') + '</div></div>' : c.ill;
      return '<article class="jp-card" data-k="' + c.k + '"><span class="no">0' + (i + 1) + '</span>' + ill + '<h4>' + c.t + '</h4><p>' + c.d + '</p></article>';
    }).join('');
    var grid = el.querySelector('[data-follow-grid]');
    if (grid && !reduce.matches) {
      var dots = [].slice.call(grid.children), card = grid.closest('.jp-card');
      card.addEventListener('pointermove', function (e) {
        dots.forEach(function (d) {
          var r = d.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          d.classList.toggle('lit', dx * dx + dy * dy < 26 * 26);
        });
      });
      card.addEventListener('pointerleave', function () { dots.forEach(function (d) { d.classList.remove('lit'); }); });
    }
  }
  window.JTLCards = { CARDS: CARDS, init: cards };
  function boot() { document.querySelectorAll('.jp-cards[data-cards]').forEach(cards); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

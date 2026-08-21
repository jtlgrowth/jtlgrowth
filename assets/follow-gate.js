/* JTL follow gate — file downloads only, page copy is never gated.
   (E-04 blur-tease-gate, adapted. Hybrid rule: read free, download gated.)

   HONEST SCOPE, stated on the page too: no platform exposes "does this visitor
   follow us" — Instagram returns a follower COUNT, never a list, and Facebook /
   LinkedIn / TikTok expose nothing at all. So this checks that the visitor
   OPENED each profile, not that they followed. It is an honour gate with
   tracking, which is what every "follow to unlock" panel on the web actually is.

   Markup contract — the page declares only the container:
     <div data-follow-gate
          data-gate-id="agentkit"
          data-file="/path/to/file.zip"
          data-label="Download the kit"
          data-note="optional line under the title"></div>
   Everything inside is built here, so every gate on the site behaves identically.
   With JS off the <noscript> block the page ships is what shows. */
(function () {
  'use strict';

  /* Owner/Aurel fill-in: GoHighLevel inbound-webhook URL for the gate email.
     Empty string = capture is skipped and the unlock still works, so nothing on
     the site is blocked waiting for it. */
  var WEBHOOK = '';

  var SRC = '/assets/socials.json';
  var KEY = function (slug) { return 'jtl-follow-' + slug; };
  var EMAIL_KEY = 'jtl-gate-email';
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function track(name, params) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
      (window.dataLayer = window.dataLayer || []).push(
        Object.assign({ event: name }, params || {}));
    } catch (e) {}
  }

  function css() {
    if (document.getElementById('jtl-gate-css')) return;
    var s = document.createElement('style');
    s.id = 'jtl-gate-css';
    s.textContent = [
      '.jgate{border:1px solid var(--line,rgba(24,24,24,.14));padding:clamp(22px,2.6vw,36px);background:rgba(255,255,255,.3)}',
      '[data-theme="dark"] .jgate{background:rgba(255,255,255,.045);border-color:rgba(226,226,226,.18)}',
      '.jgate-h{font-family:"Archivo Expanded",sans-serif;font-weight:700;font-size:clamp(17px,1.6vw,21px);letter-spacing:-.01em}',
      '.jgate-note{margin-top:10px;font-size:14px;line-height:1.6;color:var(--gray,#616161);max-width:52ch}',
      '.jgate-fine{margin-top:14px;font:400 11.5px/1.6 "Space Mono",monospace;color:var(--gray,#616161);max-width:60ch}',
      '.jgate-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-top:22px}',
      '.jgate-b{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;border:1px solid rgba(24,24,24,.25);background:transparent;color:inherit;font-family:"Space Mono",monospace;font-size:10.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;text-decoration:none;cursor:pointer;text-align:left;transition:background .25s,color .25s,border-color .25s}',
      '[data-theme="dark"] .jgate-b{border-color:rgba(226,226,226,.28)}',
      '.jgate-b:hover{background:var(--navy,#181818);color:var(--cement,#E2E2E2);border-color:var(--navy,#181818)}',
      '.jgate-b .jb-brand{display:block;font-size:9px;letter-spacing:.2em;opacity:.6;margin-bottom:4px}',
      '.jgate-b .jb-tick{flex:none;width:18px;height:18px;border:1px solid currentColor;border-radius:50%;display:grid;place-items:center;font-size:10px;opacity:.35}',
      '.jgate-b.done{border-color:var(--navy,#181818)}',
      '[data-theme="dark"] .jgate-b.done{border-color:var(--navy,#E2E2E2)}',
      '.jgate-b.done .jb-tick{opacity:1;background:var(--navy,#181818);color:var(--cement,#E2E2E2);border-color:var(--navy,#181818)}',
      '.jgate-count{margin-top:16px;font:700 10.5px "Space Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--blue,#575757)}',
      '.jgate-form{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}',
      '.jgate-form input{flex:1 1 220px;min-width:0;padding:13px 15px;border:1px solid rgba(24,24,24,.25);background:transparent;color:inherit;font:400 14px "Archivo",sans-serif}',
      '[data-theme="dark"] .jgate-form input{border-color:rgba(226,226,226,.28)}',
      '.jgate-form button{padding:13px 24px;border:none;background:var(--navy,#181818);color:var(--cement,#E2E2E2);font:600 11.5px "Archivo",sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:background .3s,opacity .3s}',
      '.jgate-form button[disabled]{opacity:.4;cursor:not-allowed}',
      '.jgate-msg{margin-top:12px;font:400 12.5px "Archivo",sans-serif;color:var(--gray,#616161);min-height:1.2em}',
      '.jgate-out{display:block;margin-top:18px;padding:15px 22px;background:var(--navy,#181818);color:var(--cement,#E2E2E2);text-decoration:none;font-family:"Space Mono",monospace;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;text-align:center}',
      '.jgate-out[hidden]{display:none}',  /* display:block above beats the UA [hidden] rule — without this the gate never actually locks */
      /* the vault: the reward is visible but blurred behind a lock, so the visitor
         can see there is something real here before deciding to follow */
      '.jgate-vault{position:relative;margin-top:22px;border:1px solid rgba(24,24,24,.18);padding:26px 22px;overflow:hidden;text-align:center}',
      '[data-theme="dark"] .jgate-vault{border-color:rgba(226,226,226,.2)}',
      '.jgate-vault .jv-body{filter:blur(7px);opacity:.5;transition:filter .55s ease,opacity .55s ease;pointer-events:none;user-select:none}',
      '.jgate-vault .jv-name{font-family:"Archivo Expanded",sans-serif;font-weight:700;font-size:clamp(18px,2vw,26px);letter-spacing:-.01em}',
      '.jgate-vault .jv-sub{margin-top:8px;font:400 13px "Archivo",sans-serif;color:var(--gray,#616161)}',
      '.jgate-vault .jv-lock{position:absolute;inset:0;display:grid;place-items:center;gap:10px;align-content:center;transition:opacity .45s ease}',
      '.jgate-vault .jv-lock svg{width:26px;height:26px;stroke:currentColor;fill:none;stroke-width:1.7;opacity:.75}',
      '.jgate-vault .jv-lock span{font:700 9.5px "Space Mono",monospace;letter-spacing:.22em;text-transform:uppercase;color:var(--gray,#616161)}',
      '.jgate-vault.open .jv-body{filter:none;opacity:1;pointer-events:auto;user-select:auto}',
      '.jgate-vault.open .jv-lock{opacity:0;pointer-events:none}',
      '@media (prefers-reduced-motion:reduce){.jgate-vault .jv-body,.jgate-vault .jv-lock{transition:none}}',
      '@media (prefers-reduced-motion:reduce){.jgate-b,.jgate-form button{transition:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function build(box, accounts) {
    var id = box.getAttribute('data-gate-id') || 'file';
    var file = box.getAttribute('data-file') || '';
    var label = box.getAttribute('data-label') || 'Download';
    var note = box.getAttribute('data-note') || '';
    var total = accounts.length;

    box.textContent = '';
    box.className = (box.className ? box.className + ' ' : '') + 'jgate';

    var h = document.createElement('div');
    h.className = 'jgate-h';
    h.textContent = 'Follow us, then it’s yours.';
    box.appendChild(h);

    if (note) {
      var n = document.createElement('p');
      n.className = 'jgate-note';
      n.textContent = note;
      box.appendChild(n);
    }

    var grid = document.createElement('div');
    grid.className = 'jgate-grid';
    box.appendChild(grid);

    var count = document.createElement('p');
    count.className = 'jgate-count';
    count.setAttribute('aria-live', 'polite');
    box.appendChild(count);

    /* the vault sits between the buttons and the counter: the reward, blurred,
       with a lock over it. Asked for by the Owner 2026-08-21 — a gate with no
       visible lock does not read as a gate at all. */
    var vault = document.createElement('div');
    vault.className = 'jgate-vault';
    var vbody = document.createElement('div');
    vbody.className = 'jv-body';
    var vname = document.createElement('div');
    vname.className = 'jv-name';
    vname.textContent = box.getAttribute('data-reward') || label;
    var vsub = document.createElement('div');
    vsub.className = 'jv-sub';
    vsub.textContent = box.getAttribute('data-reward-note') || 'Yours as soon as the profiles are open.';
    vbody.appendChild(vname); vbody.appendChild(vsub);
    var vlock = document.createElement('div');
    vlock.className = 'jv-lock';
    vlock.setAttribute('aria-hidden', 'true');
    vlock.innerHTML = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="4" y="10.5" width="16" height="10.5" rx="2"></rect>' +
      '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"></path></svg><span>Locked</span>';
    vault.appendChild(vbody); vault.appendChild(vlock);
    box.appendChild(vault);

    var form = document.createElement('form');
    form.className = 'jgate-form';
    form.noValidate = true;
    var input = document.createElement('input');
    input.type = 'email';
    input.required = true;
    input.placeholder = 'you@company.com';
    input.setAttribute('aria-label', 'Your email address');
    input.autocomplete = 'email';
    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Unlock the download';
    /* No webhook means nowhere to send an email, and a form that quietly bins
       what you type is the exact bug this file shipped with. So while WEBHOOK is
       empty the field is not rendered at all and the gate is follow-only. */
    if (WEBHOOK) form.appendChild(input);
    form.appendChild(submit);
    box.appendChild(form);

    var msg = document.createElement('p');
    msg.className = 'jgate-msg';
    box.appendChild(msg);

    var fine = document.createElement('p');
    fine.className = 'jgate-fine';
    fine.textContent = WEBHOOK
      ? 'We can’t check follows from here. No platform lets a website do that, so this runs on trust. ' +
        'Your email gets the file and our build notes; unsubscribe any time.'
      : 'We can’t check follows from here. No platform lets a website do that, so this runs on trust. ' +
        'We are not asking for your email, and nothing is collected on this page.';
    box.appendChild(fine);

    var out = document.createElement('a');
    out.className = 'jgate-out';
    out.hidden = true;
    out.textContent = label;
    out.setAttribute('download', '');
    if (/^https?:/.test(file)) { out.target = '_blank'; out.rel = 'noopener'; }
    box.appendChild(out);

    function followed() {
      return accounts.filter(function (a) {
        try { return localStorage.getItem(KEY(a.slug)) === '1'; } catch (e) { return false; }
      }).length;
    }

    function paint() {
      var got = followed();
      count.textContent = got + ' of ' + total + ' profiles opened';
      submit.disabled = got < total;
      return got;
    }

    accounts.forEach(function (a) {
      var b = document.createElement('a');
      b.className = 'jgate-b';
      b.href = a.url;
      b.target = '_blank';
      b.rel = 'noopener';
      var t = document.createElement('span');
      t.innerHTML = '<span class="jb-brand"></span>';
      t.firstChild.textContent = a.brand;
      t.appendChild(document.createTextNode(a.platform + ' · ' + a.handle));
      var tick = document.createElement('span');
      tick.className = 'jb-tick';
      tick.setAttribute('aria-hidden', 'true');
      tick.textContent = '✓';
      b.appendChild(t);
      b.appendChild(tick);
      try { if (localStorage.getItem(KEY(a.slug)) === '1') b.classList.add('done'); } catch (e) {}
      b.addEventListener('click', function () {
        try { localStorage.setItem(KEY(a.slug), '1'); } catch (e) {}
        b.classList.add('done');
        paint();
        track('follow_gate_click', { gate: id, account: a.slug, platform: a.platform });
      });
      grid.appendChild(b);
    });

    function unlock(email, isRestore) {
      out.href = file;
      out.hidden = false;
      form.hidden = true;
      vault.classList.add('open');
      msg.textContent = isRestore ? 'Unlocked. The link is below.'
        : (email ? 'Unlocked. The link is below, and a copy is on its way to ' + email + '.'
                 : 'Unlocked. The link is below.');
      if (!isRestore) track('follow_gate_unlock', { gate: id, accounts: total });
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (paint() < total) { msg.textContent = 'Open all ' + total + ' profiles first.'; return; }
      if (!WEBHOOK) { unlock('', false); return; }
      var email = input.value.trim();
      if (!RE_EMAIL.test(email)) { msg.textContent = 'That email doesn’t look right.'; input.focus(); return; }
      try { localStorage.setItem(EMAIL_KEY, email); } catch (e) {}
      if (WEBHOOK) {
        fetch(WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, gate: id, file: file, source: location.pathname })
        }).catch(function () { /* the unlock never depends on the capture */ });
      }
      unlock(email, false);
    });

    var known = null;
    try { known = localStorage.getItem(EMAIL_KEY); } catch (e) {}
    if (paint() === total && (known || !WEBHOOK)) unlock(known || '', true); else paint();
  }

  function init() {
    var boxes = [].slice.call(document.querySelectorAll('[data-follow-gate]'));
    if (!boxes.length) return;
    css();
    fetch(SRC, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('socials ' + r.status); return r.json(); })
      .then(function (d) {
        var accounts = (d && d.accounts) || [];
        if (!accounts.length) throw new Error('no accounts');
        boxes.forEach(function (b) { build(b, accounts); });
      })
      .catch(function (e) {
        /* Fail OPEN, loudly. A broken data file must never bury a download the
           Owner meant to give away. */
        boxes.forEach(function (b) {
          var file = b.getAttribute('data-file') || '';
          var label = b.getAttribute('data-label') || 'Download';
          b.className = (b.className ? b.className + ' ' : '') + 'jgate';
          b.innerHTML = '';
          var a = document.createElement('a');
          a.className = 'jgate-out';
          a.href = file;
          a.textContent = label;
          a.setAttribute('download', '');
          if (/^https?:/.test(file)) { a.target = '_blank'; a.rel = 'noopener'; }
          b.appendChild(a);
        });
        try { console.warn('[follow-gate] open fallback:', e.message); } catch (x) {}
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

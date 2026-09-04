/* JTL follow gate — file downloads only, page copy is never gated.
   (E-04 blur-tease-gate, adapted. Hybrid rule: read free, download gated.)

   HONEST SCOPE, stated on the page too: no platform exposes "does this visitor
   follow us" — Instagram returns a follower COUNT, never a list, and Facebook /
   LinkedIn / TikTok expose nothing at all. So this checks that the visitor
   OPENED each profile, not that they followed. It is an honour gate with
   tracking, which is what every "follow to unlock" panel on the web actually is.

   IN-PAGE FOLLOW: tested 2026-09-02 against our three real Facebook pages and
   rejected. Meta's compact Like Button plugin is dead (0x0 iframe for all six
   URL forms, the clean vanity URL included). The Page Plugin does render a real
   "Follow Page" CTA at 280x130 (Robots & Coffee only via its numeric id, not the
   /people/ URL), but clicking that CTA produced Facebook's own error page and
   the follower count never moved, and no edge.create fired from the embed. So a
   profile tile opens a centred popup instead: the visitor never loses this page,
   which was the actual complaint. Do not re-add the SDK without re-testing the
   click, not just the render.

   Markup contract — the page declares only the container:
     <div data-follow-gate
          data-gate-id="agentkit"
          data-file="/path/to/file.zip"
          data-label="Download the kit"
          data-note="optional line under the title"></div>
   Everything inside is built here, so every gate on the site behaves identically.
   With JS off the <noscript> block the page ships is what shows.

   RECOMMEND + FOLLOW GATE (Owner, 2026-09-02): step 1 is a Facebook
   recommendation on JTL Growth and on Robots & Coffee (GATE below), step 2 is
   a follow on each account in socials.json, step 3 opens by itself once every
   card in steps 1 and 2 is ticked. Follow ticks use the same localStorage keys
   as the old six-follow gate, so earlier visitors keep that progress. */
(function () {
  'use strict';

  /* Site-wide default endpoint for gate capture. Empty means no page captures
     anything unless it says so itself.

     A gate overrides it with data-webhook="<url>", and that is the shape to
     prefer: the endpoint then lives on the page that uses it, not in this
     shared file, so one page turning capture on cannot turn it on for another.
     /starter-pack/ carries its own GoHighLevel inbound webhook that way.

     Either way the rule holds: no endpoint, no fields, and the fine print says
     nothing is collected. Never ask for something you have nowhere to put. */
  var WEBHOOK = '';

  /* Fields a gate may ask for, via data-capture="name,email,country,review".
     Absent means email alone, which is what every gate did before this existed.
     `key` is the JSON key sent to the endpoint. */
  var FIELDS = {
    name:    { tag: 'input',  type: 'text',  key: 'first_name',  required: true,
               label: 'Your name', ph: 'Your name', ac: 'given-name' },
    email:   { tag: 'input',  type: 'email', key: 'email',       required: true,
               label: 'Your email address', ph: 'you@company.com', ac: 'email' },
    country: { tag: 'select', key: 'country', required: true, label: 'Your country',
               ph: 'Your country',
               opts: ['Malaysia', 'Vietnam', 'Thailand', 'Philippines', 'Other'] },
    review:  { tag: 'input',  type: 'text',  key: 'review_link', required: false,
               label: 'Link to your review', ph: 'Link to your review (optional)' }
  };

  var SRC = '/assets/socials.json';
  var GATE = [
    { slug: 'jtlgrowth-recommend', brand: 'JTL Growth', platform: 'Facebook',
      handle: 'Recommend us', url: 'https://www.facebook.com/jtlgrowth/reviews' },
    { slug: 'rnc-recommend', brand: 'Robots & Coffee', platform: 'Facebook',
      handle: 'Recommend us', url: 'https://www.facebook.com/profile.php?id=61592292412856&sk=reviews' }
  ];
  var KEY = function (slug) { return 'jtl-recommend-' + slug; };
  var FOLLOW_KEY = function (slug) { return 'jtl-follow-' + slug; };
  function has(k) { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } }
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
      '.jgate-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:18px}',
      '.jgate-b{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;border:1px solid rgba(24,24,24,.25);background:transparent;color:inherit;font-family:"Space Mono",monospace;font-size:10.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;text-decoration:none;cursor:pointer;text-align:left;transition:background .25s,color .25s,border-color .25s}',
      '[data-theme="dark"] .jgate-b{border-color:rgba(226,226,226,.28)}',
      '.jgate-b:hover{background:var(--navy,#181818);color:var(--cement,#E2E2E2);border-color:var(--navy,#181818)}',
      '.jgate-b .jb-brand{display:block;font-size:9px;letter-spacing:.2em;opacity:.6;margin-bottom:4px}',
      '.jgate-b .jb-tick{flex:none;width:18px;height:18px;border:1px solid currentColor;border-radius:50%;display:grid;place-items:center;font-size:10px;opacity:.35}',
      '.jgate-b.done{border-color:var(--navy,#181818)}',
      '[data-theme="dark"] .jgate-b.done{border-color:var(--navy,#E2E2E2)}',
      '.jgate-b.done .jb-tick{opacity:1;background:var(--navy,#181818);color:var(--cement,#E2E2E2);border-color:var(--navy,#181818)}',
      '.jgate-count{margin-top:16px;font:700 10.5px "Space Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--blue,#575757)}',
      '.jstep{margin-top:28px;padding-top:24px;border-top:1px solid var(--line,rgba(24,24,24,.14))}',
      '.jstep:first-of-type{margin-top:0;padding-top:0;border-top:0}',
      '[data-theme="dark"] .jstep{border-color:rgba(226,226,226,.18)}',
      '.jstep-h{display:flex;align-items:center;gap:14px;flex-wrap:wrap}',
      '.jstep-n{flex:none;width:28px;height:28px;border:1px solid currentColor;border-radius:50%;display:grid;place-items:center;font:700 11px "Space Mono",monospace}',
      '.jstep-done .jstep-n{background:var(--navy,#181818);color:var(--cement,#E2E2E2);border-color:var(--navy,#181818)}',
      '[data-theme="dark"] .jstep-done .jstep-n{background:var(--cement,#E2E2E2);color:var(--navy,#181818);border-color:var(--cement,#E2E2E2)}',
      '.jstep-t{font-family:"Archivo Expanded",sans-serif;font-weight:700;font-size:clamp(17px,1.5vw,21px);letter-spacing:-.01em}',
      '.jstep-tag{font:700 9.5px "Space Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--gray,#616161)}',
      '.jgate-form{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}',
      '.jgate-form input,.jgate-form select{flex:1 1 220px;min-width:0;padding:13px 15px;border:1px solid rgba(24,24,24,.25);background:transparent;color:inherit;font:400 14px "Archivo",sans-serif}',
      '[data-theme="dark"] .jgate-form input,[data-theme="dark"] .jgate-form select{border-color:rgba(226,226,226,.28)}',
      '[data-theme="dark"] .jgate-form select option{background:#181818;color:#E2E2E2}',
      '.jgate-form.multi{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}',
      '.jgate-form.multi button{grid-column:1/-1}',
      '.jgate-form .jf-bad{border-color:#8A2B2B}',
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

  function build(box, accounts, socials) {
    var id = box.getAttribute('data-gate-id') || 'file';
    var file = box.getAttribute('data-file') || '';
    var label = box.getAttribute('data-label') || 'Download';
    /* data-recommend="rnc" narrows step 1 to one Page. Absent = every Page in
       GATE, which is what /products/ has always shown. Gwen's brief: one review
       ask converts better than two, so a single-brand page can opt down. */
    var pick = (box.getAttribute('data-recommend') || '').trim();
    if (pick) {
      var want = pick.split(/[,\s]+/);
      accounts = accounts.filter(function (a) {
        return want.indexOf(a.slug.replace(/-recommend$/, '')) !== -1;
      });
      if (!accounts.length) accounts = GATE;   /* a typo must never empty step 1 */
    }
    /* a blob: URL saves under a junk name unless the download attr carries one */
    var filename = box.getAttribute('data-filename') || '';
    /* endpoint resolves per gate first, then the site-wide default */
    var hook = (box.getAttribute('data-webhook') || WEBHOOK || '').trim();
    var want = (box.getAttribute('data-capture') || 'email')
      .split(/[,\s]+/).filter(function (k) { return FIELDS[k]; });
    if (!want.length) want = ['email'];
    var event = box.getAttribute('data-event') || '';
    var need1 = accounts.length;
    var need2 = (socials || []).length;
    var unlockedOnce = false;

    box.textContent = '';
    box.className = (box.className ? box.className + ' ' : '') + 'jgate';

    function step(n, title, tag) {
      var s = document.createElement('div');
      s.className = 'jstep';
      var h = document.createElement('div');
      h.className = 'jstep-h';
      var num = document.createElement('span');
      num.className = 'jstep-n';
      num.textContent = n;
      var tt = document.createElement('span');
      tt.className = 'jstep-t';
      tt.textContent = title;
      var tg = document.createElement('span');
      tg.className = 'jstep-tag';
      tg.textContent = tag;
      h.appendChild(num); h.appendChild(tt); h.appendChild(tg);
      s.appendChild(h);
      box.appendChild(s);
      return s;
    }

    function status(s) {
      var c = document.createElement('p');
      c.className = 'jgate-count';
      c.setAttribute('aria-live', 'polite');
      s.appendChild(c);
      return c;
    }

    /* One card maker for both steps: click ticks the card, opens the profile
       in a centred popup, and repaints. The tick is on the click, not the
       follow or the review: no platform tells a website either, and the fine
       print says so. */
    function card(a, key, ask) {
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
      if (has(key)) b.classList.add('done');
      b.addEventListener('click', function (ev) {
        try { localStorage.setItem(key, '1'); } catch (e) {}
        b.classList.add('done');
        paint(true);
        track('follow_gate_click', { gate: id, account: a.slug, platform: a.platform, ask: ask });
        var w = 480, h = 700;
        var x = Math.max(0, ((screen.width || 1200) - w) / 2);
        var y = Math.max(0, ((screen.height || 800) - h) / 2);
        var win;
        try {
          win = window.open(a.url, 'jtl-' + ask + '-' + a.slug,
            'noopener,width=' + w + ',height=' + h + ',left=' + x + ',top=' + y);
        } catch (e) { win = null; }
        if (win) { ev.preventDefault(); try { win.focus(); } catch (e) {} }
      });
      return b;
    }

    var s1 = step('1', 'Recommend us', need1 === 1 ? 'One Page, a minute' : need1 === 2 ? 'Two Pages, a minute each' : need1 + ' Pages, a minute each');
    var grid1 = document.createElement('div');
    grid1.className = 'jgate-grid';
    s1.appendChild(grid1);
    accounts.forEach(function (a) { grid1.appendChild(card(a, KEY(a.slug), 'recommend')); });
    var count1 = status(s1);

    var s2 = step('2', 'Follow us', need2 ? 'All ' + need2 + ' accounts' : 'Profiles are in the footer');
    var grid2 = document.createElement('div');
    grid2.className = 'jgate-grid';
    s2.appendChild(grid2);
    (socials || []).forEach(function (a) { grid2.appendChild(card(a, FOLLOW_KEY(a.slug), 'follow')); });
    var count2 = status(s2);

    var s3 = step('3', 'Download', 'Opens when steps 1 and 2 are done');
    var vault = document.createElement('div');
    vault.className = 'jgate-vault';
    var vbody = document.createElement('div');
    vbody.className = 'jv-body';
    var vname = document.createElement('div');
    vname.className = 'jv-name';
    vname.textContent = box.getAttribute('data-reward') || label;
    var vsub = document.createElement('div');
    vsub.className = 'jv-sub';
    vsub.textContent = box.getAttribute('data-reward-note') || 'Yours the moment steps 1 and 2 are done.';
    vbody.appendChild(vname); vbody.appendChild(vsub);
    var vlock = document.createElement('div');
    vlock.className = 'jv-lock';
    vlock.setAttribute('aria-hidden', 'true');
    vlock.innerHTML = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="4" y="10.5" width="16" height="10.5" rx="2"></rect>' +
      '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"></path></svg><span>Locked until steps 1 and 2 are done</span>';
    vault.appendChild(vbody); vault.appendChild(vlock);
    s3.appendChild(vault);

    var form = null, submit = null, controls = {};
    if (hook) {
      form = document.createElement('form');
      form.className = 'jgate-form' + (want.length > 1 ? ' multi' : '');
      form.noValidate = true;   /* the messages below are ours, not the browser's */
      want.forEach(function (k) {
        var f = FIELDS[k], el = document.createElement(f.tag);
        if (f.tag === 'select') {
          var ph = document.createElement('option');
          ph.value = ''; ph.textContent = f.ph; ph.disabled = true; ph.selected = true;
          el.appendChild(ph);
          f.opts.forEach(function (o) {
            var op = document.createElement('option');
            op.value = o; op.textContent = o; el.appendChild(op);
          });
        } else {
          el.type = f.type;
          el.placeholder = f.ph;
          if (f.ac) el.autocomplete = f.ac;
        }
        el.required = !!f.required;
        el.setAttribute('aria-label', f.label);
        el.addEventListener('input', function () { el.classList.remove('jf-bad'); });
        el.addEventListener('change', function () { el.classList.remove('jf-bad'); });
        form.appendChild(el);
        controls[k] = el;
      });
      submit = document.createElement('button');
      submit.type = 'submit';
      submit.textContent = box.getAttribute('data-submit') || 'Send me the download';
      form.appendChild(submit);
      s3.appendChild(form);
    }

    var msg = document.createElement('p');
    msg.className = 'jgate-msg';
    s3.appendChild(msg);

    var out = document.createElement('a');
    out.className = 'jgate-out';
    out.hidden = true;
    out.textContent = label;
    out.setAttribute('download', filename);
    if (/^https?:/.test(file)) { out.target = '_blank'; out.rel = 'noopener'; }
    s3.appendChild(out);

    var fine = document.createElement('p');
    fine.className = 'jgate-fine';
    fine.textContent = hook
      ? 'We can’t check follows or recommendations from here. No platform lets a website do that, so this runs on trust. ' +
        'Your email gets the file and our build notes; unsubscribe any time.'
      : 'We can’t check follows or recommendations from here. No platform lets a website do that, so this runs on trust. ' +
        'We are not asking for your email, and nothing is collected on this page.';
    box.appendChild(fine);

    function done1() { return accounts.filter(function (a) { return has(KEY(a.slug)); }).length; }
    function done2() { return (socials || []).filter(function (a) { return has(FOLLOW_KEY(a.slug)); }).length; }

    function unlock(email, isRestore) {
      out.href = file;
      out.hidden = false;
      if (form) form.hidden = true;
      vault.classList.add('open');
      s3.classList.add('jstep-done');
      msg.textContent = isRestore ? 'Unlocked. The link is below.'
        : (email ? 'Unlocked. The link is below, and a copy is on its way to ' + email + '.'
                 : 'Unlocked. The link is below.');
      if (!isRestore && !unlockedOnce) track('follow_gate_unlock', { gate: id, accounts: need1 + need2, ask: 'recommend+follow' });
      unlockedOnce = true;
    }

    function paint(fromClick) {
      var d1 = done1(), d2 = done2();
      var ok1 = d1 >= need1, ok2 = d2 >= need2;
      count1.textContent = ok1 ? (need1 === 1 ? 'Done.' : 'Both done.')
        : d1 + ' of ' + need1 + ' done. Open ' + (need1 === 1 ? 'the Page' : 'each Page') + ', leave a recommendation, come back.';
      count2.textContent = ok2 ? (need2 ? 'All ' + need2 + ' followed.' : '') : d2 + ' of ' + need2 + ' followed.';
      s1.classList.toggle('jstep-done', ok1);
      s2.classList.toggle('jstep-done', ok2);
      var ok = ok1 && ok2;
      if (ok && !hook && !unlockedOnce) unlock('', !fromClick);
      if (submit) submit.disabled = !ok;
      return ok;
    }

    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!paint(false)) { msg.textContent = 'Finish steps 1 and 2 first.'; return; }

        var values = {}, bad = null, why = '';
        for (var i = 0; i < want.length; i++) {
          var k = want[i], el = controls[k], v = (el.value || '').trim();
          el.classList.remove('jf-bad');
          if (FIELDS[k].required && !v) {
            bad = el; why = k === 'country' ? 'Pick your country.' : 'Fill in your ' + k + '.'; break;
          }
          if (k === 'email' && v && !RE_EMAIL.test(v)) {
            bad = el; why = 'That email doesn’t look right.'; break;
          }
          values[FIELDS[k].key] = v;
        }
        if (bad) {
          bad.classList.add('jf-bad'); msg.textContent = why;
          try { bad.focus(); } catch (e) {}
          return;
        }

        if (values.email) { try { localStorage.setItem(EMAIL_KEY, values.email); } catch (e) {} }
        var payload = { gate: id, file: file, source: location.pathname };
        if (event) payload.event = event;
        for (var key in values) if (values[key]) payload[key] = values[key];
        fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(function () { /* the unlock never depends on the capture */ });
        track('follow_gate_capture', { gate: id, fields: want.join('+') });
        /* unlock fires now, not in a .then: an endpoint being down at 7PM must
           never cost someone the file they earned */
        unlock(values.email || '', false);
      });
    }

    var known = null;
    try { known = localStorage.getItem(EMAIL_KEY); } catch (e) {}
    var ready = paint(false);
    if (hook && known && ready) unlock(known, true);
  }

  function init() {
    var boxes = [].slice.call(document.querySelectorAll('[data-follow-gate]'));
    if (!boxes.length) return;
    css();
    /* The gate no longer depends on socials.json: it only feeds the optional
       row, so a missing file means no row, never a missing gate. */
    fetch(SRC, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (d) {
        var socials = (d && d.accounts) || [];
        boxes.forEach(function (b) { build(b, GATE, socials); });
      })
      .catch(function (e) {
        /* Fail OPEN, loudly. A render error must never bury a download the
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
          a.setAttribute('download', b.getAttribute('data-filename') || '');
          if (/^https?:/.test(file)) { a.target = '_blank'; a.rel = 'noopener'; }
          b.appendChild(a);
        });
        try { console.warn('[follow-gate] open fallback:', e.message); } catch (x) {}
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

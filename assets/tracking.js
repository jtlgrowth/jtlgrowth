/**
 * Venice unified tracking snippet — GA4 + Meta pixel + Google Ads, one file.
 *
 * Fires the same event names into all three platforms so a conversion means the
 * same thing everywhere. Drop this on any Venice or client site; fill the IDs
 * block at the top and delete the platforms that site doesn't use.
 *
 * Conversion model: the booking is the conversion. A Calendly click is intent,
 * not a lead — Calendly's postMessage is the only trustworthy signal that a call
 * was actually scheduled, and it works for both inline embeds and popups.
 */
(function () {
  'use strict';

  // ─── IDs — fill these per site ────────────────────────────────────────────
  var CFG = {
    ga4: 'G-7JHTYY0THC',        // GA4 measurement id, or '' to disable
    metaPixel: '',              // Meta pixel id, or '' to disable
    googleAds: '',              // 'AW-XXXXXXXXX', or '' to disable
    googleAdsBookingLabel: '',  // conversion label for the booking action
    // Microsoft Clarity project id, or '' to disable. Free heatmaps + session
    // recordings. Owner setup (2 min): clarity.microsoft.com → sign in →
    // "Add new project" → site jtlgrowth.com → copy the Project ID here.
    clarity: '',
    // PostHog visit analytics: pages, clicks, and a replay of the visit with every typed
    // field hidden. One free project serves the AVAS site, jtlgrowth.com and Checkup (pk-1320);
    // filter by $host. posthogLive false ships no PostHog at all. Flip it only together with
    // the PostHog copy on /privacy/ (check: ~/Venice/ops/runs/jtl-posthog-2026-10-29/jtl-ph-qa.mjs).
    posthogLive: true,
    // host is our relay (~/Venice/apps/ph-relay): PostHog's CDN stalls on Manila cache misses (2026-10-29).
    // Roll back by setting host to 'https://us.i.posthog.com'.
    posthog: { key: 'phc_po4dGx6cfc8VHkgMfTMEWDDHmxjLdaGDtA4YCcXQHBcN', host: 'https://e.jtlgrowth.com', ui: 'https://us.posthog.com' },
    // Consent default. 'denied' since 2026-10-08 so the /privacy/ promise is true
    // (analytics storage denied by default). The bar below asks; Accept and Decline
    // each fire a consent update (the consent-audit skill checks both directions).
    consentDefault: 'denied',
    // The consent bar (Owner 2026-10-08: "Yes, AVAS-style bar"). One key on this
    // device: unset shows the bar, 'granted' turns analytics on, 'denied' keeps it off.
    // Any element with [data-consent-reset] (the /privacy/ page) clears the answer
    // and shows the bar again. bar: false hides it on a site with no tags to gate.
    consent: {
      bar: true,
      key: 'jtl-consent',
      heading: 'Can we count this visit?',
      body: 'We use Google Analytics to see which pages get read, so we know what to fix. It stays off until you say yes.',
      more: 'What that means',
      items: [
        ['Accept', ' turns on Google Analytics cookies: pages viewed, approximate location from your IP, device, and how you arrived.'],
        ['Decline', ' keeps them off. The site works the same either way.'],
        ['', 'Your answer stays on this device. Change it any time on the ', 'privacy page', '/privacy/#cookies', '.'],
      ],
      accept: 'Accept',
      decline: 'Decline',
      // With PostHog on: a new key asks everyone again (a past yes covered Google Analytics only).
      withPosthog: {
        key: 'jtl-consent-2',
        body: 'We use Google Analytics and PostHog to see which pages get read and where people get stuck, so we know what to fix. Both stay off until you say yes.',
        accept: ' turns on Google Analytics and PostHog: pages viewed and what you click, a replay of the visit with everything you type hidden, approximate location from your IP, device, and how you arrived.',
      },
      // JTL black and white: a lifted dark card that reads on the dark and the light pages
      look: { bg: '#1A1A1A', fg: '#FCFCFC', body: '#BEBEBE', line: 'rgba(252,252,252,.16)', solidBg: '#FCFCFC', solidFg: '#121212', ghostHover: 'rgba(252,252,252,.08)' },
    },
    debug: false,
  };
  // ──────────────────────────────────────────────────────────────────────────

  var w = window;
  w.dataLayer = w.dataLayer || [];
  function gtag() { w.dataLayer.push(arguments); }

  // Consent default must be declared BEFORE any tag config call, or the tags
  // read an undefined state and behave inconsistently across platforms.
  gtag('consent', 'default', {
    ad_storage: CFG.consentDefault,
    analytics_storage: CFG.consentDefault,
    ad_user_data: CFG.consentDefault,
    ad_personalization: CFG.consentDefault,
    functionality_storage: 'granted',
    security_storage: 'granted',
  });

  // The visitor's stored answer. Only the categories this site actually uses are
  // asked for: analytics, plus the ad signals once an ads id or pixel is filled in.
  var CON = CFG.consent;
  var PH = CFG.posthogLive && CFG.posthog.key ? CFG.posthog : null;
  if (PH) {
    CON.key = CON.withPosthog.key;
    CON.body = CON.withPosthog.body;
    CON.items[0][1] = CON.withPosthog.accept;
  }
  function stored() { try { return w.localStorage.getItem(CON.key); } catch (e) { return null; } }
  function store(v) { try { if (v) w.localStorage.setItem(CON.key, v); else w.localStorage.removeItem(CON.key); } catch (e) {} }
  function grants(v) {
    var g = { analytics_storage: v };
    if (CFG.googleAds || CFG.metaPixel) { g.ad_storage = v; g.ad_user_data = v; g.ad_personalization = v; }
    return g;
  }
  // A returning visitor who said yes: update before the tags configure, so the first hit counts.
  if (stored() === 'granted') gtag('consent', 'update', grants('granted'));

  function loadScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  // ─── Google (GA4 + Ads share one gtag.js load) ────────────────────────────
  // Basic consent mode: gtag.js itself loads only after a yes. Loaded on a denied
  // default it still sends cookieless pings, and the bar promises "It stays off
  // until you say yes" (live check 2026-10-08 caught one collect hit on Decline).
  var googleId = CFG.ga4 && CFG.ga4.indexOf('X') === -1 ? CFG.ga4 : (CFG.googleAds || '');
  var googleLoaded = false;
  function loadGoogle() {
    if (googleLoaded || !googleId) return;
    googleLoaded = true;
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + googleId);
    gtag('js', new Date());
    if (CFG.ga4 && CFG.ga4.indexOf('X') === -1) gtag('config', CFG.ga4);
    if (CFG.googleAds) gtag('config', CFG.googleAds);
  }

  // ─── Opt-in tags: Google above, and Meta and Clarity, which set their own
  // cookies and ignore Google's consent signal, load only once the visitor says yes.
  var optedIn = false;
  function loadOptIns() {
  if (optedIn) return;
  optedIn = true;
  loadGoogle();

  // ─── Meta pixel ───────────────────────────────────────────────────────────
  if (CFG.metaPixel) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', CFG.metaPixel);
    fbq('track', 'PageView');
  }

  // ─── Microsoft Clarity (heatmaps + session recordings) ────────────────────
  if (CFG.clarity) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CFG.clarity);
  }

  // ─── PostHog (pages, clicks, replay with every input masked) ──────────────
  if (PH) {
    // PostHog's own loader stub, trimmed to the calls made before array.js arrives
    !function (t, e) { var o, n, p, r; e.__SV || (w.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split('.'); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; } (p = t.createElement('script')).type = 'text/javascript', p.crossOrigin = 'anonymous', p.async = !0, p.src = s.api_host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js', (r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = 'posthog', u.people = u.people || [], o = 'init capture register identify reset opt_in_capturing opt_out_capturing'.split(' '), n = 0; n < o.length; n++) g(u, o[n]); e._i.push([i, s, a]); }, e.__SV = 1); }(document, w.posthog || []);
    w.posthog.init(PH.key, {
      api_host: PH.host,
      ui_host: PH.ui,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      session_recording: { maskAllInputs: true },
      // Our consent key is the source of truth: a past "Change your choice" left
      // PostHog opted out on this device, and this yes undoes it.
      loaded: function (ph) { if (ph.has_opted_out_capturing()) ph.opt_in_capturing({ captureEventName: false }); },
    });
  }
  }
  if (stored() === 'granted') loadOptIns();
  // PostHog once running stops on a later no and resumes on a later yes, same page.
  function posthogFollow(v) {
    if (!PH || !optedIn || !w.posthog) return;
    if (v === 'granted') w.posthog.opt_in_capturing({ captureEventName: false });
    else { w.posthog.opt_out_capturing(); w.posthog.reset(); }
  }

  // ─── Unified event dispatch ───────────────────────────────────────────────
  // One call, three platforms. meta maps to a Meta standard event name.
  function track(name, params, meta) {
    params = params || {};
    if (CFG.debug) console.log('[venice-tracking]', name, params);

    if (googleId) gtag('event', name, params);

    if (CFG.metaPixel && meta && w.fbq) {
      var STANDARD = ['Lead', 'Schedule', 'Contact', 'CompleteRegistration', 'ViewContent', 'Subscribe'];
      if (STANDARD.indexOf(meta) !== -1) fbq('track', meta, params);
      else fbq('trackCustom', meta, params);
    }

    if (CFG.googleAds && CFG.googleAdsBookingLabel && name === 'booking_complete') {
      gtag('event', 'conversion', {
        send_to: CFG.googleAds + '/' + CFG.googleAdsBookingLabel,
      });
    }

    if (PH && optedIn && stored() === 'granted') w.posthog.capture(name, params);
  }
  w.veniceTrack = track;

  // ─── Consent bar ──────────────────────────────────────────────────────────
  // Built from DOM nodes (no innerHTML), styled from CFG.consent.look, shown only
  // while the answer is unset. Non-modal: the page stays usable behind it.
  var bar = null;
  function answer(v) {
    store(v);
    gtag('consent', 'update', grants(v));
    posthogFollow(v);
    if (v === 'granted') { loadOptIns(); track('consent_granted', {}); }
    if (bar) { bar.hidden = true; }
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function buildBar() {
    var L = CON.look;
    var css = el('style');
    css.id = 'jtl-consent-css';
    css.textContent =
      '#jtl-consent{position:fixed;left:24px;bottom:24px;z-index:9000;width:min(380px,calc(100vw - 48px));box-sizing:border-box;' +
      'background:' + L.bg + ';color:' + L.fg + ';border:1px solid ' + L.line + ';border-radius:16px;padding:20px 22px 18px;' +
      'box-shadow:0 18px 48px rgba(0,0,0,.45);font-family:inherit;font-size:14px;line-height:1.55;font-weight:500;letter-spacing:-.005em;text-align:left}' +
      '#jtl-consent[hidden]{display:none}' +
      '#jtl-consent .jc-h{margin:0 0 8px;font-size:18px;line-height:1.25;font-weight:650;letter-spacing:-.015em;color:' + L.fg + '}' +
      '#jtl-consent .jc-p{margin:0;color:' + L.body + '}' +
      '#jtl-consent details{margin-top:10px;font-size:13px;color:' + L.body + '}' +
      '#jtl-consent summary{cursor:pointer;list-style:none;color:' + L.fg + ';text-decoration:underline;text-underline-offset:3px;width:max-content}' +
      '#jtl-consent summary::-webkit-details-marker{display:none}' +
      '#jtl-consent ul{margin:10px 0 0;padding-left:18px}' +
      '#jtl-consent li+li{margin-top:6px}' +
      '#jtl-consent b{color:' + L.fg + ';font-weight:600}' +
      '#jtl-consent a{color:' + L.fg + ';text-decoration:underline;text-underline-offset:3px}' +
      '#jtl-consent .jc-row{display:flex;gap:10px;margin-top:16px}' +
      '#jtl-consent button{flex:1;min-height:44px;padding:10px 14px;border-radius:999px;cursor:pointer;font-family:inherit;font-size:14px;line-height:1;font-weight:600;' +
      'border:1px solid ' + L.line + ';background:transparent;color:' + L.fg + ';transition:background .2s,border-color .2s}' +
      '#jtl-consent button:hover{background:' + L.ghostHover + ';border-color:' + L.fg + '}' +
      '#jtl-consent .jc-yes{background:' + L.solidBg + ';border-color:' + L.solidBg + ';color:' + L.solidFg + '}' +
      '#jtl-consent .jc-yes:hover{background:' + L.body + ';border-color:' + L.body + '}' +
      '#jtl-consent button:focus-visible,#jtl-consent summary:focus-visible,#jtl-consent a:focus-visible{outline:2px solid ' + L.fg + ';outline-offset:2px}' +
      '@media (max-width:520px){#jtl-consent{left:10px;right:10px;bottom:10px;width:auto;padding:16px 18px 14px}}' +
      '@media (prefers-reduced-motion:no-preference){#jtl-consent{animation:jcIn .32s cubic-bezier(.2,.7,.2,1) both}}' +
      '@keyframes jcIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}';
    document.head.appendChild(css);
    var b = el('aside');
    b.id = 'jtl-consent';
    b.setAttribute('role', 'region');
    b.setAttribute('aria-labelledby', 'jtl-consent-h');
    var h = el('p', 'jc-h', CON.heading);
    h.id = 'jtl-consent-h';
    b.appendChild(h);
    b.appendChild(el('p', 'jc-p', CON.body));
    var d = el('details');
    d.appendChild(el('summary', '', CON.more));
    var ul = el('ul');
    CON.items.forEach(function (it) {
      var li = el('li');
      if (it[0]) li.appendChild(el('b', '', it[0]));
      li.appendChild(document.createTextNode(it[1]));
      if (it[2]) { var a = el('a', '', it[2]); a.href = it[3]; li.appendChild(a); li.appendChild(document.createTextNode(it[4] || '')); }
      ul.appendChild(li);
    });
    d.appendChild(ul);
    b.appendChild(d);
    var row = el('div', 'jc-row');
    var yes = el('button', 'jc-yes', CON.accept);
    yes.type = 'button';
    yes.addEventListener('click', function () { answer('granted'); });
    var no = el('button', '', CON.decline);
    no.type = 'button';
    no.addEventListener('click', function () { answer('denied'); });
    row.appendChild(yes);
    row.appendChild(no);
    b.appendChild(row);
    document.body.appendChild(b);
    return b;
  }
  function showBar() {
    if (!CON.bar) return;
    if (!bar) bar = buildBar();
    bar.hidden = false;
  }
  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  w.jtlConsent = {
    state: function () { return stored(); },
    reset: function () { store(null); gtag('consent', 'update', grants('denied')); posthogFollow('denied'); onReady(showBar); },
  };
  if (!stored()) onReady(showBar);
  // the /privacy/ page's "Change your choice" button
  document.addEventListener('click', function (e) {
    var r = e.target && e.target.closest ? e.target.closest('[data-consent-reset]') : null;
    if (r) { e.preventDefault(); w.jtlConsent.reset(); }
  });

  // ─── Auto-wired events ────────────────────────────────────────────────────

  // Intent: any click heading to the booking form (our own since 2026-10-02, Calendly before it).
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="book.ayalavirtualassistance.site"], a[href*="book.jtlgrowth.com"], a[href*="calendly.com"]') : null;
    if (a) track('book_call_click', { link_url: a.href }, 'ViewContent');
  }, true);

  // Conversion: Calendly's own confirmation that a call was scheduled.
  // Fires for inline embeds and popup widgets alike.
  w.addEventListener('message', function (e) {
    if (!e.data || typeof e.data.event !== 'string') return;
    if (e.origin.indexOf('calendly.com') === -1) return;
    if (e.data.event === 'calendly.event_scheduled') {
      track('booking_complete', { method: 'calendly' }, 'Schedule');
    }
  });

  // Lead: any form submit on the page. Forms that are wired to a real backend
  // only — an inert form will never reach here, which is the correct behaviour.
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.tagName !== 'FORM') return;
    var isNewsletter = /newsletter|subscribe|email-only/i.test(f.className + ' ' + (f.id || ''));
    track(
      isNewsletter ? 'newsletter_signup' : 'form_submit',
      { form_id: f.id || f.className || 'unnamed' },
      isNewsletter ? 'Subscribe' : 'Lead'
    );
  }, true);
})();

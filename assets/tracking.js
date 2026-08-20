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
    // Consent default. 'granted' suits PH/US-only traffic. Flip to 'denied' and
    // wire a CMP update before running EU/UK traffic — see the consent-audit skill.
    consentDefault: 'granted',
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

  function loadScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  // ─── Google (GA4 + Ads share one gtag.js load) ────────────────────────────
  var googleId = CFG.ga4 && CFG.ga4.indexOf('X') === -1 ? CFG.ga4 : (CFG.googleAds || '');
  if (googleId) {
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + googleId);
    gtag('js', new Date());
    if (CFG.ga4 && CFG.ga4.indexOf('X') === -1) gtag('config', CFG.ga4);
    if (CFG.googleAds) gtag('config', CFG.googleAds);
  }

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
  }
  w.veniceTrack = track;

  // ─── Auto-wired events ────────────────────────────────────────────────────

  // Intent: any click heading to Calendly (link, button, or popup trigger).
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="calendly.com"]') : null;
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

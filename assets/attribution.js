/* First-touch attribution for booking links. Invisible: it only fills utm_source, utm_medium and
   utm_content on links to our booking doors (book.ayalavirtualassistance.site, book.jtlgrowth.com,
   calendly.com/obmgwenayala), so a booking made after a visit from ChatGPT, Google or a social app
   carries where the visitor came from even when they skip the "Where did you hear about us?" question.
   Rules: an existing utm_source on a link wins and the link is left alone; no referrer and no utm on
   landing means nothing is stored and nothing changes; every storage access is in try/catch and the
   script works with storage blocked (it falls back to memory for the page). sessionStorage only, so
   nothing outlives the visit. Same file on avas-site and jtlgrowth-site: edit both together. */
(function () {
  "use strict";
  var KEY = "jtl-ft";
  var OWN = /(^|\.)(ayalavirtualassistance\.(site|com)|jtlgrowth\.com)$/;
  var AI = /^(chatgpt\.com|chat\.openai\.com|claude\.ai|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/;
  var SOCIAL = /^((l|lm|m|mobile|web)\.)?(instagram|facebook|linkedin|youtube|tiktok|threads|twitter|x)\.(com|net)$|^(lnkd\.in|t\.co|fb\.com|youtu\.be)$/;
  var SEARCH = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com)$/;
  var mem = null;

  function host(u) {
    try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch (e) { return ""; }
  }
  function medium(h) {
    if (AI.test(h)) { return "ai"; }
    if (SOCIAL.test(h)) { return "social"; }
    if (SEARCH.test(h)) { return "organic"; }
    return h ? "referral" : "";
  }
  function read() {
    try {
      var raw = window.sessionStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.utm_source) { return o; } }
    } catch (e) { /* blocked or corrupt: fall through */ }
    return mem;
  }
  function save(o) {
    mem = o;
    try { window.sessionStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* blocked: memory only */ }
  }

  // Landing: record the first touch once per visit.
  function landing() {
    if (read()) { return; }
    var q, t = {};
    try { q = new URLSearchParams(window.location.search); } catch (e) { q = null; }
    if (q) {
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(function (k) {
        var v = q.get(k);
        if (v && /^[\w .:+%@-]{1,100}$/.test(v)) { t[k] = v; }
      });
    }
    if (!t.utm_source) {
      var rh = host(document.referrer);
      if (!rh || OWN.test(rh) || rh === window.location.hostname) { if (!Object.keys(t).length) { return; } }
      else { t.utm_source = rh; t.utm_medium = t.utm_medium || medium(rh); }
    } else if (!t.utm_medium) {
      var m = medium(t.utm_source.toLowerCase());
      if (m && m !== "referral") { t.utm_medium = m; }
    }
    if (!t.utm_source) { return; }
    if (!t.utm_content) { t.utm_content = (window.location.pathname || "/").slice(0, 100); }
    save(t);
  }

  function isBooking(u) {
    var h = u.hostname.toLowerCase();
    if (h === "book.ayalavirtualassistance.site" || h === "book.jtlgrowth.com") { return true; }
    return h === "calendly.com" && /^\/obmgwenayala(\/|$)/i.test(u.pathname);
  }

  // Add the first touch to one URL string; returns the same string when nothing applies.
  function decorate(href) {
    var t = read();
    if (!t || !href) { return href; }
    var u;
    try { u = new URL(href, window.location.href); } catch (e) { return href; }
    if (!isBooking(u) || u.searchParams.get("utm_source")) { return href; }
    ["utm_source", "utm_medium", "utm_content"].forEach(function (k) {
      if (t[k] && !u.searchParams.get(k)) { u.searchParams.set(k, t[k]); }
    });
    return u.toString();
  }

  function fix(a) {
    try {
      var cur = a.getAttribute("href");
      if (!cur || cur.charAt(0) === "#") { return; }
      var next = decorate(cur);
      if (next !== cur) { a.setAttribute("href", next); }
    } catch (e) { /* never break the page */ }
  }
  function sweep(root) {
    try {
      var list = (root || document).querySelectorAll("a[href*='book.ayalavirtualassistance.site'],a[href*='book.jtlgrowth.com'],a[href*='calendly.com']");
      for (var i = 0; i < list.length; i++) { fix(list[i]); }
    } catch (e) { /* ignore */ }
  }

  try { landing(); } catch (e) { /* ignore */ }
  window.JTLAttr = { decorate: decorate, first: read };

  function start() {
    sweep();
    try {
      new MutationObserver(function (recs) {
        for (var i = 0; i < recs.length; i++) {
          var r = recs[i];
          if (r.type === "attributes") { if (r.target.tagName === "A") { fix(r.target); } }
          else { for (var j = 0; j < r.addedNodes.length; j++) {
            var n = r.addedNodes[j];
            if (n.nodeType === 1) { if (n.tagName === "A") { fix(n); } else { sweep(n); } }
          } }
        }
      }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    } catch (e) { /* no observer: the click hook below still covers it */ }
  }
  // Last chance before navigation, for links a script rewrites after the sweep.
  ["pointerdown", "click", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      try { var a = e.target && e.target.closest && e.target.closest("a[href]"); if (a) { fix(a); } } catch (x) { /* ignore */ }
    }, true);
  });
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", start); } else { start(); }
})();

/* Doors to the work and the shop on the homepage (Owner mix 2026-10-26:
   jtl-chooser:A, jtl-toast:A, jtl-exit:A; the Shop nav link is plain HTML).
   - chooser: "Not ready for a call?" pills under the hero buttons
   - toast:   a corner card with the Brain still once the visitor leaves the hero
              panel (or scrolls a third of the page on a phone), or after 12 s
   - exit:    "Before you go" when the pointer leaves through the top (laptop) or at
              the Contact panel (phone), after 8 s on the page
   A prompt the visitor closes stays shut for the visit (sessionStorage).
   Source and recordings: Venice ops/reports/work-visibility-2026-10-26. */
(function () {
  "use strict";
  var D = document;
  var WORK = "/work/";
  var SHOP = "/shop/";
  var NE = '<span aria-hidden="true">&#8599;</span>';

  function shut(k) { try { return sessionStorage.getItem("wp-" + k) === "1"; } catch (e) { return false; } }
  function close(k) { try { sessionStorage.setItem("wp-" + k, "1"); } catch (e) {} }
  function el(html) { var t = D.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  var css = [
    /* chooser */
    ".wp-choose{margin:18px 0 4px}",
    ".wp-choose-k{margin:0 0 8px;font:400 11px/1.2 'Space Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--gray)}",
    ".wp-choose-row{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}",
    ".wp-choose-row a{display:inline-flex;align-items:center;gap:6px;padding:9px 15px;border:1px solid var(--line);border-radius:999px;color:var(--navy);text-decoration:none;font:600 13px/1 'Archivo',sans-serif;background:color-mix(in srgb,var(--cement) 70%,transparent);transition:border-color .2s,transform .25s cubic-bezier(.2,1.4,.4,1)}",
    ".wp-choose-row a:hover{border-color:var(--navy);transform:translateY(-2px)}",
    /* toast */
    ".wp-toast{position:fixed;right:20px;bottom:20px;z-index:9000;display:grid;grid-template-columns:112px 1fr;gap:12px;width:min(380px,calc(100vw - 32px));padding:12px;border-radius:18px;background:var(--cement);color:var(--navy);border:1px solid var(--line);box-shadow:0 24px 60px -24px rgba(0,0,0,.45);transform:translateY(140%);opacity:0;transition:transform .6s cubic-bezier(.2,1.15,.3,1),opacity .3s}",
    ".wp-toast.in{transform:none;opacity:1}",
    ".wp-toast img{width:112px;height:100%;min-height:84px;object-fit:cover;border-radius:10px;background:#111}",
    ".wp-toast small{display:block;font:400 10.5px/1.2 'Space Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--gray)}",
    ".wp-toast b{display:block;margin:4px 0 2px;font:600 15px/1.25 'Archivo',sans-serif}",
    ".wp-toast p{margin:0 0 10px;font:400 12.5px/1.4 'Archivo',sans-serif;color:var(--gray)}",
    ".wp-toast .wp-row{display:flex;gap:8px}",
    ".wp-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:999px;font:600 12.5px/1 'Archivo',sans-serif;text-decoration:none;cursor:pointer;border:1px solid var(--navy);background:var(--navy);color:var(--cement)}",
    ".wp-btn.ghost{background:transparent;color:var(--navy);border-color:var(--line)}",
    "@media (max-width:720px){.wp-toast{right:16px;bottom:16px;grid-template-columns:84px 1fr}.wp-toast img{width:84px}}",
    /* exit */
    ".wp-dim{position:fixed;inset:0;z-index:9500;display:grid;place-items:center;padding:16px;background:rgba(10,10,10,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .3s}",
    ".wp-dim.in{opacity:1}",
    ".wp-dlg{width:min(440px,100%);padding:26px 24px 22px;border-radius:22px;background:var(--cement);color:var(--navy);border:1px solid var(--line);box-shadow:0 40px 90px -30px rgba(0,0,0,.6);transform:translateY(16px) scale(.97);transition:transform .45s cubic-bezier(.2,1.2,.3,1)}",
    ".wp-dim.in .wp-dlg{transform:none}",
    ".wp-dlg small{font:400 11px/1.2 'Space Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--gray)}",
    ".wp-dlg h3{margin:8px 0 6px;font:600 22px/1.2 'Archivo',sans-serif}",
    ".wp-dlg h3 em{font-family:Georgia,'Times New Roman',serif;font-weight:400}",
    ".wp-dlg p{margin:0 0 18px;font:400 14px/1.5 'Archivo',sans-serif;color:var(--gray)}",
    ".wp-dlg .wp-row{display:flex;flex-wrap:wrap;gap:8px}",
    ".wp-dlg .wp-not{margin-left:auto}",
    "@media (prefers-reduced-motion:reduce){.wp-toast,.wp-dim,.wp-dlg{transition:none}}"
  ].join("\n");
  var st = D.createElement("style");
  st.id = "wp-style";
  st.textContent = css;
  D.head.appendChild(st);

  /* chooser: above the "ask Venice" hint so its arrow keeps its path; the loop's hero
     clone (#p1clone, aria-hidden) gets the same pills, out of the tab order, so the wrap stays seamless */
  ["#p1", "#p1clone"].forEach(function (id) {
    var copy = D.querySelector(id + " .kb-copy");
    if (!copy) return;
    var nav = el('<nav class="wp-choose" aria-label="Where to start"><p class="wp-choose-k">Not ready for a call?</p><div class="wp-choose-row">' +
      '<a href="' + WORK + '">See what we\'ve built ' + NE + '</a>' +
      '<a href="' + SHOP + '">Shop AI employees ' + NE + '</a>' +
      "</div></nav>");
    if (id === "#p1clone") nav.querySelectorAll("a").forEach(function (a) { a.tabIndex = -1; });
    copy.insertBefore(nav, copy.querySelector(".kb-hint"));
  });

  /* toast */
  function toastOnce() {
    if (shut("toast") || D.querySelector(".wp-toast")) return;
    var t = el('<aside class="wp-toast" role="dialog" aria-label="See our work">' +
      '<img src="/work/demos/brain-poster.webp" alt="" width="1440" height="900">' +
      '<div><small>Our work</small><b>Want to see it running?</b><p>Live sites, apps and AI employees we built.</p>' +
      '<div class="wp-row"><a class="wp-btn" href="' + WORK + '">See the work ' + NE + '</a><button class="wp-btn ghost" type="button" data-wp-close>Not now</button></div></div></aside>');
    D.body.appendChild(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add("in"); }); });
    t.querySelector("[data-wp-close]").addEventListener("click", function () { close("toast"); t.classList.remove("in"); setTimeout(function () { t.remove(); }, 600); });
  }
  setTimeout(toastOnce, 12000);
  /* the laptop homepage is a panel deck, not a scroll: the first move past the hero counts */
  var about = D.getElementById("about");
  if (about && "MutationObserver" in window) {
    var mo = new MutationObserver(function () { if (about.classList.contains("in")) { mo.disconnect(); setTimeout(toastOnce, 1200); } });
    mo.observe(about, { attributes: true, attributeFilter: ["class"] });
  }
  var onScroll = function () {
    var max = D.documentElement.scrollHeight - innerHeight;
    if (max > 0 && scrollY / max > 0.33) { removeEventListener("scroll", onScroll); toastOnce(); }
  };
  addEventListener("scroll", onScroll, { passive: true });

  /* exit */
  var born = Date.now();
  function exitOnce() {
    if (shut("exit") || D.querySelector(".wp-dim") || Date.now() - born < 8000) return;
    close("exit");
    var dim = el('<div class="wp-dim"><div class="wp-dlg" role="dialog" aria-modal="true" aria-labelledby="wp-exit-t">' +
      '<small>Before you go</small><h3 id="wp-exit-t">Not ready for a call <em>yet?</em></h3>' +
      '<p>Look around first. Every build on our work page is live, and the shop installs an AI employee today.</p>' +
      '<div class="wp-row"><a class="wp-btn" href="' + WORK + '">See the work ' + NE + '</a><a class="wp-btn ghost" href="' + SHOP + '">Browse the shop ' + NE + '</a><button class="wp-btn ghost wp-not" type="button" data-wp-close>Not now</button></div>' +
      "</div></div>");
    D.body.appendChild(dim);
    requestAnimationFrame(function () { requestAnimationFrame(function () { dim.classList.add("in"); }); });
    var first = dim.querySelector("a");
    if (first) first.focus({ preventScroll: true });
    function bye() { dim.classList.remove("in"); D.removeEventListener("keydown", esc); setTimeout(function () { dim.remove(); }, 320); }
    function esc(e) { if (e.key === "Escape") bye(); }
    D.addEventListener("keydown", esc);
    dim.addEventListener("click", function (e) { if (e.target === dim || e.target.hasAttribute("data-wp-close")) bye(); });
  }
  D.addEventListener("mouseout", function (e) { if (!e.relatedTarget && e.clientY <= 0) exitOnce(); });
  var contact = D.getElementById("p5");
  if (contact && "IntersectionObserver" in window && matchMedia("(hover:none)").matches) {
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) exitOnce(); }, { threshold: 0.5 }).observe(contact);
  }
})();

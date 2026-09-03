#!/usr/bin/env python3
"""Three scale proposals for the fitted hero 03 (Owner, 2026-09-03 16:27: "it doesn't feel right for my
eyes, it's straining my eyes", copy too small, laptop too small). Each stage is live at real viewport
size and stays inside one screen. Writes qa/hero-v7-scale.html. Count gates on every fold."""
import pathlib, sys

SITE = pathlib.Path.home() / "Venice/deploys/deploys/jtlgrowth-site"
OUT = SITE / "qa/hero-v7-scale.html"
SRC = SITE / "qa/hero-v7-proposals.html"

def must(c, want, what):
    if c != want:
        sys.exit(f"FAIL {what}: want {want}, got {c}")

VOL_ON = ('<svg class="kb-ic-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/>'
          '<path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>')
VOL_OFF = ('<svg class="kb-ic-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
           '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/>'
           '<line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>')
EMPLOYEES = ["Lene", "Bingbong", "Venice", "Janitor", "Dex", "Belze", "Bruno", "Vann", "Rain", "Wren", "Amara", "Cael", "Lauren", "Aurel", "Lysander"]
CAL = "https://calendly.com/obmgwenayala/30min"

def laptop(window=False):
    emp = "".join(f'<li><i class="dot"></i>{e}</li>' for e in EMPLOYEES)
    chips = "".join(f'<button type="button" class="kb-chip" data-cmd="{c}" data-click>{c}</button>' for c in ["services", "price", "ai employee", "book a call", "help"])
    return f'''<div class="kb-laptop{' kb-window' if window else ''}" data-laptop>
      <div class="kb-lid">
        <div class="kb-screen">
          <div class="kb-menubar"><span class="kb-mb-app">Growth</span><span class="kb-mb-item">File</span><span class="kb-mb-item">Edit</span><span class="kb-mb-item">View</span><span class="kb-mb-spacer"></span><button type="button" class="kb-mute" data-mute aria-pressed="true" aria-label="Mute key sounds">{VOL_ON}{VOL_OFF}</button><span class="kb-mb-clock" data-clock>16:00</span></div>
          <div class="kb-cockpit">
            <aside class="kb-side" aria-hidden="true">
              <div class="kb-side-brand">Growth</div>
              <ul class="kb-side-nav"><li>Tasks</li><li class="on">Venice HQ <b>5</b></li><li>Automations</li><li>Agent Dashboard <i class="dot"></i></li><li>Agents <b>1</b></li><li>Growth Mobile</li></ul>
              <div class="kb-side-label">Usage</div>
              <div class="kb-usage"><span>5h</span><span class="bar"><i style="--p:26%"></i></span></div>
              <div class="kb-usage"><span>wk</span><span class="bar"><i style="--p:51%"></i></span></div>
              <div class="kb-side-label">Employees</div>
              <ul class="kb-side-emp">{emp}</ul>
            </aside>
            <div class="kb-main">
              <div class="kb-tabs"><span class="kb-tab on"><i class="dot"></i>Venice hq &middot; session</span><span class="kb-tab-plus">+</span></div>
              <div class="kb-term" data-term>
                <div class="kb-log" data-log aria-live="polite"></div>
                <form class="kb-prompt" data-form autocomplete="off"><span class="kb-prompt-mark" aria-hidden="true">&rsaquo;</span><input class="kb-input" data-input type="text" name="q" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Ask the AI employee" placeholder="ask anything, or type: go to services"></form>
                <div class="kb-chips" data-chips>{chips}</div>
              </div>
            </div>
          </div>
          <div class="kb-mini" data-deck data-float aria-hidden="true"></div>
        </div>
        <div class="kb-notch" aria-hidden="true"></div>
      </div>
      <div class="kb-base kb-lip" aria-hidden="true"></div>
    </div>'''

def ctas(extra=""):
    return (f'<div class="kb-ctas{extra}"><a class="kb-cta" href="{CAL}" target="_blank" rel="noopener" data-click>Put AI to work for me</a>'
            '<a class="kb-link" href="/ai-employee/" data-click>See the seven stages <span aria-hidden="true">&#8599;</span></a></div>')

def copy(two_lines=False, cta=True):
    h1 = '<h1><span class="l">Growth,</span> <em class="accent">engineered.</em></h1>' if two_lines else '<h1>Growth, <em class="accent">engineered.</em></h1>'
    return ('<div class="kb-copy">' + h1 +
            '<p class="lead">AI systems that run the repetitive half of your business.</p>' + (ctas() if cta else '') + '</div>')

# the real home keeps its dot row 28px off the bottom: shown on every stage so the bottom band is honest
DOTS = '<div class="hs-dots" aria-hidden="true"><i class="on"></i>Hero <i></i>About <i></i>Globe <i></i>Contact</div>'

V = [
  dict(id=1, name="Same frame, everything inside it bigger", tag="01 &middot; Recommended",
       sub="Your pick, untouched in layout. The headline goes from 64 to 96 px on a 2000 wide screen, the line to 22 px, the button to 52 px tall. The laptop keeps the same box (one screen is one screen at 16:10) but the app inside it renders at 1.3x: 16 px terminal text instead of 12.5, a 218 px sidebar, taller chips. What your eyes read gets 30 to 50 percent bigger; nothing moves.",
       html=lambda: f'<div class="hs hs-s1">{copy()}{laptop()}{DOTS}</div>',
       a="Headline 96 px, line 22 px, button 52 px. All 1.5x the fitted version.", b="Same laptop box as today (about 1120 px wide at 1100 tall), interior at 1.3x.", c="Nothing. Layout, order and fit are unchanged."),
  dict(id=2, name="Wide window", tag="02",
       sub="Sample 04's chassis-less app window, now cut for a wide screen: 2:1 instead of 16:10, so at the same height it is a third wider. About 1460 px across at 1100 tall, the interior at 1.3x. Same big headline above. The lid, notch and lip go; the app is a real window with a shadow, sitting on the page.",
       html=lambda: f'<div class="hs hs-s2">{copy()}{laptop(window=True)}{DOTS}</div>',
       a="Same type as 01.", b="Window about 1460 x 730 px at 2000 x 1100, a third wider than today's screen, interior at 1.3x.", c="The laptop chassis. It becomes a window (your 04 bias)."),
  dict(id=3, name="Big app, copy beside", tag="03",
       sub="Sample 01's geometry with the new type. The copy moves to the right column, so the laptop is no longer height-bound by the words above it: 66 percent of the width, about 1320 px at 2000 wide, the biggest laptop that still fits one screen. Headline on two lines at 88 px, interior at 1.2x. Eyes hit the app first, the words back it up.",
       html=lambda: f'<div class="hs hs-s3">{laptop()}{copy(two_lines=True)}{DOTS}</div>',
       a="Headline 88 px on two lines, line 20 px, button 52 px.", b="Laptop about 1320 px wide, 18 percent bigger than today, interior at 1.2x.", c="Headline over the stage. The copy returns to the side column."),
  dict(id=4, name="Button under the laptop", tag="04 &middot; Owner question",
       sub="01 with the button row moved below the laptop: headline and the one line above, the app, then the button and the link. Reading order becomes see it, try it, act. The laptop is the same size as 01 (the row costs the same 72 px above or below). What changes is where the button lands: on a 1100 tall screen it sits in the bottom band with the dot row, the scroll hint and the page counter, and it is the first thing to leave the fold on a shorter screen.",
       html=lambda: f'<div class="hs hs-s4">{copy(cta=False)}{laptop()}{ctas(" kb-ctas-under")}{DOTS}</div>',
       a="Same type as 01.", b="Same laptop as 01.", c="The button leaves the headline and joins the dot row at the bottom edge."),
]

CSS = r"""
/* ---- shared scale: bigger type on every stage ---- */
.hero-stage .hs{padding:76px 0 56px;min-height:100vh}
.hero-stage h1{font-size:clamp(48px,4.8vw,96px);line-height:1.0}
.hero-stage .lead{font-size:clamp(18px,1.2vw,22px);max-width:44ch;margin-top:12px}
.hero-stage .kb-cta{min-height:52px;padding:0 28px;font-size:12.5px}
.hero-stage .kb-link{font-size:12.5px}
.hero-stage .kb-ctas{flex-direction:row;align-items:center;justify-content:center;gap:24px;margin-top:20px}
/* interior zoom: the app inside the screen renders bigger, the screen box does not change */
.hero-stage .kb-cockpit,.hero-stage .kb-menubar{zoom:var(--kz,1.3)}
.hero-stage .hs-dots{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);display:flex;align-items:center;gap:22px;font:700 10px var(--mach);letter-spacing:.2em;text-transform:uppercase;color:#616161;pointer-events:none}
.hero-stage .hs-dots i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#AFAFAF;margin-right:9px;vertical-align:1px}
.hero-stage .hs-dots i.on{background:#181818}
/* ---- 01 same frame ---- */
.hs-s1{--kz:1.3;display:flex;flex-direction:column;align-items:center;justify-content:center}
.hs-s1 .kb-copy{text-align:center;display:flex;flex-direction:column;align-items:center}
.hs-s1 .kb-laptop{width:min(60vw,calc((100vh - 400px) * 1.6));margin-top:24px}
/* ---- 02 wide window (2:1) ---- */
.hs-s2{--kz:1.3;display:flex;flex-direction:column;align-items:center;justify-content:center}
.hs-s2 .kb-copy{text-align:center;display:flex;flex-direction:column;align-items:center}
.hs-s2 .kb-laptop{width:min(80vw,calc((100vh - 372px) * 2));margin-top:24px}
.hs-s2 .kb-window .kb-lid{padding:0;background:transparent;box-shadow:none;border-radius:0}
.hs-s2 .kb-window .kb-screen{aspect-ratio:2/1;border-radius:14px;box-shadow:0 40px 90px -30px rgba(0,0,0,.45);border:1px solid rgba(24,24,24,.12)}
.hs-s2 .kb-window .kb-notch,.hs-s2 .kb-window .kb-base{display:none}
/* ---- 04 button under the laptop (01's sizes) ---- */
.hs-s4{--kz:1.3;display:flex;flex-direction:column;align-items:center;justify-content:center}
.hs-s4 .kb-copy{text-align:center;display:flex;flex-direction:column;align-items:center}
.hs-s4 .kb-laptop{width:min(60vw,calc((100vh - 400px) * 1.6));margin-top:24px}
.hs-s4 .kb-ctas-under{margin-top:20px}
/* ---- 03 big app, copy beside ---- */
.hero-stage .hs-s3{--kz:1.2;display:grid;grid-template-columns:66vw 1fr;align-items:center;gap:0;padding-left:64px} /* 64px keeps the studies rail off the bezel; the site has no rail */
.hs-s3 .kb-laptop{width:100%;max-width:calc((100vh - 150px) * 1.5);margin-left:0}
.hs-s3 .kb-copy{justify-self:center;text-align:center;max-width:min(100%,600px);padding:0 3vw 0 1vw}
.hs-s3 h1{font-size:clamp(44px,4.4vw,88px);line-height:.98}
.hs-s3 .lead{margin-left:auto;margin-right:auto;max-width:34ch}
.hs-s3 .kb-ctas{flex-direction:column;gap:16px;margin-top:24px}
@media (max-width:1100px){
  .hero-stage .kb-cockpit,.hero-stage .kb-menubar{zoom:1}
  .hs-s1 .kb-laptop,.hs-s2 .kb-laptop,.hs-s4 .kb-laptop{width:92vw}
  .hero-stage .hs-s3{grid-template-columns:1fr;padding-left:0}
  .hs-s3 .kb-laptop{margin:0 auto;max-width:92vw}
  .hs-s3 .kb-copy{padding:28px 4vw 40px;max-width:none}
}
@media (max-width:860px), (prefers-reduced-motion: reduce){
  .hero-stage .hs{padding:24px 0 40px;min-height:0}
  .hero-stage .kb-ctas{flex-direction:column;gap:14px}
  .hero-stage .kb-mini{display:none}
  .hero-stage .kb-mini,.hero-stage .kb-mini *{transition:none!important}
}
"""

src = SRC.read_text(encoding="utf-8")
base_css = src[src.index("<style>") + 7: src.index("/* ---- 01 Keeby, maximised ---- */")]
must(len(base_css) > 5000, True, "shell + shared stage css read from the five samples")

variants = ""
for v in V:
    variants += f'''
<!-- ============================ 0{v["id"]} ============================ -->
<section class="variant" id="v{v["id"]}">
  <div class="vhead"><span class="vtag{' rec' if v['id'] == 1 else ''}">{v["tag"]}</span><h2 class="vname">{v["name"]}</h2></div>
  <p class="vsub">{v["sub"]}</p>
  <div class="hero-stage" data-stage="{v["id"]}">{v["html"]()}</div>
  <div class="vfoot"><div><h4>Type</h4><p>{v["a"]}</p></div><div><h4>App</h4><p>{v["b"]}</p></div><div><h4>What gives way</h4><p>{v["c"]}</p></div></div>
</section>'''

html = f'''<!DOCTYPE html>
<!-- template: W-28 jtl-page-v6 (register: jtl-mono) -->
<!-- doc shell: qa/hero-v7-proposals.html, the house studies pattern -->
<!-- engine: assets/v7 (term, sound, keys in float mode), the same one index-v7.html runs -->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Hero v7: three scales</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Archivo+Expanded:wght@500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,650;1,9..144,650&family=Space+Mono:wght@400;700&display=swap">
<link rel="stylesheet" href="../assets/v7/home.css">
<style>
{base_css}
{CSS}
</style>
</head>
<body>
<a class="skip" href="#v1">Skip to the samples</a>
<nav class="rail-nav" aria-label="Samples">
  <a href="#v1" data-r="v1">01</a><a href="#v2" data-r="v2">02</a><a href="#v3" data-r="v3">03</a><a href="#v4" data-r="v4">04</a>
  <a href="#top" class="top" aria-label="Back to top">&#8593;</a>
</nav>
<div class="doc" id="top">
  <p class="kick">jtlgrowth.com &middot; home v7 hero &middot; three scales &middot; 3 sep 2026</p>
  <h1 class="doc-title">Three scales for the fitted hero, <em>none of them small.</em></h1>
  <p class="doc-lead">The fitted 03 strains the eyes: 64 px headline, 12.5 px terminal text, on a 2000 px screen. Every stage below is bigger where you read, and each still lands inside one screen. The three differ in what they give up to get there: 01 gives up nothing and scales the inside, 02 gives up the chassis and goes wide, 03 gives up the headline-on-top and puts the copy beside the biggest laptop that fits.</p>
  <p class="doc-lead">Every stage is live at real viewport size. Type in each one. Use the rail on the left, or press 1 to 4. The dot row at the bottom of each stage is the real one from the home, so you see what the bottom band holds.</p>
</div>
{variants}
<footer class="doc-end">
  <hr class="rule">
  <h2 class="sec">Pick one, or point</h2>
  <p>01 is the recommendation: it is your pick with the reading sizes fixed, and it goes into index-v7 as one CSS block. 02 if the app should own the width. 03 if the laptop should be the biggest thing on the page. 04 answers the question of the button under the laptop: same laptop as 01, the button moves into the bottom band. Say the number.</p>
</footer>
<script src="../assets/v7/sound.js" data-base="../assets/sounds/"></script>
<script src="../assets/v7/keys.js"></script>
<script src="../assets/v7/term.js"></script>
<script>
(function(){{
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var rail = document.querySelectorAll('.rail-nav a[data-r]');
  var vs = [].slice.call(document.querySelectorAll('.variant'));
  var vio = new IntersectionObserver(function(es){{ es.forEach(function(e){{ if (e.isIntersecting) rail.forEach(function(a){{ a.classList.toggle('on', a.getAttribute('data-r') === e.target.id); }}); }}); }}, {{ rootMargin: '-40% 0px -55% 0px' }});
  vs.forEach(function(v){{ vio.observe(v); }});
  addEventListener('keydown', function(e){{
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    var n = parseInt(e.key, 10); if (n >= 1 && n <= 4) {{ var v = document.getElementById('v' + n); if (v) v.scrollIntoView({{ behavior: reduce.matches ? 'auto' : 'smooth' }}); }}
  }});
  function t(){{ var d = new Date(), s = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); document.querySelectorAll('[data-clock]').forEach(function(e){{ e.textContent = s; }}); }}
  t(); setInterval(t, 30000);
}})();
</script>
</body>
</html>
'''
must(html.count('class="variant"'), 4, "variants")
must(html.count("data-float"), 4, "mini keyboards")
must(html.count("data-term"), 4, "terminals")
must(html.count("kb-eyebrow"), 0, "no eyebrow")
must(html.count("Gwen"), 0, "no Gwen in copy")
must(html.count('class="kb-deck"'), 0, "no deck")
must(html.count("Put AI to work for me"), 4, "CTA on all four")
must(html.count('class="hs-dots"'), 4, "dot row on every stage")
must(html.count("—") + html.count("–"), 0, "no dashes")
for bad in ("venice-edit", "data-token"):
    must(html.count(bad), 0, f"{bad} absent")
OUT.write_text(html, encoding="utf-8")
print(f"OK {OUT} {len(html.encode())} B; 4 stages, 4 mini keyboards, 0 eyebrows, 0 Gwen, 0 decks")

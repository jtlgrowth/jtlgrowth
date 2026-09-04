#!/usr/bin/env python3
"""Three ways to tell the visitor the laptop is real and what to ask it (Owner, 2026-09-03 16:51:
"add a text or a curved arrow signalling they can type, and what the capabilities are"). Built on the
round 5 hero (scale sample 03). Writes qa/hero-v7-hint.html. Count gates on every fold."""
import pathlib, re, runpy, sys

SITE = pathlib.Path.home() / "Venice/deploys/deploys/jtlgrowth-site"
OUT = SITE / "qa/hero-v7-hint.html"
SRC = SITE / "qa/hero-v7-proposals.html"
G = runpy.run_path(str(SITE / "qa/build-hero-scale.py"))  # laptop(), ctas(), DOTS, CAL; rebuilds the scale page as a side effect
laptop, ctas, DOTS, CAL = G["laptop"], G["ctas"], G["DOTS"], G["CAL"]

def must(c, want, what):
    if c != want:
        sys.exit(f"FAIL {what}: want {want}, got {c}")

HINT = "Or ask Venice. It answers what we build, what it costs, how fast, and who runs it."

def copy(hint=None):
    h = f'<p class="kb-hint" data-hint>{hint}</p>' if hint else ''
    return ('<div class="kb-copy"><h1><span class="l">Growth,</span> <em class="accent">engineered.</em></h1>'
            '<p class="lead">AI systems that run the repetitive half of your business.</p>' + ctas() + h + '</div>')

V = [
  dict(id=1, name="Curved arrow from the copy", tag="01 &middot; Recommended",
       sub="One mono line under the buttons says what Venice answers, and a hand-drawn curve leaves it, sweeps down and lands on the laptop's edge exactly at the prompt line. The curve draws itself once, in one direction, when the hero is in view, then stays. Nothing loops. Under reduced motion it is simply there.",
       html=lambda: f'<div class="hs hs-r5 hs-h1" data-arrow>{laptop()}{copy(HINT)}<svg class="kb-arrow" aria-hidden="true"><path class="kb-arrow-path" d=""/><path class="kb-arrow-head" d=""/></svg></div>{DOTS}',
       a="One mono line in the copy: what it answers.", b="A curve from the line to the prompt, drawn once.", c="A 30-line script measures the two boxes and draws the path; redrawn on resize."),
  dict(id=2, name="Coach mark inside the app", tag="02",
       sub="The hint lives where real apps put it: a light tag inside the screen, just above the prompt line, with a pointer to it. It appears after the greeting finishes and leaves the moment the visitor clicks or types. The copy column stays as it is. The illusion holds because the app explains itself the way an app would.",
       html=lambda: f'<div class="hs hs-r5 hs-h2" data-coach>{laptop()}{copy()}</div>{DOTS}',
       a="Copy unchanged.", b="A tag inside the screen: Type here. Ask what we build, what it costs, how fast, or go to services.", c="Shows after the greeting, hides on the first click or key."),
  dict(id=3, name="Text line and a placeholder that asks for you", tag="03",
       sub="No arrow. The copy gets the same mono line, and the prompt line inside the app types example questions to itself, one at a time (what do you build, how much, how fast, go to services), the way a search box suggests. It stops the moment the visitor clicks in. The capabilities are demonstrated in the exact spot they are used.",
       html=lambda: f'<div class="hs hs-r5 hs-h3" data-cycle>{laptop()}{copy(HINT)}</div>{DOTS}',
       a="One mono line in the copy: what it answers.", b="The placeholder types five example questions in turn, 45 ms a character, holds, clears.", c="Stops on focus. Static list under reduced motion."),
]

src = SRC.read_text(encoding="utf-8")
base_css = src[src.index("<style>") + 7: src.index("/* ---- 01 Keeby, maximised ---- */")]
must(len(base_css) > 5000, True, "shell + shared stage css read from the five samples")
home = (SITE / "assets/v7/home.css").read_text(encoding="utf-8")
r5 = home[home.index("/* round 5 (Owner pick from the scale study"):]
must(len(r5) > 1500, True, "round 5 block read from home.css")
r5 = (r5.replace("#p1clone", "#p1").replace("#p1 .kb-hero-r5", ".hero-stage .hs-r5")
        .replace("#p1 .kb-cockpit", ".hero-stage .kb-cockpit").replace("#p1 .kb-menubar", ".hero-stage .kb-menubar"))
must(r5.count("#p1"), 0, "round 5 block rescoped to the stage")

CSS = r"""
/* ---- the stage centres like the real panel ---- */
.hero-stage{display:flex;align-items:center}
.hero-stage .hs{width:100%}
.hero-stage .hs-dots{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);display:flex;align-items:center;gap:22px;font:700 10px var(--mach);letter-spacing:.2em;text-transform:uppercase;color:#616161;pointer-events:none}
.hero-stage .hs-dots i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#AFAFAF;margin-right:9px;vertical-align:1px}
.hero-stage .hs-dots i.on{background:#181818}
/* the hint line, same voice as the site's notes */
.hero-stage .kb-hint{font:400 11px var(--mach);letter-spacing:.14em;text-transform:uppercase;line-height:1.7;color:#616161;margin:26px auto 0;max-width:34ch}
/* ---- 01 curved arrow ---- */
.hs-h1{position:relative}
.hs-h1 .kb-arrow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:3}
.hs-h1 .kb-arrow path{fill:none;stroke:#181818;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.hs-h1 .kb-arrow-path{transition:stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)}
.hs-h1 .kb-arrow-head{opacity:0;transition:opacity .25s ease .75s}
.hs-h1 .kb-arrow.drawn .kb-arrow-head{opacity:1}
/* ---- 02 coach mark ---- */
.hs-h2 .kb-coach{position:relative;align-self:flex-end;margin:0 4px 10px 0;padding:9px 12px;border-radius:8px;background:#E2E2E2;color:#111;font:400 11px/1.5 var(--mach);letter-spacing:.02em;max-width:46ch;opacity:0;transform:translateY(4px);transition:opacity .3s ease,transform .3s ease;pointer-events:none}
.hs-h2 .kb-coach b{font-weight:700}
.hs-h2 .kb-coach::after{content:"";position:absolute;right:14px;bottom:-6px;width:12px;height:12px;background:#E2E2E2;transform:rotate(45deg)}
.hs-h2 .kb-coach.show{opacity:1;transform:none}
/* ---- 03 living placeholder ---- */
.hs-h3 .kb-input::placeholder{color:#8A8A8A}
@media (max-width:1100px){.hs-h1 .kb-arrow{display:none}.hero-stage .kb-hint{max-width:none}}
@media (max-width:860px), (prefers-reduced-motion: reduce){
  .hs-h1 .kb-arrow-path{transition:none}.hs-h1 .kb-arrow-head{transition:none}
  .hs-h2 .kb-coach{transition:none}
  .hero-stage .hs-r5{padding:24px 0 40px}
}
"""

JS = r"""
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* 01: the curve from the hint line to the laptop edge at the prompt line */
  var arrowStage = document.querySelector('[data-arrow]');
  if (arrowStage){
    var svg = arrowStage.querySelector('.kb-arrow'), line = svg.querySelector('.kb-arrow-path'), head = svg.querySelector('.kb-arrow-head');
    var drawn = false;
    function draw(animate){
      if (innerWidth <= 1100) return;
      var st = arrowStage.getBoundingClientRect(), hint = arrowStage.querySelector('[data-hint]').getBoundingClientRect(),
          lap = arrowStage.querySelector('.kb-laptop').getBoundingClientRect(), inp = arrowStage.querySelector('.kb-input').getBoundingClientRect();
      var sx = hint.left - st.left - 12, sy = hint.top - st.top + hint.height / 2;
      var ex = lap.right - st.left + 10, ey = inp.top - st.top + inp.height / 2;
      var c1x = sx - 40, c1y = sy + (ey - sy) * 0.85, c2x = ex + 70, c2y = ey + 2;
      line.setAttribute('d', 'M' + sx + ' ' + sy + ' C' + c1x + ' ' + c1y + ' ' + c2x + ' ' + c2y + ' ' + ex + ' ' + ey);
      head.setAttribute('d', 'M' + (ex + 11) + ' ' + (ey - 7) + ' L' + ex + ' ' + ey + ' L' + (ex + 11) + ' ' + (ey + 7));
      var L = line.getTotalLength();
      line.style.strokeDasharray = L;
      if (animate && !reduce){
        line.style.transition = 'none'; line.style.strokeDashoffset = L; line.getBoundingClientRect();
        line.style.transition = ''; line.style.strokeDashoffset = 0;
      } else { line.style.strokeDashoffset = 0; }
      svg.classList.add('drawn');
      drawn = true;
    }
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting && !drawn){ setTimeout(function(){ draw(true); }, 500); } }); }, { threshold: 0.4 });
    io.observe(arrowStage);
    addEventListener('resize', function(){ if (drawn) draw(false); });
  }
  /* 02: the coach mark above the prompt line, gone on the first click or key */
  var coachStage = document.querySelector('[data-coach]');
  if (coachStage){
    var term = coachStage.querySelector('.kb-term'), prompt = coachStage.querySelector('.kb-prompt');
    var tag = document.createElement('div'); tag.className = 'kb-coach'; tag.setAttribute('aria-hidden', 'true');
    tag.innerHTML = '<b>Type here.</b> Ask what we build, what it costs, how fast, or go to services.';
    term.insertBefore(tag, prompt);
    var shownAt = 0;
    var cio = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting && !shownAt){ shownAt = 1; setTimeout(function(){ tag.classList.add('show'); }, 2600); } }); }, { threshold: 0.4 });
    cio.observe(coachStage);
    function hide(){ tag.classList.remove('show'); }
    coachStage.querySelector('.kb-input').addEventListener('focus', hide);
    term.addEventListener('pointerdown', hide);
    addEventListener('jtl-keydown', hide);
  }
  /* 03: the placeholder asks the questions for you until the visitor clicks in */
  var cycleStage = document.querySelector('[data-cycle]');
  if (cycleStage){
    var input = cycleStage.querySelector('.kb-input');
    var Q = ['what do you build?', 'how much does it cost?', 'how fast can you install?', 'who runs it?', 'go to services'];
    var base = input.getAttribute('placeholder'), stop = false, qi = 0, timer = null;
    if (reduce){ input.setAttribute('placeholder', 'ask what we build, what it costs, how fast, or go to services'); }
    else {
      function typeNext(){
        if (stop) return;
        var q = Q[qi % Q.length]; qi++; var i = 0;
        input.setAttribute('placeholder', '');
        (function tick(){
          if (stop) return;
          i++; input.setAttribute('placeholder', q.slice(0, i));
          if (i < q.length) timer = setTimeout(tick, 45);
          else timer = setTimeout(typeNext, 1600);
        })();
      }
      var pio = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting && !timer){ timer = setTimeout(typeNext, 1800); } }); }, { threshold: 0.4 });
      pio.observe(cycleStage);
      input.addEventListener('focus', function(){ stop = true; clearTimeout(timer); input.setAttribute('placeholder', base); });
    }
  }
})();
"""

variants = ""
for v in V:
    variants += f'''
<!-- ============================ 0{v["id"]} ============================ -->
<section class="variant" id="v{v["id"]}">
  <div class="vhead"><span class="vtag{' rec' if v['id'] == 1 else ''}">{v["tag"]}</span><h2 class="vname">{v["name"]}</h2></div>
  <p class="vsub">{v["sub"]}</p>
  <div class="hero-stage" data-stage="{v["id"]}">{v["html"]()}</div>
  <div class="vfoot"><div><h4>In the copy</h4><p>{v["a"]}</p></div><div><h4>In the app</h4><p>{v["b"]}</p></div><div><h4>Behaviour</h4><p>{v["c"]}</p></div></div>
</section>'''

html = f'''<!DOCTYPE html>
<!-- template: W-28 jtl-page-v6 (register: jtl-mono) -->
<!-- doc shell: qa/hero-v7-proposals.html, the house studies pattern -->
<!-- engine: assets/v7 (term, sound, keys in float mode), the same one index-v7.html runs; hero = round 5 -->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Hero v7: the type-here hint</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Archivo+Expanded:wght@500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,650;1,9..144,650&family=Space+Mono:wght@400;700&display=swap">
<link rel="stylesheet" href="../assets/v7/home.css">
<style>
{base_css}
{r5}
{CSS}
</style>
</head>
<body>
<a class="skip" href="#v1">Skip to the samples</a>
<nav class="rail-nav" aria-label="Samples">
  <a href="#v1" data-r="v1">01</a><a href="#v2" data-r="v2">02</a><a href="#v3" data-r="v3">03</a>
  <a href="#top" class="top" aria-label="Back to top">&#8593;</a>
</nav>
<div class="doc" id="top">
  <p class="kick">jtlgrowth.com &middot; home v7 hero &middot; the type-here hint &middot; 4 sep 2026</p>
  <h1 class="doc-title">Three ways to say <em>you can type here, and here is what it answers.</em></h1>
  <p class="doc-lead">The hero is your pick from the scale study (03: big app left, copy beside). Each stage adds one cue that the laptop is real and lists what Venice answers: what we build, what it costs, how fast, who runs it, and go to any page. The hint only promises what the terminal actually does today. Every stage is live: type in each one. Rail on the left, or press 1 to 3.</p>
</div>
{variants}
<footer class="doc-end">
  <hr class="rule">
  <h2 class="sec">Pick one, or point</h2>
  <p>01 is the recommendation: the curve is the one element on the page that points, and it is drawn once, in one direction. 02 if the app should explain itself with nothing added to the copy. 03 if the prompt line should demonstrate the questions rather than describe them. They combine: 01 plus 03's placeholder is one line to say.</p>
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
    var n = parseInt(e.key, 10); if (n >= 1 && n <= 3) {{ var v = document.getElementById('v' + n); if (v) v.scrollIntoView({{ behavior: reduce.matches ? 'auto' : 'smooth' }}); }}
  }});
  function t(){{ var d = new Date(), s = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); document.querySelectorAll('[data-clock]').forEach(function(e){{ e.textContent = s; }}); }}
  t(); setInterval(t, 30000);
}})();
{JS}
</script>
</body>
</html>
'''
must(html.count('class="variant"'), 3, "variants")
must(html.count("data-float"), 3, "mini keyboards")
must(html.count("data-term"), 3, "terminals")
must(html.count(" data-hint>"), 2, "hint line on 01 and 03")
must(html.count("kb-eyebrow"), 0, "no eyebrow")
must(html.count("Gwen"), 0, "no Gwen in copy")
must(html.count('class="kb-deck"'), 0, "no deck")
must(html.count("—") + html.count("–"), 0, "no dashes")
for bad in ("venice-edit", "data-token"):
    must(html.count(bad), 0, f"{bad} absent")
OUT.write_text(html, encoding="utf-8")
print(f"OK {OUT} {len(html.encode())} B; 3 stages, hint line on 2, 0 eyebrows, 0 Gwen, 0 decks")

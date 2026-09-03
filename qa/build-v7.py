#!/usr/bin/env python3
"""Assemble index-v7.html from the live index.html: new laptop hero (and its loop
clone), two new panels (globe dark, services light), engine constants, input
guards, v7 assets. Every step has a count gate. Exit 1 on any miss."""
import pathlib, re, sys

SITE = pathlib.Path.home() / "Venice/deploys/deploys/jtlgrowth-site"
SRC = SITE / "index.html"
OUT = SITE / "index-v7.html"
html = SRC.read_text(encoding="utf-8")

def must(count, want, what):
    if count != want:
        sys.exit(f"FAIL {what}: want {want}, got {count}")

def sub1(pattern, repl, what, flags=0):
    global html
    html, n = re.subn(pattern, repl, html, count=1, flags=flags)
    must(n, 1, what)

MARK = ('<svg viewBox="288 703 1315 626" aria-hidden="true"><g fill="none" stroke="currentColor" '
        'stroke-width="141.5" stroke-linecap="butt"><path d="M624 774H1267"/>'
        '<path d="M846 706V1122A134.5 134.5 0 0 1 711.5 1256.5H494A134.5 134.5 0 0 1 359.5 1122"/>'
        '<path d="M1195 706V1122A134.5 134.5 0 0 0 1329.5 1256.5H1602"/></g></svg>')
VOL_ON = ('<svg class="kb-ic-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/>'
          '<path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>')
VOL_OFF = ('<svg class="kb-ic-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
           '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/>'
           '<line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>')
EMPLOYEES = ["Lene", "Bingbong", "Venice", "Janitor", "Dex", "Belze", "Bruno", "Vann", "Rain", "Wren", "Amara", "Cael", "Lauren", "Aurel", "Lysander"]

def laptop(static):
    emp = "".join(f'<li><i class="dot"></i>{n}</li>' for n in EMPLOYEES)
    mute = ('<span class="kb-mute" aria-hidden="true">' + VOL_ON + VOL_OFF + '</span>' if static else
            '<button type="button" class="kb-mute" data-mute aria-pressed="true" aria-label="Mute key sounds">' + VOL_ON + VOL_OFF + '</button>')
    term_attr = '' if static else ' data-term'
    prompt = ('<div class="kb-prompt"><span class="kb-prompt-mark" aria-hidden="true">&rsaquo;</span><span class="kb-input kb-input-static"></span></div>' if static else
              '<form class="kb-prompt" data-form autocomplete="off"><span class="kb-prompt-mark" aria-hidden="true">&rsaquo;</span>'
              '<input class="kb-input" data-input type="text" name="q" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" '
              'aria-label="Ask the AI employee" placeholder="ask anything, or type: go to services"></form>')
    click = '' if static else ' data-click'
    chips = "".join(f'<button type="button" class="kb-chip" data-cmd="{c}"{click}>{c}</button>' for c in ["services", "price", "ai employee", "book a call", "help"])
    return f'''<div class="kb-laptop rv d2" data-laptop>
      <div class="kb-lid">
        <div class="kb-screen">
          <div class="kb-menubar"><span class="kb-mb-app">Growth</span><span class="kb-mb-item">File</span><span class="kb-mb-item">Edit</span><span class="kb-mb-item">View</span><span class="kb-mb-spacer"></span>{mute}<span class="kb-mb-clock" data-clock>14:41</span></div>
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
              <div class="kb-term"{term_attr}>
                <div class="kb-log" data-log aria-live="polite"></div>
                {prompt}
                <div class="kb-chips" data-chips>{chips}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="kb-notch" aria-hidden="true"></div>
      </div>
      <div class="kb-base">
        <div class="kb-deck" data-deck aria-hidden="true"></div>
        <div class="kb-trackpad" aria-hidden="true"></div>
      </div>
    </div>'''

def hero(static):
    return f'''<div class="grid-lines"></div>
    <div class="hero-glow"></div>
    <div class="kb-hero">
      {laptop(static)}
      <div class="kb-copy">
        <p class="kb-eyebrow rv d1">AI and automation agency &middot; Caloocan</p>
        <h1 class="rv d2">Growth, <em class="accent">engineered.</em></h1>
        <p class="lead rv d3">AI systems that run the repetitive half of your business.</p>
        <div class="kb-ctas rv d4"><a class="kb-cta" href="https://calendly.com/obmgwenayala/30min" target="_blank" rel="noopener"{'' if static else ' data-click'}>Book the call with Gwen</a><a class="kb-link" href="/ai-employee/"{'' if static else ' data-click'}>See the seven stages <span aria-hidden="true">&#8599;</span></a></div>
        <p class="kb-note rv d5">Or just type in the laptop.</p>
      </div>
    </div>'''

HERO = f'<section class="panel in" id="p1" aria-label="JTL Growth, AI and automation agency">\n    {hero(False)}\n  </section>'
CLONE = f'<section class="panel in panel-clone" id="p1clone" aria-hidden="true" data-static>\n    {hero(True)}\n  </section>'

GLOBE = '''<section class="panel" id="globe" aria-label="Where it runs">
    <div class="inner kb-globe-inner">
      <div class="kb-globe-copy">
        <p class="kb-eyebrow rv d1">Panel three &middot; where it runs</p>
        <h2 class="rv d2">Systems running <em class="accent">around the world.</em></h2>
        <p class="lead rv d3">Every ping is a system doing its job. Cities on record only. Type in the laptop and your own city lights up. Drag the globe to look around.</p>
      </div>
      <div class="kb-globe-stage rv d2">
        <div class="jp-globe" data-globe data-dark="1" data-counter="1"></div>
      </div>
    </div>
  </section>
  '''
CARDS = '''<section id="services" class="kb-cards-page" aria-label="Services, the four tiers plus the proofs">
    <div class="inner kb-cards-inner">
      <p class="kb-eyebrow rv d1">Services &middot; the four tiers, plus the proofs</p>
      <h2 class="rv d2">Each tier only works <em class="accent">because the one under it does.</em></h2>
      <p class="lead rv d3">We install the same four layers we run our own firm on, in the order that makes each one pay for the next. Move your cursor over card three.</p>
      <div class="jp-cards rv d4" data-cards data-layout="grid" data-follow="1"></div>
    </div>
  </section>'''

# ---- hero and clone ----
sub1(r'<section class="panel in" id="p1"[^>]*>.*?</section>', lambda m: HERO, "hero section replaced", re.S)
sub1(r'<section class="panel in panel-clone" id="p1clone"[^>]*>.*?</section>', lambda m: CLONE, "clone section replaced", re.S)
# ---- new panels before contact ----
sub1(r'(<section class="panel" id="p5")', lambda m: GLOBE + m.group(1), "globe and services panels inserted")
# ---- engine constants and guards ----
sub1(r"const LABELS=\['Hero','About','Contact'\];", "const LABELS=['Hero','About','Globe','Contact'];", "LABELS")
sub1(r"const darkPanels=\[\];[^\n]*", "const darkPanels=[2];  // v7: the globe panel is the one dark stop on the home", "darkPanels")
sub1(r"const STOP_VARS=\['--bg-hero','--bg-about','--bg-contact','--bg-hero'\];",
     "const STOP_VARS=['--bg-hero','--bg-about','--bg-globe','--bg-contact','--bg-hero'];", "STOP_VARS")
sub1(r"const HOLD=\{2:0\.7\};", "const HOLD={3:0.7};", "HOLD reindexed")
sub1(r"(function goTo\(i\)\{[^\n]*\n)", lambda m: m.group(1) + "  window.__goTo=goTo; // v7: the laptop terminal slides to panels\n", "goTo exposed")
sub1(r"(addEventListener\('wheel',e=>\{\n)", lambda m: m.group(1) + "    if(e.target&&e.target.closest&&e.target.closest('.kb-term'))return; // v7: the terminal log scrolls itself\n", "wheel guard")
sub1(r"(addEventListener\('keydown',e=>\{\n)", lambda m: m.group(1) + "    if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.kb-term'))return; // v7: typing never slides the page\n", "keydown guard")
# ---- morph stops in both registers ----
sub1(r"--bg-hero:#E2E2E2; --bg-about:#DBDBDB; --bg-contact:#E2E2E2;", "--bg-hero:#E2E2E2; --bg-about:#DBDBDB; --bg-globe:#101010; --bg-contact:#E2E2E2;", "light stops")
sub1(r"--bg-hero:#121212; --bg-about:#171717; --bg-contact:#121212;", "--bg-hero:#121212; --bg-about:#171717; --bg-globe:#101010; --bg-contact:#121212;", "dark stops")
# ---- static mode grounds ----
sub1(r"#p1,#about,#p5\{background:var\(--cement\)\}", "#p1,#about,#p5{background:var(--cement)}\n  #globe{background:#101010}", "static grounds")
# ---- menu sections ----
sub1(r'<a href="#" data-go="2">Contact <span class="mk">03</span></a>',
     '<a href="#" data-go="2">Globe <span class="mk">03</span></a>\n          <a href="#" data-go="3">Contact <span class="mk">04</span></a>', "menu sections")
# ---- head and scripts ----
sub1(r"<title>([^<]*)</title>", lambda m: f"<title>{m.group(1)} &middot; v7 staged</title>", "title")
GLUE = '''<meta name="robots" content="noindex">
<link rel="stylesheet" href="assets/v7/home.css">
<style id="v7-glue">
/* v7 glue: panels stay transparent on desktop so the viewport morph shows through; static mode paints them */
#globe{background:transparent}
@media (max-width:860px), (prefers-reduced-motion: reduce){#globe{background:#101010}}
</style>
</head>'''
sub1(r"</head>", GLUE, "head glue")
SCRIPTS = '''<script src="assets/v7/sound.js"></script>
<script src="assets/v7/keys.js"></script>
<script src="assets/v7/term.js"></script>
<script src="assets/v7/globe.js"></script>
<script>(function(){function t(){var d=new Date(),s=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');document.querySelectorAll('[data-clock]').forEach(function(e){e.textContent=s});}t();setInterval(t,30000);})();</script>
</body>'''
sub1(r"</body>", SCRIPTS, "scripts")
html = html.replace("<!DOCTYPE html>", "<!DOCTYPE html>\n<!-- v7 staged home (2026-09-03): laptop terminal hero, dark globe panel, services cards panel. Built by qa/build-v7.py from index.html; not linked, noindex. -->", 1)

# ---- gates ----
must(len(re.findall(r'<section class="panel(?: in)?" id=', html)), 4, "real panels")
must(html.count('class="panel in panel-clone"'), 1, "clone")
must(html.count("--bg-globe"), 3, "--bg-globe defined in both registers plus STOP_VARS")
p1 = re.search(r'<section class="panel in" id="p1".*?</section>', html, re.S).group(0)
clone = re.search(r'<section class="panel in panel-clone".*?</section>', html, re.S).group(0)
must(p1.count("<input"), 1, "one input in the hero")
must(clone.count("<input"), 0, "no input in the clone")
must(clone.count("data-term"), 0, "clone terminal is inert")
must(html.count("data-globe"), 1, "one globe")
must(html.count("data-cards"), 0, "no card grid on the home")
must(html.count('name="robots" content="noindex"'), 1, "noindex")
for bad in ("venice-edit", "data-token"):
    must(html.count(bad), 0, f"{bad} absent")
for sec in (p1, clone, GLOBE):
    text = re.sub(r"<!--.*?-->", "", sec, flags=re.S)
    must(text.count("—") + text.count("–"), 0, "no dashes in new markup")
wavs = list((SITE / "assets/sounds/gateron-ink-black").glob("*.wav")) + list((SITE / "assets/sounds/click").glob("*.wav"))
must(len(wavs), 12, "12 wav samples")
for w in wavs:
    if w.stat().st_size < 5000:
        sys.exit(f"FAIL {w.name} under 5 KB")
for f in ("home.css", "term.js", "keys.js", "sound.js", "globe.js", "cards.js"):
    p = SITE / "assets/v7" / f
    if not p.is_file() or p.stat().st_size < 1500:
        sys.exit(f"FAIL asset {f} missing or tiny")
OUT.write_text(html, encoding="utf-8")
print(f"OK {OUT} {len(html.encode())} B; panels 4 + clone, stops 5, wavs {len(wavs)}, assets 6")

# ---------------- services page: the card grid replaces the ladder ----------------
SSRC = SITE / "services/index.html"; SOUT = SITE / "services/index-v7.html"
s = SSRC.read_text(encoding="utf-8")
s, n = re.subn(r'<section id="ladder">.*?</section>', lambda m: CARDS, s, count=1, flags=re.S); must(n, 1, "ladder replaced by the cards")
SGLUE = """<meta name="robots" content="noindex">
<link rel="stylesheet" href="/assets/v7/home.css">
<style id="v7-glue">#services .kb-cards-inner{width:min(1240px,90vw);margin:0 auto;max-height:none;overflow:visible;padding:clamp(56px,8vw,110px) 0}#services .kb-eyebrow{margin-bottom:14px}#services h2{margin:0 0 12px}#services .lead{margin:0 0 28px}</style>
</head>"""
s, n = re.subn(r"</head>", SGLUE, s, count=1); must(n, 1, "services head")
s, n = re.subn(r"</body>", '<script src="/assets/v7/cards.js"></script>\n</body>', s, count=1); must(n, 1, "services script")
s, n = re.subn(r"<title>([^<]*)</title>", lambda m: f"<title>{m.group(1)} &middot; v7 staged</title>", s, count=1); must(n, 1, "services title")
must(s.count("data-cards"), 1, "one card grid on services")
must(s.count('id="ladder"'), 0, "ladder gone")
must(s.count('name="robots" content="noindex"'), 1, "services noindex")
for bad in ("venice-edit", "data-token"): must(s.count(bad), 0, f"{bad} absent from services")
SOUT.write_text(s, encoding="utf-8")
print(f"OK {SOUT} {len(s.encode())} B; cards 1, ladder 0")

#!/usr/bin/env python3
"""Draws the animated SVGs on github.com/jtlgrowth. Stdlib only, no network for `static`.

  python3 .github/profile/build.py static [--out .github/profile]   header, keys, toolkit (committed to main)
  python3 .github/profile/build.py stats  --out dist                 the log card (nightly, needs GH_TOKEN)

Every image comes in a dark and a light variant; the README picks one with
<picture> and prefers-color-scheme. Animation is CSS inside the SVG, so it runs
in an <img> with no script. prefers-reduced-motion jumps to the final frame.
"""
import argparse
import datetime as dt
import json
import os
import pathlib
import urllib.request
from xml.sax.saxutils import escape

HERE = pathlib.Path(__file__).resolve().parent
USER = "jtlgrowth"

THEMES = {
    "dark": dict(bg="#101010", ink="#E2E2E2", mark="#FCFCFC", mute="#8A8A8A", faint="#333333",
                 line="#2A2A2A", face="#1C1C1C", edge="#3A3A3A", base="#000000", glow=0.30, sweep=0.95),
    "light": dict(bg="#E2E2E2", ink="#121212", mark="#121212", mute="#5E5E5E", faint="#BDBDBD",
                  line="#C8C8C8", face="#FCFCFC", edge="#121212", base="#121212", glow=0.07, sweep=0.22),
}
SANS = "'Archivo',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
MONO = "'Space Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"
REDUCED = ("@media (prefers-reduced-motion:reduce){*{animation-duration:1ms!important;"
           "animation-delay:0s!important;animation-iteration-count:1!important}}")

# The homepage boot mark (index.html #boot .bt-mark), same paths and stroke.
MARK_BOX = (288, 703, 1315, 626)
MARK_PATHS = [  # (d, draw start s, draw end s)
    ("M846 706V1122A134.5 134.5 0 0 1 711.5 1256.5H494A134.5 134.5 0 0 1 359.5 1122", 0.15, 1.05),
    ("M1195 706V1122A134.5 134.5 0 0 0 1329.5 1256.5H1602", 0.35, 1.25),
    ("M624 774H1267", 0.85, 1.40),
]
SEATS = 27  # index.html SEATS, and "27 AI seats" on the homepage

TYPED = [
    "Systems that turn leads into revenue.",
    "Funnels. Automation. AI employees. Ops portals.",
    "Two people. 27 AI seats. One firm.",
    "You name the outcome. We quote the build.",
]

KEYS = [  # file stem, legend; the README wraps each in its link
    ("key-site", "JTLGROWTH.COM"),
    ("key-book", "BOOK A CALL"),
    ("key-email", "HELLO@JTLGROWTH.COM"),
    ("key-linkedin", "LINKEDIN"),
    ("key-founder", "MEET THE FOUNDER"),
]
TOOLKIT = [["CLAUDE", "GPT-5", "N8N", "GOHIGHLEVEL"], ["SUPABASE", "FASTAPI", "PLAYWRIGHT"]]

ARROW = "M7 17 17 7M7 7h10v10"  # lucide arrow-up-right, 24 grid


def svg(w, h, label, style, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'role="img" aria-label="{escape(label)}"><title>{escape(label)}</title>'
            f"<style>{style}{REDUCED}</style>{body}</svg>\n")


def mono_w(text, size, track=0.0):
    """Width of a monospace run; every text that animates against it is pinned with textLength."""
    return len(text) * (0.6 * size + track)


def pct(t, total):
    return f"{max(0.0, min(100.0, t / total * 100)):.3f}%"


# ---------------------------------------------------------------- header

def header(th):
    W, H = 1280, 440
    c = THEMES[th]
    css = [
        f".hud{{font:400 17px/1 {MONO};letter-spacing:3px;fill:{c['mute']};opacity:0;animation:in .6s ease .1s forwards}}",
        f".cap{{font:700 18px/1 {MONO};letter-spacing:3.6px;fill:{c['mute']}}}",
        f".typed{{font:400 24px/1 {MONO};fill:{c['ink']}}}",
        f".prompt{{font:400 24px/1 {MONO};fill:{c['mute']}}}",
        "@keyframes in{to{opacity:1}}",
        "@keyframes draw{to{stroke-dashoffset:0}}",
        f"@keyframes lit{{to{{fill:{c['ink']}}}}}",
        f"@keyframes halo{{to{{opacity:{c['glow']}}}}}",
        f"@keyframes sweep{{0%,100%{{opacity:{c['glow']}}}5%{{opacity:{c['sweep']}}}12%{{opacity:{c['glow']}}}}}",
        "@keyframes win{0%,99.99%{opacity:1}100%{opacity:0}}",
        "@keyframes hold{to{opacity:1}}",
        "@keyframes out{to{opacity:0}}",
        "@keyframes blink{50%{opacity:0}}",
    ]
    b = [f'<rect width="{W}" height="{H}" fill="{c["bg"]}"/>',
         f'<text class="hud" x="48" y="58">JTL GROWTH</text>',
         f'<text class="hud" x="{W - 48}" y="58" text-anchor="end">REVENUE INFRASTRUCTURE</text>']

    # the mark draws in
    mx, my, mw, mh = MARK_BOX
    s = 300 / mw
    tx, ty = W / 2 - (mx + mw / 2) * s, 160 - (my + mh / 2) * s
    b.append(f'<g transform="translate({tx:.2f} {ty:.2f}) scale({s:.5f})" fill="none" '
             f'stroke="{c["mark"]}" stroke-width="141.5" stroke-linecap="butt">')
    for d, t0, t1 in MARK_PATHS:
        b.append(f'<path d="{d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" '
                 f'style="animation:draw {t1 - t0:.2f}s cubic-bezier(.65,0,.35,1) {t0:.2f}s forwards"/>')
    b.append("</g>")

    # 27 seats clock in, then a light passes along the row every 7 s
    gap, y, t_first, step = 18, 272, 1.30, 0.055
    x0 = W / 2 - (SEATS - 1) * gap / 2
    b.append('<defs><filter id="soft" x="-1" y="-1" width="3" height="3">'
             '<feGaussianBlur stdDeviation="3.2"/></filter></defs>')
    halos, dots = [], []
    for i in range(SEATS):
        x, t = x0 + i * gap, t_first + i * step
        halos.append(f'<circle cx="{x:.1f}" cy="{y}" r="7" fill="{c["ink"]}" opacity="0" '
                     f'style="animation:halo .35s ease {t:.3f}s forwards,sweep 7s ease-in-out {3.6 + i * 0.045:.3f}s infinite"/>')
        dots.append(f'<circle cx="{x:.1f}" cy="{y}" r="4.5" fill="{c["faint"]}" '
                    f'style="animation:lit .35s ease {t:.3f}s forwards"/>')
    b.append(f'<g filter="url(#soft)">{"".join(halos)}</g>{"".join(dots)}')

    # CLOCKING IN n% counts with the seats, then gives way to the payoff line
    cap_y = 318
    t_done = t_first + (SEATS - 1) * step
    longest = "CLOCKING IN 100%"
    cap_x = W / 2 - mono_w(longest, 18, 3.6) / 2
    for i in range(SEATS + 1):
        n = round(i / SEATS * 100)
        t = t_first + (i - 1) * step if i else 0.0
        if i < SEATS:
            dur = step if i else t_first
            anim = f"win {dur:.3f}s linear {t:.3f}s"
        else:
            anim = f"hold .01s linear {t:.3f}s forwards,out .4s ease {t_done + 0.9:.3f}s forwards"
        b.append(f'<text class="cap" x="{cap_x:.1f}" y="{cap_y}" opacity="0" style="animation:{anim}">CLOCKING IN {n}%</text>')
    b.append(f'<text class="cap" x="{W / 2}" y="{cap_y}" text-anchor="middle" opacity="0" '
             f'style="animation:in .5s ease {t_done + 1.3:.3f}s forwards">ALL 27 SEATS CLOCKED IN</text>')

    b.append(f'<line x1="48" x2="{W - 48}" y1="356" y2="356" stroke="{c["line"]}" stroke-width="1"/>')
    b.append(typed_lines(c, W, base_y=404, start=t_done + 1.2, css=css))
    # reduced motion: the loop is frozen off, so the first line stands still instead
    css.append("@media (prefers-reduced-motion:reduce){.still{opacity:1}}")
    b.append(f'<text class="typed still" x="{W / 2}" y="404" text-anchor="middle" opacity="0">{escape(TYPED[0])}</text>')
    label = ("JTL Growth. The JTL mark draws in while 27 AI seats clock in, then a line types: "
             + " ".join(TYPED))
    return svg(W, H, label, "".join(css), "".join(b))


def typed_lines(c, W, base_y, start, css):
    """Terminal line under the header: each sentence types, holds, deletes; the cycle loops."""
    size, cw = 24, 0.6 * 24
    per_char, hold, per_del, gap = 0.045, 1.9, 0.018, 0.35
    spans = []
    for line in TYPED:
        n = len(line)
        spans.append((line, n, n * per_char, n * per_del))
    total = sum(ty + hold + de + gap for _, _, ty, de in spans)
    prompt_w = mono_w("> ", size)
    out, t = [], 0.0
    for k, (line, n, ty, de) in enumerate(spans):
        w = n * cw
        x = W / 2 - (w + prompt_w) / 2 + prompt_w
        p0, p1, p2, p3 = t, t + ty, t + ty + hold, t + ty + hold + de
        eps = 0.02
        pre = f"{pct(p0 - eps, total)}{{opacity:0}}" if p0 > eps else ""
        css.append(
            f"@keyframes g{k}{{0%{{opacity:0}}{pre}{pct(p0, total)}{{opacity:1}}"
            f"{pct(p3, total)}{{opacity:1}}{pct(p3 + eps, total)}{{opacity:0}}100%{{opacity:0}}}}")
        css.append(
            f"@keyframes m{k}{{0%{{transform:translateX(0)}}"
            f"{pct(p0, total)}{{transform:translateX(0);animation-timing-function:steps({n},end)}}"
            f"{pct(p1, total)}{{transform:translateX({w:.1f}px)}}"
            f"{pct(p2, total)}{{transform:translateX({w:.1f}px);animation-timing-function:steps({n},end)}}"
            f"{pct(p3, total)}{{transform:translateX(0)}}100%{{transform:translateX(0)}}}}")
        anim = f"{total:.3f}s linear {start:.3f}s infinite"
        out.append(
            f'<g opacity="0" style="animation:g{k} {anim}">'
            f'<text class="prompt" x="{x - prompt_w:.1f}" y="{base_y}">&gt;</text>'
            f'<text class="typed" x="{x:.1f}" y="{base_y}" textLength="{w:.1f}" lengthAdjust="spacingAndGlyphs">{escape(line)}</text>'
            f'<rect x="{x - 1:.1f}" y="{base_y - 28}" width="{w + 40:.1f}" height="40" fill="{c["bg"]}" style="animation:m{k} {anim}"/>'
            f'<g style="animation:m{k} {anim}"><rect x="{x:.1f}" y="{base_y - 22}" width="13" height="27" fill="{c["ink"]}" '
            f'style="animation:blink 1.06s steps(1) infinite"/></g></g>')
        t = p3 + gap
    return "".join(out)


# ---------------------------------------------------------------- keycaps

def keycap(x, y, w, h, legend, c, size=17, track=1.5, arrow=False, press=None):
    """One key: a base slab and a face that sits 5px above it. `press` = CSS animation for the face."""
    tw = mono_w(legend, size, track)
    face_style = f' style="animation:{press}"' if press else ""
    aw = 16 if arrow else 0
    lx = x + (w - tw - (aw + 10 if arrow else 0)) / 2
    parts = [f'<rect x="{x + 1}" y="{y + 6}" width="{w - 2}" height="{h - 6}" rx="7" fill="{c["base"]}"/>',
             f'<g{face_style}><rect x="{x + 0.75}" y="{y + 0.75}" width="{w - 1.5}" height="{h - 7.5}" rx="7" '
             f'fill="{c["face"]}" stroke="{c["edge"]}" stroke-width="1.5"/>',
             f'<text x="{lx:.1f}" y="{y + (h - 6) / 2 + size * 0.36:.1f}" textLength="{tw:.1f}" lengthAdjust="spacingAndGlyphs" '
             f'style="font:700 {size}px/1 {MONO};letter-spacing:{track}px;fill:{c["ink"]}">{escape(legend)}</text>']
    if arrow:
        ax, ay = lx + tw + 10, y + (h - 6) / 2 - aw / 2
        parts.append(f'<path d="{ARROW}" transform="translate({ax:.1f} {ay:.1f}) scale({aw / 24:.4f})" fill="none" '
                     f'stroke="{c["ink"]}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>')
    parts.append("</g>")
    return "".join(parts)


def key_file(th, legend, idx):
    c = THEMES[th]
    size, track = 17, 1.5
    w = round(mono_w(legend, size, track) + 26 + 64)
    h = 62
    css = ("@keyframes press{0%,100%{transform:translateY(0)}40%{transform:translateY(4px)}}")
    face = f"press .34s ease {0.35 + idx * 0.16:.2f}s 1"
    return svg(w, h, legend.lower().capitalize(), css, keycap(0, 0, w, h, legend, c, size, track, arrow=True, press=face))


def toolkit(th):
    c = THEMES[th]
    size, track, h, gap, W = 17, 1.5, 62, 14, 900
    css = ["@keyframes wave{0%,100%{transform:translateY(0)}2.5%{transform:translateY(4px)}5%{transform:translateY(0)}}"]
    body, k = [], 0
    for r, row in enumerate(TOOLKIT):
        widths = [round(mono_w(t, size, track) + 48) for t in row]
        x = (W - (sum(widths) + gap * (len(row) - 1))) / 2
        for t, w in zip(row, widths):
            press = f"wave 8s ease {0.6 + k * 0.12:.2f}s infinite"
            body.append(keycap(round(x), r * (h + gap), w, h, t, c, size, track, press=press))
            x += w + gap
            k += 1
    H = len(TOOLKIT) * h + (len(TOOLKIT) - 1) * gap
    label = "Toolkit: " + ", ".join(t.title() for row in TOOLKIT for t in row)
    return svg(W, H, label, "".join(css), "".join(body))


# ---------------------------------------------------------------- the log (nightly)

def fetch_calendar(token):
    q = ('{user(login:"%s"){repositories(privacy:PUBLIC,isFork:false){totalCount}'
         'contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}') % USER
    req = urllib.request.Request("https://api.github.com/graphql", data=json.dumps({"query": q}).encode(),
                                 headers={"Authorization": f"bearer {token}", "User-Agent": "jtlgrowth-profile"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    if "errors" in data:
        raise SystemExit(f"graphql: {data['errors']}")
    u = data["data"]["user"]
    cal = u["contributionsCollection"]["contributionCalendar"]
    days = [d["contributionCount"] for w in cal["weeks"] for d in w["contributionDays"]]
    return dict(total=cal["totalContributions"], days=days, repos=u["repositories"]["totalCount"])


def streaks(days):
    """Current streak counts through yesterday when today has nothing yet; longest is within the window."""
    seq = days[:-1] if days and days[-1] == 0 else days
    cur = 0
    for n in reversed(seq):
        if not n:
            break
        cur += 1
    best = run = 0
    for n in days:
        run = run + 1 if n else 0
        best = max(best, run)
    return cur, best


def log_card(th, stats, today):
    c = THEMES[th]
    W, H = 900, 176
    cur, best = streaks(stats["days"])
    tiles = [(f"{stats['total']:,}", "CONTRIBUTIONS"), (str(cur), "DAY STREAK"),
             (str(best), "LONGEST STREAK"), (str(stats["repos"]), "PUBLIC REPOS")]
    css = ["@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}"]
    gap = 14
    tw = (W - gap * 3) / 4
    body = []
    for i, (num, lab) in enumerate(tiles):
        x = i * (tw + gap)
        body.append(f'<g style="opacity:0;animation:up .5s cubic-bezier(.2,.7,.2,1) {0.15 + i * 0.12:.2f}s forwards">'
                    f'<rect x="{x + 0.75:.1f}" y="0.75" width="{tw - 1.5:.1f}" height="138" fill="{c["bg"]}" stroke="{c["line"]}" stroke-width="1.5"/>'
                    f'<text x="{x + 22:.1f}" y="76" style="font:700 46px/1 {SANS};letter-spacing:-1px;fill:{c["ink"]}">{escape(num)}</text>'
                    f'<text x="{x + 22:.1f}" y="112" style="font:400 13px/1 {MONO};letter-spacing:1.6px;fill:{c["mute"]}">{lab}</text></g>')
    body.append(f'<text x="0" y="168" style="font:400 12px/1 {MONO};letter-spacing:1.4px;fill:{c["mute"]}">'
                f'PAST 12 MONTHS · REFRESHED {today} BY .github/workflows/profile.yml</text>')
    label = (f"The log: {stats['total']:,} contributions in the last 12 months, a {cur}-day streak, "
             f"longest streak {best} days, {stats['repos']} public repos. Refreshed {today}.")
    return svg(W, H, label, "".join(css), "".join(body))


# ---------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("what", choices=["static", "stats"])
    ap.add_argument("--out", default=str(HERE))
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    written = []

    def put(name, text):
        (out / name).write_text(text)
        written.append(name)

    if a.what == "static":
        for th in THEMES:
            put(f"header-{th}.svg", header(th))
            put(f"toolkit-{th}.svg", toolkit(th))
            for i, (stem, legend) in enumerate(KEYS):
                put(f"{stem}-{th}.svg", key_file(th, legend, i % 4))
    else:
        token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
        if not token:
            raise SystemExit("stats needs GH_TOKEN")
        stats = fetch_calendar(token)
        today = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).strftime("%Y-%m-%d")
        for th in THEMES:
            put(f"log-{th}.svg", log_card(th, stats, today))
    print(f"wrote {len(written)} files to {out}: {', '.join(written)}")


if __name__ == "__main__":
    main()

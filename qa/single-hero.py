#!/usr/bin/env python3
"""Fold a qa/hero-v7-*.html study into one file for Drop Here: home.css, the three engines and the
wav samples inlined, site links pointed at jtlgrowth.com.
usage: python3 qa/single-hero.py hero-v7-scale.html jtl-hero-scale.html"""
import base64, pathlib, re, sys
SITE = pathlib.Path.home() / "Venice/deploys/deploys/jtlgrowth-site"
src, dst = sys.argv[1], sys.argv[2]
OUT = pathlib.Path.home() / "Desktop/Drop Here (auto-sorts 6am)" / dst
h = (SITE / "qa" / src).read_text()
css = (SITE / "assets/v7/home.css").read_text()
h, n = re.subn(r'<link rel="stylesheet" href="\.\./assets/v7/home\.css">', lambda m: "<style>" + css + "</style>", h); assert n == 1
wavs = {}
for p in sorted((SITE / "assets/sounds").rglob("*.wav")):
    wavs[str(p.relative_to(SITE / "assets/sounds"))] = "data:audio/wav;base64," + base64.b64encode(p.read_bytes()).decode()
assert len(wavs) == 12, len(wavs)
for f in ("sound", "keys", "term"):
    js = (SITE / f"assets/v7/{f}.js").read_text()
    if f == "sound":
        js = js.replace("var BASE = (document.currentScript && document.currentScript.getAttribute('data-base')) || 'assets/sounds/';",
                        "var BASE = ''; var INLINE = " + repr(wavs).replace("'", '"') + ";")
        js = js.replace("fetch(BASE + f)", "fetch(INLINE[f] || (BASE + f))")
        assert "INLINE[f]" in js
    h, n = re.subn(rf'<script src="\.\./assets/v7/{f}\.js"[^>]*></script>', lambda m: "<script>" + js.replace("</script>", "<\\/script>") + "</script>", h); assert n == 1, f
h = h.replace('href="/ai-employee/"', 'href="https://jtlgrowth.com/ai-employee/"')
assert "../assets/" not in h
OUT.write_text(h)
size = len(h.encode())
assert size > 150_000, size
print(f"OK {OUT} {size} B")

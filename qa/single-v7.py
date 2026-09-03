#!/usr/bin/env python3
"""Fold index-v7.html into one file for Drop Here: v7 css/js inlined, wavs as data URIs,
site assets pointed at jtlgrowth.com. Byte gates on every fold."""
import base64, pathlib, re, sys
SITE = pathlib.Path.home() / "Venice/deploys/deploys/jtlgrowth-site"
OUT = pathlib.Path.home() / "Desktop/Drop Here (auto-sorts 6am)/jtl-home-v7.html"
h = (SITE / "index-v7.html").read_text()
css = (SITE / "assets/v7/home.css").read_text()
h, n = re.subn(r'<link rel="stylesheet" href="assets/v7/home.css">', lambda m: "<style>" + css + "</style>", h); assert n == 1
for f in ("sound", "keys", "term", "globe", "cards"):
    js = (SITE / f"assets/v7/{f}.js").read_text()
    if f == "sound":
        # samples become data URIs in a map the engine reads through fetch (data: URLs fetch fine)
        wavs = {}
        for p in sorted((SITE / "assets/sounds").rglob("*.wav")):
            wavs[str(p.relative_to(SITE / "assets/sounds"))] = "data:audio/wav;base64," + base64.b64encode(p.read_bytes()).decode()
        assert len(wavs) == 12, len(wavs)
        js = js.replace("var BASE = (document.currentScript && document.currentScript.getAttribute('data-base')) || 'assets/sounds/';",
                        "var BASE = ''; var INLINE = " + repr(wavs).replace("'", '"') + ";")
        js = js.replace("fetch(BASE + f)", "fetch(INLINE[f] || (BASE + f))")
        assert "INLINE[f]" in js
    h, n = re.subn(rf'<script src="assets/v7/{f}\.js"></script>', lambda m: "<script>" + js.replace("</script>", "<\\/script>") + "</script>", h); assert n == (0 if f == "cards" else 1), f
h = h.replace('href="assets/', 'href="https://jtlgrowth.com/assets/').replace('src="assets/', 'src="https://jtlgrowth.com/assets/').replace("src=\"/assets/", "src=\"https://jtlgrowth.com/assets/")
h = h.replace('href="/', 'href="https://jtlgrowth.com/')
assert "assets/v7/" not in h, "v7 asset link survived"
OUT.write_text(h)
size = len(h.encode())
assert size > 200_000, size
print(f"OK {OUT} {size} B")

# services single
S = (SITE / "services/index-v7.html").read_text()
S, n = re.subn(r'<link rel="stylesheet" href="/assets/v7/home.css">', lambda m: "<style>" + css + "</style>", S); assert n == 1
cj = (SITE / "assets/v7/cards.js").read_text()
S, n = re.subn(r'<script src="/assets/v7/cards.js"></script>', lambda m: "<script>" + cj.replace("</script>", "<\\/script>") + "</script>", S); assert n == 1
S = S.replace('href="/assets/', 'href="https://jtlgrowth.com/assets/').replace('src="/assets/', 'src="https://jtlgrowth.com/assets/').replace('href="assets/', 'href="https://jtlgrowth.com/assets/').replace('src="assets/', 'src="https://jtlgrowth.com/assets/').replace('href="/', 'href="https://jtlgrowth.com/')
assert "assets/v7/" not in S
SOUT2 = OUT.parent / "jtl-services-v7.html"; SOUT2.write_text(S)
print(f"OK {SOUT2} {len(S.encode())} B")

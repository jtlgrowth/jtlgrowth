#!/usr/bin/env python3
"""Promote the staged v7 pages into the live paths (Owner, 2026-09-04, Soren PROCEED, council waived):
index-v7.html -> index.html, services/index-v7.html -> services/index.html. Strips the three staging
marks (noindex meta, "v7 staged" title suffix, the header comment) with count gates, then removes the
staged files. Exit 1 on any miss; nothing is written until every gate passes."""
import pathlib, re, sys

SITE = pathlib.Path.home() / "Venice/deploys/deploys/jtlgrowth-site"

def must(count, want, what):
    if count != want:
        sys.exit(f"FAIL {what}: want {want}, got {count}")

def promote(src, dst, hero_gate):
    h = src.read_text(encoding="utf-8")
    h, n = re.subn(r'<meta name="robots" content="noindex">\n', "", h, count=1); must(n, 1, f"{src.name}: noindex meta removed")
    h, n = re.subn(r" &middot; v7 staged</title>", "</title>", h, count=1); must(n, 1, f"{src.name}: staged title suffix removed")
    h, n = re.subn(r"\n<!-- v7 staged home[^\n]*-->", "", h, count=1)
    if dst == "index.html": must(n, 1, "home: staged header comment removed")
    must(h.count("noindex"), 0, f"{dst}: no noindex anywhere")
    must(h.count("v7 staged"), 0, f"{dst}: no staged marker anywhere")
    for sel, want in hero_gate: must(h.count(sel), want, f"{dst}: {sel} x{want}")
    for bad in ("venice-edit", "data-token"): must(h.count(bad), 0, f"{dst}: {bad} absent")
    # dashes: tools/emdash/emdash.py is the only checker (run after promotion); the pre-v7 page carries en dashes inside script text
    return h

home = promote(SITE / "index-v7.html", "index.html", [('class="kb-hero kb-hero-r5"', 2), ("data-arrow", 2), ('class="kb-mini"', 2), ("data-globe", 1), ("assets/v7/hint.js", 1), ("--bg-globe", 3)])
services = promote(SITE / "services/index-v7.html", "services/index.html", [("data-cards", 1), ('id="ladder"', 0), ("/assets/v7/cards.js", 1)])
old_home = (SITE / "index.html").read_text(encoding="utf-8")
must(old_home.count("kb-hero-r5"), 0, "live index.html is still the old hero before the swap")
for f in ("assets/v7/hint.js", "assets/vendor/cobe-0.6.3.esm.js", "assets/vendor/phenomenon-1.6.0.esm.js"):
    if not (SITE / f).is_file(): sys.exit(f"FAIL {f} missing")
wavs = list((SITE / "assets/sounds").rglob("*.wav")); must(len(wavs), 12, "12 wav samples")
(SITE / "index.html").write_text(home, encoding="utf-8")
(SITE / "services/index.html").write_text(services, encoding="utf-8")
(SITE / "index-v7.html").unlink(); (SITE / "services/index-v7.html").unlink()
print(f"OK index.html {len(home.encode())} B, services/index.html {len(services.encode())} B; staged files removed; noindex 0, staged 0")

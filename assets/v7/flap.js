/* v7 flap: split-flap preloader. A 6 x 22 board (the Vestaboard shape) flips
   every tile through letters, symbols and digits; the nine word tiles lock on
   J T L / G R O W T H between 0.9 and 1.2 s; a grey ring forms around the word,
   dims to charcoal, and a slow diagonal ripple keeps the blank field alive until
   the page is ready. Then the board slides left, same contract as the old #boot
   (sessionStorage 'jtlboot', node removed 700 ms after .off).
   Measured from the reel Jamz sent 2026-09-22 (Vestaboard intro: letters to
   2.0 s, symbols to 3.3 s, digits to 4.3 s, colour chips to 5.0 s); compressed to
   3.4 s because of the 2026-09-07 reader finding (a 2.4 s logo screen read as
   "loading" and nobody named the business). The word is the mark here.
   Sound: silent until the first pointerdown, keydown or wheel anywhere, then a
   clatter of the site's own Gateron samples through JTLSound.keyDown. Escape or
   the skip button dismisses; no gesture ever both unmutes and dismisses.
   Reduced motion: final frame at once, 0.4 s fade (flap.css). */
(function () {
  'use strict';
  try { if (sessionStorage.getItem('jtlboot')) return; } catch (e) {}

  var ROWS = 6, COLS = 22;
  var WORDS = [{ row: 2, col: 9, text: 'JTL' }, { row: 3, col: 8, text: 'GROWTH' }];
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var SYMBOLS = '!@#$%&?*+=:;/.-';
  var DIGITS = '0123456789';
  var T = { symbols: 1200, digits: 2000, chips: 2600, blank: 3200, min: 3400, cap: 4600, rippleEvery: 1800, rippleLen: 900 };
  var C = { face: '#161616', faceWord: '#1E1E1E', gutter: '#0A0A0A', glyph: '#C9C9C9', glyphWord: '#FFFFFF', chipA: '#E2E2E2', chipB: '#9E9E9E', chipDim: '#2A2A2A' };
  var BASE_FLIP = 83; /* ms per flip, ~12 flips a second like the reel */
  var KEYS = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'];

  /* ---- DOM ---- */
  var root = document.createElement('div');
  root.id = 'boot';
  root.innerHTML = '<canvas aria-hidden="true"></canvas><span class="flap-sr" role="status">JTL Growth</span><button class="flap-skip" type="button" aria-label="Skip intro">skip</button>';
  document.body.appendChild(root);
  var cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
  var skipBtn = root.querySelector('.flap-skip');

  /* ---- state ---- */
  var tiles = [], wordSet = {}, haloSet = {};
  var S = { phase: 'letters', t: 0, soundOn: false, plays: 0, done: false, reduced: false, loaded: false, ripples: 0, workMs: 0 };
  WORDS.forEach(function (w) {
    for (var i = 0; i < w.text.length; i++) wordSet[w.row + ',' + (w.col + i)] = w.text[i];
  });
  Object.keys(wordSet).forEach(function (k) {
    var rc = k.split(',').map(Number);
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      var kk = (rc[0] + dr) + ',' + (rc[1] + dc);
      if (!wordSet[kk] && rc[0] + dr >= 0 && rc[0] + dr < ROWS && rc[1] + dc >= 0 && rc[1] + dc < COLS) haloSet[kk] = true;
    }
  });
  var wordIndex = 0;
  for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
    var k = r + ',' + c, target = wordSet[k] || null;
    var tile = { r: r, c: c, ch: 'A', next: 'B', p: Math.random(), dur: BASE_FLIP * (0.92 + Math.random() * 0.16), locked: false, target: target, halo: !!haloSet[k], chip: null, rippleAt: -1, rp: 1 };
    if (target) {
      /* land on the target between 0.9 and 1.2 s, left to right, by picking the start letter */
      var lockAt = 900 + wordIndex * 35, d = 9 + Math.floor(Math.random() * 5);
      var ti = LETTERS.indexOf(target), si = (ti - d + 26 * 2) % 26;
      tile.ch = LETTERS[si]; tile.next = LETTERS[(si + 1) % 26]; tile.p = 0; tile.dur = lockAt / d;
      tile.lockAt = lockAt; wordIndex++;
    }
    tiles.push(tile);
  }

  function nextChar(ch, phase) {
    var i;
    if (phase === 'letters') { i = LETTERS.indexOf(ch); return LETTERS[(i + 1) % 26]; }
    if (phase === 'symbols') { i = SYMBOLS.indexOf(ch); return i < 0 ? SYMBOLS[0] : SYMBOLS[(i + 1) % SYMBOLS.length]; }
    if (phase === 'digits') { i = DIGITS.indexOf(ch); return i < 0 ? DIGITS[0] : DIGITS[(i + 1) % 10]; }
    return '';
  }

  /* ---- layout ---- */
  var unit = 20, gap = 2, tileH = 27, ox = 0, oy = 0, W = 0, H = 0, dpr = 1;
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var vw = root.clientWidth, vh = root.clientHeight;
    var g = 0.1;
    var byW = (vw * 0.92) / (COLS + (COLS + 1) * g);
    var byH = (vh * 0.64) / (ROWS * 4 / 3 + (ROWS + 1) * g * 4 / 3);
    unit = Math.max(8, Math.min(byW, byH, 44));
    gap = unit * g; tileH = unit * 4 / 3;
    W = COLS * unit + (COLS + 1) * gap; H = ROWS * tileH + (ROWS + 1) * gap;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ox = gap; oy = gap;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '700 ' + Math.round(tileH * 0.6) + 'px "Archivo Expanded", Archivo, "Space Mono", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  }
  layout();
  addEventListener('resize', layout);

  /* ---- drawing ---- */
  function faceColor(tile) {
    if (tile.chip) return tile.chip;
    return tile.locked ? C.faceWord : C.face;
  }
  function drawHalf(tile, x, y, ch, chip, top, shade) {
    /* one half of a tile: face + glyph, clipped to the half */
    var hy = top ? y : y + tileH / 2, hh = tileH / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, hy, unit, hh); ctx.clip();
    ctx.fillStyle = chip || (tile.locked ? C.faceWord : C.face);
    ctx.fillRect(x, y, unit, tileH);
    if (ch && !chip) {
      ctx.fillStyle = tile.locked ? C.glyphWord : C.glyph;
      ctx.fillText(ch, x + unit / 2, y + tileH / 2 + tileH * 0.04);
    }
    if (shade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + shade.toFixed(3) + ')'; ctx.fillRect(x, hy, unit, hh); }
    ctx.restore();
  }
  function drawTile(tile) {
    var x = ox + tile.c * (unit + gap), y = oy + tile.r * (tileH + gap), mid = y + tileH / 2;
    var p = tile.p, flipping = p > 0 && p < 1 && !tile.locked && tile.rp >= 1;
    var rippling = tile.rp < 1;
    if (!flipping && !rippling) {
      drawHalf(tile, x, y, tile.ch, tile.chip, true, 0);
      drawHalf(tile, x, y, tile.ch, tile.chip, false, 0);
    } else if (rippling) {
      /* blank-to-blank shading pass: the flap falls and rises with no glyph change */
      var q = tile.rp, s = q < 0.5 ? 1 - q * 2 : q * 2 - 1;
      drawHalf(tile, x, y, tile.ch, tile.chip, true, q < 0.5 ? 0 : 0.18 * (1 - s));
      drawHalf(tile, x, y, tile.ch, tile.chip, false, 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, q < 0.5 ? y : mid, unit, tileH / 2); ctx.clip();
      ctx.translate(0, mid); ctx.scale(1, Math.max(s, 0.02)); ctx.translate(0, -mid);
      drawHalf(tile, x, y, tile.ch, tile.chip, q < 0.5, 0.35 * (1 - s));
      ctx.restore();
    } else {
      var cur = tile.ch, nxt = tile.next, curChip = tile.chip, nxtChip = tile.nextChip || null;
      if (p < 0.5) {
        /* top flap of the current glyph falls over the hinge, revealing the next glyph's top */
        var s1 = 1 - p * 2;
        drawHalf(tile, x, y, nxt, nxtChip, true, 0.12);
        drawHalf(tile, x, y, cur, curChip, false, 0);
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, unit, tileH / 2); ctx.clip();
        ctx.translate(0, mid); ctx.scale(1, Math.max(s1, 0.02)); ctx.translate(0, -mid);
        drawHalf(tile, x, y, cur, curChip, true, 0.45 * (1 - s1));
        ctx.restore();
      } else {
        /* the same flap keeps falling and grows as the next glyph's bottom half */
        var s2 = p * 2 - 1;
        drawHalf(tile, x, y, nxt, nxtChip, true, 0);
        drawHalf(tile, x, y, cur, curChip, false, 0.10);
        ctx.save();
        ctx.beginPath(); ctx.rect(x, mid, unit, tileH / 2); ctx.clip();
        ctx.translate(0, mid); ctx.scale(1, Math.max(s2, 0.02)); ctx.translate(0, -mid);
        drawHalf(tile, x, y, nxt, nxtChip, false, 0.45 * (1 - s2));
        ctx.restore();
      }
    }
    ctx.fillStyle = C.gutter; ctx.fillRect(x, mid - 0.5, unit, 1);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < tiles.length; i++) drawTile(tiles[i]);
  }

  /* ---- sound ---- */
  var soundAcc = 0, soundWaiting = false;
  function unlockSound() {
    if (S.soundOn) return;
    if (window.JTLSound) { window.JTLSound.unlock(); S.soundOn = true; }
    else soundWaiting = true; /* sound.js loads at the end of body; picked up in the loop */
  }
  function tick(vol) {
    if (!S.soundOn || !window.JTLSound) return;
    window.JTLSound.keyDown(KEYS[Math.floor(Math.random() * KEYS.length)]);
    S.plays++;
  }
  function soundStep(dt, t) {
    if (soundWaiting && window.JTLSound) { soundWaiting = false; unlockSound(); }
    if (!S.soundOn) return;
    var hz = t < T.chips ? 9 : (t < T.blank ? 5 : 0);
    if (!hz) return;
    soundAcc += dt;
    if (soundAcc >= 1000 / hz) { soundAcc -= 1000 / hz; tick(); }
  }

  /* ---- lifecycle ---- */
  function done() {
    if (S.done) return; S.done = true;
    root.classList.add('off');
    try { sessionStorage.setItem('jtlboot', '1'); } catch (e) {}
    setTimeout(function () { if (raf) cancelAnimationFrame(raf); raf = 0; if (root.parentNode) root.parentNode.removeChild(root); }, 700);
  }
  addEventListener('load', function () { S.loaded = true; });
  skipBtn.addEventListener('click', done);
  addEventListener('keydown', function (e) {
    if (S.done) return;
    if (e.key === 'Escape') { done(); return; }
    unlockSound();
  });
  document.addEventListener('pointerdown', function (e) {
    if (S.done || (e.target && e.target.closest && e.target.closest('.flap-skip'))) return;
    unlockSound();
  }, true);
  addEventListener('wheel', function () { if (!S.done) unlockSound(); }, { passive: true });

  function finalFrame() {
    tiles.forEach(function (t) {
      t.p = 0; t.rp = 1;
      if (t.target) { t.ch = t.target; t.locked = true; t.chip = null; }
      else if (t.halo) { t.ch = ''; t.chip = C.chipDim; }
      else { t.ch = ''; t.chip = null; }
    });
  }

  function lerpColor(a, b, k) {
    var pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
    var pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
    var o = pa.map(function (v, i) { return Math.round(v + (pb[i] - v) * k); });
    return 'rgb(' + o[0] + ',' + o[1] + ',' + o[2] + ')';
  }

  var t0 = performance.now(), last = t0, raf = 0, nextRipple = T.blank + 300;
  function step(now) {
    var dt = Math.min(now - last, 50); last = now;
    var t = now - t0; S.t = t;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      S.reduced = true; S.phase = 'idle'; finalFrame(); draw();
      if (t >= 400) done();
      if (!S.done) raf = requestAnimationFrame(step);
      return;
    }
    var phase = t < T.symbols ? 'letters' : t < T.digits ? 'symbols' : t < T.chips ? 'digits' : t < T.blank ? 'chips' : 'idle';
    S.phase = phase;

    for (var i = 0; i < tiles.length; i++) {
      var tile = tiles[i];
      if (tile.locked) continue;
      if (tile.target) {
        tile.p += dt / tile.dur;
        if (tile.p >= 1) {
          tile.p = 0; tile.ch = tile.next;
          if (tile.ch === tile.target) { tile.locked = true; continue; }
          tile.next = LETTERS[(LETTERS.indexOf(tile.ch) + 1) % 26];
        }
        continue;
      }
      if (phase === 'idle') {
        /* field is blank; halo dims from grey to charcoal between blank and min */
        if (tile.halo) {
          var k = Math.min(1, Math.max(0, (t - T.blank) / (T.min - T.blank)));
          tile.chip = lerpColor(tile.haloBase || C.chipB, C.chipDim, k);
        }
        if (tile.rp < 1) { tile.rp = Math.min(1, tile.rp + dt / 400); }
        else if (tile.rippleAt >= 0 && t >= tile.rippleAt) { tile.rippleAt = -1; tile.rp = 0.0001; }
        continue;
      }
      tile.p += dt / tile.dur;
      if (tile.p >= 1) {
        tile.p = 0; tile.ch = tile.next; tile.chip = tile.nextChip || null; tile.nextChip = null;
        if (phase === 'chips') {
          if (tile.halo) {
            var base = ((tile.r + tile.c) % 2) ? C.chipA : C.chipB;
            tile.haloBase = base; tile.next = ''; tile.nextChip = base;
            if (tile.chip) { tile.p = 0; tile.next = ''; tile.nextChip = tile.chip; }
          } else {
            tile.next = '';
            if (tile.ch === '') { tile.p = 0; }
          }
        } else {
          tile.next = nextChar(tile.ch, phase);
        }
      }
      /* a chip tile or a blank tile that has arrived stops flipping */
      if ((tile.chip && tile.nextChip === tile.chip) || (tile.ch === '' && tile.next === '' && !tile.nextChip)) tile.p = 0;
    }

    /* ripple scheduling: one diagonal wave across the blank field */
    if (phase === 'idle' && t >= nextRipple) {
      nextRipple += T.rippleEvery; S.ripples++;
      var span = T.rippleLen - 400;
      tiles.forEach(function (tl) {
        if (tl.locked || tl.halo) return;
        tl.rippleAt = t + ((tl.r + tl.c) / (ROWS + COLS - 2)) * span;
      });
      if (S.soundOn) { tick(); setTimeout(function () { if (!S.done) tick(); }, 450); }
    }

    soundStep(dt, t);
    var w0 = performance.now(); draw(); S.workMs = S.workMs * 0.9 + (performance.now() - w0) * 0.1; /* running mean of draw cost, read by tools/qa/flap-check.mjs */
    if (t >= T.min && (S.loaded || t >= T.cap)) done();
    if (!S.done || raf) raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);

  window.JTLFlap = {
    done: done,
    state: S,
    word: function () { return WORDS.map(function (w) { var s = ''; for (var i = 0; i < w.text.length; i++) { var tl = tiles[w.row * COLS + w.col + i]; s += tl.locked ? tl.ch : '_'; } return s; }).join(' '); }
  };
})();

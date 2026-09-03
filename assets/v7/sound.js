/* v7 sound: real switch samples through the E-49b engine shape.
   Samples: assets/sounds/gateron-ink-black/<category>_<down|up>_<NN>.wav and
   assets/sounds/click/sibat-{down,up}.wav (Keeby recordings, shipped on the
   Owner's call 2026-09-03). Routing mirrors tools/jtlboard/jtlboard.swift:
   Space, Enter, Backspace, everything else alpha. Volumes from jtlboard:
   keys .55 down / .40 up, click .30 down / .18 up.
   Chain: source -> gain(envelope) -> StereoPanner(by column) -> compressor -> out.
   6-voice cap, round robin down N / up N+1, pitch jitter +-3%.
   Unlocks on the first keydown in the terminal or pointerdown on the laptop.
   Mute persists in localStorage 'jtl-sound' (default on). */
(function () {
  'use strict';
  var BASE = (document.currentScript && document.currentScript.getAttribute('data-base')) || 'assets/sounds/';
  var FILES = {
    alpha_down: ['gateron-ink-black/alpha_down_01.wav', 'gateron-ink-black/alpha_down_02.wav', 'gateron-ink-black/alpha_down_03.wav'],
    alpha_up: ['gateron-ink-black/alpha_up_01.wav'],
    space_down: ['gateron-ink-black/space_down_01.wav'], space_up: ['gateron-ink-black/space_up_01.wav'],
    enter_down: ['gateron-ink-black/enter_down_01.wav'], enter_up: ['gateron-ink-black/enter_up_01.wav'],
    backspace_down: ['gateron-ink-black/backspace_down_01.wav'], backspace_up: ['gateron-ink-black/backspace_up_01.wav'],
    click_down: ['click/sibat-down.wav'], click_up: ['click/sibat-up.wav']
  };
  var VOL = { down: 0.55, up: 0.40, click_down: 0.30, click_up: 0.18 };
  var MAX_VOICES = 6;
  var S = { enabled: true, ctx: null, comp: null, buffers: {}, cursor: {}, voices: [], plays: 0, loading: false, loaded: false };
  try { S.enabled = localStorage.getItem('jtl-sound') !== 'off'; } catch (e) {}

  function category(code) {
    if (code === 'Space') return 'space';
    if (code === 'Enter' || code === 'NumpadEnter') return 'enter';
    if (code === 'Backspace' || code === 'Delete') return 'backspace';
    return 'alpha';
  }
  /* column 0..1 from the key's physical place, for the pan */
  var COLS = 'Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal Backspace|Tab KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight Backslash|CapsLock KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote Enter|ShiftLeft KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash ShiftRight'.split('|').map(function (r) { return r.split(' '); });
  function pan(code) {
    for (var r = 0; r < COLS.length; r++) { var i = COLS[r].indexOf(code); if (i > -1) return (i / (COLS[r].length - 1)) * 1.6 - 0.8; }
    return 0;
  }

  function init() {
    if (S.ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    S.ctx = new AC({ latencyHint: 'interactive' });
    S.comp = S.ctx.createDynamicsCompressor();
    S.comp.threshold.value = -12; S.comp.ratio.value = 4; S.comp.attack.value = 0.002; S.comp.release.value = 0.05;
    S.comp.connect(S.ctx.destination);
    load();
    return true;
  }
  function load() {
    if (S.loading) return; S.loading = true;
    var jobs = [];
    Object.keys(FILES).forEach(function (key) {
      S.buffers[key] = [];
      FILES[key].forEach(function (f, i) {
        jobs.push(fetch(BASE + f).then(function (r) { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })
          .then(function (ab) { return S.ctx.decodeAudioData(ab); })
          .then(function (buf) { S.buffers[key][i] = buf; })
          .catch(function () { /* a hole in a profile is a real 404 upstream too; skip */ }));
      });
    });
    Promise.all(jobs).then(function () { S.loaded = true; });
  }
  function unlock() {
    if (!init()) return;
    if (S.ctx.state === 'suspended') S.ctx.resume();
  }
  function play(key, vol, panV, rate) {
    if (!S.enabled || !S.ctx) return;
    var pool = (S.buffers[key] || []).filter(Boolean); if (!pool.length) return;
    var i = (S.cursor[key] || 0) % pool.length; S.cursor[key] = i + 1;
    var now = S.ctx.currentTime;
    S.voices = S.voices.filter(function (v) { return v.end > now; });
    if (S.voices.length >= MAX_VOICES) { var old = S.voices.shift(); try { old.src.stop(); } catch (e) {} }
    var src = S.ctx.createBufferSource(); src.buffer = pool[i];
    src.playbackRate.value = (rate || 1) * (0.97 + Math.random() * 0.06);
    var g = S.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.003);
    var dur = pool[i].duration / src.playbackRate.value;
    g.gain.setValueAtTime(vol, now + Math.max(0.003, dur - 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    var tail = g;
    if (S.ctx.createStereoPanner) { var p = S.ctx.createStereoPanner(); p.pan.value = panV || 0; g.connect(p); tail = p; }
    tail.connect(S.comp); src.connect(g);
    src.start(now); src.stop(now + dur + 0.01);
    S.voices.push({ src: src, end: now + dur });
    S.plays++;
  }
  function keyDown(code) { unlock(); play(category(code) + '_down', VOL.down, pan(code)); }
  function keyUp(code) { play(category(code) + '_up', VOL.up, pan(code)); }
  function clickDown() { unlock(); play('click_down', VOL.click_down, 0); }
  function clickUp() { play('click_up', VOL.click_up, 0); }

  function setEnabled(on) {
    S.enabled = !!on;
    try { localStorage.setItem('jtl-sound', on ? 'on' : 'off'); } catch (e) {}
    document.querySelectorAll('[data-mute]').forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? 'Mute key sounds' : 'Unmute key sounds');
    });
  }

  function boot() {
    setEnabled(S.enabled);
    addEventListener('jtl-keydown', function (e) { if (!e.detail || e.detail.repeat) return; keyDown(e.detail.code); });
    addEventListener('jtl-keyup', function (e) { if (!e.detail) return; keyUp(e.detail.code); });
    document.addEventListener('pointerdown', function (e) {
      if (e.target.closest('[data-laptop]')) unlock();
      if (e.target.closest('[data-click]')) clickDown();
    }, true);
    document.addEventListener('pointerup', function (e) { if (e.target.closest('[data-click]')) clickUp(); }, true);
    document.querySelectorAll('[data-mute]').forEach(function (b) {
      b.addEventListener('click', function () { unlock(); setEnabled(!S.enabled); if (S.enabled) play('click_down', VOL.click_down, 0); });
    });
    /* warm the buffers early on any first gesture so the first key is not silent */
    var warm = function () { unlock(); removeEventListener('pointerdown', warm); removeEventListener('keydown', warm); };
    addEventListener('pointerdown', warm, { once: true });
    addEventListener('keydown', warm, { once: true });
  }
  window.JTLSound = { state: S, keyDown: keyDown, keyUp: keyUp, clickDown: clickDown, clickUp: clickUp, setEnabled: setEnabled, category: category, unlock: unlock };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

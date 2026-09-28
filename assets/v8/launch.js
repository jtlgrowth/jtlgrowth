/* 03-keynote "Launch Night": one scroll engine for services.html, workshop.html, work.html.
   Vanilla, no library, file:// safe (no fetch). Every pinned scene reads one progress value p (0 to 1)
   from its section and scrubs forward with it. Motion is directional only; nothing loops or bobs.
   Reduced motion (or SETTINGS.behavior.animations = false) adds html.still: no scene runs, CSS stacks them. */
(() => {
  const root = document.documentElement;
  const S = window.SETTINGS || {};
  const B = S.behavior || {};
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches || B.animations === false;
  if (rm) root.classList.add('still');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const band = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const inout = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const phone = () => innerWidth < 761;
  const set = (el, k, v) => el.style.setProperty(k, typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : v);

  /* ---------- Project Settings binding: values change in SETTINGS, never hunted in markup ---------- */
  $$('[data-setting]').forEach((el) => {
    const v = el.dataset.setting.split('.').reduce((o, k) => o && o[k], S);
    if (typeof v !== 'string') return;
    if (el.dataset.attr === 'href') { if (/^(https:\/\/|\/(?!\/)|[a-z-]+\.html)/.test(v)) el.setAttribute('href', v); }
    else el.textContent = v;
  });

  /* ---------- curtain: the house lights go down once per session ---------- */
  const curtain = $('#curtain');
  if (curtain) {
    let seen = false;
    try { seen = sessionStorage.getItem('kn-seen') === '1' || sessionStorage.getItem('jtlboot') === '1'; } catch (e) {}
    if (rm || seen || B.preloader === false) curtain.classList.add('gone');
    else {
      try { sessionStorage.setItem('kn-seen', '1'); } catch (e) {}
      setTimeout(() => curtain.classList.add('up'), 820);
      setTimeout(() => curtain.classList.add('gone'), 1660);
    }
  }

  /* ---------- lazy films: src lands near the viewport, plays muted only while seen ---------- */
  const load = (v) => { if (v.dataset.loaded) return; v.dataset.loaded = '1'; v.src = v.dataset.src; v.load(); };
  const vids = $$('video[data-src]');
  const nearV = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { load(e.target); nearV.unobserve(e.target); } }), { rootMargin: '100% 0px' });
  const seenV = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (rm) return;
    if (e.isIntersecting) { load(v); const pr = v.play(); if (pr) pr.catch(() => {}); } else v.pause();
  }), { threshold: 0.25 });
  vids.forEach((v) => {
    v.muted = true;
    const from = parseFloat(v.dataset.start || '0');
    if (from > 0) {
      v.loop = false;
      v.addEventListener('loadedmetadata', () => { v.currentTime = from; });
      v.addEventListener('ended', () => { v.currentTime = from; if (!rm) { const pr = v.play(); if (pr) pr.catch(() => {}); } });
    }
    if (rm) { v.controls = true; v.loop = false; v.removeAttribute('autoplay'); }
    nearV.observe(v); seenV.observe(v);
  });

  /* ---------- services compare (phone): the cue's dots follow the tier column in view ---------- */
  $$('.cmp-scroll').forEach((sc) => {
    const dots = $$('.cmp-cue .dots i', sc.parentElement);
    if (!dots.length) return;
    const upd = () => {
      const max = sc.scrollWidth - sc.clientWidth;
      const i = max > 0 ? Math.round((sc.scrollLeft / max) * (dots.length - 1)) : 0;
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      sc.classList.toggle('end', max > 0 && sc.scrollLeft >= max - 4);
    };
    sc.addEventListener('scroll', upd, { passive: true });
    upd();
  });

  /* ---------- reveal once (rises into place, never returns) ---------- */
  const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { threshold: 0.12 });
  $$('[data-reveal]').forEach((el) => (rm ? el.classList.add('in') : rv.observe(el)));

  /* ---------- frame sequences on canvas (cover fit, nearest loaded frame) ---------- */
  function Seq(canvas, srcs) {
    const ctx = canvas.getContext('2d');
    const imgs = [];
    let cur = -1, want = 0, started = false;
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      cur = -1; draw(want);
    }
    function nearest(i) {
      for (let d = 0; d < srcs.length; d++) {
        if (imgs[i - d] && imgs[i - d].ok) return i - d;
        if (imgs[i + d] && imgs[i + d].ok) return i + d;
      }
      return -1;
    }
    function draw(p) {
      want = clamp(p);
      const i = nearest(Math.round(want * (srcs.length - 1)));
      if (i < 0 || i === cur || canvas.width < 2) return;
      cur = i;
      // contain, never cover: the frames are 16:9 in a 16:10 screen, so cover cut 'This is jtlboard.' at both
      // edges. Letterbox with the frames' own paper grey, the same bars as the sharp 1440x900 still.
      const im = imgs[i].el, s = Math.min(canvas.width / im.naturalWidth, canvas.height / im.naturalHeight);
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.fillStyle = canvas.dataset.fill || '#E0E0E0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(im, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      canvas.style.opacity = 1;
    }
    function start() {
      if (started) return; started = true;
      const order = [];
      for (let i = 0; i < srcs.length; i += 4) order.push(i);
      for (let i = 0; i < srcs.length; i++) if (!order.includes(i)) order.push(i);
      order.forEach((i) => {
        const el = new Image(); el.decoding = 'async';
        const rec = (imgs[i] = { el, ok: false });
        el.onload = () => { rec.ok = true; if (Math.abs(i - Math.round(want * (srcs.length - 1))) < 5) { cur = -1; draw(want); } };
        el.src = srcs[i];
      });
    }
    canvas.style.opacity = 0;
    return { size, draw, start };
  }
  const frames = (dir, n) => Array.from({ length: n }, (_, i) => `${dir}/${String(i).padStart(3, '0')}.webp`);
  const whenNear = (el, fn) => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { fn(); io.disconnect(); } }), { rootMargin: '150% 0px' });
    io.observe(el);
  };

  /* ---------- scene handlers ---------- */
  const H = {};

  /* WORK 01: the lid opens under the spotlight */
  H.open = {
    init(el, st) { st.copy = $('.open-copy', el); },
    frame(el, p, st) {
      // the copy is gone by p 0.2, before the lid starts to move, so the two never cross
      const ph = phone();
      const q = ease(band(p, 0.2, 0.66));
      set(el, '--lid', `${lerp(-34, 0, q)}deg`);
      set(el, '--sc', lerp(ph ? 0.9 : 0.56, 1, q));
      set(el, '--ty', `${lerp(ph ? 0 : 15, 0, q)}vh`);
      const c = band(p, 0.02, 0.2);
      st.copy.style.opacity = String(1 - c);
      st.copy.style.transform = `translate3d(0,${(-c * 26).toFixed(2)}vh,0)`;
      set(el, '--tag', band(p, 0.7, 0.86));
    },
  };

  /* generic horizontal walk: laptop line-up, built-after-the-room, photo reel */
  H.track = {
    init(el, st) {
      st.track = $('[data-track]', el);
      st.items = $$('[data-item]', st.track);
      st.count = $('[data-count]', el);
      st.bg = $('.bgword', el);
      this.resize(el, st);
    },
    resize(el, st) {
      st.centers = st.items.map((it) => it.offsetLeft + it.offsetWidth / 2);
      st.ws = st.items.map((it) => it.offsetWidth);
    },
    frame(el, p, st) {
      const vw = innerWidth, n = st.items.length;
      const q = band(p, 0.05, 0.95);
      const x = vw / 2 - lerp(st.centers[0], st.centers[n - 1], q);
      st.track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      let best = 0, bd = 1e9;
      st.items.forEach((it, i) => {
        const raw = (st.centers[i] + x - vw / 2) / (st.ws[i] * 0.85 + 60);
        const a = Math.min(Math.abs(raw), 1);
        if (Math.abs(raw) < bd) { bd = Math.abs(raw); best = i; }
        it.style.transform = `scale(${(1 - 0.12 * a).toFixed(4)})`;
        set(it, '--cap', clamp(1 - a * 1.8));
        set(it, '--dim', a * 0.6);
        set(it, '--g', clamp(a * 1.8));
      });
      if (st.count) st.count.textContent = String(best + 1).padStart(2, '0');
      if (st.bg) st.bg.style.transform = `translate3d(${(x * 0.3).toFixed(1)}px,-50%,0)`;
    },
  };

  /* WORK 03: phone line-up. Desktop: seven phones rise off the floor and fan out past both edges, their names in
     one row over the floor fade. Phone: a walk past each phone at about 80% of the width. */
  H.pocket = {
    init(el, st) {
      st.items = $$('.pk-item', el); st.idx = st.items.map((it) => +it.dataset.i);
      const stage = $('.stage', el);
      const floor = document.createElement('div'); floor.className = 'pk-floor'; floor.setAttribute('aria-hidden', 'true');
      const caps = document.createElement('ol'); caps.className = 'pk-caps'; caps.setAttribute('aria-hidden', 'true');
      st.caps = st.items.map((it) => { const li = document.createElement('li'); li.innerHTML = $('figcaption', it).innerHTML; caps.appendChild(li); return li; });
      stage.appendChild(floor); stage.appendChild(caps);
      this.resize(el, st);
    },
    resize(el, st) {
      st.hw = st.caps.map((li) => li.offsetWidth / 2);
      st.g = parseFloat(getComputedStyle(root).getPropertyValue('--gutter')) || 16;
    },
    frame(el, p, st) {
      const pw = st.items[0].offsetWidth, vw = innerWidth;
      if (!phone()) {
        const off = [0, 0.8, 1.4, 1.98];
        const sc = [1.12, 0.9, 0.8, 0.7];
        const spread = inout(band(p, 0.14, 0.64));
        const cap = band(p, 0.62, 0.78);
        set(el, '--lead-o', 1 - band(p, 0.02, 0.14));
        st.items.forEach((it, k) => {
          const i = st.idx[k], a = Math.abs(i);
          const rise = ease(band(p, a * 0.03, 0.18 + a * 0.03));
          const x = Math.sign(i) * off[a] * pw * spread;
          it.style.transform = `translate3d(${x.toFixed(1)}px,${((1 - rise) * 75).toFixed(2)}vh,0)`;
          set(it, '--s', sc[a]);
          const hw = st.hw[k] || 60, c = clamp(vw / 2 + x, st.g + hw, vw - st.g - hw);
          set(st.caps[k], '--cx', `${c.toFixed(1)}px`);
          set(st.caps[k], '--cap', cap);
        });
      } else {
        const step = pw * 0.98, q = band(p, 0.06, 0.94);
        const at = lerp(-3, 3, q);
        st.items.forEach((it, k) => {
          const i = st.idx[k];
          const d = i - at, a = Math.min(Math.abs(d), 1);
          it.style.transform = `translate3d(${(d * step).toFixed(1)}px,0,0)`;
          set(it, '--s', 1 - 0.16 * a);
          set(it, '--cap', clamp(1 - Math.abs(d) * 1.8));
        });
      }
    },
  };

  /* WORK 05: jtlboard. The sentence types, each key lights as it lands, then the board flies into the real footage. */
  const KB = [
    [['⇥', 'tab', 1.5], 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', ['⌫', 'del', 1]],
    [['⇪', 'caps', 1.75], 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ['↵', 'ret', 1.75]],
    [['⇧', 'shift', 2.25], 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', ['⇧', 'shift', 1.25]],
    [['fn', 'fn', 1], ['⌃', 'ctl', 1], ['⌥', 'opt', 1], ['⌘', 'cmd', 1.25], ['', 'space', 5], ['⌘', 'cmd', 1.25], ['⌥', 'opt', 1], ['←', 'lt', 1], ['→', 'rt', 1]],
  ];
  function buildKb(kb) {
    if (!kb || kb.dataset.built) return;
    kb.dataset.built = '1';
    KB.forEach((row) => {
      const r = document.createElement('div'); r.className = 'kb-row';
      row.forEach((k) => {
        const [label, id, u] = Array.isArray(k) ? k : [k, k, 1];
        const b = document.createElement('span'); b.className = 'key'; b.dataset.k = id; b.textContent = label;
        b.style.setProperty('--u', u); r.appendChild(b);
      });
      kb.appendChild(r);
    });
  }
  H.jtlboard = {
    init(el, st) {
      st.kb = $('.kb', el); buildKb(st.kb);
      st.keys = {};
      $$('.key', el).forEach((k) => (st.keys[k.dataset.k] = st.keys[k.dataset.k] || []).push(k));
      st.text = el.dataset.text || '';
      st.out = $('[data-typed]', el);
      st.lap = $('.jb-lap', el); st.scr = $('.jb-lap .mbp-scr', el);
      const chars = [...st.text], n = chars.length;
      st.hits = {};
      chars.forEach((ch, i) => {
        const t = 0.05 + (i / Math.max(1, n - 1)) * 0.42;
        const ids = [];
        if (ch === ' ') ids.push('space'); else if (ch === '.') ids.push('.'); else if (ch === ',') ids.push(','); else ids.push(ch.toLowerCase());
        if (ch !== ch.toLowerCase()) ids.push('shift');
        ids.forEach((id) => (st.hits[id] = st.hits[id] || []).push(t));
      });
      st.times = chars.map((_, i) => 0.05 + (i / Math.max(1, n - 1)) * 0.42);
      st.seq = Seq($('canvas', el), frames(el.dataset.frames, +el.dataset.count));
      whenNear(el, st.seq.start);
      this.resize(el, st);
    },
    resize(el, st) {
      st.seq.size();
      const stage = $('.stage', el), sr = stage.getBoundingClientRect();
      const kt = st.kb.style.transform, lt = st.lap.style.transform;
      st.kb.style.transform = 'none'; st.lap.style.transform = 'none';
      const kr = st.kb.getBoundingClientRect(), lr = st.scr.getBoundingClientRect();
      st.kb.style.transform = kt; st.lap.style.transform = lt;
      // the landing spot is the film's own mini keyboard in the frames on screen while the board lands
      // (frames 15 to 27: centred at 37% x 56% of the screen, 41% of its width), so the two meet and cross-fade as one
      const s = (lr.width * 0.41) / kr.width;
      st.fly = {
        s,
        dx: lr.left - sr.left + lr.width * 0.372 - (kr.left - sr.left) - (kr.width * s) / 2,
        dy: lr.top - sr.top + lr.height * 0.555 - (kr.top - sr.top) - (kr.height * s) / 2,
      };
    },
    frame(el, p, st) {
      const count = st.times.filter((t) => t <= p).length;
      st.out.textContent = st.text.slice(0, count);
      for (const id in st.keys) {
        let h = 0;
        (st.hits[id] || []).forEach((t) => { if (t <= p) h = Math.max(h, 0.24, 1 - (p - t) / 0.05); });
        st.keys[id].forEach((k) => set(k, '--h', h));
      }
      set(el, '--typed-o', 1 - band(p, 0.46, 0.52));
      // desktop: the title steps aside so the laptop can take 78 to 80% of the width
      set(el, '--head-o', phone() ? 1 : 1 - band(p, 0.46, 0.56));
      // the board flies onto the film's own mini keyboard and fades out over it by p 0.66, so only one keyboard ever shows
      const f = inout(band(p, 0.5, 0.66));
      st.kb.style.transform = `translate3d(${(st.fly.dx * f).toFixed(1)}px,${(st.fly.dy * f).toFixed(1)}px,0) scale(${lerp(1, st.fly.s, f).toFixed(4)})`;
      st.kb.style.opacity = String(1 - band(p, 0.6, 0.66));
      const l = ease(band(p, 0.46, 0.64));
      st.lap.style.transform = `translate3d(0,${((1 - l) * 90).toFixed(2)}vh,0)`;
      st.seq.draw(lerp(0.3, 1, band(p, 0.55, 0.95)));
      set(el, '--copy-o', band(p, 0.72, 0.84));
    },
    still(el, st) { buildKb($('.kb', el)); const o = $('[data-typed]', el); if (o) o.textContent = el.dataset.text || ''; },
  };

  /* WORK 06: Blurred. The laptop steps up to fill the stage, the screen frosts in one direction
     (sharp, light, medium, then the app's own frosted glass), the lid closes, then the one line lands.
     The 52-frame film is not used here: it frosts, clears and frosts again (frames 9 to 18 and 41 to 51),
     which would play as a back-and-forth. */
  H.blurred = {
    init(el, st) { st.beat = $('.beat', el); st.fr = $$('.frost', el); },
    frame(el, p, st) {
      const ph = phone();
      const z = inout(band(p, 0.08, 0.3));
      set(el, '--bls', lerp(ph ? 0.9 : 0.68, 1, z));
      set(el, '--bly', `${lerp(ph ? 3 : 19, 0, z).toFixed(2)}vh`);
      set(el, '--head-o', ph ? 1 : 1 - band(p, 0.1, 0.22));
      [[0.32, 0.42], [0.4, 0.5], [0.48, 0.6]].forEach(([a, b], i) => { if (st.fr[i]) set(st.fr[i], '--o', band(p, a, b)); });
      set(el, '--lid', `${(-87 * inout(band(p, 0.46, 0.86))).toFixed(2)}deg`);
      const bo = band(p, 0.3, 0.38) * (1 - band(p, 0.76, 0.84));
      set(st.beat, '--bo', bo);
      set(st.beat, '--by', p < 0.55 ? 1 - band(p, 0.3, 0.38) : -band(p, 0.76, 0.84));
      set(el, '--fo', ease(band(p, 0.84, 0.95)));
    },
    still(el) { const im = $('.scr-still', el); if (im && im.dataset.stillSrc) im.src = im.dataset.stillSrc; },
  };

  /* films: the card grows to full bleed (R&C reel DNA), the phone slides in beside it */
  H.grow = {
    frame(el, p) {
      // phone: the portal's portrait film grows from a card to the whole screen
      const ph = phone();
      const g = inout(band(p, 0.04, 0.5));
      const s = lerp(ph ? 0.72 : 0.56, 1, g);
      set(el, '--gs', s);
      set(el, '--gr', lerp(28, 0, g) / s);
      set(el, '--gy', `${lerp(ph ? 8 : 12, 0, g)}vh`);
      set(el, '--t-o', 1 - band(p, 0.02, 0.15));
      // the scrim is at full strength before the caption starts to appear
      set(el, '--scrim-o', band(p, 0.46, 0.58));
      set(el, '--ph-o', ease(band(p, 0.5, 0.7)));
      set(el, '--cap-o', band(p, 0.58, 0.74));
    },
  };

  /* WORK finale: the Brain on Supernova. A star, then the whole stage. */
  H.nova = {
    frame(el, p) {
      const g = inout(band(p, 0.06, 0.6));
      const r = lerp(4.5, 78, g);
      set(el, '--r', r);
      set(el, '--ring-d', `${((2 * r) / 100) * (Math.hypot(innerWidth, innerHeight) / Math.SQRT2)}px`);
      set(el, '--ring-o', 1 - band(p, 0.44, 0.6));
      set(el, '--nt-o', 1 - band(p, 0.18, 0.4));
      set(el, '--nt-s', lerp(1, 1.16, band(p, 0.08, 0.4)));
      set(el, '--cap-o', band(p, 0.62, 0.8));
    },
  };


  /* ---------- ship graft: /work/ laptop line-up at 390, paged reel with a hold on each (G9).
     Desktop is byte-identical to H.track. Phone replaces the continuous sweep with a stepped
     walk between visual positions (CSS order puts the AVAS portal first), the same rhythm as
     05-exhibition's wallReel: position only ever grows with scroll (directional, G9/G10 spirit). */
  H.tracklap = {
    init(el, st) {
      st.track = $('[data-track]', el);
      st.items = $$('[data-item]', st.track);
      st.count = $('[data-count]', el);
      st.bg = $('.bgword', el);
      this.resize(el, st);
    },
    resize(el, st) {
      st.centers = st.items.map((it) => it.offsetLeft + it.offsetWidth / 2);
      st.ws = st.items.map((it) => it.offsetWidth);
      st.order = st.items.map((it, i) => i).sort((a, b) => st.centers[a] - st.centers[b]);
      st.xs = st.order.map((i) => -st.centers[i]);
    },
    frame(el, p, st) {
      if (phone()) {
        const n = st.xs.length;
        const raw = clamp(band(p, 0.04, 0.94)) * (n - 1);
        const i = Math.min(n - 2, Math.floor(raw)), f = raw - i;
        const x = lerp(st.xs[i], st.xs[i + 1], inout(band(f, 0.2, 0.8))) + innerWidth / 2;
        st.track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
        const cur = st.order[Math.min(n - 1, Math.round(raw))];
        st.items.forEach((it, k) => {
          const on = k === cur ? 1 : 0;
          set(it, '--cap', on);
          set(it, '--dim', on ? 0 : 0.6);
          set(it, '--g', on ? 0 : 1.2);
          it.style.transform = '';
        });
        if (st.count) st.count.textContent = String(st.order.indexOf(cur) + 1).padStart(2, '0');
        if (st.bg) st.bg.style.transform = `translate3d(${(x * 0.3).toFixed(1)}px,-50%,0)`;
        return;
      }
      H.track.frame(el, p, st);
    },
  };

  /* ---------- ship graft: services travelling line, one OA beat between tier 2 and tier 3.
     Position is a straight function of the pin's own progress p, so it only ever moves one way. ---------- */
  H.rule = {
    init(el, st) { st.track = $('.rule-track', el); },
    frame(el, p, st) {
      const from = innerWidth * 0.6, to = -(st.track.scrollWidth - innerWidth * 0.4);
      st.track.style.transform = `translate3d(${(from + (to - from) * p).toFixed(1)}px,0,0)`;
    },
  };

  /* SERVICES 01: four slabs, stacked, then an exploded view with a label per tier */
  H.stack = {
    init(el, st) { st.slabs = $$('.slab', el); st.labels = $$('.slab-labels li', el); st.box = $('.slabs', el); },
    frame(el, p, st) {
      const e = inout(band(p, 0.08, 0.58));
      set(el, '--gap', lerp(1.6, phone() ? 6 : 7.6, e));
      const br = st.box.getBoundingClientRect();
      st.slabs.forEach((s, i) => {
        const on = band(p, 0.28 + i * 0.07, 0.4 + i * 0.07);
        set(s, '--lit', lerp(0.3, 1, on));
        const lb = st.labels[i];
        if (!lb) return;
        const r = s.firstElementChild.getBoundingClientRect();
        set(lb, '--ly', `${(r.top + r.height / 2 - br.top).toFixed(1)}px`);
        set(lb, '--lx', `${(r.right - br.left + 18).toFixed(1)}px`);
        set(lb, '--lo', on);
      });
      set(el, '--ln-o', band(p, 0.68, 0.82));
    },
  };

  /* SERVICES tiers: the device slides in as the slide arrives, then holds while pinned */
  H.tier = {
    frame(el, p, st, r) {
      const arrive = clamp((innerHeight - r.top) / innerHeight);
      set(el, '--d-o', ease(band(arrive, 0.15, 1)));
      set(el, '--c-o', ease(band(arrive, 0.3, 1)));
    },
  };

  /* WORKSHOP 01: the recap film under the title, the scrim lifts */
  H.film = {
    frame(el, p) {
      set(el, '--c-o', 1 - band(p, 0.08, 0.5));
      set(el, '--sc-o', lerp(1, 0.2, band(p, 0.1, 0.6)));
      set(el, '--tag', band(p, 0.55, 0.75));
    },
  };

  /* WORKSHOP 02: the highlight reel, one full-screen slide per fact, each wipes in from the right */
  H.slides = {
    init(el, st) { st.sl = $$('[data-slide]', el); st.count = $('[data-count]', el); },
    frame(el, p, st) {
      const n = st.sl.length, q = band(p, 0.02, 0.98), seg = 1 / n;
      let cur = 0;
      st.sl.forEach((s, i) => {
        const enter = i === 0 ? 1 : inout(band(q, i * seg - seg * 0.5, i * seg));
        if (enter > 0.5) cur = i;
        set(s, '--wipe', (1 - enter) * 100);
        set(s, '--zs', lerp(1.12, 1, band(q, i * seg - seg * 0.5, (i + 1) * seg)));
        set(s, '--co', i === 0 ? 1 - 0 : band(q, i * seg - seg * 0.12, i * seg + seg * 0.12));
      });
      if (st.count) st.count.textContent = String(cur + 1).padStart(2, '0');
    },
  };

  /* WORKSHOP finale: one more thing */
  H.omt = {
    frame(el, p) {
      set(el, '--a-o', band(p, 0.02, 0.18));
      const up = inout(band(p, 0.32, 0.54));
      set(el, '--a-y', -up * 24);
      set(el, '--a-s', lerp(1, 0.5, up));
      set(el, '--b-o', ease(band(p, 0.4, 0.64)));
      set(el, '--c-o', band(p, 0.66, 0.82));
    },
  };

  /* a word band that moves only while you scroll past it, one way */
  H.band = {
    init(el, st) { st.row = $('.band-row', el); st.words = $$('span', st.row); },
    frame(el, p, st) {
      const w = st.row.scrollWidth, vw = innerWidth;
      const x = lerp(vw * 0.15, -(w - vw * 0.85), p);
      st.row.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      st.words.forEach((s) => { const c = s.offsetLeft + x + s.offsetWidth / 2; s.classList.toggle('on', Math.abs(c - vw / 2) < s.offsetWidth / 2); });
    },
  };

  /* ---------- engine ---------- */
  const scenes = $$('[data-scene]').map((el) => ({ el, h: H[el.dataset.scene], st: {} }));
  function progress(el, r) {
    const len = r.height - innerHeight;
    if (len <= 0) return r.top <= 0 ? 1 : 0;
    return clamp(-r.top / len);
  }
  let ticking = false;
  function frame(all) {
    ticking = false;
    const vh = innerHeight;
    for (const s of scenes) {
      if (!s.h || !s.h.frame) continue;
      const r = s.el.getBoundingClientRect();
      if (!all && (r.bottom < -vh * 0.5 || r.top > vh * 1.5)) continue;
      const p = s.el.classList.contains('pin') ? progress(s.el, r) : clamp((vh - r.top) / (vh + r.height));
      s.h.frame(s.el, p, s.st, r);
    }
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => frame(false)); } };
  if (rm) {
    scenes.forEach((s) => s.h && s.h.still && s.h.still(s.el, s.st));
  } else {
    scenes.forEach((s) => s.h && s.h.init && s.h.init(s.el, s.st));
    addEventListener('scroll', req, { passive: true });
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { scenes.forEach((s) => s.h && s.h.resize && s.h.resize(s.el, s.st)); frame(true); }, 120); });
    frame(true);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { scenes.forEach((s) => s.h && s.h.resize && s.h.resize(s.el, s.st)); frame(true); });
    addEventListener('load', () => { scenes.forEach((s) => s.h && s.h.resize && s.h.resize(s.el, s.st)); frame(true); });
  }
})();

/* ---------- ship graft: site Menu disclosure (every live nav link reachable) ---------- */
(() => {
  const btn = document.getElementById('menu-btn'), panel = document.getElementById('menu-panel');
  if (!btn || !panel) return;
  const items = () => [...panel.querySelectorAll('a')];
  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';
  const setOpen = (o) => {
    btn.setAttribute('aria-expanded', o ? 'true' : 'false');
    panel.hidden = !o;
    if (o) { const f = items()[0]; if (f) f.focus(); }
  };
  btn.addEventListener('click', () => setOpen(!isOpen()));
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { setOpen(false); btn.focus(); }
  }, true);
  document.addEventListener('click', (e) => {
    if (isOpen() && !panel.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
})();

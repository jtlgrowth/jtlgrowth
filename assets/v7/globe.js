/* v8 globe: cobe dotted globe (E-54b mechanics) with hub arcs from Manila to every
   city on the line, a pinned pill label per city and an arc label at each peak
   (cobe.vercel.app is the reference), JTL ping tiles, a rolling counter (E-52b)
   that counts the visitor's own keystrokes, ambient pings on the cities on the
   line, and a real day-and-night overlay from the sun position.
   The arcs are drawn on a 2D overlay with the same projection the pings use:
   cobe 2's own arcs are a quadratic bezier whose peak sits inside the globe once
   the pair is more than about 85 degrees apart (Manila to London is 105, to
   Boston 122), so the library cannot draw this route.
   Listens: window 'jtl-keydown' (from term.js) -> ping the visitor's city, +1.
   Boots when in view, renders only while visible. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var MARK = '<svg viewBox="288 703 1315 626" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="141.5" stroke-linecap="butt"><path d="M624 774H1267"/><path d="M846 706V1122A134.5 134.5 0 0 1 711.5 1256.5H494A134.5 134.5 0 0 1 359.5 1122"/><path d="M1195 706V1122A134.5 134.5 0 0 0 1329.5 1256.5H1602"/></g></svg>';

  /* the hub and the cities on the line */
  var HUB = 'Manila';
  var CITY = {
    Manila: [14.6, 121.0], Caloocan: [14.65, 120.97], Taguig: [14.53, 121.05],
    Boston: [42.36, -71.06], 'New York': [40.71, -74.01], 'Los Angeles': [34.05, -118.24],
    London: [51.51, -0.13], Paris: [48.86, 2.35], Amsterdam: [52.37, 4.9], Berlin: [52.52, 13.41],
    Sydney: [-33.87, 151.21], Melbourne: [-37.81, 144.96],
    Singapore: [1.35, 103.82], Tokyo: [35.68, 139.65], Dubai: [25.2, 55.27]
  };
  /* which side of the dot the pill sits on, so the Europe and US clusters fan out instead of stacking */
  var SIDE = { Manila: 'n', Boston: 'n', 'New York': 's', 'Los Angeles': 'w', London: 'w', Paris: 's', Amsterdam: 'n', Berlin: 'e', Sydney: 'e', Melbourne: 's', Singapore: 's', Tokyo: 'e', Dubai: 'n' };
  /* reach sets: core = the six named by the Owner, wide = the marketing set, cycle = twelve with three arcs live at a time */
  var REACH = {
    core: ['Boston', 'London', 'Amsterdam', 'Berlin', 'Sydney', 'Melbourne'],
    wide: ['Boston', 'New York', 'London', 'Paris', 'Amsterdam', 'Berlin', 'Sydney', 'Melbourne', 'Singapore', 'Dubai'],
    cycle: ['Boston', 'New York', 'Los Angeles', 'London', 'Paris', 'Amsterdam', 'Berlin', 'Sydney', 'Melbourne', 'Singapore', 'Tokyo', 'Dubai']
  };
  var TZ_CITY = {
    'Asia/Manila': ['Manila', [14.6, 121.0]], 'Asia/Tokyo': ['Tokyo', [35.7, 139.7]], 'Asia/Seoul': ['Seoul', [37.6, 127.0]],
    'Asia/Singapore': ['Singapore', [1.35, 103.8]], 'Asia/Jakarta': ['Jakarta', [-6.2, 106.8]], 'Asia/Bangkok': ['Bangkok', [13.75, 100.5]],
    'Asia/Hong_Kong': ['Hong Kong', [22.3, 114.2]], 'Asia/Dubai': ['Dubai', [25.2, 55.3]], 'Asia/Kolkata': ['Mumbai', [19.1, 72.9]],
    'Europe/London': ['London', [51.5, -0.1]], 'Europe/Paris': ['Paris', [48.9, 2.35]], 'Europe/Berlin': ['Berlin', [52.5, 13.4]],
    'Europe/Madrid': ['Madrid', [40.4, -3.7]], 'Europe/Rome': ['Rome', [41.9, 12.5]], 'Europe/Amsterdam': ['Amsterdam', [52.4, 4.9]],
    'America/New_York': ['New York', [40.7, -74.0]], 'America/Chicago': ['Chicago', [41.9, -87.6]], 'America/Denver': ['Denver', [39.7, -105.0]],
    'America/Los_Angeles': ['Los Angeles', [34.05, -118.2]], 'America/Toronto': ['Toronto', [43.7, -79.4]], 'America/Vancouver': ['Vancouver', [49.3, -123.1]],
    'America/Sao_Paulo': ['Sao Paulo', [-23.5, -46.6]], 'Australia/Sydney': ['Sydney', [-33.9, 151.2]], 'Australia/Melbourne': ['Melbourne', [-37.8, 145.0]],
    'Australia/Brisbane': ['Brisbane', [-27.5, 153.0]], 'Australia/Perth': ['Perth', [-31.95, 115.9]], 'Pacific/Auckland': ['Auckland', [-36.85, 174.8]]
  };
  var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  var visitor = TZ_CITY[tz] || ['Manila', [14.6, 121.0]];
  var VISITOR = visitor[0];
  if (!CITY[VISITOR]) CITY[VISITOR] = visitor[1];

  /* geo helpers shared by markers, pings, arcs and the night shade (cobe's frame) */
  function vec(lat, lng) {
    var r = lat * Math.PI / 180, s = lng * Math.PI / 180 - Math.PI, n = Math.cos(r);
    return [-n * Math.cos(s), Math.sin(r), n * Math.sin(s)];
  }
  function rot(v, phi, theta) {
    var x = v[0], y = v[1], z = v[2];
    var cp = Math.cos(phi), sp = Math.sin(phi); var x2 = x * cp + z * sp, z2 = -x * sp + z * cp;
    var ct = Math.cos(theta), st = Math.sin(theta); var y2 = y * ct - z2 * st, z3 = y * st + z2 * ct;
    return [x2, y2, z3];
  }
  /* great-circle interpolation between two unit vectors */
  function slerp(a, b, t) {
    var d = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1), w = Math.acos(d), s = Math.sin(w);
    if (s < 1e-6) return a;
    var ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
    return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
  }
  function ease(x) { x = clamp(x, 0, 1); return 1 - (1 - x) * (1 - x) * (1 - x); }
  /* subsolar point from the clock: declination by day of year, longitude by UTC hour */
  function sun() {
    var now = new Date();
    var start = Date.UTC(now.getUTCFullYear(), 0, 0);
    var doy = Math.floor((now.getTime() - start) / 86400000);
    var decl = -23.44 * Math.cos(2 * Math.PI * (doy + 10) / 365);
    var h = now.getUTCHours() + now.getUTCMinutes() / 60;
    var lon = 180 - h * 15; while (lon > 180) lon -= 360; while (lon < -180) lon += 360;
    return vec(decl, lon);
  }
  /* rolling counter, E-52b */
  function counter(el, label) {
    el.className = 'jp-counter'; el.innerHTML = '';
    var value = 0, cells = [], box = document.createElement('span'); el.appendChild(box);
    var small = document.createElement('small'); small.textContent = label; el.appendChild(small);
    function render(n) {
      var s = String(n).padStart(3, '0');
      while (cells.length < s.length) { var c = document.createElement('span'); c.className = 'digit'; c.innerHTML = '<span>0</span>'; box.appendChild(c); cells.push(c); }
      for (var i = 0; i < s.length; i++) {
        var cell = cells[i], cur = cell.querySelector('span:last-child');
        if (cur.textContent === s[i]) continue;
        var nxt = document.createElement('span'); nxt.textContent = s[i];
        if (reduce.matches) { cell.innerHTML = ''; cell.appendChild(nxt); continue; }
        cur.className = 'out'; nxt.className = 'in'; cell.appendChild(nxt);
        setTimeout(function (c, o) { return function () { if (o.parentNode === c) c.removeChild(o); }; }(cell, cur), 320);
      }
    }
    render(0);
    return { bump: function () { value++; render(value); }, get: function () { return value; } };
  }

  function globe(el) {
    if (el.__globeInit) return; el.__globeInit = true;
    var dark = el.getAttribute('data-dark') !== '0';
    var wantCounter = el.getAttribute('data-counter') === '1';
    var mode = REACH[el.getAttribute('data-reach')] ? el.getAttribute('data-reach') : 'core';
    var LINE = REACH[mode];
    var ink = dark ? '#E2E2E2' : '#181818';
    var canvas = document.createElement('canvas'); el.appendChild(canvas);
    var night = document.createElement('canvas'); night.className = 'jp-night'; night.width = 96; night.height = 96; el.appendChild(night);
    var nctx = night.getContext('2d');
    var arcCanvas = document.createElement('canvas'); arcCanvas.className = 'jp-arcs'; arcCanvas.setAttribute('aria-hidden', 'true'); el.appendChild(arcCanvas);
    var actx = arcCanvas.getContext('2d');
    var pings = [];
    for (var i = 0; i < 6; i++) { var d = document.createElement('div'); d.className = 'jp-ping'; d.innerHTML = MARK; el.appendChild(d); pings.push(d); }
    /* one pill per city on the line, the hub included; one label per arc, shown at the peak once the arc has landed */
    var pins = [HUB].concat(LINE).map(function (city) {
      var p = document.createElement('div'); p.className = 'jp-pin'; p.setAttribute('data-side', SIDE[city] || 'n'); p.setAttribute('data-pin', city); p.setAttribute('aria-hidden', 'true');
      p.textContent = city; el.appendChild(p);
      return { city: city, side: SIDE[city] || 'n', v: vec(CITY[city][0], CITY[city][1]), el: p, k: -1 };
    });
    var hubV = vec(CITY[HUB][0], CITY[HUB][1]);
    var arcs = LINE.map(function (city) {
      var b = vec(CITY[city][0], CITY[city][1]);
      var w = Math.acos(clamp(hubV[0] * b[0] + hubV[1] * b[1] + hubV[2] * b[2], -1, 1));
      var lab = document.createElement('div'); lab.className = 'jp-arc-label'; lab.setAttribute('data-arc', city); lab.setAttribute('aria-hidden', 'true');
      lab.textContent = city + ' → ' + HUB; el.appendChild(lab);
      /* the arc runs from the city home to the hub (Owner, 2026-09-06: "from other country to manila").
         Peak height in globe radii: a short hop stays low, the long ones rise, capped so the peak stays inside the canvas */
      return { city: city, a: b, b: hubV, w: w, h: Math.min(0.2, 0.06 + 0.15 * (w / Math.PI)), born: Infinity, dies: Infinity, e: 0, alpha: 0, seen: false, lap: -1, el: lab, k: -1 };
    });
    var cnt = null;
    if (wantCounter) { var c = document.createElement('div'); el.parentNode.insertBefore(c, el.nextSibling); cnt = counter(c, 'keystrokes since you arrived'); }
    /* v8.1: the "Running in <city>" caption and the Caloocan clock line are gone (Owner, 2026-09-07:
       they collided with the panel nav). The pills name the cities now; the counter stays. */
    var booted = false, visible = false, timer = 0;
    var state = { phi: 0, theta: 0.25, c: 0, live: [], last: VISITOR };
    var slot = 0, holdUntil = 0;
    var AMBIENT = ['Caloocan', 'Taguig'].concat(LINE);
    function land(city, hold) {
      var s = slot++ % pings.length, now = performance.now();
      state.live = state.live.filter(function (p) { return p.slot !== s; });
      state.live.push({ city: city, at: now, slot: s });
      var d = pings[s]; d.classList.remove('live'); void d.offsetWidth; d.classList.add('live');
      /* the visitor's own ping holds the ledger for a beat; ambient pings do not talk over it */
      if (hold) holdUntil = now + 2500;
      if (hold || now >= holdUntil) state.last = city;
    }
    function ambient() {
      if (visible) land(AMBIENT[Math.floor(Math.random() * AMBIENT.length)]);
      timer = setTimeout(ambient, 3000 + Math.random() * 2000);
    }
    addEventListener('jtl-keydown', function (e) {
      if (e.detail && e.detail.repeat) return;
      if (cnt) cnt.bump();
      land(VISITOR, true);
    });

    function boot() {
      if (booted) return; booted = true;
      /* cobe is vendored (assets/vendor, phenomenon alongside) so the public home has no CDN at runtime and
         WebKit stops re-requesting cobe's dependency against our origin; the CDN is the fallback for the
         single-file copies that run from disk */
      import('/assets/vendor/cobe-0.6.3.esm.js').catch(function () { return import('https://cdn.jsdelivr.net/npm/cobe@0.6.3/+esm'); }).then(function (m) { start(m.default); }).catch(function () {
        var note = document.createElement('div'); note.className = 'jp-globe-fallback';
        note.textContent = 'The globe needs network access to load cobe.';
        canvas.remove(); night.remove(); arcCanvas.remove(); pins.concat(arcs).forEach(function (x) { x.el.remove(); }); el.appendChild(note);
      });
    }
    function drawNight(phi, theta) {
      var S = rot(sun(), phi, theta);
      var img = nctx.createImageData(96, 96), px = img.data, R = 96 / 2; /* sphere radius in canvas units = 0.4 * c relative to c/2 centre */
      for (var y = 0; y < 96; y++) for (var x = 0; x < 96; x++) {
        var nx = (x + 0.5 - R) / (R * 0.8), ny = -(y + 0.5 - R) / (R * 0.8);
        var d2 = nx * nx + ny * ny, o = (y * 96 + x) * 4;
        if (d2 > 1) { px[o + 3] = 0; continue; }
        var nz = Math.sqrt(1 - d2);
        var dot = nx * S[0] + ny * S[1] + nz * S[2];
        var a = clamp(-dot / 0.18, 0, 1) * 0.62;
        px[o] = 16; px[o + 1] = 16; px[o + 2] = 16; px[o + 3] = Math.round(a * 255);
      }
      nctx.putImageData(img, 0, 0);
    }
    function start(createGlobe) {
      var size = function () { return Math.min(680, el.clientWidth || innerWidth * 0.92); };
      var c = size(), phi = 0, theta = 0.25, vel = 0, dragging = false, last = null, samples = [], nightAt = 0;
      (function () {
        var v = vec(CITY[VISITOR][0], CITY[VISITOR][1]);
        phi = Math.atan2(-v[0], v[2]); if (-v[0] * Math.sin(phi) + v[2] * Math.cos(phi) < 0) phi += Math.PI;
      })();
      /* clip-space point of a unit vector lifted by f globe radii; the globe itself is radius 0.8 of the canvas half-width */
      function clip(v, f, ph) { var p = rot(v, ph, theta); return [p[0] * 0.8 * f, p[1] * 0.8 * f, p[2] * 0.8 * f]; }
      /* in front of the globe, or peeking past its silhouette from behind (cobe's own rule for arcs) */
      function shown(q) { return q[2] > 0 || q[0] * q[0] + q[1] * q[1] >= 0.64; }
      function project(lat, lng, ph) {
        var q = clip(vec(lat, lng), 1, ph);
        return { x: c / 2 + q[0] * c / 2, y: c / 2 - q[1] * c / 2, z: q[2] / 0.8 };
      }
      function arcPoint(A, t, ph) { return clip(slerp(A.a, A.b, t), 1 + A.h * Math.sin(Math.PI * t), ph); }
      function fitArcCanvas() { arcCanvas.width = c * 2; arcCanvas.height = c * 2; actx.setTransform(2, 0, 0, 2, 0, 0); }
      fitArcCanvas();
      /* pill widths are measured on first placement; measure again once the webfont is in (the fallback face is narrower) */
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { pins.concat(arcs).forEach(function (x) { x.w = 0; }); });
      /* label placement: opacity and blur by how far in front the anchor sits, and by how much room the pill has
         inside the globe box (the panel clips at the viewport, so a pill dissolves at the edge instead of being cut);
         arc labels sit above pills. Style writes only when the value moves */
      function place(item, q, k) {
        var x = c / 2 + q[0] * c / 2, y = c / 2 - q[1] * c / 2;
        if (!item.w) item.w = item.el.offsetWidth || 0;
        var side = item.side || 'n', L = side === 'e' ? x + 9 : side === 'w' ? x - 9 - item.w : x - item.w / 2, R = L + item.w;
        k = Math.min(k, clamp((L - 2) / 16, 0, 1), clamp((c - R - 2) / 16, 0, 1));
        var kk = Math.round(k * 100) / 100;
        item.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        if (kk !== item.k) { item.k = kk; item.el.style.opacity = kk; item.el.style.filter = kk < 1 ? 'blur(' + ((1 - kk) * 6).toFixed(1) + 'px)' : 'none'; item.el.style.zIndex = (item.h !== undefined ? 12 : 2) + Math.round(kk * 8); }
      }
      /* the arc's crossing of the silhouette between two samples, bisected so the stroke meets the globe edge */
      function edge(A, ta, tb, ph) {
        var lo = ta, hi = tb, sa = shown(arcPoint(A, ta, ph));
        for (var n = 0; n < 6; n++) { var mid = (lo + hi) / 2; if (shown(arcPoint(A, mid, ph)) === sa) lo = mid; else hi = mid; }
        return arcPoint(A, lo, ph);
      }
      /* arc timeline: core and wide draw every arc once, staggered; cycle keeps three live and rotates through the twelve */
      /* RM is read once: the timeline is decided at boot, a mid-session toggle of the OS setting must not strand it */
      var RM = reduce.matches;
      var t0 = performance.now() + 600, pool = arcs.slice(), nextBirth = t0, LIVE = 3, LIFE = 7000, FADE = 700, GROW = 1400, PERIOD = 2600, TAIL = 9, RIPPLE = 900, ripples = [];
      if (mode !== 'cycle' || RM) arcs.forEach(function (A, i) { A.born = RM ? 0 : t0 + i * 380; });
      else for (var s = pool.length - 1; s > 0; s--) { var j = Math.floor(Math.random() * (s + 1)), tmp = pool[s]; pool[s] = pool[j]; pool[j] = tmp; }
      function schedule(now) {
        if (mode !== 'cycle' || RM) return;
        var live = arcs.filter(function (A) { return A.born <= now && now < A.dies + FADE; }).length;
        if (live < LIVE && now >= nextBirth) {
          var A = pool.shift(); pool.push(A);
          if (A.born === Infinity || now >= A.dies + FADE) { A.born = now; A.dies = now + LIFE; A.e = 0; A.alpha = 0; A.lap = -1; nextBirth = now + 2400; }
        }
      }
      /* one arc in focus at a time: the newest arc while it grows, then the focus walks the live arcs every 3.5 s.
         Only the focused arc carries its label (peaks of neighbouring routes sit too close for two labels) */
      var focus = -1, focusAt = 0, HOLD = 3500;
      function pickFocus(now) {
        /* a birth takes focus only when nothing live holds it; otherwise the walk reaches the newborn after HOLD */
        arcs.forEach(function (A, i) { if (now >= A.born && !A.seen) { A.seen = true; if (focus < 0 || arcs[focus].alpha <= 0 || arcs[focus].dies <= now) { focus = i; focusAt = now; } } });
        if (now - focusAt < HOLD || (focus > -1 && arcs[focus].e < 1)) return;
        for (var n = 1; n <= arcs.length; n++) {
          var i = (focus + n) % arcs.length, A = arcs[i];
          if (now >= A.born && now < A.dies) { focus = i; focusAt = now; return; }
        }
      }
      function drawArcs(now, ph) {
        actx.clearRect(0, 0, c, c);
        actx.lineWidth = 1.5; actx.lineCap = 'round'; actx.lineJoin = 'round'; actx.strokeStyle = ink; actx.fillStyle = ink;
        pickFocus(now);
        arcs.forEach(function (A, idx) {
          if (now < A.born) { A.e = 0; A.alpha = 0; place(A, [0, 0, -1], 0); return; }
          A.e = RM ? 1 : ease((now - A.born) / GROW);
          A.alpha = now < A.dies ? 1 : clamp(1 - (now - A.dies) / FADE, 0, 1);
          if (A.alpha <= 0) { A.seen = false; place(A, [0, 0, -1], 0); return; }
          var hot = idx === focus;
          actx.globalAlpha = (hot ? 0.95 : 0.5) * A.alpha;
          var N = 48, pen = false, q, x, y, t, tPrev = 0, e0;
          actx.beginPath();
          for (var i = 0; i <= N; i++) {
            t = i / N * A.e; q = arcPoint(A, t, ph);
            if (!shown(q)) {
              if (pen) { e0 = edge(A, tPrev, t, ph); actx.lineTo(c / 2 + e0[0] * c / 2, c / 2 - e0[1] * c / 2); }
              pen = false; tPrev = t; continue;
            }
            x = c / 2 + q[0] * c / 2; y = c / 2 - q[1] * c / 2;
            if (pen) actx.lineTo(x, y);
            else { if (i > 0) { e0 = edge(A, t, tPrev, ph); actx.moveTo(c / 2 + e0[0] * c / 2, c / 2 - e0[1] * c / 2); actx.lineTo(x, y); } else actx.moveTo(x, y); }
            pen = true; tPrev = t;
          }
          actx.stroke();
          /* the head of a growing arc */
          if (A.e < 1 && shown(q)) { actx.beginPath(); actx.arc(x, y, 2.5, 0, Math.PI * 2); actx.fill(); }
          /* once landed, a comet rides the arc home on repeat: bright head, tail fading behind it, a ripple at the hub on arrival */
          if (A.e >= 1 && !RM) {
            var run = (now - A.born - GROW) / PERIOD, lap = Math.floor(run), s = run - lap;
            if (lap !== A.lap) { if (A.lap > -1) ripples.push({ at: now }); A.lap = lap; }
            for (var j = 1; j <= TAIL; j++) {
              var t1 = s - (TAIL - j + 1) * 0.014, t2 = s - (TAIL - j) * 0.014;
              if (t2 <= 0) continue;
              var p1 = arcPoint(A, Math.max(0, t1), ph), p2 = arcPoint(A, t2, ph);
              if (!shown(p1) || !shown(p2)) continue;
              actx.globalAlpha = A.alpha * (j / TAIL) * 0.95; actx.lineWidth = 1 + 1.6 * (j / TAIL);
              actx.beginPath(); actx.moveTo(c / 2 + p1[0] * c / 2, c / 2 - p1[1] * c / 2); actx.lineTo(c / 2 + p2[0] * c / 2, c / 2 - p2[1] * c / 2); actx.stroke();
            }
            var head = arcPoint(A, s, ph);
            if (shown(head)) { actx.globalAlpha = A.alpha; actx.beginPath(); actx.arc(c / 2 + head[0] * c / 2, c / 2 - head[1] * c / 2, 2.6, 0, Math.PI * 2); actx.fill(); }
            actx.lineWidth = 1.5;
          }
          /* short hops (Tokyo, Singapore: under about 40 degrees) skip the route label, its peak sits on top of the city pill */
          var peak = arcPoint(A, 0.5, ph);
          var k = (!hot || A.e < 1 || A.w < 0.7) ? 0 : A.alpha * (shown(peak) ? clamp((peak[2] + 0.05) / 0.2, 0, 1) : 0);
          place(A, peak, k);
        });
        /* city dots, drawn here from the same projection as the arcs and pills: cobe snaps its own markers to the
           nearest of its 16000 lattice dots, up to 4.8 px away, so an arc would land beside a cobe dot */
        pins.forEach(function (P) {
          var q = clip(P.v, 1, ph); if (q[2] <= 0) return;
          actx.globalAlpha = clamp((q[2] + 0.02) / 0.16, 0, 1); actx.strokeStyle = dark ? '#101010' : '#E2E2E2'; actx.lineWidth = 1.5;
          actx.beginPath(); actx.arc(c / 2 + q[0] * c / 2, c / 2 - q[1] * c / 2, P.city === HUB ? 3.6 : 2.7, 0, Math.PI * 2); actx.stroke(); actx.fill();
        });
        actx.strokeStyle = ink; actx.lineWidth = 1.5;
        /* arrival rings at the hub, drawn only while the hub faces the viewer */
        var hub = clip(hubV, 1, ph);
        ripples = ripples.filter(function (r) { return now - r.at < RIPPLE; });
        if (hub[2] > 0) ripples.forEach(function (r) {
          var age = (now - r.at) / RIPPLE;
          actx.globalAlpha = (1 - age) * 0.7; actx.lineWidth = 1.2;
          actx.beginPath(); actx.arc(c / 2 + hub[0] * c / 2, c / 2 - hub[1] * c / 2, 4 + 18 * age, 0, Math.PI * 2); actx.stroke();
        });
        actx.globalAlpha = 1;
      }
      function placePins(ph) {
        pins.forEach(function (P) { var q = clip(P.v, 1, ph); place(P, q, clamp((q[2] + 0.02) / 0.16, 0, 1)); });
      }
      createGlobe(canvas, {
        devicePixelRatio: 2, width: c * 2, height: c * 2, phi: 0, theta: theta, dark: dark ? 1 : 0,
        diffuse: dark ? 1.6 : 1.2, mapSamples: 16000, mapBrightness: dark ? 6 : 1.2,
        baseColor: dark ? [0.2, 0.2, 0.2] : [1, 1, 1], markerColor: dark ? [0.886, 0.886, 0.886] : [0.094, 0.094, 0.094],
        glowColor: dark ? [0.12, 0.12, 0.12] : [0.96, 0.96, 0.96], markers: [],
        onRender: function (st) {
          if (!visible) return;
          if (!dragging) { phi += (reduce.matches ? 0 : 0.0022) + vel; vel *= 0.94; }
          st.phi = phi; st.width = c * 2; st.height = c * 2;
          var now = performance.now();
          schedule(now);
          /* cobe markers carry only the live pings; the city dots are drawn on the overlay (see drawArcs) */
          st.markers = state.live.map(function (p) { return { location: CITY[p.city], size: 0.04 + 0.03 * clamp(1 - (now - p.at) / 1800, 0, 1) }; });
          state.live.forEach(function (p) {
            var ll = CITY[p.city], pt = project(ll[0], ll[1], phi), d = pings[p.slot];
            var vis = pt.z > 0.05 && now - p.at < 4200;
            d.style.opacity = vis ? '1' : '0';
            d.style.transform = 'translate(' + (pt.x - 15) + 'px,' + (pt.y - 15) + 'px)';
          });
          if (now - nightAt > (reduce.matches ? 60000 : 90)) { nightAt = now; drawNight(phi, theta); }
          drawArcs(now, phi);
          placePins(phi);
        }
      });
      canvas.classList.add('on');
      function down(e) { dragging = true; canvas.classList.add('dragging'); last = e.clientX; samples = []; vel = 0; }
      function move(e) { if (!dragging) return; var dx = e.clientX - last; last = e.clientX; phi += dx / c * Math.PI; samples.push({ t: performance.now(), dx: dx }); }
      function up() {
        if (!dragging) return; dragging = false; canvas.classList.remove('dragging');
        var now = performance.now(), rec = samples.filter(function (s) { return now - s.t < 100; });
        vel = clamp(rec.reduce(function (a, s) { return a + s.dx; }, 0) / c * 0.06, -0.08, 0.08);
      }
      canvas.addEventListener('pointerdown', down); addEventListener('pointermove', move); addEventListener('pointerup', up);
      addEventListener('resize', function () { c = size(); fitArcCanvas(); });
      timer = setTimeout(ambient, 500);
      el.__globe = { state: state, project: project, land: land, arcs: arcs, pins: pins, mode: mode, getPhi: function () { return phi; }, setPhi: function (v) { phi = v; vel = 0; nightAt = 0; } };
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { visible = e.isIntersecting; if (visible) boot(); });
    }, { threshold: 0.15 });
    io.observe(el);
  }

  window.JTLGlobe = { CITY: CITY, HUB: HUB, REACH: REACH, VISITOR: VISITOR, sun: sun, vec: vec, init: globe };
  function boot() { document.querySelectorAll('.jp-globe[data-globe]').forEach(globe); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

/* v7 globe: cobe dotted globe (E-54b mechanics) with JTL ping tiles, a rolling
   counter (E-52b) that counts the visitor's own keystrokes, ambient pings on the
   cities on record (Caloocan HQ, Taguig workshop venue, the visitor's city from
   the browser timezone), a real day-and-night overlay from the sun position, and
   an orbiting JTL satellite (markup here, motion in home.css).
   Listens: window 'jtl-keydown' (from term.js) -> ping the visitor's city, +1.
   Boots when in view, renders only while visible. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var MARK = '<svg viewBox="288 703 1315 626" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="141.5" stroke-linecap="butt"><path d="M624 774H1267"/><path d="M846 706V1122A134.5 134.5 0 0 1 711.5 1256.5H494A134.5 134.5 0 0 1 359.5 1122"/><path d="M1195 706V1122A134.5 134.5 0 0 0 1329.5 1256.5H1602"/></g></svg>';

  /* cities with evidence only */
  var CITY = { Caloocan: [14.65, 120.97], Taguig: [14.53, 121.05] };
  var AMBIENT = ['Caloocan', 'Taguig'];
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

  /* geo helpers shared by markers, pings and the night shade (cobe's frame) */
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
  function manilaTime() {
    try { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }).format(new Date()); }
    catch (e) { return ''; }
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
    var stage = el.parentNode;
    /* orbit ring, styled by home.css */
    var orbit = document.createElement('div'); orbit.className = 'jp-orbit'; orbit.setAttribute('aria-hidden', 'true');
    /* satellite: one JTL tile and six ghosts, moved per frame on a tilted ellipse
       around the globe; z-index flips so the near half passes in front */
    var ring = '<i class="jp-sat">' + MARK + '</i>';
    for (var k = 1; k <= 6; k++) ring += '<i class="jp-sat-ghost" style="--k:' + k + '"></i>';
    orbit.innerHTML = ring;
    stage.insertBefore(orbit, el);
    var sats = [].slice.call(orbit.children), satAngle = Math.PI * 1.15, satAt = 0;
    function moveSats(now) {
      if (!reduce.matches) { var dt = satAt ? Math.min(50, now - satAt) : 16; satAngle += (2 * Math.PI / 14000) * dt; }
      satAt = now;
      var w = orbit.clientWidth || 640, cx = w / 2, cy = w / 2, R = w * 0.56, tilt = 0.42;
      sats.forEach(function (s, i) {
        var a = satAngle - i * 0.11;
        var x = cx + R * Math.cos(a), y = cy + R * tilt * Math.sin(a), front = Math.sin(a) > 0;
        var sc = front ? 1 : 0.8;
        s.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + sc + ')';
        s.style.zIndex = front ? 4 : 0;
        s.style.opacity = i === 0 ? (front ? 1 : 0.55) : Math.max(0, 0.5 - i * 0.07) * (front ? 1 : 0.6);
      });
    }
    moveSats(performance.now());
    var canvas = document.createElement('canvas'); el.appendChild(canvas);
    var night = document.createElement('canvas'); night.className = 'jp-night'; night.width = 96; night.height = 96; el.appendChild(night);
    var nctx = night.getContext('2d');
    var pings = [];
    for (var i = 0; i < 6; i++) { var d = document.createElement('div'); d.className = 'jp-ping'; d.innerHTML = MARK; el.appendChild(d); pings.push(d); }
    var cnt = null;
    if (wantCounter) { var c = document.createElement('div'); el.parentNode.insertBefore(c, el.nextSibling); cnt = counter(c, 'keystrokes since you arrived'); }
    var cap = document.createElement('div'); cap.className = 'jp-globe-cap';
    cap.innerHTML = '<span>Running in </span><b data-city>' + VISITOR + '</b>';
    var after = cnt ? el.nextSibling.nextSibling : el.nextSibling;
    el.parentNode.insertBefore(cap, after);
    var clock = document.createElement('div'); clock.className = 'jp-clock';
    el.parentNode.insertBefore(clock, cap.nextSibling);
    function tickClock() { var t = manilaTime(); clock.textContent = t ? 'It is ' + t + ' in Caloocan, the seats are on shift' : ''; }
    tickClock(); setInterval(tickClock, 30000);
    var capCity = cap.querySelector('[data-city]');

    var booted = false, visible = false, timer = 0;
    var state = { phi: 0, theta: 0.25, c: 0, live: [] };
    var slot = 0, holdUntil = 0;
    function land(city, hold) {
      var s = slot++ % pings.length, now = performance.now();
      state.live = state.live.filter(function (p) { return p.slot !== s; });
      state.live.push({ city: city, at: now, slot: s });
      var d = pings[s]; d.classList.remove('live'); void d.offsetWidth; d.classList.add('live');
      /* the visitor's own ping owns the caption for a beat; ambient pings do not talk over it */
      if (hold) holdUntil = now + 2500;
      if (hold || now >= holdUntil) capCity.textContent = city;
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
      import('https://cdn.jsdelivr.net/npm/cobe@0.6.3/+esm').then(function (m) { start(m.default); }).catch(function () {
        var note = document.createElement('div'); note.className = 'jp-globe-fallback';
        note.textContent = 'The globe needs network access to load cobe.';
        canvas.remove(); night.remove(); el.appendChild(note);
      });
    }
    function drawNight(phi, theta) {
      var S = rot(sun(), phi, theta);
      var img = nctx.createImageData(96, 96), px = img.data, R = 96 / 2, rr = 0.4 * 96 / (96 / 2); /* sphere radius in canvas units = 0.4 * c relative to c/2 centre */
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
      function project(lat, lng, ph) {
        var p = rot(vec(lat, lng), ph, theta);
        return { x: c / 2 + p[0] * c * 0.4, y: c / 2 - p[1] * c * 0.4, z: p[2] };
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
          st.markers = state.live.map(function (p) { return { location: CITY[p.city], size: 0.04 + 0.03 * clamp(1 - (now - p.at) / 1800, 0, 1) }; });
          state.live.forEach(function (p) {
            var ll = CITY[p.city], pt = project(ll[0], ll[1], phi), d = pings[p.slot];
            var vis = pt.z > 0.05 && now - p.at < 4200;
            d.style.opacity = vis ? '1' : '0';
            d.style.transform = 'translate(' + (pt.x - 15) + 'px,' + (pt.y - 15) + 'px)';
          });
          if (now - nightAt > (reduce.matches ? 60000 : 90)) { nightAt = now; drawNight(phi, theta); }
          moveSats(now);
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
      addEventListener('resize', function () { c = size(); });
      timer = setTimeout(ambient, 500);
      el.__globe = { state: state, project: project, land: land, getPhi: function () { return phi; }, setPhi: function (v) { phi = v; vel = 0; nightAt = 0; } };
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { visible = e.isIntersecting; if (visible) boot(); });
    }, { threshold: 0.15 });
    io.observe(el);
  }

  window.JTLGlobe = { CITY: CITY, VISITOR: VISITOR, sun: sun, init: globe };
  function boot() { document.querySelectorAll('.jp-globe[data-globe]').forEach(globe); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

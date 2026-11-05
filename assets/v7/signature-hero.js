/* JTL Signature hero (Owner pick pk-1388): routed-lines background + workflow card timeline.
   Source of truth for the preview: HQ ops/runs/jtl-signature-2026-11-05/src/bg1.js + timeline.js.
   #p1 runs the loop; #p1clone (the horizontal wrap copy) gets the same static traces and a finished card.
   Starts when the draw intro (#boot) gets .off or leaves the DOM, 5 s fallback. Reduced motion: no pulses. */
(function () {
  var D = document, P1 = D.getElementById('p1'), CL = D.getElementById('p1clone');
  if (!P1 || !P1.classList.contains('sg')) return;
  var R = matchMedia('(prefers-reduced-motion:reduce)').matches, NS = 'http://www.w3.org/2000/svg';

  function Routes(H0) {
    var bg = H0.querySelector('.sg-bg'), svg = bg.querySelector('svg'), P = { m: [], p: [], f: [] };
    function rc(e) { var r = e.getBoundingClientRect(), h = H0.getBoundingClientRect(); return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height }; }
    // chamfer the corners of a polyline (45 degree turns, the JTL mark's own grammar)
    function ch(p, c) {
      var o = [p[0]], i, a, b, n, l1, l2, k;
      for (i = 1; i < p.length - 1; i++) {
        a = p[i - 1]; b = p[i]; n = p[i + 1];
        l1 = Math.hypot(b[0] - a[0], b[1] - a[1]); l2 = Math.hypot(n[0] - b[0], n[1] - b[1]);
        k = Math.max(0, Math.min(c, l1 / 2, l2 / 2));
        o.push([b[0] - (b[0] - a[0]) / l1 * k, b[1] - (b[1] - a[1]) / l1 * k], [b[0] + (n[0] - b[0]) / l2 * k, b[1] + (n[1] - b[1]) / l2 * k]);
      }
      o.push(p[p.length - 1]); return o;
    }
    function dr(q, cl) { var p = D.createElementNS(NS, 'path'); p.setAttribute('d', 'M' + q.map(function (a) { return a[0].toFixed(1) + ' ' + a[1].toFixed(1); }).join('L')); p.setAttribute('class', cl); svg.appendChild(p); }
    function ring(x, y) { var e = D.createElementNS(NS, 'circle'); e.setAttribute('cx', x); e.setAttribute('cy', y); e.setAttribute('r', 3.5); e.setAttribute('class', 'vi'); svg.appendChild(e); }
    // a pulse is a dot with a short trail; it only ever moves along its trace toward the card
    function pulse(q, delay, dur, op) {
      var L = [0], t = 0, i;
      for (i = 1; i < q.length; i++) { t += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); L.push(t); }
      var kf = q.map(function (p, i) { return { transform: 'translate3d(' + p[0].toFixed(1) + 'px,' + p[1].toFixed(1) + 'px,0)', offset: L[i] / t }; });
      [[6, 1], [4.4, .55], [3.2, .28]].forEach(function (s, j) {
        var e = D.createElement('i'); e.className = 'pl';
        e.style.cssText = 'width:' + s[0] + 'px;height:' + s[0] + 'px;margin:' + (-s[0] / 2) + 'px 0 0 ' + (-s[0] / 2) + 'px';
        bg.appendChild(e);
        var o = { duration: dur, delay: delay + j * 85, easing: 'linear', fill: 'both' };
        e.animate(kf, o);
        var a = e.animate([{ opacity: 0 }, { opacity: op * s[1], offset: .04 }, { opacity: op * s[1], offset: Math.max(.06, 1 - 70 / t) }, { opacity: 0 }], o);
        a.onfinish = function () { e.remove(); };
      });
    }
    function layout() {
      var W = H0.clientWidth, H = H0.clientHeight, tgt = H0.querySelector('.sg-tgt');
      if (!W || !H || !tgt || !tgt.offsetWidth) return false;
      [].forEach.call(svg.querySelectorAll('*'), function (n) { n.remove(); });
      P = { m: [], p: [], f: [] };
      var c = rc(tgt), ic = [].map.call(H0.querySelectorAll('.sg-st .sg-ic'), function (e) { var r = rc(e); return [r.x + r.w / 2, r.y + r.h / 2]; }),
        ix = ic[0][0], m = matchMedia('(max-width:860px)').matches, C = 34, M, PA = [], F = [], j, y0, y3, xa;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      if (!m) {
        y0 = Math.max(80, c.y - 150); y3 = Math.min(H - 40, c.y + c.h + 150);
        M = [[[ix + 430, y0], [ix, y0], ic[0]], [[10, ic[1][1] - 260], [10, ic[1][1]], ic[1]], [[ix + 430, y3], [ix, y3], ic[2]]];
        [14, 28].forEach(function (k) { PA.push([0, [[ix + 430, y0 + k], [ix + k, y0 + k], [ix + k, c.y + 36]], k]); PA.push([2, [[ix + 430, y3 - k], [ix + k, y3 - k], [ix + k, c.y + c.h - 36]], k]); });
        for (j = 0; j < 3; j++) { xa = c.x + c.w * (.55 + .17 * j); F.push([[W + 10, 80 + 28 * j], [xa + 150 + 40 * j, 80 + 28 * j], [xa + 150 + 40 * j, 134 + 28 * j], [xa, 134 + 28 * j], [xa, c.y + 30]], [[W + 10, H - 70 - 28 * j], [xa + 150 + 40 * j, H - 70 - 28 * j], [xa + 150 + 40 * j, H - 124 - 28 * j], [xa, H - 124 - 28 * j], [xa, c.y + c.h - 30]]); }
      } else {
        M = [[[8, Math.max(80, c.y - 170)], [8, ic[0][1]], ic[0]], [[W - 8, Math.max(80, c.y - 120)], [W - 8, ic[1][1]], ic[1]], [[W - 8, H - 34], [ix, H - 34], ic[2]]];
        [12, 24].forEach(function (k) { PA.push([2, [[W - 8, H - 34 - k], [ix + k, H - 34 - k], [ix + k, c.y + c.h - 30]], k]); });
        for (j = 0; j < 2; j++) { xa = c.x + c.w * (.45 + .35 * j); F.push([[W + 10, H - 78 + 22 * j - 22], [xa + 60, H - 78 + 22 * j - 22], [xa + 60, H - 108 + 22 * j - 22], [xa, H - 108 + 22 * j - 22], [xa, c.y + c.h - 30]]); }
      }
      M.forEach(function (p) { var q = ch(p, C); P.m.push(q); dr(q, 't1'); if (p[0][0] < W && p[0][1] > 0) ring(p[0][0], p[0][1]); });
      PA.forEach(function (a) { var q = ch(a[1], Math.max(8, C - .414 * a[2])); P.p.push([a[0], q]); dr(q, 't2'); });
      F.forEach(function (p) { var q = ch(p, 22); P.f.push(q); dr(q, 't3'); });
      return true;
    }
    function fire(i, d) { if (!P.m[i]) return; pulse(P.m[i], d, 1500, 1); P.p.forEach(function (a) { if (a[0] === i) pulse(a[1], d + 70, 1500, .5); }); }
    function amb() {
      [[0, 700], [1, 2300], [2, 3900], [3, 5600], [4, 1500], [5, 4700], [1, 7000]].forEach(function (a) {
        var q = P.f[a[0] % P.f.length];
        if (q) pulse(q, a[1], Math.hypot(q[q.length - 1][0] - q[0][0], q[q.length - 1][1] - q[0][1]) * 1.5 / .3 | 0, .6);
      });
    }
    return { layout: layout, fire: fire, amb: amb };
  }

  var live = Routes(P1), still = CL ? Routes(CL) : null;
  var st = [].slice.call(P1.querySelectorAll('.sg-st')), w = P1.querySelector('.sg-wfw'), c = P1.querySelector('.sg-cnt'), wf = P1.querySelector('.sg-wf'), wr = P1.querySelectorAll('.sg-wd');
  for (var k = 0; k < wr.length; k++) wr[k].style.transitionDelay = (k * .09) + 's';
  function set(n) { wf.setAttribute('data-n', n); st.forEach(function (e, i) { e.classList.toggle('done', i < n); e.classList.toggle('on', i === n); }); c.textContent = Math.min(n, 3) + '/3'; }
  // pulse arrival is the card step: each step lights when its pulse reaches it (launch = arrival minus 1.5 s)
  function cycle() {
    var A = [1500, 3400, 5300];
    A.forEach(function (a, i) { live.fire(i, a - 1500); setTimeout(function () { set(i); }, a); });
    setTimeout(function () { set(3); }, A[2] + 1300);
    live.amb();
    setTimeout(function () { w.classList.add('rst'); }, 8800);
    setTimeout(function () { st.forEach(function (e) { e.classList.remove('on', 'done'); }); c.textContent = '0/3'; wf.setAttribute('data-n', 0); }, 9300);
    setTimeout(function () { w.classList.remove('rst'); cycle(); }, 9450);
  }
  function paint() { live.layout(); if (still) still.layout(); }
  function go() {
    P1.classList.add('sg-go');
    if (R) { paint(); set(3); } else setTimeout(function () { paint(); cycle(); }, 1350);
  }
  var rz; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(paint, 200); });
  var b = D.getElementById('boot');
  if (!b || R) { go(); }
  else {
    var f = 0, h = function () { if (f) return; f = 1; go(); };
    new MutationObserver(function () { if (!D.getElementById('boot') || b.classList.contains('off')) h(); }).observe(D.body, { attributes: true, subtree: true, childList: true });
    setTimeout(h, 5000);
  }
})();

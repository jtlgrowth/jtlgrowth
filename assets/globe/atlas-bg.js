/* Mind Atlas — background build.
   Ported from ~/Venice/globe/index.html (the live Mind Atlas page served by
   ops-api). Geometry is MEASURED from that file, not invented: R = 5, a 14-lat /
   20-lon wire cage at opacity .17, an equator torus, one tilted ring with 90
   fibonacci sparkles, a Saturn nucleus, and a memory cloud laid out on a
   fibonacci sphere. What changed, and why:

   - alpha:true + a transparent clear colour. The page version paints an opaque
     #050406 and would occlude everything under it.
   - the canvas sizes from its CONTAINER, not window.innerWidth/Height.
   - no OrbitControls. On the page it captures the wheel for dolly with no
     enableZoom=false, so it would eat the visitor's scroll. The camera is driven
     by scroll progress instead.
   - no CSS2DRenderer, no labels, no click-picking, no search, no reader, no
     attract/screensaver mode, no WebAudio, no SSE presence bridge, no
     document-level key handlers. A background must never steal a keystroke.
   - a real pause: IntersectionObserver + visibilitychange. The page version runs
     an unconditional rAF forever.
   - warm hues out. The atlas ships #ffcc66 / #ff6b9d / #7ff0be; the JTL register
     is mono with no warm hues anywhere, so every colour here is a grey.

   Data is the text-free snapshot from ops/globe-snapshot.py — shape only, never
   titles or note bodies. See that file for why.                                */

import * as THREE from './three.module.js';

const R = 5;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* mono register — silver ramp, no hue */
const C = {
  star:   0xE2E2E2,
  wire:   0xD5D5D5,
  ring:   0xFFFFFF,
  spark:  0xE2E2E2,
  core:   0xEDEDED,
  puff:   0xB9B9B9,
  dust:   [0xE2E2E2, 0xC9C9C9, 0xB9B9B9, 0x969696, 0x7A7A7A, 0x616161],
  kind:   [0xFFFFFF, 0xB9B9B9, 0x8F8F8F],   // school · decision · memory
  edge:   0x9E9E9E
};
const KIND_SIZE = [0.16, 0.14, 0.085];

const hash01 = t => {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
};

function fibSpherePoint(index, total, radius) {
  const ga = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / Math.max(total - 1, 1)) * 2;
  const r = Math.sqrt(Math.max(1 - y * y, 0)), th = ga * index;
  return new THREE.Vector3(Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius);
}

function memberOffset(seed, spread) {
  const th = hash01(seed + ':t') * Math.PI * 2;
  const phi = Math.acos(2 * hash01(seed + ':p') - 1);
  const r = spread * (0.35 + hash01(seed + ':r'));
  return new THREE.Vector3(r * Math.sin(phi) * Math.cos(th), r * Math.sin(phi) * Math.sin(th), r * Math.cos(phi));
}

function softDot() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(.15, 'rgba(255,255,255,.6)');
  g.addColorStop(.5, 'rgba(255,255,255,.1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

export function initAtlas({ container, atlas, dust }) {
  if (!container) return null;

  const dot = softDot();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  const root = new THREE.Group();
  scene.add(root);

  const disposables = [];
  const track = o => { disposables.push(o); return o; };

  /* ── starfield ─────────────────────────────────────────────── */
  {
    const pos = [];
    for (let i = 0; i < 900; i++) {
      pos.push((hash01('sx' + i) - .5) * 130, (hash01('sy' + i) - .5) * 130, (hash01('sz' + i) - .5) * 130);
    }
    const g = track(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)));
    const m = track(new THREE.PointsMaterial({ color: C.star, size: .12, map: dot, sizeAttenuation: true, transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(new THREE.Points(g, m));
  }

  /* ── wire cage: 14 latitudes, 20 longitudes ────────────────── */
  {
    const wireMat = track(new THREE.LineBasicMaterial({ color: C.wire, transparent: true, opacity: .10, blending: THREE.AdditiveBlending, depthWrite: false }));
    for (let i = 1; i < 14; i++) {
      const phi = (i / 14) * Math.PI, r = R * Math.sin(phi), y = R * Math.cos(phi), pts = [];
      for (let j = 0; j <= 80; j++) { const th = (j / 80) * Math.PI * 2; pts.push(new THREE.Vector3(r * Math.cos(th), y, r * Math.sin(th))); }
      root.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(pts)), wireMat));
    }
    for (let i = 0; i < 20; i++) {
      const th = (i / 20) * Math.PI * 2, pts = [];
      for (let j = 0; j <= 80; j++) { const phi = (j / 80) * Math.PI; pts.push(new THREE.Vector3(R * Math.sin(phi) * Math.cos(th), R * Math.cos(phi), R * Math.sin(phi) * Math.sin(th))); }
      root.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(pts)), wireMat));
    }
    const eq = new THREE.Mesh(
      track(new THREE.TorusGeometry(R, .01, 8, 128)),
      track(new THREE.MeshBasicMaterial({ color: C.ring, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })));
    eq.rotation.x = Math.PI / 2;
    root.add(eq);
  }

  /* ── tilted ring + sparkles ────────────────────────────────── */
  {
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(R * .94, .008, 8, 128)),
      track(new THREE.MeshBasicMaterial({ color: C.ring, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false })));
    ring.rotation.x = Math.PI / 2 + (hash01('ringx0') - .5) * .55;
    ring.rotation.z = (hash01('ringz0') - .5) * .45;
    root.add(ring);
    const pos = [];
    for (let i = 0; i < 90; i++) {
      const p = fibSpherePoint(i * 3 + 1, 270, R * .99);
      pos.push(p.x + (hash01(i + 'sx') - .5) * .3, p.y + (hash01(i + 'sy') - .5) * .3, p.z + (hash01(i + 'sz') - .5) * .3);
    }
    root.add(new THREE.Points(
      track(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))),
      track(new THREE.PointsMaterial({ color: C.spark, size: .06, map: dot, transparent: true, opacity: .48, depthWrite: false, blending: THREE.AdditiveBlending }))));
  }

  /* ── nucleus: puff + filaments + double ring ───────────────── */
  {
    const nucleus = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const m = track(new THREE.SpriteMaterial({ map: dot, color: i ? C.puff : C.core, transparent: true, opacity: i ? .3 : .5, blending: THREE.AdditiveBlending, depthWrite: false }));
      const sp = new THREE.Sprite(m);
      const sc = 1.4 + i * .6; sp.scale.set(sc, sc, 1);
      nucleus.add(sp);
    }
    const fp = [];
    for (let i = 0; i < 90; i++) {
      const d = new THREE.Vector3(hash01('fx' + i) - .5, hash01('fy' + i) - .5, hash01('fz' + i) - .5).normalize();
      const l = .5 + hash01('fl' + i) * .5;
      fp.push(0, 0, 0, d.x * l, d.y * l, d.z * l);
    }
    nucleus.add(new THREE.LineSegments(
      track(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(fp, 3))),
      track(new THREE.LineBasicMaterial({ color: C.puff, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }))));
    [[1.15, .012, .45], [1.45, .006, .2]].forEach(([r, t, o]) => {
      const rg = new THREE.Mesh(
        track(new THREE.TorusGeometry(r, t, 8, 96)),
        track(new THREE.MeshBasicMaterial({ color: C.core, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false })));
      rg.rotation.x = Math.PI / 2 - .18;
      nucleus.add(rg);
    });
    root.add(nucleus);
  }

  /* ── memory cloud + threads (from the text-free snapshot) ──── */
  let nodeCount = 0, edgeCount = 0;
  if (atlas && Array.isArray(atlas.nodes) && atlas.nodes.length) {
    const kinds = atlas.nodes, n = kinds.length;
    nodeCount = n;
    const pts = new Array(n);
    const buckets = [[], [], []];
    for (let i = 0; i < n; i++) {
      const p = fibSpherePoint(i, n, R * (0.72 + hash01('rr' + i) * 0.3));
      p.add(memberOffset('n' + i, .28));
      pts[i] = p;
      buckets[kinds[i]] ? buckets[kinds[i]].push(p) : buckets[2].push(p);
    }
    buckets.forEach((bucket, k) => {
      if (!bucket.length) return;
      const pos = [];
      bucket.forEach(p => pos.push(p.x, p.y, p.z));
      root.add(new THREE.Points(
        track(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))),
        track(new THREE.PointsMaterial({ color: C.kind[k], size: KIND_SIZE[k], map: dot, transparent: true, opacity: k === 2 ? .62 : .9, depthWrite: false, blending: THREE.AdditiveBlending }))));
    });
    const edges = Array.isArray(atlas.edges) ? atlas.edges : [];
    const ep = [];
    edges.forEach(([a, b]) => {
      const pa = pts[a], pb = pts[b];
      if (!pa || !pb) return;
      ep.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
      edgeCount++;
    });
    if (ep.length) {
      root.add(new THREE.LineSegments(
        track(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(ep, 3))),
        track(new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false }))));
    }
  }

  /* ── graphify dust: the 16-vertex tesseract, inside the sphere ─ */
  if (dust && Array.isArray(dust.nodes) && dust.nodes.length) {
    const verts = [];
    for (let ring = 0; ring < 2; ring++) {
      const sc = ring === 0 ? 1.85 : 0.95;
      for (let b = 0; b < 8; b++) verts.push([(b & 1 ? 1 : -1) * sc, (b & 2 ? 1 : -1) * sc, (b & 4 ? 1 : -1) * sc]);
    }
    const pos = [], col = [];
    dust.nodes.forEach(([comm, deg], i) => {
      const v = verts[comm % 16];
      const j = memberOffset('d' + i, .62);
      pos.push(v[0] + j.x, v[1] + j.y, v[2] + j.z);
      const c = new THREE.Color(C.dust[comm % C.dust.length]);
      col.push(c.r, c.g, c.b);
    });
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    root.add(new THREE.Points(g, track(new THREE.PointsMaterial({
      size: .055, map: dot, vertexColors: true, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending
    }))));
  }

  /* ── sizing ────────────────────────────────────────────────── */
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  /* ── camera: driven by page scroll, never by the wheel ─────── */
  let scrollP = 0;
  function readScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollP = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  }
  readScroll();
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', readScroll, { passive: true });

  function place(t) {
    const p = scrollP;
    root.rotation.y = (REDUCED ? 0 : t * 0.045) + p * Math.PI * 0.85;
    root.rotation.x = -0.12 + p * 0.34;
    camera.position.set(0, 3.0 - p * 2.0, 13.6 - p * 2.4);
    camera.lookAt(0, 0, 0);
  }

  /* ── loop, paused whenever it is off-screen or the tab is hidden ─ */
  let raf = null, visible = true, start = null;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (start === null) start = now;
    place((now - start) / 1000);
    renderer.render(scene, camera);
  }
  function play() {
    if (REDUCED) { place(0); renderer.render(scene, camera); return; }
    if (raf === null) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
  }
  const io = new IntersectionObserver(es => {
    visible = es.some(e => e.isIntersecting);
    visible && !document.hidden ? play() : stop();
  }, { threshold: 0 });
  io.observe(container);
  const onVis = () => (visible && !document.hidden ? play() : stop());
  document.addEventListener('visibilitychange', onVis);
  play();

  return {
    nodes: nodeCount,
    edges: edgeCount,
    reduced: REDUCED,
    destroy() {
      stop(); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('scroll', readScroll);
      removeEventListener('resize', readScroll);
      disposables.forEach(d => d.dispose && d.dispose());
      dot.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}

/* Room hero: the Batch 1 clip rendered as a halftone field on a full-screen quad.
   three r167 from /assets/globe/three.module.js, the copy already deployed on this
   site (zero new library bytes). Motion is driven only by scroll, the pointer and
   the footage itself: nothing drifts on its own (Owner rule: directional, not
   ambient). The stage is constant-dark chrome in both themes, so the two colours
   are literal, like the site's other dark panels.

   design-standards canvas checklist, all four:
     1. DPR clamp  Math.min(dpr, innerWidth < 820 ? 1.5 : 2), then halved: the
        halftone hides sub-cell detail, so half resolution is invisible.
     2. visibility-gated loop  IntersectionObserver + visibilitychange.
     3. reduced motion read inside the loop  flips on -> loop stops, plain fallback.
     4. webglcontextlost teardown  dispose everything, plain fallback.
   Never a black hole: the <video> stays visible under the canvas with its poster,
   so every failure path shows the plain mono clip with the scrim.                 */
import * as THREE from '/assets/globe/three.module.js';

const VERT = `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform sampler2D uTex; uniform vec2 uRes; uniform vec2 uTexRes;
uniform float uCell; uniform float uMix; uniform vec2 uPointer; uniform float uLens;
uniform vec3 uDot; uniform vec3 uGround;
varying vec2 vUv;
/* cover-fit: map stage uv onto the clip so the clip covers the stage, centred */
vec2 coverUv(vec2 uv){
  float sa = uRes.x / uRes.y, ta = uTexRes.x / uTexRes.y;
  vec2 s = sa > ta ? vec2(1.0, ta / sa) : vec2(sa / ta, 1.0);
  return (uv - 0.5) * s + 0.5;
}
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
  vec2 cells = uRes / uCell;
  vec2 cellUv = (floor(vUv * cells) + 0.5) / cells;
  float l = luma(texture2D(uTex, coverUv(cellUv)).rgb);
  vec2 local = fract(vUv * cells) - 0.5;
  float r = 0.49 * sqrt(l);                 /* dot radius grows with brightness */
  float aa = 0.9 / uCell;                   /* about one device pixel of edge */
  float d = smoothstep(r + aa, r - aa, length(local));
  vec3 halftone = mix(uGround, uDot, d);
  float sharp = luma(texture2D(uTex, coverUv(vUv)).rgb);
  vec3 mono = mix(uGround, uDot, sharp);
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float lens = uLens > 0.0 ? smoothstep(uLens, uLens * 0.25, distance(vUv * asp, uPointer * asp)) : 0.0;
  gl_FragColor = vec4(mix(halftone, mono, max(lens, uMix)), 1.0);
}`;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* stage: the sticky 100svh box; track: its 200svh parent; copy: the text block that
   reads --p; cue: the scroll cue; cell: coarse cell size in CSS px (default 12).
   onFail: called on any teardown so the page can switch to the plain fallback.   */
export function initRoomHero({ stage, video, canvas, track, copy, cue, cell = 12, onFail }) {
  if (!stage || !video || !canvas || !track || reduced()) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  const pr = Math.max(0.5, Math.min(devicePixelRatio || 1, innerWidth < 820 ? 1.5 : 2) * 0.5);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x121212, 1);

  const tex = new THREE.VideoTexture(video);        /* r167: self-updates via requestVideoFrameCallback */
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;

  const u = {
    uTex: { value: tex },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTexRes: { value: new THREE.Vector2(16, 9) },
    uCell: { value: cell * pr },
    uMix: { value: 0 },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uLens: { value: 0 },
    uDot: { value: new THREE.Color('#E2E2E2') },
    uGround: { value: new THREE.Color('#121212') }
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, depthTest: false, depthWrite: false });
  const geo = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(mesh);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function resize() {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    u.uRes.value.set(Math.round(w * pr), Math.round(h * pr));
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(stage);
  const onMeta = () => { if (video.videoWidth) u.uTexRes.value.set(video.videoWidth, video.videoHeight); };
  onMeta(); video.addEventListener('loadedmetadata', onMeta);

  /* pointer lens, fine pointers only, eased toward the target each frame (no spring) */
  const fine = matchMedia('(pointer: fine)').matches;
  const target = { x: 0.5, y: 0.5, lens: 0 };
  const onMove = e => {
    const r = stage.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width; target.y = 1 - (e.clientY - r.top) / r.height; target.lens = 0.16;
  };
  const onLeave = () => { target.lens = 0; };
  if (fine) { stage.addEventListener('pointermove', onMove, { passive: true }); stage.addEventListener('pointerleave', onLeave); }

  let raf = null, visible = true, cueGone = false, lit = false;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (reduced()) { destroy(); return; }                       /* checklist item 3 */
    const r = track.getBoundingClientRect();
    const total = track.offsetHeight - innerHeight;
    const p = total > 0 ? clamp(-r.top / total, 0, 1) : (r.top <= 0 ? 1 : 0);
    const dissolve = smooth(0, 0.55, p);
    u.uCell.value = (cell - (cell - cell / 3) * dissolve) * pr;
    u.uMix.value = smooth(0.25, 0.55, p);
    u.uPointer.value.x += (target.x - u.uPointer.value.x) * 0.18;
    u.uPointer.value.y += (target.y - u.uPointer.value.y) * 0.18;
    u.uLens.value += (target.lens - u.uLens.value) * 0.12;
    if (copy) copy.style.setProperty('--p', p.toFixed(4));
    if (cue && !cueGone && p > 0.02) { cue.classList.add('gone'); cueGone = true; }
    renderer.render(scene, cam);
    if (!lit && video.readyState >= 2) { lit = true; canvas.classList.add('lit'); }
  }
  function play() { if (raf === null) raf = requestAnimationFrame(frame); }
  function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
  const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); visible && !document.hidden ? play() : stop(); }, { threshold: 0 });
  io.observe(stage);
  const onVis = () => (visible && !document.hidden ? play() : stop());
  document.addEventListener('visibilitychange', onVis);
  const onLost = e => { e.preventDefault(); destroy(); };        /* checklist item 4 */
  canvas.addEventListener('webglcontextlost', onLost);
  const onHide = () => destroy();
  addEventListener('pagehide', onHide);

  let dead = false;
  function destroy() {
    if (dead) return; dead = true;
    stop(); ro.disconnect(); io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    removeEventListener('pagehide', onHide);
    canvas.removeEventListener('webglcontextlost', onLost);
    video.removeEventListener('loadedmetadata', onMeta);
    if (fine) { stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave); }
    geo.dispose(); mat.dispose(); tex.dispose(); renderer.dispose();
    canvas.classList.remove('lit');
    if (onFail) onFail();
  }

  video.play().catch(() => {});
  play();
  return { destroy };
}

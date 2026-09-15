/* work-gallery.js — six-screen shelf scene for /work/: one scroll-driven camera
   dolly from a wide row shot to a close pass on the sixth screen (the workshop).
   Plain three.js ES module, no build step, no npm. Bails cleanly on no WebGL2 or
   a narrow viewport; the DOM gallery below (#grid) works with zero JS either way. */
import * as THREE from '/assets/globe/three.module.js';

const SCREENS = [
  { id: 'fwib', name: 'FWIB', img: '/shots/fwib.png' },
  { id: 'jtl', name: 'JTL Growth site', img: '/shots/jtlgrowth.png' },
  { id: 'nightshift', name: 'AVAS Night Shift', img: '/shots/avas-nightshift.png' },
  { id: 'rnc', name: 'Robots & Coffee', img: '/shots/rnc.png' },
  { id: 'avas-workshop', name: 'AVAS AI Workshop', img: '/shots/avas-ai-workshop.png' },
  { id: 'workshop', name: 'Batch 1 Workshop', img: '/shots/workshop.png' }
];

const stageEl = document.getElementById('stage');
if (stageEl) boot();

function supportsWebGL2() {
  try {
    var c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch (e) { return false; }
}

function boot() {
  if (innerWidth < 720 || !supportsWebGL2()) { stageEl.hidden = true; return; }
  init().catch(function () { stageEl.hidden = true; });
}

async function init() {
  var pin = stageEl.querySelector('.stage-pin');
  var canvas = document.getElementById('stage-gl');
  var track = stageEl.querySelector('.stage-track');
  var cap = document.getElementById('stage-cap');
  var capName = document.getElementById('stage-cap-name');
  var capOpen = document.getElementById('stage-cap-open');
  var dots = [].slice.call(document.querySelectorAll('#stage-rail i'));
  var toggle = document.getElementById('stage-toggle');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;
  var motion = stageEl.getAttribute('data-motion') || 'full';

  var bg = readBg(pin);
  var scene = new THREE.Scene();
  scene.background = bg;
  scene.fog = new THREE.Fog(bg.getHex(), 4, 24);

  var camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 40);
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  var key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(0, 4.5, 2.5);
  scene.add(key);

  var N = SCREENS.length;
  var planeW = 1.6, planeH = 1.0, gap = 0.42;
  var totalW = N * planeW + (N - 1) * gap;
  var startX = -totalW / 2 + planeW / 2;
  var xs = SCREENS.map(function (_, i) { return startX + i * (planeW + gap); });
  var shelfY = -planeH / 2 - 0.03;

  scene.add(shelf(totalW));

  var textures = await Promise.all(SCREENS.map(function (s) { return loadTexture(s.img); }));
  var groups = [];
  var screenMeshes = [];
  textures.forEach(function (tex, i) {
    var yaw = (i % 2 === 0 ? 1 : -1) * THREE.MathUtils.degToRad(5);
    var group = new THREE.Group();
    group.position.set(xs[i], 0, 0);
    group.rotation.y = yaw;

    // screens are unlit: a display emits its picture, it does not reflect the key light
    var mat = new THREE.MeshBasicMaterial({ map: tex });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
    mesh.userData.id = SCREENS[i].id;
    group.add(mesh);
    screenMeshes.push(mesh);

    var reflMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
    var refl = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), reflMat);
    refl.position.y = 2 * shelfY;
    refl.scale.y = -1;
    group.add(refl);

    scene.add(group);
    groups.push(group);
  });

  /* camera framing: wide start fits the row at ~94% of frame width, low in frame
     (target aimed above the row); close end sits by the sixth screen, the workshop. */
  var startPos = new THREE.Vector3(), startTarget = new THREE.Vector3();
  var endPos = new THREE.Vector3(), endTarget = new THREE.Vector3();
  function layout() {
    var w = pin.clientWidth || innerWidth, h = pin.clientHeight || innerHeight;
    camera.aspect = w / h;
    var vFov = THREE.MathUtils.degToRad(35);
    var visW = totalW / 0.939;
    var visH = visW / camera.aspect;
    var d = visH / (2 * Math.tan(vFov / 2));
    startPos.set(0, 0.5, d);
    startTarget.set(0, 0.98, 0);
    var lastX = xs[N - 1];
    // end on the sixth screen at about 70% of the frame width: the shelf and the caption stay in view
    endPos.set(lastX - 0.05, planeH * 0.12, planeW * 1.45);
    endTarget.set(lastX, 0, 0);
    scene.fog.near = d * 0.15;
    scene.fog.far = d * 2.4;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  layout();

  var grain = grainPass();
  var curIdx = -1;
  var tiltTX = 0, tiltTY = 0, tiltX = 0, tiltY = 0;
  var visible = false, rafId = null;

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function progress() {
    var r = track.getBoundingClientRect();
    var total = track.offsetHeight - innerHeight;
    if (total <= 0) return r.top <= 0 ? 1 : 0;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  var demoP = null;
  function frame(forceP) {
    var p = typeof forceP === 'number' ? forceP : (demoP !== null ? demoP : progress());
    var e = ease(p);

    var pos = new THREE.Vector3().lerpVectors(startPos, endPos, e);
    var tgt = new THREE.Vector3().lerpVectors(startTarget, endTarget, e);

    if (fine && motion === 'full' && !reduced) {
      tiltX += (tiltTX - tiltX) * 0.08;
      tiltY += (tiltTY - tiltY) * 0.08;
      var maxTilt = Math.tan(THREE.MathUtils.degToRad(2)) * pos.distanceTo(tgt);
      tgt.x += tiltX * maxTilt;
      tgt.y -= tiltY * maxTilt;
    }

    camera.position.copy(pos);
    camera.lookAt(tgt);

    var idx = Math.min(N - 1, Math.floor(e * N));
    groups.forEach(function (g, i) {
      var s = i === idx ? 1.08 : 1;
      g.scale.x += (s - g.scale.x) * 0.15;
      g.scale.y += (s - g.scale.y) * 0.15;
    });
    if (idx !== curIdx) {
      curIdx = idx;
      capName.textContent = SCREENS[idx].name;
      capOpen.href = '#' + SCREENS[idx].id;
      dots.forEach(function (d, i) { d.classList.toggle('cur', i === idx); });
    }
    cap.classList.toggle('in', e > 0.02);

    renderer.autoClear = true;
    renderer.render(scene, camera);
    if (motion === 'full' && !reduced) {
      renderer.autoClear = false;
      grain.render(renderer);
      renderer.autoClear = true;
    }
  }

  function loop() {
    frame();
    rafId = visible ? requestAnimationFrame(loop) : null;
  }
  function kick() { if (!rafId && visible) rafId = requestAnimationFrame(loop); }

  if (reduced) {
    frame(0);
  } else {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible = en.isIntersecting; if (visible) kick(); });
    }, { threshold: 0 }).observe(pin);
    addEventListener('scroll', function () { demoP = null; if (visible) kick(); }, { passive: true });
    if (fine) {
      addEventListener('pointermove', function (e) {
        tiltTX = (e.clientX / innerWidth) * 2 - 1;
        tiltTY = (e.clientY / innerHeight) * 2 - 1;
      }, { passive: true });
    }
  }

  addEventListener('resize', function () { layout(); if (!visible) frame(reduced ? 0 : undefined); }, { passive: true });

  if (toggle) {
    if (reduced) {
      toggle.hidden = true;
    } else {
      toggle.addEventListener('click', function () {
        motion = motion === 'calm' ? 'full' : 'calm';
        stageEl.setAttribute('data-motion', motion);
        var pressed = motion === 'calm';
        toggle.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        var label = pressed ? 'Full motion' : 'Calm motion';
        toggle.textContent = label;
        toggle.setAttribute('aria-label', label);
        kick();
      });
    }
  }

  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  canvas.addEventListener('click', function (e) {
    var r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(screenMeshes, false);
    if (hits.length) {
      var el = document.getElementById(hits[0].object.userData.id);
      if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    }
  });

  window.__ready = true;
  window.__demo = function () { demoP = 1; visible = true; frame(1); kick(); };
}

function readBg(el) {
  var s = getComputedStyle(el).backgroundColor;
  var m = s.match(/\d+/g);
  if (!m) return new THREE.Color(0x121212);
  // the CSS value is sRGB; Color(r,g,b) would read it as linear and lift #101010 to a mid gray
  return new THREE.Color().setRGB(m[0] / 255, m[1] / 255, m[2] / 255, THREE.SRGBColorSpace);
}

function shelf(totalW) {
  var geo = new THREE.PlaneGeometry(totalW * 1.3, 3);
  var mat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6, metalness: 0 });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.53;
  return mesh;
}

function loadTexture(url) {
  return new Promise(function (resolve) {
    new THREE.TextureLoader().load(url, function (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      resolve(tex);
    }, undefined, function () { resolve(new THREE.Texture()); });
  });
}

function grainPass() {
  var scene = new THREE.Scene();
  var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: 'void main(){gl_Position=vec4(position,1.0);}',
    fragmentShader: [
      'uniform float uT;',
      'float rnd(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}',
      'void main(){',
      '  float n = rnd(gl_FragCoord.xy + uT);',
      '  gl_FragColor = vec4(vec3(n), 0.035);',
      '}'
    ].join('\n')
  });
  var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  scene.add(quad);
  var t = 0;
  return {
    render: function (renderer) {
      t = (t + 1) % 1000;
      mat.uniforms.uT.value = t;
      renderer.render(scene, cam);
    }
  };
}

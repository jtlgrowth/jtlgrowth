/*! arming-switch.js | <arming-switch> guarded confirm control | JTL Growth, 2026-11-20
 *
 * A three-step physical confirmation for actions that cannot be undone:
 * lift the safety cover, throw the switch to Arm, then press and hold the lamp.
 * Closing the cover pushes an armed switch back to Safe.
 *
 * Written in-house. The idea was seen on Arc UI's "Arming switch" (a paid Pro
 * component, uiarc.dev). No Arc source was read or copied; only the hardware
 * metaphor (a guarded aircraft switch) is shared.
 *
 * Use:
 *   <script src="arming-switch.js"></script>
 *   <arming-switch heading="Kill all sessions" detail="14 terminals on this Mac"
 *                  action="kill them" tone="red"></arming-switch>
 *   el.addEventListener('arming-confirm', e => e.detail.waitUntil(doTheThing()));
 *
 * Attributes: heading, detail, action, lamp-label, running-label, running-note,
 *   done-label, done-note, hold-ms (default 1300), tone (blue | red | mono),
 *   theme (dark), once, disabled, disabled-note, demo (ms), demo-fail, heading-level,
 *   compact (keeps text and switch side by side in a narrow box, such as a dialog).
 * Events: arming-change {state}, arming-confirm {waitUntil(promise)},
 *   arming-done, arming-fail {error}.
 * API: el.state, el.reset().
 */
(() => {
  if (typeof customElements === 'undefined' || customElements.get('arming-switch')) return;

  const OPEN = 108;  // cover angle when lifted, degrees
  const SAFE = 38;   // lever angle at Safe (tip down, toward the viewer)
  const ARM = 142;   // lever angle at Arm (tip up)

  // Lucide paths, from library/icons/lucide.
  const SHIELD = '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>';
  const ICONS = {
    safe: SHIELD + '<path d="m9 12 2 2 4-4"/>',
    open: SHIELD,
    armed: '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
    running: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
    done: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    failed: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  };

  const CSS = `
:host{display:block;container-type:inline-size;
  --as-cover:#1f5fe0;--as-armed:#f5a524;--as-done:#22c55e;--as-fail:#d92d20;
  --as-ring:var(--as-cover);--as-done-ring:var(--as-done);--as-led-off:#3c4048;--as-led-on:var(--as-done);
  --as-bg:#fff;--as-ink:#111318;--as-muted:#5b616e;--as-line:#e4e6ea;--as-chip:#f1f2f4;
  --as-size:17px;
  font:16px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--as-ink)}
:host([tone=red]){--as-cover:#d92d20}
:host([tone=mono]){--as-cover:#3a3d45;--as-armed:#d9d3c3;--as-done:#ffffff;--as-ring:#111318;--as-done-ring:#111318;--as-led-off:#d3d6db;--as-led-on:#111318}
:host([theme=dark]){--as-bg:#15161a;--as-ink:#f3f4f6;--as-muted:#a3a8b3;--as-line:#2a2c33;--as-chip:#23252b}
:host([theme=dark][tone=mono]){--as-ring:#f3f4f6;--as-done-ring:#f3f4f6}
*{box-sizing:border-box}
.as{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1em 2.5em;align-items:center;
  background:var(--as-bg);border:1px solid var(--as-line);border-radius:1.25em;padding:1.25em 2em}
.copy{min-width:0}
.h{font-size:1.25em;font-weight:650;letter-spacing:-.01em;line-height:1.25}
.d{margin:.25em 0 0;color:var(--as-muted)}
.chip{display:inline-flex;align-items:center;gap:.45em;margin-top:.9em;padding:.3em .85em .3em .6em;
  border-radius:99em;background:var(--as-chip);font-weight:560}
.h[hidden]+.d[hidden]+.chip{margin-top:0}
.ico{width:1.1em;height:1.1em;flex:none}
.as[data-state=running] .ico{animation:as-spin 1.2s linear infinite}
.note{margin:.8em 0 0;color:var(--as-muted);min-height:2.9em}
.swap{animation:as-in .5s cubic-bezier(.22,1,.36,1)}

.stage{position:relative;font-size:min(var(--as-size),4.6cqw);padding:4.7em 0 1.2em;justify-self:end;
  user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.plate{position:relative;width:19.5em;height:12.5em;border-radius:.6em;
  background:repeating-linear-gradient(90deg,rgba(255,255,255,0) 0 1px,rgba(20,24,32,.024) 1px 2px),
    linear-gradient(180deg,#f6f7f9 0%,#e3e5e9 55%,#d5d8dd 100%);
  box-shadow:inset 0 1px 0 #fff,inset 0 0 0 1px #c3c7ce,0 .28em 0 #b3b7bf,0 .34em 0 #8e929b,
    0 1.1em 1.6em -.7em rgba(15,18,25,.45)}
.plate i{position:absolute;display:block}
.screw{width:.62em;height:.62em;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#fff,#aeb2ba 70%,#7c8088);
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.8)}
.screw::after{content:"";position:absolute;left:18%;right:18%;top:calc(50% - .5px);height:1px;
  background:rgba(0,0,0,.5);transform:rotate(var(--r,35deg))}
.s1{left:.7em;top:.7em}.s2{right:.7em;top:.7em;--r:-20deg}
.s3{left:.7em;bottom:.7em;--r:80deg}.s4{right:.7em;bottom:.7em;--r:10deg}

.well{left:3.4em;top:2.1em;width:5.6em;height:8.3em;border-radius:.5em;
  background:linear-gradient(180deg,#232429,#131417);
  box-shadow:inset 0 .12em .3em rgba(0,0,0,.8),inset 0 -1px 0 rgba(255,255,255,.08),0 1px 0 rgba(255,255,255,.9)}
.lg{position:absolute;display:flex;align-items:center;gap:.3em;color:#454a55;white-space:nowrap;line-height:1}
.lg b{font-size:.76em;font-weight:600}
.lg-arm,.lg-safe{right:16.1em}
.lg-arm{top:3.9em}.lg-safe{top:8.05em}
.lg-arm::after,.lg-safe::after{content:"";width:.5em;height:1px;background:#6b707b}
.lsh{left:6.2em;top:6.25em;width:1em;height:2.3em;margin-left:-.5em;border-radius:50%;
  background:rgba(0,0,0,.6);filter:blur(.26em);transform-origin:50% 0;
  transform:translate(.22em,0) scaleY(var(--lever-cos,.79))}
.nut{left:6.2em;top:6.25em;width:2em;height:2em;margin:-1em 0 0 -1em;
  clip-path:polygon(25% 6.7%,75% 6.7%,100% 50%,75% 93.3%,25% 93.3%,0 50%);
  background:conic-gradient(from 30deg,#f1f2f4 0 60deg,#aeb2ba 0 120deg,#e6e8eb 0 180deg,#9fa3ab 0 240deg,#dcdee2 0 300deg,#b9bdc4 0)}
.collar{left:6.2em;top:6.25em;width:1.15em;height:1.15em;margin:-.575em 0 0 -.575em;border-radius:50%;
  background:radial-gradient(circle,#26272c 0 36%,#8b8f97 40%,#f4f5f7 64%,#9a9ea6 100%)}
.csh{left:3.1em;top:1.75em;width:6.2em;height:9em;border-radius:.5em;
  box-shadow:0 .5em .9em rgba(0,0,0,.4);opacity:calc(1 - var(--cover-n,0))}
.hinge{left:3.5em;top:1.42em;width:5.4em;height:.5em;border-radius:.25em;
  background:linear-gradient(180deg,#fdfdfd,#c4c8ce 45%,#878b93);box-shadow:0 1px 1px rgba(0,0,0,.3)}

.d3{position:absolute;inset:0;perspective:60em;perspective-origin:50% 40%;pointer-events:none}
.space{position:absolute;inset:0;transform-style:preserve-3d}
.toggle{position:absolute;left:3.4em;top:2.1em;width:5.6em;height:8.3em;border-radius:.5em;
  transform-style:preserve-3d;pointer-events:auto;cursor:pointer;touch-action:none;outline:none}
.toggle:focus-visible{box-shadow:0 0 0 2px var(--as-bg),0 0 0 4px var(--as-ink)}
.arm{position:absolute;left:2.8em;top:4.15em;width:0;height:2.6em;transform-style:preserve-3d;
  transform-origin:50% 0;transform:rotateX(var(--lever,38deg))}
.arm i{position:absolute;display:block}
.rod{left:-.34em;top:0;width:.68em;height:100%;clip-path:polygon(32% 0,68% 0,100% 100%,0 100%);
  background:linear-gradient(90deg,#80848c,#f7f8fa 32%,#cfd2d7 58%,#70747c)}
.ball{left:-.56em;top:calc(100% - .56em);width:1.12em;height:1.12em;border-radius:50%;
  background:radial-gradient(circle at 36% 30%,#fff 0,#e3e5e9 22%,#a4a8b0 62%,#6a6e76 100%);
  box-shadow:0 0 0 1px rgba(0,0,0,.18);transform:rotateX(calc(var(--lever,38deg) * -1))}

.cover{position:absolute;left:3.1em;top:1.75em;width:6.2em;height:9em;transform-style:preserve-3d;
  transform-origin:50% 0;transform:rotateX(var(--cover,0deg));pointer-events:auto;cursor:pointer;
  touch-action:none;outline:none;
  --face:color-mix(in srgb,var(--as-cover) 58%,transparent);
  --edge:color-mix(in srgb,var(--as-cover) 82%,#fff)}
.cover i{position:absolute;display:block;background:var(--face);border:1px solid var(--edge)}
.f-top,.f-bot{left:0;width:100%;height:2.3em;transform-origin:50% 0;transform:rotateX(90deg)}
.f-top{top:0}.f-bot{top:100%;background:color-mix(in srgb,var(--as-cover) 46%,rgba(255,255,255,.5))}
.f-l,.f-r{top:0;width:2.3em;height:100%;transform-origin:0 50%;transform:rotateY(-90deg);
  background:color-mix(in srgb,var(--as-cover) 68%,rgba(0,0,0,.28))}
.f-l{left:0}.f-r{left:100%}
.cover .f-front{inset:0;transform:translateZ(2.3em);border-radius:.4em;
  background:linear-gradient(150deg,rgba(255,255,255,.42) 0%,rgba(255,255,255,0) 30%),
    linear-gradient(180deg,color-mix(in srgb,var(--as-cover) 66%,transparent),color-mix(in srgb,var(--as-cover) 84%,transparent))}
.f-front::before{content:"";position:absolute;left:22%;right:22%;bottom:.55em;height:1em;
  background:repeating-linear-gradient(180deg,rgba(255,255,255,.5) 0 1px,rgba(0,0,0,.16) 1px 2px,transparent 2px .32em)}
.f-front::after{content:"";position:absolute;left:28%;right:28%;top:100%;height:.5em;
  border-radius:0 0 .3em .3em;background:color-mix(in srgb,var(--as-cover) 88%,#fff)}
.cover:focus-visible .f-front{outline:2px solid var(--as-ink);outline-offset:3px}

.led{left:12.5em;top:2.3em;width:.44em;height:.44em;border-radius:50%;background:var(--as-led-off);
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.35);transition:background-color .5s,box-shadow .5s}
.as[data-state=armed] .led,.as[data-state=running] .led,.as[data-state=done] .led{
  background:var(--as-led-on);box-shadow:inset 0 0 0 1px rgba(0,0,0,.35),0 0 .5em color-mix(in srgb,var(--as-led-on) 55%,transparent)}
.lg-ready{left:13.2em;top:2.16em}
.lg-hold{left:14em;top:10.5em;transform:translateX(-50%)}
.lamp{position:absolute;left:14em;top:6.25em;width:5.8em;height:5.8em;margin:-2.9em 0 0 -2.9em;
  border:0;padding:0;background:none;border-radius:50%;cursor:pointer;font:inherit;color:inherit;
  touch-action:none;-webkit-tap-highlight-color:transparent;outline:none}
.lamp:focus-visible{box-shadow:0 0 0 2px var(--as-ink)}
.lamp[aria-disabled=true]{cursor:default}
.halo{inset:.5em;border-radius:50%;opacity:0;transition:opacity .6s;
  box-shadow:0 0 1.5em .25em color-mix(in srgb,var(--as-armed) 60%,transparent)}
.as[data-state=armed] .halo,.as[data-state=running] .halo{opacity:1}
.as[data-state=done] .halo{opacity:1;box-shadow:0 0 1.5em .25em color-mix(in srgb,var(--as-done) 60%,transparent)}
.bezel{inset:.6em;border-radius:50%;
  background:conic-gradient(from 210deg,#fdfdfd,#b9bdc4,#f2f3f5,#a5a9b1,#fbfbfc,#b2b6bd,#fdfdfd);
  box-shadow:0 .12em .25em rgba(0,0,0,.35),inset 0 0 0 1px rgba(0,0,0,.15)}
.lens{inset:1.15em;border-radius:50%;overflow:hidden;
  background:radial-gradient(circle at 50% 42%,#6a5a4d,#3a3029 60%,#1f1915);
  box-shadow:inset 0 .1em .3em rgba(0,0,0,.7);transition:transform .3s cubic-bezier(.22,1,.36,1)}
.as[data-hold] .lens{transform:scale(.95)}
.lit{inset:0;opacity:0;transition:opacity .5s}
.lit.a{background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--as-armed) 40%,#fff),var(--as-armed) 55%,color-mix(in srgb,var(--as-armed) 62%,#000))}
.lit.g{background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--as-done) 40%,#fff),var(--as-done) 55%,color-mix(in srgb,var(--as-done) 62%,#000))}
.lit.f{background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--as-fail) 40%,#fff),var(--as-fail) 55%,color-mix(in srgb,var(--as-fail) 62%,#000))}
.as[data-state=armed] .lit.a,.as[data-state=running] .lit.a{opacity:1}
.as[data-state=armed]:not([data-failed]) .lit.a{animation:as-flick .75s steps(1) 1}
.as[data-state=done] .lit.g{opacity:1}
.as[data-failed] .lit.f{animation:as-fail 1.6s ease-out 1}
.dots{inset:0;background:radial-gradient(circle,rgba(0,0,0,.3) 24%,transparent 27%) 50% 50%/.44em .44em}
.glare{left:18%;top:10%;width:46%;height:30%;border-radius:50%;
  background:radial-gradient(closest-side,rgba(255,255,255,.55),transparent);transform:rotate(-24deg)}
.ring{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.ring circle{fill:none;transform-origin:50% 50%;transform:rotate(-90deg)}
.trk{stroke:rgba(15,18,25,.1);stroke-width:1.6;opacity:0;transition:opacity .5s}
.as[data-state=armed] .trk,.as[data-state=running] .trk{opacity:1}
.prg{stroke:var(--as-ring);stroke-width:2.8;stroke-linecap:round;stroke-dasharray:100;
  stroke-dashoffset:calc(100 - var(--p,0) * 100);opacity:min(1,var(--p,0) * 400)}
.as[data-state=running] .prg{stroke-dasharray:24 76;stroke-dashoffset:0;animation:as-spin-ring 1.2s linear infinite}
.as[data-state=done] .prg{stroke:var(--as-done-ring);stroke-dashoffset:0;opacity:1}
.pulse{inset:.5em;border-radius:50%;border:2px solid var(--as-done-ring);opacity:0}
.as[data-state=done] .pulse{animation:as-pulse 1.7s ease-out 2}
.as[data-state=done] .pulse.p2{animation-delay:.55s}
:host([disabled]) .stage{opacity:.5}
:host([disabled]) .cover,:host([disabled]) .toggle,:host([disabled]) .lamp{cursor:not-allowed}

@keyframes as-in{from{opacity:0;filter:blur(3px)}to{opacity:1;filter:blur(0)}}
@keyframes as-spin{to{transform:rotate(360deg)}}
@keyframes as-spin-ring{from{transform:rotate(-90deg)}to{transform:rotate(270deg)}}
@keyframes as-flick{0%{opacity:0}14%{opacity:1}26%{opacity:.2}40%{opacity:1}52%{opacity:.5}64%,100%{opacity:1}}
@keyframes as-fail{0%,60%{opacity:1}100%{opacity:0}}
@keyframes as-pulse{from{transform:scale(.86);opacity:.7}to{transform:scale(1.3);opacity:0}}
@container (max-width:44em){
  .as{grid-template-columns:minmax(0,1fr);padding:1.25em 1em}
  .stage{justify-self:center}
}
:host([compact]) .as{grid-template-columns:minmax(0,1fr) auto;gap:1em 1.5em;padding:.25em 1.5em}
:host([compact]) .stage{justify-self:end}
@media (prefers-reduced-motion:reduce){
  .swap,.pulse,.lit{animation:none!important}
  .as[data-state=running] .prg,.as[data-state=running] .ico{animation:none}
}
`;

  const TPL = `
<div class="as" data-state="safe">
  <div class="copy">
    <div class="h" role="heading" aria-level="3"></div>
    <p class="d"></p>
    <div class="chip"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"></svg><span class="lbl"></span></div>
    <p class="note" id="note" role="status"></p>
  </div>
  <div class="stage">
    <div class="plate">
      <i class="screw s1"></i><i class="screw s2"></i><i class="screw s3"></i><i class="screw s4"></i>
      <i class="well"></i>
      <span class="lg lg-arm" aria-hidden="true"><b>Arm</b></span>
      <span class="lg lg-safe" aria-hidden="true"><b>Safe</b></span>
      <i class="lsh"></i><i class="nut"></i><i class="collar"></i>
      <i class="csh"></i><i class="hinge"></i>
      <i class="led"></i><span class="lg lg-ready" aria-hidden="true"><b>Ready</b></span>
      <span class="lg lg-hold" aria-hidden="true"><b></b></span>
      <div class="d3"><div class="space">
        <div class="cover" role="button" tabindex="0" aria-label="Safety cover" aria-expanded="false" aria-describedby="note"><i class="f-top"></i><i class="f-bot"></i><i class="f-l"></i><i class="f-r"></i><i class="f-front"></i></div>
        <div class="toggle" role="switch" tabindex="0" aria-label="Arm switch" aria-checked="false" aria-describedby="note"><div class="arm"><i class="rod"></i><i class="ball"></i></div></div>
      </div></div>
      <button class="lamp" type="button" aria-describedby="note" aria-disabled="true">
        <i class="halo"></i><i class="bezel"></i>
        <i class="lens"><i class="lit a"></i><i class="lit g"></i><i class="lit f"></i><i class="dots"></i><i class="glare"></i></i>
        <svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="47"/><circle class="prg" cx="50" cy="50" r="47" pathLength="100"/></svg>
        <i class="pulse"></i><i class="pulse p2"></i>
      </button>
    </div>
  </div>
</div>`;

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const restart = (el) => { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); };

  class ArmingSwitch extends HTMLElement {
    static get observedAttributes() {
      return ['heading', 'detail', 'action', 'lamp-label', 'running-label', 'running-note', 'done-label',
        'done-note', 'disabled', 'disabled-note', 'heading-level'];
    }

    constructor() {
      super();
      // delegatesFocus: a host with tabindex is one stop to a focus trap, and focus lands on the cover.
      const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
      root.innerHTML = '<style>' + CSS + '</style>' + TPL;
      const $ = (s) => root.querySelector(s);
      this._el = {
        as: $('.as'), h: $('.h'), d: $('.d'), chip: $('.chip'), ico: $('.ico'), lbl: $('.lbl'), note: $('.note'),
        cover: $('.cover'), toggle: $('.toggle'), lamp: $('.lamp'), hold: $('.lg-hold b'),
      };
      this._cover = { x: 0, v: 0, t: 0, k: 95, c: 13.5, min: 0, max: OPEN + 9 };
      this._lever = { x: SAFE, v: 0, t: SAFE, k: 230, c: 17, min: SAFE, max: ARM };
      this._p = 0;
      this._holding = this._auto = this._running = this._done = this._locked = false;
      this._failed = '';
      this._raf = 0;
      this._lastKey = 0;
      this._prev = '';
      this._reduce = matchMedia('(prefers-reduced-motion: reduce)');
      this._bind();
    }

    connectedCallback() {
      this._render(); this._paint();
      // Safari does not focus a button on click, so the lamp's own blur never comes there:
      // a hold also ends when the window loses focus, and any countdown ends when the page is hidden.
      this._away = (ev) => { if (ev.type === 'visibilitychange' ? document.hidden : !this._auto) this._stopHold(); };
      window.addEventListener('blur', this._away);
      document.addEventListener('visibilitychange', this._away);
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf); this._raf = 0; clearTimeout(this._resetT); clearTimeout(this._holdT); this._holding = false;
      window.removeEventListener('blur', this._away);
      document.removeEventListener('visibilitychange', this._away);
    }
    attributeChangedCallback(name) {
      if (!this._el || !this.isConnected) return;
      if (name === 'disabled' && this.hasAttribute('disabled')) this._stopHold();
      this._render();
    }

    get state() {
      if (this._running) return 'running';
      if (this._done) return 'done';
      if (this._cover.t > 0 && this._lever.t > 90) return 'armed';
      return this._cover.t > 0 ? 'open' : 'safe';
    }

    /** Back to Safe with the cover down. Does not cancel an action already running. */
    reset() {
      clearTimeout(this._resetT);
      clearTimeout(this._holdT);
      this._done = this._locked = this._holding = this._auto = false;
      this._failed = '';
      this._p = 0;
      this._cover.t = 0;
      this._lever.t = SAFE;
      this._el.as.removeAttribute('data-hold');
      this._render();
      this._kick();
    }

    get _off() { return this.hasAttribute('disabled') || this._locked || this._running; }

    _render() {
      const e = this._el, s = this.state, a = (k) => this.getAttribute(k);
      const action = a('action') || 'confirm';
      const text = {
        safe: ['Safe', 'Lift the safety cover to begin.'],
        open: ['Cover open', 'Throw the switch up to arm it.'],
        armed: ['Armed', 'Press and hold the lamp to ' + action + '.'],
        running: [a('running-label') || 'Working', a('running-note') || 'Running now. Keep this open.'],
        done: [a('done-label') || 'Done', (a('done-note') || 'Finished.') + (this._locked ? '' : ' Lift the cover to run it again.')],
      };
      let [label, note] = text[s];
      let icon = s;
      if (s === 'armed' && this._auto) note = 'Starting now. Press again or Escape to cancel.';
      if (s === 'armed' && this._failed) { label = 'Failed'; icon = 'failed'; note = this._failed + ' Still armed. Hold the lamp to try again.'; }
      if (this.hasAttribute('disabled')) { label = 'Locked'; icon = 'open'; note = a('disabled-note') || 'This action is locked right now.'; }

      e.h.textContent = a('heading') || '';
      e.h.hidden = !a('heading'); // no empty heading in the tree when a dialog already has the title
      e.h.setAttribute('aria-level', a('heading-level') || '3');
      e.d.textContent = a('detail') || '';
      e.d.hidden = !a('detail');
      const lamp = a('lamp-label') || 'Hold to ' + action;
      e.hold.textContent = lamp;
      e.as.dataset.state = s;
      e.as.toggleAttribute('data-failed', s === 'armed' && !!this._failed);
      if (e.lbl.textContent !== label) { e.lbl.textContent = label; e.ico.innerHTML = ICONS[icon]; restart(e.chip); }
      if (e.note.textContent !== note) { e.note.textContent = note; restart(e.note); }

      e.cover.setAttribute('aria-expanded', String(this._cover.t > 0));
      e.cover.setAttribute('aria-disabled', String(this._off));
      e.toggle.setAttribute('aria-checked', String(this._lever.t > 90 && this._cover.t > 0));
      e.toggle.setAttribute('aria-disabled', String(this._off || this._cover.t === 0));
      e.lamp.setAttribute('aria-label', lamp);
      e.lamp.setAttribute('aria-disabled', String(s !== 'armed' || this.hasAttribute('disabled')));

      if (this._prev !== s) {
        this._prev = s;
        this.dispatchEvent(new CustomEvent('arming-change', { bubbles: true, composed: true, detail: { state: s } }));
      }
    }

    _paint() {
      const st = this._el.as.style, c = this._cover.x, l = this._lever.x;
      st.setProperty('--cover', c.toFixed(2) + 'deg');
      st.setProperty('--cover-n', clamp(c / OPEN, 0, 1).toFixed(3));
      st.setProperty('--lever', l.toFixed(2) + 'deg');
      st.setProperty('--lever-cos', Math.cos(l * Math.PI / 180).toFixed(3));
      st.setProperty('--p', this._p.toFixed(4));
    }

    _kick() {
      if (this._raf) return;
      this._last = performance.now();
      this._raf = requestAnimationFrame((t) => this._tick(t));
    }

    _tick(now) {
      // Real elapsed time, cut into fixed sub-steps: the motion keeps true speed
      // when the browser throttles frames (background tab, low power mode).
      let rem = clamp((now - this._last) / 1000, 0, 1.2);
      this._last = now;
      let active = false;
      do {
        const dt = Math.min(rem, 1 / 120);
        rem -= dt;
        active = false;
        for (const s of [this._cover, this._lever]) {
          if (s.drag) { active = true; continue; }
          if (this._reduce.matches) { s.x = s.t; s.v = 0; continue; }
          s.v += (-s.k * (s.x - s.t) - s.c * s.v) * dt;
          s.x += s.v * dt;
          if (s.x < s.min) { s.x = s.min; s.v = -s.v * 0.22; }   // the stop: a small clack
          if (s.x > s.max) { s.x = s.max; s.v = -s.v * 0.22; }
          if (Math.abs(s.x - s.t) > 0.05 || Math.abs(s.v) > 0.6) active = true;
          else { s.x = s.t; s.v = 0; }
        }
        // A closing cover pushes an armed lever back to Safe, as the real hardware does.
        if (this._cover.t === 0 && this._cover.x < 50 && this._lever.t !== SAFE && !this._lever.drag) {
          this._lever.t = SAFE;
          active = true;
        }
      } while (rem > 0 && active);

      if (this._holding) {
        this._p = clamp((now - this._holdT0) / this._holdMs, 0, 1);
        active = true;
      } else if (this._p > 0 && !this._running) {
        this._p = Math.max(0, this._p0 - (now - this._dropT0) / (this._holdMs * 0.4));
        if (this._p > 0) active = true;
      }
      this._paint();
      this._raf = active ? requestAnimationFrame((t) => this._tick(t)) : 0;
    }

    _setCover(open) {
      if (this._off) return;
      clearTimeout(this._resetT);
      this._failed = '';
      if (open) { this._cover.t = OPEN; this._done = false; }
      else { this._cover.t = 0; this._stopHold(); }
      this._render();
      this._kick();
    }

    _setLever(arm) {
      if (this._off) return;
      if (this._cover.t === 0) { restart(this._el.note); return; }
      this._lever.t = arm ? ARM : SAFE;
      this._failed = '';
      if (!arm) this._stopHold();
      this._render();
      this._kick();
    }

    get _holdMs() { return Math.max(400, Number(this.getAttribute('hold-ms')) || 1300); }

    _startHold(auto) {
      if (this.state !== 'armed' || this.hasAttribute('disabled')) { restart(this._el.note); return; }
      if (this._holding) return;
      this._holding = true;
      this._auto = !!auto;
      this._failed = '';
      // The clock, not the frame count, decides when the hold is complete.
      const left = (1 - this._p) * this._holdMs;
      this._holdT0 = performance.now() - this._p * this._holdMs;
      clearTimeout(this._holdT);
      this._holdT = setTimeout(() => { if (this._holding) this._fire(); }, left);
      this._el.as.setAttribute('data-hold', '');
      this._render();
      this._kick();
    }

    _stopHold() {
      if (!this._holding) return;
      clearTimeout(this._holdT);
      this._p = clamp((performance.now() - this._holdT0) / this._holdMs, 0, 1);
      this._p0 = this._p;
      this._dropT0 = performance.now();
      this._holding = this._auto = false;
      this._el.as.removeAttribute('data-hold');
      this._render();
      this._kick();
    }

    async _fire() {
      clearTimeout(this._holdT);
      this._holding = this._auto = false;
      this._el.as.removeAttribute('data-hold');
      this._running = true;
      this._p = 1;
      this._render();
      const waits = [];
      this.dispatchEvent(new CustomEvent('arming-confirm', {
        bubbles: true, composed: true,
        detail: { waitUntil: (p) => { waits.push(Promise.resolve(p)); } },
      }));
      if (!waits.length && this.hasAttribute('demo')) {
        const ms = Number(this.getAttribute('demo')) || 1800;
        waits.push(new Promise((res, rej) => setTimeout(() => (
          this.hasAttribute('demo-fail') ? rej(new Error('The server said no.')) : res()), ms)));
      }
      const floor = new Promise((r) => setTimeout(r, 700)); // long enough to read "running"
      let err = null;
      try { await Promise.all(waits); } catch (x) { err = x || new Error('Something went wrong.'); }
      await floor;
      if (!this.isConnected) return;
      this._running = false;
      this._p = 0;
      if (err) {
        this._failed = String(err.message || 'Something went wrong.').slice(0, 140);
      } else {
        this._done = true;
        if (this.hasAttribute('once')) this._locked = true;
        this._resetT = setTimeout(() => { this._cover.t = 0; this._render(); this._kick(); }, 1900);
      }
      this._render();
      this._kick();
      this.dispatchEvent(new CustomEvent(err ? 'arming-fail' : 'arming-done', {
        bubbles: true, composed: true, detail: err ? { error: err } : {},
      }));
    }

    /** Tap toggles; a vertical drag follows the finger and snaps on release. */
    _draggable(el, spring, gain, onTap, onDrop, allowed) {
      let st = null;
      el.addEventListener('pointerdown', (e) => {
        if (e.button > 0 || !allowed()) { if (e.button === 0) restart(this._el.note); return; }
        st = { y: e.clientY, x0: spring.x, moved: false };
        try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      });
      el.addEventListener('pointermove', (e) => {
        if (!st) return;
        const dy = e.clientY - st.y;
        if (!st.moved && Math.abs(dy) < 5) return;
        st.moved = true;
        spring.drag = true;
        spring.x = clamp(st.x0 - dy * gain, spring.min, spring === this._cover ? OPEN + 4 : spring.max);
        spring.v = 0;
        this._kick();
      });
      const end = (e) => {
        if (!st) return;
        const moved = st.moved;
        st = null;
        spring.drag = false;
        if (e.type === 'pointercancel') { this._kick(); return; }
        if (moved) onDrop(spring.x); else onTap();
        this._kick();
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }

    _bind() {
      const e = this._el;
      const isKey = (ev) => ev.key === ' ' || ev.key === 'Enter';

      this._draggable(e.cover, this._cover, 1.15,
        () => this._setCover(this._cover.t === 0),
        (x) => this._setCover(x > OPEN / 2),
        () => !this._off);
      this._draggable(e.toggle, this._lever, 2.4,
        () => this._setLever(this._lever.t !== ARM),
        (x) => this._setLever(x > 90),
        () => !this._off && this._cover.t > 0);

      e.cover.addEventListener('keydown', (ev) => {
        if (!isKey(ev)) return;
        ev.preventDefault();
        this._setCover(this._cover.t === 0);
      });
      e.toggle.addEventListener('keydown', (ev) => {
        if (isKey(ev)) { ev.preventDefault(); this._setLever(this._lever.t !== ARM); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); this._setLever(true); }
        else if (ev.key === 'ArrowDown') { ev.preventDefault(); this._setLever(false); }
      });

      // Lamp: pointer or key held for hold-ms. Sliding off or letting go cancels.
      e.lamp.addEventListener('pointerdown', (ev) => { if (ev.button === 0) this._startHold(false); });
      for (const t of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) {
        e.lamp.addEventListener(t, () => { if (!this._auto) this._stopHold(); });
      }
      // A finger or pen stays captured by the lamp it pressed, so no pointerleave
      // comes when it slides off (a mouse sends one). Measure where it is instead.
      e.lamp.addEventListener('pointermove', (ev) => {
        if (!this._holding || this._auto) return;
        const r = e.lamp.getBoundingClientRect(), g = 10;
        if (ev.clientX < r.left - g || ev.clientX > r.right + g || ev.clientY < r.top - g || ev.clientY > r.bottom + g) this._stopHold();
      });
      e.lamp.addEventListener('contextmenu', (ev) => ev.preventDefault());
      e.lamp.addEventListener('keydown', (ev) => {
        if (!isKey(ev)) return;
        ev.preventDefault();
        this._lastKey = performance.now();
        if (!ev.repeat) this._startHold(false);
      });
      e.lamp.addEventListener('keyup', (ev) => {
        if (!isKey(ev)) return;
        ev.preventDefault();
        this._lastKey = performance.now();
        if (!this._auto) this._stopHold();
      });
      // A click with no pointer and no key behind it comes from assistive tech
      // (voice control, switch access). It cannot hold, so it starts a timed
      // countdown of the same length; a second click or Escape cancels it.
      e.lamp.addEventListener('click', (ev) => {
        if (ev.detail !== 0 || performance.now() - this._lastKey < 600) return;
        if (this._holding && this._auto) this._stopHold(); else this._startHold(true);
      });

      this.shadowRoot.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Escape') return;
        if (this._holding) this._stopHold();
        else if (this._cover.t > 0 && !this._off) this._setCover(false);
      });
    }
  }

  customElements.define('arming-switch', ArmingSwitch);
})();

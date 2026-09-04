/* v7 hero hint (Owner pick 2026-09-04, hint study sample 01): a hand-drawn curve from the mono line
   under the buttons to the laptop's edge, landing on the prompt line. Drawn once, in one direction,
   after the copy has revealed; the loop clone gets the same curve with no animation so the landing
   is pixel-identical. Redrawn without animation on resize. Under 1100px the arrow is hidden by CSS.
   Reduced motion: the curve is simply there. */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function draw(stage, animate){
    var svg = stage.querySelector('.kb-arrow'); if (!svg) return;
    var lines = [].slice.call(svg.querySelectorAll('.kb-arrow-path')), line = lines[0], head = svg.querySelector('.kb-arrow-head'), label = svg.querySelector('.kb-arrow-label');
    var hint = stage.querySelector('[data-hint]'), lap = stage.querySelector('.kb-laptop'), inp = stage.querySelector('.kb-input, .kb-input-static');
    if (!hint || !lap || !inp || innerWidth <= 1100) return;
    var st = stage.getBoundingClientRect(), h = hint.getBoundingClientRect(), l = lap.getBoundingClientRect(), i = inp.getBoundingClientRect();
    var sx = h.left - st.left - 12, sy = h.top - st.top + h.height / 2;
    var ex = l.right - st.left + 10, ey = i.top - st.top + i.height / 2;
    var c1x = sx - 40, c1y = sy + (ey - sy) * 0.85, c2x = ex + 70, c2y = ey + 2;
    var d = 'M' + sx + ' ' + sy + ' C' + c1x + ' ' + c1y + ' ' + c2x + ' ' + c2y + ' ' + ex + ' ' + ey;
    lines.forEach(function(p){ p.setAttribute('d', d); });
    // a hand-drawn head: open, a touch asymmetric, the strokes overshoot the tip the way a pen does
    head.setAttribute('d', 'M' + (ex + 13) + ' ' + (ey - 9) + ' L' + (ex - 1) + ' ' + (ey + 0.5) + ' L' + (ex + 14) + ' ' + (ey + 6));
    if (label){ var lx = ex + 30, ly = ey + 36; label.setAttribute('x', lx); label.setAttribute('y', ly); label.setAttribute('transform', 'rotate(-8 ' + lx + ' ' + ly + ')'); }
    var L = line.getTotalLength();
    lines.forEach(function(p){
      p.style.strokeDasharray = L;
      if (animate && !reduce){
        p.style.transition = 'none'; p.style.strokeDashoffset = L; p.getBoundingClientRect();
        p.style.transition = ''; p.style.strokeDashoffset = 0;
      } else {
        p.style.transition = 'none'; p.style.strokeDashoffset = 0;
      }
    });
    svg.classList.add('drawn');
    stage.__arrowDrawn = true;
  }

  function stages(){ return [].slice.call(document.querySelectorAll('[data-arrow]')); }

  function boot(){
    stages().forEach(function(s){
      var isClone = !!(s.closest && s.closest('[data-static]'));
      if (isClone){ draw(s, false); return; }
      // the copy reveals over ~1s (rv d1); measure after it has settled, once more when fonts are surely in
      setTimeout(function(){ draw(s, true); }, 1300);
      setTimeout(function(){ if (s.__arrowDrawn) draw(s, false); }, 3200);
    });
  }

  var rt = null;
  addEventListener('resize', function(){
    clearTimeout(rt);
    rt = setTimeout(function(){ stages().forEach(function(s){ draw(s, false); }); }, 120);
  });

  window.JTLHint = { draw: function(){ stages().forEach(function(s){ draw(s, false); }); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

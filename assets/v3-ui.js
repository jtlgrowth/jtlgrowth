/* JTL shared UI (subpages) — mono mini-crystal companion linking home.
   Owner 2026-08-19: keep the black, no palette changes — so no theme system here.
   v3.1 graft pass. Owner 2026-08-20: click sound removed. */
(function(){
  'use strict';
  /* mono mini-crystal, bottom-right, links home */
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var css=document.createElement('style');
  css.textContent='#jtl-corner{position:fixed;right:16px;bottom:16px;z-index:60}'
    +'#jtl-corner a{display:block;width:52px;height:52px;opacity:.85}'
    +'#jtl-corner canvas{width:100%;height:100%}';
  document.head.appendChild(css);
  var box=document.createElement('div');box.id='jtl-corner';
  box.innerHTML='<a href="/" aria-label="JTL Growth home"><canvas id="jtl-mini" aria-hidden="true"></canvas></a>';
  document.body.appendChild(box);
  var cv=document.getElementById('jtl-mini'),ctx=cv.getContext('2d');
  var DPR=Math.min(2,window.devicePixelRatio||1),S=52;
  cv.width=S*DPR;cv.height=S*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  /* v4: the "seal" form from the homepage leak story (funnel -> stone -> seal) */
  var V=[[0,-1.75,0],[0,.55,0],[.95,.05,0],[0,.05,.95],[-.95,.05,0],[0,.05,-.95]];
  var F=[[0,2,3,0,1.10],[0,3,4,1,.97],[0,4,5,0,.85],[0,5,2,1,1.0],
    [1,3,2,2,.94],[1,4,3,3,1.0],[1,5,4,2,.85],[1,2,5,3,.9]];
  /* mono ramp — black stone (subpages run light grounds) */
  var COLS=['#1A1A1A','#2B2B2B','#3C3C3C','#4E4E4E'];
  function shade(hex,f){var n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;
    r=Math.min(255,Math.round(r*f));g=Math.min(255,Math.round(g*f));b=Math.min(255,Math.round(b*f));
    return 'rgb('+r+','+g+','+b+')';}
  var a=0.6;
  (function loop(){
    if(document.visibilityState==='visible'){
      ctx.clearRect(0,0,S,S);
      var ca=Math.cos(a),sa=Math.sin(a),pts=[],z=[],i,s=S*.30,c=S/2;
      for(i=0;i<6;i++){var v=V[i],x=v[0]*ca+v[2]*sa,zz=-v[0]*sa+v[2]*ca;
        pts.push([c+x*s,c+(v[1]*.92+zz*.30)*s]);z.push(zz);}
      F.map(function(f,k){return [(z[f[0]]+z[f[1]]+z[f[2]])/3,k]})
       .sort(function(u,v){return u[0]-v[0]})
       .forEach(function(o){var f=F[o[1]];
        ctx.fillStyle=shade(COLS[f[3]],f[4]);
        ctx.beginPath();ctx.moveTo(pts[f[0]][0],pts[f[0]][1]);
        ctx.lineTo(pts[f[1]][0],pts[f[1]][1]);ctx.lineTo(pts[f[2]][0],pts[f[2]][1]);
        ctx.closePath();ctx.fill();});
      a+=0.006;
    }
    requestAnimationFrame(loop);
  })();
})();

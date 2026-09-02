import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [name, w, h, theme] of [['recap-1440-light',1440,900,'light'],['recap-1440-dark',1440,900,'dark'],['recap-375-light',375,800,'light']]) {
  const p = await b.newPage({viewport:{width:w,height:h}});
  await p.addInitScript(t=>{try{localStorage.setItem('jtl-theme',t)}catch(e){}}, theme);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8117/workshop/',{waitUntil:'networkidle'});
  await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120));} window.scrollTo(0,0);});
  await p.waitForTimeout(600);
  const info = await p.evaluate(()=>({figs:document.querySelectorAll('figure.wk-photo').length, imgsBroken:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).length, video:!!document.querySelector('#room video'), h:document.body.scrollHeight, calendlyBody:document.querySelectorAll('main a[href*="calendly"]').length}));
  await p.screenshot({path:`${name}.png`, fullPage:true});
  console.log(name, JSON.stringify(info), 'pageerrors', errs.length);
  await p.close();
}
await b.close();

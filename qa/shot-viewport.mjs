import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [name,w,h,url] of [['vp-1440-top',1440,900,'http://127.0.0.1:8117/workshop/'],['vp-375-top',375,800,'http://127.0.0.1:8117/workshop/'],['vp-1440-live-old',1440,900,'https://jtlgrowth.com/workshop/'],['vp-1440-wins',1440,900,'http://127.0.0.1:8117/workshop/#wins']]) {
  const p = await b.newPage({viewport:{width:w,height:h}});
  await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(900);
  const m = await p.evaluate(()=>{const e=document.querySelector('.page-hero .eyebrow'),hd=document.getElementById('hdr');const r=e.getBoundingClientRect(),q=hd.getBoundingClientRect();return {eyebrowTop:Math.round(r.top),eyebrowBottom:Math.round(r.bottom),headerBottom:Math.round(q.bottom),overlap:r.top<q.bottom}});
  await p.screenshot({path:`${name}.png`});
  console.log(name, JSON.stringify(m)); await p.close();
}
await b.close();

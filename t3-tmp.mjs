import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for (const w of [1024,1100,1279,1280,1440]) {
  const c=await b.newContext({viewport:{width:w,height:800}});
  const p=await c.newPage();
  await p.goto('http://localhost:3000/services',{waitUntil:'networkidle'});
  await p.waitForTimeout(1800);
  const info=await p.evaluate(()=>{
    const inner=document.querySelector('header.sticky').firstElementChild;
    const nav=inner.querySelector('nav');
    const nr=nav.getBoundingClientRect();
    const actions=inner.lastElementChild.getBoundingClientRect();
    return {navLeft:Math.round(nr.x),navRight:Math.round(nr.right),scrollW:nav.scrollWidth,boxW:Math.round(nr.width),actionsRight:Math.round(actions.right),gap:Math.round(nr.x-actions.right),overflow:nav.scrollWidth>Math.round(nr.width),links:[...nav.querySelectorAll('a')].map(a=>a.textContent.trim())};
  });
  console.log(w, JSON.stringify(info));
  await c.close();
}
await b.close();

import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for (const url of ['/services','/guide','/rules','/contact','/']) {
  const c=await b.newContext({viewport:{width:1440,height:900}});
  const p=await c.newPage();
  await p.goto('http://localhost:3000'+url,{waitUntil:'networkidle'});
  await p.waitForTimeout(1800);
  const info=await p.evaluate(()=>{
    const f=document.querySelector('footer.site-footer');
    const r=f?f.getBoundingClientRect():null;
    return {vh:window.innerHeight,footerTop:r?Math.round(r.top):null,footerBottom:r?Math.round(r.bottom):null,docH:document.documentElement.scrollHeight,bodyDisplay:getComputedStyle(document.body).display};
  });
  console.log(url,JSON.stringify(info));
  await c.close();
}
await b.close();

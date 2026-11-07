import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for (const [url,w] of [['/',1440],['/',390],['/services',1440],['/login',1440],['/business-cards',1440]]) {
  const c=await b.newContext({viewport:{width:w,height:900}});
  const p=await c.newPage();
  await p.goto('http://localhost:3000'+url,{waitUntil:'networkidle'});
  await p.waitForTimeout(1800);
  const info=await p.evaluate(()=>{
    const f=document.querySelector('footer.site-footer');
    const r=f?f.getBoundingClientRect():null;
    return {vh:window.innerHeight,footerBottom:r?Math.round(r.bottom):null,docH:document.documentElement.scrollHeight,scrollY:window.scrollY};
  });
  console.log(url,w,JSON.stringify(info));
  await c.close();
}
await b.close();

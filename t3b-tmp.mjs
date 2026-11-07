import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for (const w of [1440,390]) {
  const c=await b.newContext({viewport:{width:w,height:900}});
  const p=await c.newPage();
  const r=await p.goto('http://localhost:3000/contact',{waitUntil:'networkidle'});
  await p.waitForTimeout(1500);
  const info=await p.evaluate(()=>({
    title:document.title,
    h1:document.querySelector('h1')?.textContent?.trim(),
    headerContact:[...document.querySelectorAll('header.sticky nav a')].some(a=>a.getAttribute('href')==='/contact'),
    footerContact:[...document.querySelectorAll('footer a')].some(a=>a.getAttribute('href')==='/contact'),
    ticketLinks:[...document.querySelectorAll('a[href="/dashboard/tickets"]')].length,
  }));
  console.log(w,'status',r.status(),JSON.stringify(info));
  await c.close();
}
await b.close();

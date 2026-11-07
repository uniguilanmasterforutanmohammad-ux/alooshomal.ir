import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for (const [url,sel] of [['/business-cards','.directory-card'],['/biolinks','.directory-biolink-card']]) {
  for (const w of [1440,390]) {
    const c=await b.newContext({viewport:{width:w,height:900}});
    const p=await c.newPage();
    await p.goto('http://localhost:3000'+url,{waitUntil:'networkidle'});
    await p.waitForTimeout(2200);
    const info=await p.evaluate((sel)=>{
      const card=document.querySelector(sel);
      if(!card) return 'no card';
      const inner=card.querySelector('.directory-card-inner');
      const av=card.querySelector('.directory-card-avatar, .directory-biolink-avatar');
      const img=av.querySelector('img');
      const r=(e)=>{if(!e)return null;const b=e.getBoundingClientRect();return {w:Math.round(b.width),h:Math.round(b.height)};};
      return {card:r(card),inner:r(inner),avatar:r(av),img:r(img),radius:getComputedStyle(av).borderRadius};
    },sel);
    console.log(url,w,JSON.stringify(info));
    await c.close();
  }
}
await b.close();

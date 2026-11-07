import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1440,height:900}});
const p=await c.newPage();
await p.goto('http://localhost:3000/services',{waitUntil:'networkidle'});
await p.waitForTimeout(2500);
const info=await p.evaluate(()=>{
  const bar=[...document.querySelectorAll('[role="status"]')].find(e=>e.textContent.includes('موقتاً توسط مدیر'));
  const hdr=document.querySelector('header.sticky');
  return {barH:bar?Math.round(bar.getBoundingClientRect().height):0,barText:bar?bar.textContent.trim():null,headerTop:hdr?getComputedStyle(hdr).top:null,varH:getComputedStyle(document.documentElement).getPropertyValue('--feature-notice-h')};
});
console.log(JSON.stringify(info));
await b.close();

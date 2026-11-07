import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1440,height:1000}});
const p=await c.newPage();
await p.goto('http://localhost:3000/business-cards',{waitUntil:'networkidle'});
await p.waitForTimeout(2500);
const card=await p.$('.directory-card');
if(card) await card.screenshot({path:'/tmp/card.png'});
await b.close();

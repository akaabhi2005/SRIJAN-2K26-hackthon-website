import {chromium} from 'playwright';
const b=await chromium.launch({channel:'chrome'});
for(const mode of ['reduced','no-js','closed','normal']) {
 const c=await b.newContext({viewport:{width:390,height:844},javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduced'?'reduce':'no-preference'}); const p=await c.newPage(); const errors=[];p.on('pageerror',e=>errors.push(e.message));
 if(mode==='closed') await p.clock.setFixedTime(new Date('2026-10-11T06:30:01Z'));
 await p.goto('http://127.0.0.1:4321');await p.waitForTimeout(1500);
 if(mode==='normal') {
  await p.locator('.menu summary').click();await p.locator('.menu a[href="#battlefield"]').click();await p.waitForTimeout(1400);
  console.log('domains nav',await p.locator('#battlefield').evaluate(e=>({opacity:getComputedStyle(e).opacity,top:e.getBoundingClientRect().top}))); 
  await p.locator('.menu summary').click();await p.locator('.menu a[href="#partners"]').click();await p.waitForTimeout(1400);console.log('partners nav',await p.locator('.f1').evaluate(e=>getComputedStyle(e).opacity));
  await p.screenshot({path:'audit-mobile.png'});
 }
 const r=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,closed:document.querySelectorAll('[data-reg-btn][href]').length,animations:document.getAnimations().length,images:[...document.images].filter(i=>!i.loading||i.loading!=='lazy').filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)})); console.log(mode,r,errors);
 if(r.overflow||errors.length||r.images.length||(mode==='closed'&&r.closed)||(mode==='reduced'&&r.animations))process.exitCode=1;
 await c.close();
}
await b.close();

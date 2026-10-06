// Run after npm run build. Uses only local files and applies production security headers.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

const root = resolve('dist');
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
const event = JSON.parse(await readFile('src/data/event.json', 'utf8'));
const headers = Object.fromEntries(config.headers[0].headers.map(h => [h.key, h.value]));
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.woff':'font/woff', '.svg':'image/svg+xml', '.webp':'image/webp', '.avif':'image/avif', '.jpg':'image/jpeg', '.png':'image/png' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(path);
    res.writeHead(200, {...headers, 'Content-Type': types[extname(path)] || 'application/octet-stream'}).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir('.audit/screenshots', {recursive:true});
let checks = 0;
const expect = (ok, message) => { assert.ok(ok, message); checks++; };

async function open(browser, size, mode = 'normal') {
  const context = await browser.newContext({ viewport:{width:size[0], height:size[1]},
    hasTouch: size[0] < 900, javaScriptEnabled: mode !== 'no-js', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if(r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  if (mode !== 'no-js') await page.clock.setFixedTime(new Date(Date.parse(event.registration.closes) + (mode === 'closed' ? 1000 : -86400000)));
  await page.goto(base);
  // Firefox does not resolve asynchronous page promises with JavaScript disabled.
  if (mode !== 'no-js') await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(450);
  return {context,page,errors};
}

async function layout(page, label) {
  const r = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(e=>e.id);
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      duplicate: ids.filter((id,i)=>ids.indexOf(id)!==i),
      clipped: [...document.querySelectorAll('.frame')].filter(e=>e.scrollHeight>e.clientHeight+4).map(e=>e.id || e.className),
      anchors: [...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash && !document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash),
      stackedFrames: getComputedStyle(document.querySelector('.stage')).position === 'sticky' &&
        [...document.querySelectorAll('.frame')].filter(e=>+getComputedStyle(e).opacity > .9).length > 1,
    };
  });
  expect(!r.overflow && !r.duplicate.length && !r.clipped.length && !r.anchors.length && !r.stackedFrames, `${label}: ${JSON.stringify(r)}`);
}

async function interactions(page, label) {
  // The newly added prize section must be reachable, not the old story trophy.
  const menu = page.locator('.menu summary');
  const mobile = await menu.isVisible();
  if (mobile) await menu.click();
  await page.locator(`${mobile ? '.menu' : '.nav'} a[href="#reward"]`).click();
  await page.waitForFunction(() => {
    const r = document.getElementById('reward').getBoundingClientRect();
    return r.top >= 0 && r.top < innerHeight / 2;
  });
  expect(await page.locator('#reward').evaluate(e => {
    const r=e.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight/2 && e.classList.contains('prizes-section');
  }), `${label}: prize navigation`);
  if (mobile) expect(await page.locator('.menu').getAttribute('open') === null, `${label}: menu closes`);
  await page.locator('#schedule').scrollIntoViewIfNeeded();
  const tabs = page.locator('.day-tab');
  await tabs.first().focus(); await page.keyboard.press('End');
  expect(await tabs.last().getAttribute('aria-selected') === 'true', `${label}: schedule keyboard End`);
  expect(await page.locator('.day:not([hidden])').count() === 1, `${label}: one active schedule panel`);
  await page.keyboard.press('Home');
  expect(await tabs.first().getAttribute('aria-selected') === 'true', `${label}: schedule keyboard Home`);
  for (const selector of ['[data-faq]', '.ps-list details']) {
    const details=page.locator(selector).first();
    await details.locator('summary').click();
    expect(await details.getAttribute('open') !== null, `${label}: ${selector} opens`);
    await details.locator('summary').click(); await page.waitForTimeout(320);
    expect(await details.getAttribute('open') === null, `${label}: ${selector} closes`);
  }
  for (const list of await page.locator('.people').all()) {
    await list.scrollIntoViewIfNeeded();
    await page.waitForTimeout(650);
    expect(await list.evaluate(e => getComputedStyle(e.children[0]).opacity === '1'), `${label}: long team section reveals`);
  }
  await page.locator('.back-to-top-btn').click(); await page.waitForFunction(()=>scrollY < 3);
  expect(await page.evaluate(()=>scrollY < 3), `${label}: back to top`);
}

try {
  const requested = (process.env.BROWSERS || 'chrome').split(',');
  for (const name of requested) {
    const browser = await (name === 'firefox' ? firefox : name === 'webkit' ? webkit : chromium).launch(name==='chrome' ? {channel:'chrome'} : {});
    try {
      const sizes = name === 'chrome' ? [[320,568],[360,640],[390,844],[412,915],[768,1024],[820,1180],[844,390],[1024,600],[1366,768],[1920,1080],[2560,1440]] : [[390,844],[844,390],[1366,768]];
      for (const size of sizes) {
        const {context,page,errors}=await open(browser,size);
        const label=`${name} ${size.join('x')}`;
        await layout(page,label);
        await interactions(page,label);
        if (size[0]===390 || size[0]===1366 || size[0]===844) await page.screenshot({path:`.audit/screenshots/${name}-${size.join('x')}.png`});
        expect(!errors.length, `${label}: ${errors.join('\n')}`);
        await context.close(); console.log('PASS',label);
      }
      for (const mode of ['reduced','no-js','closed']) {
        const {context,page,errors}=await open(browser,[390,844],mode);
        await layout(page,`${name} ${mode}`);
        if(mode==='closed') expect(await page.locator('[data-reg-btn][href]').count()===0, `${name}: registration closes at configured deadline`);
        if(mode==='reduced') expect(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)===0, `${name}: reduced motion`);
        if(mode==='no-js') {
          expect(await page.locator('.stage').evaluate(e=>getComputedStyle(e).position)!=='sticky', `${name}: no-js static layout`);
          expect(await page.locator('.day[open]').count()===event.schedule.days.length, `${name}: no-js schedule`);
          await page.locator('[data-faq] summary').first().click();
          expect(await page.locator('[data-faq]').first().getAttribute('open')!==null, `${name}: no-js FAQ`);
        }
        expect(!errors.length, `${name} ${mode}: ${errors.join('\n')}`);
        await context.close(); console.log('PASS',name,mode);
      }
      const {context,page,errors}=await open(browser,[1366,768]);
      await page.goto(base+'/#battlefield'); await page.waitForTimeout(600);
      expect(await page.locator('#battlefield').evaluate(e=>+getComputedStyle(e).opacity>.9), `${name}: direct story link`);
      for(const size of [[390,844],[844,390],[1366,768]]) {
        await page.setViewportSize({width:size[0],height:size[1]}); await page.waitForTimeout(250);
        await layout(page,`${name} resize ${size.join('x')}`);
      }
      await page.evaluate(()=>document.documentElement.style.fontSize='32px'); await page.setViewportSize({width:1280,height:720}); await page.waitForTimeout(300);
      await layout(page,`${name} 200% text`);
      expect(!errors.length, `${name}: resize errors ${errors}`);
      await context.close();
    } finally { await browser.close(); }
  }
  const js = (await readdir(resolve(root,'_astro'))).filter(f=>f.endsWith('.js'));
  let bytes=0; for(const f of js) bytes+=(await readFile(resolve(root,'_astro',f))).length;
  expect(bytes < 30000, `JS budget exceeded: ${bytes}`);
  console.log(`PASS ${checks} checks; client JavaScript ${bytes} bytes`);
} finally { await new Promise(r=>server.close(r)); }

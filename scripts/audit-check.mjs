import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const policy = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url))).headers[0].headers;
let failures = 0;
for (const [width, height] of [[320,568],[390,844],[768,1024],[1366,768],[1920,1080]]) {
  const context = await browser.newContext({ viewport: {width,height} });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type() === 'error') errors.push(m.text()); });
  await page.route('**/*', async route => {
    const response = await route.fetch();
    await route.fulfill({response, headers: {...response.headers(), ...Object.fromEntries(policy.map(h=>[h.key,h.value]))}});
  });
  await page.goto('http://127.0.0.1:4321');
  await page.waitForTimeout(1400);
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    clipped: [...document.querySelectorAll('.frame')].filter(e=>e.scrollHeight>e.clientHeight+3).map(e=>e.id),
    broken: [...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash && !document.getElementById(a.hash.slice(1))).map(a=>a.hash),
  }));
  await page.locator('#schedule').scrollIntoViewIfNeeded();
  await page.locator('.day-tab').nth(1).click();
  result.schedule = await page.locator('.day:not([hidden])').count() === 1;
  await page.locator('[data-faq] summary').first().click();
  result.faq = await page.locator('[data-faq]').first().getAttribute('open') !== null;
  console.log({width,height,...result,errors});
  if(result.overflow || result.clipped.length || result.broken.length || !result.schedule || !result.faq || errors.length) failures++;
  await context.close();
}
await browser.close();
process.exitCode = failures ? 1 : 0;

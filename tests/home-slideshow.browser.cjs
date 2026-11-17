const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),html=fs.readFileSync(process.env.CAROUSEL_INDEX||path.join(root,'index.html'),'utf8');
 const hero=html.match(/<section id="home-hero".*?<\/section>/s)?.[0];assert.ok(hero);
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
   await page.route('http://slideshow.test/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width"><style>body{margin:0}</style><link rel="stylesheet" href="/assets/home-slideshow.css">'+hero+'<script src="/assets/home-slideshow.js"></script>'});
    if(url.pathname.startsWith('/assets/'))return route.fulfill({body:fs.readFileSync(path.join(root,url.pathname)),contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript'});
    return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><rect width="100%" height="100%" fill="purple"/></svg>'});
   });
   await page.goto('http://slideshow.test/');const img=page.locator('#home-hero img');
   const first=await img.getAttribute('src');
   assert.equal(await img.evaluate(e=>Math.round(e.getBoundingClientRect().width)),width);
   await page.clock.runFor(4100);await page.waitForFunction(src=>document.querySelector('#home-hero img').getAttribute('src')!==src,first);
   await page.locator('.hero-pause').click();const paused=await img.getAttribute('src');await page.clock.runFor(8100);assert.equal(await img.getAttribute('src'),paused);
   await page.locator('.hero-next').click();await page.waitForFunction(src=>document.querySelector('#home-hero img').getAttribute('src')!==src,paused);
   await page.locator('.hero-pause').click();await page.locator('.hero-open').click();assert.equal(await page.locator('#hero-fullscreen').evaluate(e=>e.open),true);
   const full=await page.locator('#hero-fullscreen>img').getAttribute('src');await page.clock.runFor(8100);assert.equal(await page.locator('#hero-fullscreen>img').getAttribute('src'),full);
   await page.keyboard.press('ArrowRight');await page.waitForFunction(src=>document.querySelector('#hero-fullscreen>img').getAttribute('src')!==src,full);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#hero-fullscreen').evaluate(e=>e.open),false);
   const opening=await page.evaluate(()=>localStorage.getItem('sarah:hero-opening'));await page.reload();assert.notEqual(await img.getAttribute('src'),opening,'consecutive page openings differ');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await context.close();
  }
  console.log('Desktop/mobile: four-second rotation, non-repeating opening, full-width layout, pause, manual controls and fullscreen viewer passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

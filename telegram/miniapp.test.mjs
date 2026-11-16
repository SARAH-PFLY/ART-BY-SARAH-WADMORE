import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/telegram-mini-app.js',import.meta.url),'utf8');
function context(telegram=true,path='/'){
 const calls=[],events={},styles={},dialog={open:false},location={pathname:path,href:'https://sarahwadmore.com'+path,origin:'https://sarahwadmore.com',assign:p=>calls.push(['navigate',p])};
 const app={initData:'test',platform:'android',safeAreaInset:{top:10,bottom:5},contentSafeAreaInset:{top:20},viewportStableHeight:700,ready:()=>calls.push(['ready']),expand:()=>calls.push(['expand']),setHeaderColor:()=>{},setBackgroundColor:()=>{},isVersionAtLeast:()=>true,setBottomBarColor:()=>{},onEvent:(name,fn)=>events[name]=fn,BackButton:{show:()=>calls.push(['show']),hide:()=>calls.push(['hide']),onClick:fn=>events.back=fn}};
 const document={documentElement:{classList:{add:()=>{}},style:{setProperty:(key,value)=>styles[key]=value}},querySelector:s=>s==='#lightbox'?dialog:{click:()=>{dialog.open=false;calls.push(['close'])}},addEventListener:(name,fn)=>events[name]=fn};
 const c={window:{Telegram:telegram?{WebApp:app}:undefined,innerHeight:600},document,location,URL,MutationObserver:class{constructor(fn){events.mutation=fn}observe(){}}};
 runInNewContext(source,c);return {calls,events,styles,dialog};
}
let c=context(false);assert.deepEqual(c.calls,[]);
c=context();assert.ok(c.calls.some(x=>x[0]==='ready'));assert.equal(c.styles['--app-safe-top'],'30px');assert.equal(c.styles['--app-height'],'700px');
c.dialog.open=true;c.events.mutation();assert.equal(c.calls.at(-1)[0],'show');c.events.back();assert.equal(c.calls.at(-1)[0],'close');
c=context(true,'/about/');c.events.back();assert.deepEqual(c.calls.at(-1),['navigate','/']);
console.log('Passed ordinary-browser fallback, Telegram initialization, safe areas, viewport and back navigation');

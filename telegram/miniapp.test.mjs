import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/telegram-mini-app.js',import.meta.url),'utf8');
function context(telegram=true,path='/'){
 const calls=[],events={},styles={},dialog={open:false},location={pathname:path,href:'https://sarahwadmore.com'+path,origin:'https://sarahwadmore.com',assign:p=>calls.push(['navigate',p])};
 const button={hidden:true,attributes:{},setAttribute(k,v){this.attributes[k]=v}},status={};
 const app={initData:'test',platform:'android',safeAreaInset:{top:10,bottom:5},contentSafeAreaInset:{top:20},viewportStableHeight:700,ready:()=>calls.push(['ready']),expand:()=>calls.push(['expand']),setHeaderColor:()=>{},setBackgroundColor:()=>{},isVersionAtLeast:()=>true,setBottomBarColor:()=>{},onEvent:(name,fn)=>events[name]=fn,BackButton:{show:()=>calls.push(['show']),hide:()=>calls.push(['hide']),onClick:fn=>events.back=fn}};
 app.isFullscreen=false;app.requestFullscreen=()=>calls.push(['nativeEnter']);app.exitFullscreen=()=>calls.push(['nativeExit']);
 const document={documentElement:{classList:{add:()=>{}},style:{setProperty:(key,value)=>styles[key]=value}},querySelector:s=>s==='#lightbox'?dialog:s==='#expand'?button:s==='#media-status'?status:s==='#close'?{click:()=>{dialog.open=false;calls.push(['close'])}}:null,addEventListener:(name,fn)=>events[name]=fn};
 const c={window:{Telegram:telegram?{WebApp:app}:undefined,innerHeight:600,addEventListener:(name,fn)=>events['window:'+name]=fn,visualViewport:{height:550,addEventListener:(name,fn)=>events['visual:'+name]=fn}},document,location,URL,MutationObserver:class{constructor(fn){events.mutation=fn}observe(){}disconnect(){}}};
 runInNewContext(source,c);return {calls,events,styles,dialog,app,window:c.window,document,button,status};
}
let c=context(false);assert.deepEqual(c.calls,[]);
c=context();assert.ok(c.calls.some(x=>x[0]==='ready'));assert.equal(c.styles['--app-safe-top'],'30px');assert.equal(c.styles['--app-height'],'550px');
c.dialog.open=true;c.events.mutation();assert.equal(c.calls.at(-1)[0],'show');c.events.back();assert.equal(c.calls.at(-1)[0],'close');
c=context(true,'/about/');c.events.back();assert.deepEqual(c.calls.at(-1),['navigate','/']);
console.log('Passed ordinary-browser fallback, Telegram initialization, safe areas, viewport and back navigation');

c=context();c.app.viewportHeight=480;c.events.viewportChanged();assert.equal(c.styles['--app-height'],'480px');
c.app.viewportHeight=620;c.window.visualViewport.height=400;c.events['visual:resize']();assert.equal(c.styles['--app-height'],'400px');
let childClosed=0;const childStyles={},childDialog={open:true},childButton={hidden:true,setAttribute(){}},childStatus={},childDoc={documentElement:{classList:{add(){}},style:{setProperty:(key,value)=>childStyles[key]=value}},querySelector:s=>s==='#lightbox'?childDialog:s==='#expand'?childButton:s==='#media-status'?childStatus:s==='#close'?{click(){childDialog.open=false;childClosed++}}:null,addEventListener(){}};
c.window.__sarahRadio={framed:true,document:()=>childDoc,navigate:p=>c.calls.push(['radioNavigate',p])};
c.events['window:sarah:page-changed']();assert.equal(childStyles['--app-height'],'400px');c.events.back();assert.equal(childClosed,1);c.events.back();assert.deepEqual(c.calls.at(-1),['radioNavigate','/']);
console.log('Passed current visible viewport resize and native Telegram Back targeting the active radio page');

c=context();assert.equal(c.button.hidden,false);c.window.__sarahMiniApp.toggleFullscreen();assert.equal(c.calls.at(-1)[0],'nativeEnter');
c.app.isFullscreen=true;c.events.fullscreenChanged();assert.equal(c.button.attributes['aria-label'],'Exit Telegram fullscreen');assert.equal(c.button.attributes['aria-pressed'],'true');
c.window.__sarahMiniApp.toggleFullscreen();assert.equal(c.calls.at(-1)[0],'nativeExit');
c.window.__sarahMiniApp.exitFullscreen();assert.equal(c.calls.at(-1)[0],'nativeExit');
c.app.isFullscreen=false;c.events.fullscreenChanged();assert.equal(c.button.attributes['aria-pressed'],'false');
c.events.fullscreenFailed({error:'UNSUPPORTED'});assert.match(c.status.textContent,/not supported by this Telegram app/);
c.window.__sarahMiniApp.toggleFullscreen();assert.equal(c.calls.at(-1)[0],'expand');
c=context();c.app.isVersionAtLeast=()=>false;c.window.__sarahMiniApp.toggleFullscreen();assert.equal(c.calls.at(-1)[0],'expand');
c=context();delete c.app.requestFullscreen;c.window.__sarahMiniApp.toggleFullscreen();assert.equal(c.calls.at(-1)[0],'expand');
c=context();c.app.requestFullscreen=()=>{throw Error('Client unavailable')};c.window.__sarahMiniApp.toggleFullscreen();assert.match(c.status.textContent,/not supported/);
c=context();c.app.isFullscreen=true;c.events.fullscreenFailed({error:'ALREADY_FULLSCREEN'});assert.equal(c.button.attributes['aria-pressed'],'true');c.window.__sarahMiniApp.toggleFullscreen();assert.equal(c.calls.at(-1)[0],'nativeExit');
c.window.location={origin:'https://sarahwadmore.com'};c.window.__sarahRadio={};
const childWindow={};runInNewContext(source,{parent:c.window,window:childWindow,location:{origin:'https://sarahwadmore.com'}});
assert.equal(childWindow.__sarahMiniApp,c.window.__sarahMiniApp);
console.log('Passed native Telegram fullscreen enter/exit/events, unsupported and older-client handling, and shared bridge in radio frames');


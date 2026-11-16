import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../assets/radio.js',import.meta.url),'utf8');
const events={},elements=[],children=[];
function element(tag){
 const handlers={};const el={tag,style:{},handlers,textContent:'',attributes:{},addEventListener:(name,fn)=>handlers[name]=fn,setAttribute:(k,v)=>el.attributes[k]=v,removeAttribute:k=>delete el.attributes[k],append:child=>children.push(child),prepend:child=>children.push(child)};
 if(tag==='audio'){el.plays=0;el.pauses=0;el.play=()=>{el.plays++;return Promise.resolve()};el.pause=()=>el.pauses++;el.load=()=>{}}
 if(tag==='iframe'){
 el.contentDocument={title:'About Sarah'};
 el.replacements=[];el.contentWindow={location:{replace(href){this.href=href;el.replacements.push(href)}}};
 Object.defineProperty(el,'src',{set(){throw Error('Child navigation must replace history, not assign iframe.src')}});
 }
 elements.push(el);return el;
}
const nav=element('nav'),doc={body:element('body'),createElement:element,querySelector:()=>nav,querySelectorAll:()=>[],addEventListener:(name,fn)=>events['doc:'+name]=fn,title:'Art'};
doc.body.classList={add:()=>{}};
const window={addEventListener:(name,fn)=>events[name]=fn,dispatchEvent:()=>{}};
const location={origin:'https://sarahwadmore.com',href:'https://sarahwadmore.com/',pathname:'/'};
const entries=[{state:null,url:location.href}];let cursor=0;
const updateLocation=url=>{const next=new URL(url);location.href=next.href;location.pathname=next.pathname;location.search=next.search};
const history={
 pushState(state,_,url){entries.splice(++cursor);entries.push({state,url});this.last=entries[cursor];updateLocation(url)},
 replaceState(state,_,url){entries[cursor]={state,url};this.last=entries[cursor];updateLocation(url)},
 back(){if(cursor>0){const entry=entries[--cursor];updateLocation(entry.url);events.popstate({state:entry.state})}},
 forward(){if(cursor<entries.length-1){const entry=entries[++cursor];updateLocation(entry.url);events.popstate({state:entry.state})}}
};
runInNewContext(source,{window,document:doc,location,history,URL,Event:class{constructor(type){this.type=type}}});
const audio=elements.find(e=>e.tag==='audio'),button=elements.find(e=>e.tag==='button');
assert.equal(elements.filter(e=>e.tag==='audio').length,1);
await window.__sarahRadio.toggle();assert.equal(audio.plays,1);assert.equal(button.textContent,'RADIO ON');
const identity=audio;
let prevented=false;
events['doc:click']({target:{closest:()=>({href:'https://sarahwadmore.com/about/',hasAttribute:()=>false})},button:0,preventDefault:()=>prevented=true});
assert.ok(prevented);assert.ok(window.__sarahRadio.framed);assert.equal(history.last.url,'https://sarahwadmore.com/about/');
const frame=elements.find(e=>e.tag==='iframe');frame.handlers.load();
assert.equal(audio,identity);assert.equal(audio.plays,1);assert.equal(audio.pauses,0);
assert.equal(entries.length,2);assert.equal(frame.replacements.length,1);
window.__sarahRadio.navigate('/blog/');assert.equal(elements.filter(e=>e.tag==='iframe').length,1);assert.equal(audio.pauses,0);
assert.equal(entries.length,3);assert.equal(frame.replacements.length,2);
for(const [traverse,path] of [['back','/about/'],['back','/'],['forward','/about/'],['forward','/blog/']]){
 history[traverse]();assert.equal(location.href,'https://sarahwadmore.com'+path);assert.equal(frame.contentWindow.location.href,location.href);
 assert.equal(entries.length,3);assert.equal(audio.pauses,0);
}
window.__sarahRadio.syncURL('https://sarahwadmore.com/?art=123');assert.equal(history.last.url,'https://sarahwadmore.com/?art=123');
await window.__sarahRadio.toggle();assert.equal(audio.pauses,1);assert.equal(button.textContent,'RADIO OFF');assert.equal(button.attributes['aria-pressed'],'false');
window.location=location;
const childWindow={addEventListener(){}};
runInNewContext(source,{parent:window,window:childWindow,document:doc,location,history,URL,Event:class{}});
assert.equal(childWindow.__sarahRadio,window.__sarahRadio);assert.equal(elements.filter(e=>e.tag==='audio').length,1);
await childWindow.__sarahRadio.toggle();audio.handlers.error();assert.equal(button.textContent,'RADIO RETRY');assert.equal(audio.pauses,2);
await childWindow.__sarahRadio.toggle();assert.equal(button.textContent,'RADIO ON');
events.popstate({state:{radioPage:'https://sarahwadmore.com/about/'}});assert.equal(frame.contentWindow.location.href,'https://sarahwadmore.com/about/');assert.equal(audio.pauses,2);
window.__sarahRadio.navigate('https://elsewhere.example/');assert.equal(frame.contentWindow.location.href,'https://sarahwadmore.com/about/');
const rels=new Set(['author']),outgoing={href:'https://opensea.io/collection/sarah-pu51fly',target:'',hasAttribute:()=>false,relList:{add:(...tokens)=>tokens.forEach(token=>rels.add(token))}};
const outgoingEvent={target:{closest:()=>outgoing},button:0,preventDefault(){this.defaultPrevented=true}};
events['doc:click'](outgoingEvent);
assert.equal(outgoing.target,'_blank');assert.ok(rels.has('noopener'));assert.ok(rels.has('noreferrer'));assert.ok(rels.has('author'));
assert.ok(!outgoingEvent.defaultPrevented,'Telegram must still be able to handle the outgoing click');
assert.equal(frame.contentWindow.location.href,'https://sarahwadmore.com/about/');assert.equal(audio.pauses,2);
const modified={...outgoing,target:'',relList:{add(){throw Error('Modified clicks retain native behavior')}}};
events['doc:click']({target:{closest:()=>modified},button:0,ctrlKey:true});assert.equal(modified.target,'');
events['doc:click']({target:{closest:()=>modified},button:0,defaultPrevented:true});assert.equal(modified.target,'');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/#detail\{pointer-events:none\}/);
assert.match(html,/#lightbox \.prev,#lightbox \.next\{z-index:6;pointer-events:auto/);
assert.match(html,/\.prev,.next\{top:auto;bottom:18px\}/);
assert.match(html,/if\(event.target===fullVideo\)return/);
assert.match(html,/<video id="full-video" controls/);
const viewer={works:[{title:'First',src:'first.png'},{title:'A long artwork title that wraps across several lines',src:'second.gif'},{title:'Video',src:'third.mp4',type:'video'},{title:'Fourth',src:'fourth.png'}],current:0,full:{removeAttribute(){}},fullVideo:{removeAttribute(){},setAttribute(){},load(){},play:()=>Promise.resolve()},mediaStatus:{},detail:{replaceChildren(title){this.title=title},append(){}},isVideo:w=>w.type==='video',setArtworkURL(){},stopVideo(){},reducedMotion:{matches:false},document:{createTextNode:t=>t,createElement:()=>({})}};
runInNewContext(html.match(/function show\(index\)\{[^\n]+/)[0],viewer);
const arrows={};viewer.document.querySelector=s=>arrows[s]||=( {} );
runInNewContext(html.match(/document.querySelector\('#prev'\).onclick=[^\n]+/)[0],viewer);
arrows['#next'].onclick();assert.equal(viewer.detail.title,viewer.works[1].title);
arrows['#next'].onclick();assert.equal(viewer.fullVideo.src,'third.mp4');assert.equal(viewer.full.hidden,true);
arrows['#next'].onclick();assert.equal(viewer.detail.title,'Fourth');
arrows['#prev'].onclick();assert.equal(viewer.detail.title,'Video');
const {renderIndex,renderArticle,makePost}=await import('./blog.mjs');
assert.match(renderIndex([]),/src="\/assets\/radio.js"/);
assert.match(renderArticle(makePost({title:'Studio'},'New work',1,'2026-11-16T00:00:00Z'),'New work',[]),/href="\/assets\/radio.css"/);
console.log('Passed persistent audio, replacement frame history with Back/Forward, outgoing links, shared artwork URL, retry/stop and unchanged arrow/video controls');


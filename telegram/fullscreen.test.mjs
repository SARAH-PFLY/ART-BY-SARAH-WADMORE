import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/const expand=document.querySelector\('#expand'\);[\s\S]*?\nexpand.onclick=[^\n]+/)[0];
function context(native=false,browser=true){
 const calls=[],button={},mediaStatus={},box={close:()=>calls.push('close')},document={fullscreenElement:null,documentElement:{},querySelector:()=>button,exitFullscreen:async()=>calls.push('browserExit')};
 if(browser)document.documentElement.requestFullscreen=async()=>calls.push('browserEnter');
 const window={};if(native)window.__sarahMiniApp={toggleFullscreen:()=>calls.push('nativeToggle'),exitFullscreen:()=>calls.push('nativeExit')};
 const c={window,document,mediaStatus,box};runInNewContext(source,c);runInNewContext(html.match(/async function closeViewer\(\)\{[^\n]+/)[0],c);
 return {c,calls,button,document,mediaStatus};
}
let t=context(true);await t.button.onclick();assert.deepEqual(t.calls,['nativeToggle']);await t.c.closeViewer();assert.deepEqual(t.calls,['nativeToggle','nativeExit','close']);
t=context(true,false);await t.button.onclick();assert.deepEqual(t.calls,['nativeToggle']);
t=context();await t.button.onclick();assert.deepEqual(t.calls,['browserEnter']);t.document.fullscreenElement={};await t.button.onclick();assert.equal(t.calls.at(-1),'browserExit');await t.c.closeViewer();assert.deepEqual(t.calls.slice(-2),['browserExit','close']);
t=context(false,false);assert.equal(t.button.hidden,true);
t=context();t.document.documentElement.requestFullscreen=async()=>{throw Error('Denied')};await t.button.onclick();assert.match(t.mediaStatus.textContent,/not available in this browser/);
console.log('Passed existing viewer button using native Telegram fullscreen, browser fallback, viewer close and denied-browser feedback');

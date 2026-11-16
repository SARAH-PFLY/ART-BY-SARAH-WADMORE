(() => {
 'use strict';
 try{if(parent!==window&&parent.location.origin===location.origin&&parent.__sarahRadio){window.__sarahMiniApp=parent.__sarahMiniApp;return}}catch{}
 const app=window.Telegram?.WebApp;
 if(!app||(!app.initData&&app.platform==='unknown'))return;
 const root=document.documentElement;
 root.classList.add('telegram-mini-app');
 const currentDocument=()=>window.__sarahRadio?.document()||document;
 let fullscreenUnsupported=false;
 const nativeFullscreen=()=>!fullscreenUnsupported&&app.isVersionAtLeast?.('8.0')&&typeof app.requestFullscreen==='function'&&typeof app.exitFullscreen==='function';
 const syncFullscreen=()=>{
 const button=currentDocument().querySelector('#expand');if(!button)return;
 button.hidden=false;
 button.setAttribute('aria-label',app.isFullscreen?'Exit Telegram fullscreen':'Enter Telegram fullscreen');
 button.setAttribute('aria-pressed',String(!!app.isFullscreen));
 };
 const fullscreenUnavailable=()=>{
 app.expand();const status=currentDocument().querySelector('#media-status');
 if(status)status.textContent='Fullscreen is not supported by this Telegram app. Try updating Telegram or maximising its Mini App window.';
 syncFullscreen();
 };
 window.__sarahMiniApp={
 toggleFullscreen(){
 if(!nativeFullscreen()){fullscreenUnavailable();return}
 try{if(app.isFullscreen)app.exitFullscreen();else app.requestFullscreen()}catch{fullscreenUnsupported=true;fullscreenUnavailable()}
 },
 exitFullscreen(){if(nativeFullscreen()&&app.isFullscreen)try{app.exitFullscreen()}catch{}}
 };
 const safe=()=>{
 const height=Math.min(window.innerHeight,window.visualViewport?.height||Infinity,app.viewportHeight||Infinity);
 for(const doc of new Set([document,currentDocument()])){
 const element=doc.documentElement;element.classList.add('telegram-mini-app');
 const system=app.safeAreaInset||{},content=app.contentSafeAreaInset||{};
 for(const edge of ['top','right','bottom','left'])element.style.setProperty('--app-safe-'+edge,((system[edge]||0)+(content[edge]||0))+'px');
 element.style.setProperty('--app-height',height+'px');
 }
 };
 const syncBack=()=>{const dialog=currentDocument().querySelector('#lightbox');if(dialog?.open||location.pathname!=='/')app.BackButton?.show();else app.BackButton?.hide()};
 const back=()=>{const dialog=currentDocument().querySelector('#lightbox');if(dialog?.open){currentDocument().querySelector('#close')?.click();return}if(window.__sarahRadio?.framed)window.__sarahRadio.navigate('/');else location.assign('/')};
 let observer;const linked=new WeakSet();
 const bindPage=()=>{
 observer?.disconnect();const doc=currentDocument(),dialog=doc.querySelector('#lightbox');
 if(dialog){observer=new MutationObserver(syncBack);observer.observe(dialog,{attributes:true,attributeFilter:['open']})}
 if(!linked.has(doc)){
 linked.add(doc);doc.addEventListener('click',event=>{
 const anchor=event.target.closest?.('a[href]');if(!anchor||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const url=new URL(anchor.href,location.href);if(url.origin===location.origin||!['https:','http:'].includes(url.protocol))return;
 event.preventDefault();if(url.hostname==='t.me')app.openTelegramLink(url.href);else app.openLink(url.href);
 });
 }
 safe();syncBack();syncFullscreen();
 };
 try{
 app.ready();app.expand();app.setHeaderColor?.('#000000');app.setBackgroundColor?.('#000000');
 if(app.isVersionAtLeast?.('7.10'))app.setBottomBarColor?.('#000000');
 app.BackButton?.onClick(back);
 for(const event of ['viewportChanged','safeAreaChanged','contentSafeAreaChanged'])app.onEvent?.(event,safe);
 app.onEvent?.('fullscreenChanged',()=>{safe();syncFullscreen()});
 app.onEvent?.('fullscreenFailed',event=>{if(event?.error==='ALREADY_FULLSCREEN'){syncFullscreen();return}fullscreenUnsupported=true;fullscreenUnavailable()});
 window.addEventListener('resize',safe);
 window.visualViewport?.addEventListener('resize',safe);
 window.addEventListener('sarah:page-changed',bindPage);
 bindPage();
 }catch{ /* Browser fallbacks remain available; this is public artwork browsing, not authentication. */ }
})();

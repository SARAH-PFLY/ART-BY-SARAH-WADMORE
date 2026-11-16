(() => {
 'use strict';
 try{if(parent!==window&&parent.location.origin===location.origin&&parent.__sarahRadio)return}catch{}
 const app=window.Telegram?.WebApp;
 if(!app||(!app.initData&&app.platform==='unknown'))return;
 const root=document.documentElement;
 root.classList.add('telegram-mini-app');
 const currentDocument=()=>window.__sarahRadio?.document()||document;
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
 safe();syncBack();
 };
 try{
 app.ready();app.expand();app.setHeaderColor?.('#000000');app.setBackgroundColor?.('#000000');
 if(app.isVersionAtLeast?.('7.10'))app.setBottomBarColor?.('#000000');
 app.BackButton?.onClick(back);
 for(const event of ['viewportChanged','safeAreaChanged','contentSafeAreaChanged'])app.onEvent?.(event,safe);
 window.addEventListener('resize',safe);
 window.visualViewport?.addEventListener('resize',safe);
 window.addEventListener('sarah:page-changed',bindPage);
 bindPage();
 }catch{ /* Browser fallbacks remain available; this is public artwork browsing, not authentication. */ }
})();

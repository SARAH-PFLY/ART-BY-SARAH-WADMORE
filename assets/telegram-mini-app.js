(() => {
 'use strict';
 const app=window.Telegram?.WebApp;
 if(!app||(!app.initData&&app.platform==='unknown'))return;
 const root=document.documentElement;
 root.classList.add('telegram-mini-app');
 const safe=()=>{const system=app.safeAreaInset||{},content=app.contentSafeAreaInset||{};for(const edge of ['top','right','bottom','left'])root.style.setProperty('--app-safe-'+edge,((system[edge]||0)+(content[edge]||0))+'px');root.style.setProperty('--app-height',(app.viewportStableHeight||window.innerHeight)+'px')};
 const syncBack=()=>{const dialog=document.querySelector('#lightbox');if(dialog?.open||location.pathname!=='/')app.BackButton?.show();else app.BackButton?.hide()};
 const back=()=>{const dialog=document.querySelector('#lightbox');if(dialog?.open){document.querySelector('#close')?.click();return}location.assign('/')};
 try{
 app.ready();app.expand();app.setHeaderColor?.('#000000');app.setBackgroundColor?.('#000000');
 if(app.isVersionAtLeast?.('7.10'))app.setBottomBarColor?.('#000000');
 app.BackButton?.onClick(back);
 for(const event of ['viewportChanged','safeAreaChanged','contentSafeAreaChanged'])app.onEvent?.(event,safe);
 const dialog=document.querySelector('#lightbox');if(dialog)new MutationObserver(syncBack).observe(dialog,{attributes:true,attributeFilter:['open']});
 document.addEventListener('click',event=>{
 const anchor=event.target.closest?.('a[href]');if(!anchor||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const url=new URL(anchor.href,location.href);if(url.origin===location.origin)return;
 if(!['https:','http:'].includes(url.protocol))return;
 event.preventDefault();if(url.hostname==='t.me')app.openTelegramLink(url.href);else app.openLink(url.href);
 });
 safe();syncBack();
 }catch{ /* Browser fallbacks remain available; this is public artwork browsing, not authentication. */ }
})();
(() => {
 'use strict';
 const STREAM='https://api.cryptomoonboys.com/radio/stream';
 const pathAllowed=url=>url.origin===location.origin&&(url.pathname==='/'||url.pathname==='/about/'||url.pathname.startsWith('/blog/'))&&!/\.(json|xml|txt|md|pdf)$/i.test(url.pathname);
 let shared;
 try{if(parent!==window&&parent.location.origin===location.origin)shared=parent.__sarahRadio}catch{}
 const embedded=!!shared;
 if(!shared){
 const audio=document.createElement('audio');audio.preload='none';audio.volume=.5;document.body.append(audio);
 let wanted=false,state='off',generation=0,frame=null;const listeners=new Set(),initial=location.href;
 const notify=()=>listeners.forEach(fn=>fn(state));
 const stop=()=>{generation++;wanted=false;state='off';audio.pause();audio.removeAttribute('src');audio.load();notify()};
 const failed=()=>{if(!wanted)return;stop();state='error';notify()};
 shared={
 subscribe(fn){listeners.add(fn);fn(state);return()=>listeners.delete(fn)},
 get active(){return wanted},get framed(){return !!frame},
 syncURL(href){const url=new URL(href,location.href);if(frame&&pathAllowed(url))history.replaceState({radioPage:url.href},'',url.href)},
 document(){return frame?.contentDocument||document},
 navigate(href,push=true){
 const url=new URL(href,location.href);if(!pathAllowed(url))return;
 if(!frame){
 frame=document.createElement('iframe');frame.id='radio-content';frame.title='Sarah Wadmore website';frame.allow='autoplay; fullscreen; clipboard-write; web-share';
 Object.assign(frame.style,{position:'fixed',inset:'0',width:'100%',height:'var(--app-height,100dvh)',border:'0',background:'#000',zIndex:'1000'});
 document.body.style.overflow='hidden';document.body.classList.add('radio-shell');
 document.querySelectorAll('video').forEach(video=>video.pause());
 frame.addEventListener('load',()=>{try{document.title=frame.contentDocument.title;window.dispatchEvent(new Event('sarah:page-changed'))}catch{}});
 document.body.append(frame);
 }
 if(push)history.pushState({radioPage:url.href},'',url.href);
 // The top document owns history; child navigation must not add a second entry.
 frame.contentWindow.location.replace(url.href);
 },
 async toggle(){
 if(wanted){stop();return}
 wanted=true;state='loading';const version=++generation;notify();audio.src=STREAM;
 try{await audio.play();if(version!==generation)return;state='on';notify()}catch{if(version===generation)failed()}
 }
 };
 window.__sarahRadio=shared;
 audio.addEventListener('error',failed);
 audio.addEventListener('waiting',()=>{if(wanted){state='loading';notify()}});
 audio.addEventListener('playing',()=>{if(wanted){state='on';notify()}});
 window.addEventListener('popstate',event=>{if(shared.framed)shared.navigate(event.state?.radioPage||initial,false)});
 }else window.__sarahRadio=shared;
 const button=document.createElement('button');button.type='button';button.className='radio-toggle';button.setAttribute('aria-label','Toggle GraffPUNKS live radio');
 const mount=document.querySelector('header nav')||document.querySelector('header')||document.body;mount.prepend(button);
 const unsubscribe=shared.subscribe(state=>{button.textContent=state==='on'?'RADIO ON':state==='loading'?'RADIO …':state==='error'?'RADIO RETRY':'RADIO OFF';button.setAttribute('aria-pressed',String(state==='on'||state==='loading'));button.setAttribute('aria-label','GraffPUNKS live radio: '+state+'. '+(state==='on'||state==='loading'?'Turn off':'Turn on'))});
 button.addEventListener('click',()=>shared.toggle());
 window.addEventListener('pagehide',unsubscribe,{once:true});
 document.addEventListener('click',event=>{
 const a=event.target.closest?.('a[href]');if(!a||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||a.target==='_blank'||a.hasAttribute('download'))return;
 const url=new URL(a.href,location.href);
 // Keep outgoing sites out of our persistent same-origin content frame.
 // Let the default click (or Telegram's later link handler) open the destination.
 if(embedded&&url.origin!==location.origin&&['https:','http:'].includes(url.protocol)){
 a.target='_blank';a.relList.add('noopener','noreferrer');return;
 }
 if(url.origin===location.origin&&url.pathname===location.pathname&&url.search===location.search&&url.hash)return;
 if(pathAllowed(url)&&(shared.active||shared.framed)){event.preventDefault();shared.navigate(url.href)}
 });
})();

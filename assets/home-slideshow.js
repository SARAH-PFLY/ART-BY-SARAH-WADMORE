(function(){
 'use strict';
 const hero=document.querySelector('#home-hero');if(!hero)return;
 const image=hero.querySelector('img'),open=hero.querySelector('.hero-open');
 const slides=JSON.parse(hero.dataset.slides);if(!slides.length)return;
 let last='';try{last=localStorage.getItem('sarah:hero-opening')||''}catch{}
 const choices=slides.filter(src=>src!==last),pool=choices.length?choices:slides;
 let current=slides.indexOf(pool[Math.floor(Math.random()*pool.length)]),timer=null,paused=false,version=0;
 image.src=slides[current];try{localStorage.setItem('sarah:hero-opening',slides[current])}catch{}
 const count=hero.querySelector('.hero-count'),pause=hero.querySelector('.hero-pause');
 const modal=document.createElement('dialog');modal.id='hero-fullscreen';modal.setAttribute('aria-label','Sarah Wadmore mural viewer');
 modal.innerHTML='<img alt="Street art mural by Sarah Wadmore (PFLY), England"><div class="hero-modal-tools"><button type="button" data-expand aria-label="Enter device fullscreen">⛶</button><button type="button" data-close aria-label="Close mural viewer">×</button></div><button type="button" class="hero-modal-prev" aria-label="Previous mural">‹</button><button type="button" class="hero-modal-next" aria-label="Next mural">›</button>';
 document.body.append(modal);const full=modal.querySelector('img');let ownedFullscreen=false;
 function label(){count.textContent=(current+1)+' / '+slides.length;open.setAttribute('aria-label','Open mural '+(current+1)+' of '+slides.length+' fullscreen');if(modal.open)full.src=slides[current]}
 function schedule(){clearTimeout(timer);if(!paused&&!modal.open&&!document.hidden&&slides.length>1)timer=setTimeout(()=>change(1),4000)}
 async function change(step){
  clearTimeout(timer);const token=++version,next=(current+step+slides.length)%slides.length;
  const preload=new Image();preload.src=slides[next];try{await preload.decode()}catch{schedule();return}
  if(token!==version)return;current=next;image.src=preload.src;label();schedule();
 }
 hero.querySelector('.hero-prev').onclick=()=>change(-1);hero.querySelector('.hero-next').onclick=()=>change(1);
 pause.onclick=()=>{paused=!paused;pause.textContent=paused?'Play':'Pause';pause.setAttribute('aria-pressed',String(paused));schedule()};
 open.onclick=()=>{++version;clearTimeout(timer);full.src=slides[current];modal.showModal()};
 modal.querySelector('[data-close]').onclick=()=>modal.close();
 modal.querySelector('[data-expand]').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().then(()=>{ownedFullscreen=true}).catch(()=>{});else document.exitFullscreen?.().catch(()=>{})};
 modal.querySelector('.hero-modal-prev').onclick=()=>change(-1);modal.querySelector('.hero-modal-next').onclick=()=>change(1);
 modal.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();change(event.key==='ArrowLeft'?-1:1)}});
 modal.addEventListener('close',()=>{++version;if(ownedFullscreen&&document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});ownedFullscreen=false;open.focus();schedule()});
 document.addEventListener('visibilitychange',()=>{++version;schedule()});
 label();schedule();
})();

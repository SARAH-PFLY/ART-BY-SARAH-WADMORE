(function(root){
 'use strict';
 const storage={
  get(key,session=false){try{return (session?sessionStorage:localStorage).getItem(key)}catch{return null}},
  set(key,value,session=false){try{(session?sessionStorage:localStorage).setItem(key,value)}catch{}}
 };
 const key=work=>work.uploadId||work.src;
 function previews(work){
  const candidates=(Array.isArray(work.previews)?work.previews:[]).filter(p=>p&&/^artworks\/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp)$/i.test(p.src)&&Number.isFinite(p.width)&&p.width>0);
  if(work.thumbnail&&work.thumbnailWidth&&!candidates.some(p=>p.src===work.thumbnail||p.width===work.thumbnailWidth))candidates.push({src:work.thumbnail,width:work.thumbnailWidth,height:work.thumbnailHeight});
  return candidates.sort((a,b)=>a.width-b.width);
 }
 function ordered(works){return [...works.filter(w=>w.featured),...works.filter(w=>!w.featured)]}
 function create({wall,box,full,fullVideo,reducedMotion,getWorks,getCurrent,show,syncPreviews,layout}){
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  let preference=storage.get('sarah:data-saving')||'auto';
  const autoSaving=()=>!!connection?.saveData||/^(slow-2g|2g)$/.test(connection?.effectiveType||'');
  let saving=preference==='on'||preference==='auto'&&autoSaving();
  let preload=null,preloadURL='',preloadTimer=null,restorePending=true;
  let zoom=1,x=0,y=0,fitWidth=0,fitHeight=0,start=null,pinch=null,hadPinch=false;
  const pointers=new Map();
  const viewer=box.querySelector('.viewer');
  const setting=document.createElement('button');setting.type='button';setting.className='gallery-setting';setting.id='data-saving';
  document.querySelector('header nav').prepend(setting);
  const settingNote=document.createElement('span');settingNote.className='sr-only';settingNote.role='status';setting.after(settingNote);
  function settingLabel(){setting.textContent='DATA '+(preference==='auto'?'AUTO':saving?'SAVER':'FULL');setting.setAttribute('aria-label','Data saving: '+preference+(preference==='auto'?(saving?' (on)':' (off)'):'')+'. Click to change.');setting.title='Cycle data saving: Auto / On / Off';settingNote.textContent=saving?'Data saving on. Video previews and preloading paused.':'Full gallery browsing enabled.'}
  function cancelPreload(){clearTimeout(preloadTimer);preloadTimer=null;if(preload){preload.removeAttribute('src');preload=null}preloadURL=''}
  function setPreference(value){
   preference=value;storage.set('sarah:data-saving',value);saving=value==='on'||value==='auto'&&autoSaving();settingLabel();
   cancelPreload();wall.querySelectorAll('.tile img').forEach(img=>applyPreview(img,img._artwork));syncPreviews();
   if(saving&&fullVideo.loop)fullVideo.pause();
  }
  setting.onclick=()=>setPreference(preference==='auto'?'on':preference==='on'?'off':'auto');
  connection?.addEventListener?.('change',()=>{if(preference==='auto')setPreference('auto')});
  settingLabel();
  function applyPreview(img,work){
   if(!work)return;
   const options=previews(work);
   // Assign sizes/srcset before src to avoid a speculative full-file request.
   if(!saving&&options.length>1){img.sizes='(max-width: 650px) 50vw, 33.34vw';img.srcset=options.map(p=>p.src+' '+p.width+'w').join(', ')}
   else{img.removeAttribute('srcset');img.removeAttribute('sizes')}
   img.src=options.length?(saving?options[0].src:options.at(-1).src):(work.thumbnail||work.src);
  }
  function bindImage(img,work){
   img._artwork=work;
   if(work.width&&work.height){img.width=work.width;img.height=work.height}
   else if(work.thumbnailWidth&&work.thumbnailHeight){img.width=work.thumbnailWidth;img.height=work.thumbnailHeight}
   img.addEventListener('load',()=>{img.classList.add('is-loaded');layout();restorePosition()});
   let failed=false;
   img.addEventListener('error',()=>{img.classList.add('is-loaded');if(failed||saving)return;failed=true;img.removeAttribute('srcset');img.src=work.src});
   applyPreview(img,work);
  }
  function savePosition(){
   const tiles=[...wall.querySelectorAll('.tile')];
   const anchor=tiles.filter(t=>t.getBoundingClientRect().bottom>0).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)[0];
   storage.set('sarah:gallery-position',JSON.stringify({key:anchor?.dataset.artwork,offset:anchor?.getBoundingClientRect().top||0,y:scrollY}),true);
  }
  function restorePosition(){
   if(!restorePending||box.open||new URL(location.href).searchParams.has('art'))return;
   let saved;try{saved=JSON.parse(storage.get('sarah:gallery-position',true)||'null')}catch{}
   if(!saved){restorePending=false;return}
   const anchor=[...wall.querySelectorAll('.tile')].find(t=>t.dataset.artwork===saved.key);
   const desired=anchor?scrollY+anchor.getBoundingClientRect().top-saved.offset:Math.min(saved.y,Math.max(0,document.documentElement.scrollHeight-innerHeight));
   if(!Number.isFinite(desired)){restorePending=false;return}
   // Wait until the wall has its metadata-based height before restoring.
   if(document.documentElement.scrollHeight-innerHeight>=desired-2){scrollTo(0,Math.max(0,desired));restorePending=false}
  }
  addEventListener('pagehide',()=>{cancelPreload();if(!restorePending)savePosition()});
  document.addEventListener('click',event=>{if(event.target.closest?.('a[href]')&&!box.open)savePosition()});
  addEventListener('pointerdown',()=>{restorePending=false},{once:true});
  addEventListener('wheel',()=>{restorePending=false},{once:true,passive:true});
  function schedulePreload(){
   cancelPreload();if(saving||!box.open||document.hidden||getWorks().length<2)return;
   const next=getWorks()[(getCurrent()+1)%getWorks().length];
   if(!next||next.type==='video'||/\.mp4(?:[?#]|$)/i.test(next.src)||next.animated)return;
   preloadTimer=setTimeout(()=>{if(saving||!box.open)return;preload=new Image();preload.decoding='async';preload.fetchPriority='low';preloadURL=next.src;preload.src=next.src},200);
  }
  full.addEventListener('load',()=>{full.classList.add('is-loaded');fit();schedulePreload()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelPreload()});
  const toolbar=document.createElement('div');toolbar.className='viewer-tools';toolbar.setAttribute('aria-label','Artwork tools');
  toolbar.innerHTML='<div class="zoom-controls" role="group" aria-label="Image zoom"><button type="button" id="zoom-out" aria-label="Zoom out">−</button><button type="button" id="zoom-reset" aria-label="Reset image zoom">100%</button><button type="button" id="zoom-in" aria-label="Zoom in">+</button></div><button type="button" id="artwork-enquire">Enquire about this artwork ↗</button>';
  box.append(toolbar);
  const zoomGroup=toolbar.querySelector('.zoom-controls'),zoomReset=toolbar.querySelector('#zoom-reset');
  const hint=document.createElement('p');hint.id='viewer-hint';hint.textContent='Swipe to explore · Pinch or double-tap to zoom';hint.hidden=true;box.append(hint);
  let hintTimer;
  function fit(){
   if(full.hidden||!full.naturalWidth)return;
   const s=getComputedStyle(viewer),vw=viewer.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),vh=viewer.clientHeight-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom);
   const ratio=Math.min(vw/full.naturalWidth,vh/full.naturalHeight);fitWidth=full.naturalWidth*ratio;fitHeight=full.naturalHeight*ratio;
   full.style.width=fitWidth+'px';full.style.height=fitHeight+'px';transform();
  }
  function transform(){
   const style=getComputedStyle(viewer),vw=viewer.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),vh=viewer.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
   const maxX=Math.max(0,(fitWidth*zoom-vw)/2),maxY=Math.max(0,(fitHeight*zoom-vh)/2);
   x=Math.max(-maxX,Math.min(maxX,x));y=Math.max(-maxY,Math.min(maxY,y));
   full.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+zoom+')';
   full.style.cursor=zoom>1?'grab':'zoom-in';zoomReset.textContent=Math.round(zoom*100)+'%';
   toolbar.querySelector('#zoom-out').disabled=zoom<=1;toolbar.querySelector('#zoom-in').disabled=zoom>=4;
  }
  function setZoom(value){zoom=Math.max(1,Math.min(4,value));if(zoom===1){x=0;y=0}transform()}
  function resetZoom(){pointers.clear();pinch=null;start=null;zoom=1;x=y=0;full.style.transform='';full.style.width='';full.style.height='';fit()}
  toolbar.querySelector('#zoom-in').onclick=()=>setZoom(zoom+.5);
  toolbar.querySelector('#zoom-out').onclick=()=>setZoom(zoom-.5);
  zoomReset.onclick=()=>setZoom(1);
  // Pointer capture retargets desktop clicks to the viewer, including dblclick.
  viewer.addEventListener('dblclick',event=>{if(full.hidden||event.target===fullVideo||fullVideo.contains(event.target))return;event.preventDefault();setZoom(zoom>1?1:2)});
  full.draggable=false;
  let lastTap=0;
  viewer.addEventListener('pointerdown',event=>{
   if(event.target===fullVideo||fullVideo.contains(event.target))return;
   viewer.setPointerCapture?.(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
   if(pointers.size===1){start={x:event.clientX,y:event.clientY,panX:x,panY:y};hadPinch=false}
   if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};hadPinch=true}
  });
  viewer.addEventListener('pointermove',event=>{
   if(!pointers.has(event.pointerId))return;
   pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
   if(pointers.size===2&&pinch&&!full.hidden){const [a,b]=[...pointers.values()];setZoom(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance))}
   else if(start&&zoom>1){x=start.panX+event.clientX-start.x;y=start.panY+event.clientY-start.y;transform()}
  });
  viewer.addEventListener('pointerup',event=>{
   if(!pointers.has(event.pointerId))return;
   pointers.delete(event.pointerId);
   if(start&&!hadPinch&&zoom===1){
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){lastTap=0;show(getCurrent()+(dx<0?1:-1))}
    else if(event.pointerType==='touch'&&Math.hypot(dx,dy)<10&&!full.hidden){const now=Date.now();if(now-lastTap<300){setZoom(2);lastTap=0}else lastTap=now}
   }
   if(!pointers.size){start=null;pinch=null}
  });
  viewer.addEventListener('pointercancel',()=>{pointers.clear();start=null;pinch=null});
  viewer.addEventListener('wheel',event=>{if(full.hidden)return;event.preventDefault();setZoom(zoom+(event.deltaY<0?.25:-.25))},{passive:false});
  box.addEventListener('keydown',event=>{if(event.target.matches('input,textarea,select')||full.hidden)return;if(['+','=','-','0'].includes(event.key)){event.preventDefault();setZoom(event.key==='0'?1:zoom+(event.key==='-'?-.5:.5))}});
  addEventListener('resize',fit);
  function onShow(work){
   cancelPreload();resetZoom();full.classList.remove('is-loaded');zoomGroup.hidden=work.type==='video'||/\.mp4(?:[?#]|$)/i.test(work.src);
   toolbar.querySelector('#artwork-enquire').dataset.id=work.uploadId||'';
   hint.hidden=true;clearTimeout(hintTimer);
   if(matchMedia('(pointer:coarse)').matches&&!storage.get('sarah:swipe-hint')){
    hint.hidden=false;storage.set('sarah:swipe-hint','seen');hintTimer=setTimeout(()=>{hint.hidden=true},5000);
   }
  }
  box.addEventListener('close',()=>{cancelPreload();resetZoom();hint.hidden=true;clearTimeout(hintTimer)});
  box.addEventListener('cancel',event=>{if(event.target===box&&zoom>1){event.preventDefault();event.stopImmediatePropagation();setZoom(1)}},true);
  // A separate draft keeps enquiries editable without sending anything automatically.
  const enquiry=document.createElement('dialog');enquiry.id='enquiry-panel';enquiry.setAttribute('aria-labelledby','enquiry-heading');
  enquiry.innerHTML='<div class="enquiry-head"><h2 id="enquiry-heading">Ask Sarah about this piece.</h2><button type="button" id="close-enquiry" aria-label="Close enquiry">×</button></div><label for="enquiry-message">Your message</label><textarea id="enquiry-message" rows="7"></textarea><p>In Telegram, reply with your question; the artwork title and link are included automatically. To use your edited draft, copy it first. Your enquiry goes to Sarah through her art bot.</p><div class="enquiry-actions"><button type="button" id="copy-enquiry">Copy message</button><a id="send-enquiry" target="_blank" rel="noopener noreferrer">Open Telegram ↗</a></div><p id="enquiry-status" role="status"></p>';
  box.append(enquiry);
  const draft=enquiry.querySelector('textarea'),enquiryStatus=enquiry.querySelector('#enquiry-status');
  toolbar.querySelector('#artwork-enquire').onclick=()=>{
   const work=getWorks()[getCurrent()],url=new URL('/',location.origin);url.searchParams.set('art',key(work));
   draft.value='Hi Sarah, I would like to enquire about “'+work.title+'” — the original, prints or a commission.\n\nArtwork: '+url.href+'\n\nMy question: ';
   const send=enquiry.querySelector('#send-enquiry');send.href=/^\d+$/.test(work.uploadId||'')?'https://t.me/sarahs_artbot?start=enquire_'+work.uploadId:'https://t.me/sarahs_artbot';
   enquiryStatus.textContent='';enquiry.showModal();
  };
  enquiry.querySelector('#close-enquiry').onclick=()=>enquiry.close();
  enquiry.addEventListener('close',()=>toolbar.querySelector('#artwork-enquire').focus());
  enquiry.addEventListener('keydown',event=>event.stopPropagation());
  enquiry.querySelector('#copy-enquiry').onclick=async()=>{try{await navigator.clipboard.writeText(draft.value);enquiryStatus.textContent='Message copied. Paste it into the Telegram enquiry.'}catch{draft.focus();draft.select();enquiryStatus.textContent='Select and copy your message, then paste it into Telegram.'}};
  return {get saving(){return saving},bindImage,applyPreview,onShow,savePosition,restorePosition,resetZoom,get zoom(){return zoom},setPreference,ordered,previews};
 }
 root.GalleryExperience={create,ordered,previews};
})(globalThis);

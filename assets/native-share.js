(function(root){
'use strict';
root.createArtworkFileShare=function({navigator:nav=root.navigator,fetch:fetchFile=root.fetch.bind(root),File:FileType=root.File,onState,onMessage,getCaption}){
 let token=0,file=null,work=null,controller=null,state='idle',busy=false;
 const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',mp4:'video/mp4'};
 const notify=value=>{state=value;onState(value,work)};
 function cancel(){token++;controller?.abort();controller=null;file=null;work=null;notify('idle')}
 async function prepare(artwork,baseURL){
 cancel();work=artwork;
 if(!nav.share||!nav.canShare||!FileType){notify('unsupported');return}
 const id=token;controller=new AbortController();notify('loading');
 try{
 const url=new URL(artwork.src,baseURL),base=new URL(baseURL);
 if(url.origin!==base.origin)throw Error('Different origin');
 const name=decodeURIComponent(url.pathname.split('/').pop()),extension=name.split('.').pop().toLowerCase(),type=types[extension];
 if(!type)throw Error('Unsupported media');
 const response=await fetchFile(url.href,{signal:controller.signal,cache:'force-cache'});
 if(!response.ok)throw Error('Media unavailable');
 if(Number(response.headers.get('content-length'))>10*1024*1024)throw Error('Large file');
 const blob=await response.blob();if(!blob.size||blob.size>10*1024*1024)throw Error('Invalid size');
 if(id!==token)return;
 const prepared=new FileType([blob],name,{type});
 if(!nav.canShare({files:[prepared]})){notify('unsupported');return}
 file=prepared;notify('ready');
 }catch(error){if(id!==token)return;if(error.name!=='AbortError'){notify('unavailable');onMessage('The artwork file could not be prepared. You can still save the artwork and copy its caption.')}} 
 }
 function share(){
 if(busy)return;
 if(state==='loading'){onMessage('Preparing the original artwork. Tap Share image + caption when it is ready.');return}
 if(state!=='ready'||!file||!nav.share){onMessage('This browser cannot attach the artwork file. Use Save artwork and Copy caption.');return}
 const text=getCaption(),payload={title:work?.title||'Art by Sarah Wadmore',text,files:[file]};
 busy=true;const id=token;
 // Call directly from the click, without waiting for a download or clipboard operation.
 try{
 const result=nav.share(payload);
 Promise.resolve(result).then(()=>{if(id===token)onMessage('Handed to your sharing app. Check the caption and finish posting there. Some apps may omit caption text.')})
 .catch(error=>{if(id===token&&error.name!=='AbortError')onMessage('Sharing could not open. Try again, or use Save artwork and Copy caption.')})
 .finally(()=>{busy=false});
 }catch(error){busy=false;if(error.name!=='AbortError')onMessage('Sharing is unavailable. Use Save artwork and Copy caption.')}
 }
 return {prepare,share,cancel};
};
})(globalThis);

const LIMIT=8*1024*1024;
export function parse(text=''){const match=text.match(/^\/upload(?:@\w+)?\s+([\s\S]+)$/i);if(!match)return null;const parts=match[1].split('|').map(x=>x.trim());if(!parts[0]||parts[0].length>200)return null;return {title:parts[0],medium:parts.slice(1).join(' · ').slice(0,800)}}
function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}
const encode=text=>b64(new TextEncoder().encode(text));
async function equal(a,b){const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const x=await hash(a),y=await hash(b);return x.reduce((v,n,i)=>v|(n^y[i]),0)===0}
async function telegram(env,method,body){const r=await fetch('https://api.telegram.org/bot'+env.BOT_TOKEN+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok||!data.ok)throw Error('Telegram request failed');return data.result}
async function gh(env,path,method='GET',body){const r=await fetch('https://api.github.com/repos/'+env.REPO+'/'+path,{method,headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','User-Agent':'SarahArtworkUploader','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error('GitHub '+r.status);return r.json()}
async function handle(update,env){
 const m=update.message;if(!m||m.chat.type!=='private'||String(m.from?.id)!==env.SARAH_USER_ID)return;
 const say=text=>telegram(env,'sendMessage',{chat_id:m.chat.id,text});
 const text=m.caption||m.text||'';
 if(/^\/(start|help)(?:@\w+)?(?:\s|$)/i.test(text)){await say('Send one photo with this caption:\n/upload Artwork title | Medium | Dimensions\nOr reply with that command to a photo. JPEG, PNG or WebP image documents also work (maximum 8 MB).');return}
 const details=parse(text);if(!details){await say('Use /upload Artwork title | Medium | Dimensions as the photo caption, or reply to a photo with that command.');return}
 const media=m.photo||m.document?m:m.reply_to_message;
 const file=media?.photo?.at(-1)||media?.document;
 if(!file){await say('Please attach a photo or reply to one with /upload and the details.');return}
 if((file.file_size||0)>LIMIT){await say('Please send an image smaller than 8 MB.');return}
 const info=await telegram(env,'getFile',{file_id:file.file_id});
 const response=await fetch('https://api.telegram.org/file/bot'+env.BOT_TOKEN+'/'+info.file_path);
 if(!response.ok)throw Error('Image download failed');
 const reader=response.body.getReader();const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>LIMIT){await reader.cancel();await say('Please send an image smaller than 8 MB.');return}chunks.push(value)}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 const ext=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'png':String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'?'webp':null;
 if(!ext){await say('Only JPEG, PNG or WebP images are supported.');return}
 const id=String(update.update_id),path='artworks/telegram-'+id+'.'+ext;
 // Commit image and manifest together, using the branch ref as a compare-and-swap.
 // A retry reloads the current tree, so concurrent uploads cannot overwrite each other.
 for(let attempt=0;attempt<4;attempt++){
 const ref=await gh(env,'git/ref/heads/main');const head=ref.object.sha;
 const commit=await gh(env,'git/commits/'+head);
 const manifest=await gh(env,'contents/artworks.json?ref='+head);
 const list=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(manifest.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
 if(!Array.isArray(list))throw Error('Invalid artwork manifest');
 if(list.some(w=>w.uploadId===id)){await say('This upload is already saved.');return}
 const entry={...details,src:path,uploadId:id,uploadedAt:new Date().toISOString()};
 const image=await gh(env,'git/blobs','POST',{encoding:'base64',content:b64(bytes)});
 const json=await gh(env,'git/blobs','POST',{encoding:'base64',content:encode(JSON.stringify([entry,...list],null,2)+'\n')});
 const tree=await gh(env,'git/trees','POST',{base_tree:commit.tree.sha,tree:[{path,mode:'100644',type:'blob',sha:image.sha},{path:'artworks.json',mode:'100644',type:'blob',sha:json.sha}]});
 const next=await gh(env,'git/commits','POST',{message:'Add artwork from Telegram',tree:tree.sha,parents:[head]});
 try{await gh(env,'git/refs/heads/main','PATCH',{sha:next.sha,force:false})}catch(error){if(attempt<3&&/GitHub (409|422)/.test(error.message))continue;throw error}
 await say('Saved: '+details.title+'\nIt will appear first after GitHub Pages finishes publishing.\nhttps://sarahwadmore.com/');return;
 }
}
export default {async fetch(request,bindings){
 const env={...bindings,BOT_TOKEN:bindings.BotFathertoken||bindings.BT_TOKEN||bindings.BOT_TOKEN,GITHUB_TOKEN:bindings.GitHubtoken||bindings.H_TOKEN||bindings.GITHUB_TOKEN};
 if(new URL(request.url).pathname!=='/telegram'||request.method!=='POST')return new Response('Not found',{status:404});
 if(!env.WEBHOOK_SECRET||!env.BOT_TOKEN||!env.GITHUB_TOKEN||!env.SARAH_USER_ID)return new Response('Not configured',{status:503});
 if(!await equal(request.headers.get('X-Telegram-Bot-Api-Secret-Token')||'',env.WEBHOOK_SECRET))return new Response('Forbidden',{status:403});
 if(Number(request.headers.get('content-length')||0)>100000)return new Response('Too large',{status:413});
 try{await handle(await request.json(),env);return new Response('OK')}catch{console.error(JSON.stringify({event:'upload_failed'}));return new Response('Retry later',{status:503})}
}};

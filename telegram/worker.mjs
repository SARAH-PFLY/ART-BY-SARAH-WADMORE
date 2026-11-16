import {parseBlog,makePost,renderArticle,renderIndex,sitemap,rss} from './blog.mjs';
const LIMIT=8*1024*1024;
export function hasH264Video(bytes){
 try{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const text=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
 function boxes(start,end){
 const result=[];
 for(let p=start;p<end;){
 if(p+8>end)throw Error('Truncated box');
 let size=view.getUint32(p),header=8;
 if(size===1){if(p+16>end)throw Error('Truncated extended box');size=view.getUint32(p+8)*4294967296+view.getUint32(p+12);header=16}
 if(size===0)size=end-p;
 if(!Number.isSafeInteger(size)||size<header||p+size>end)throw Error('Invalid box size');
 result.push({type:text(p+4,p+8),start:p+header,end:p+size});p+=size;
 }
 return result;
 }
 const root=boxes(0,bytes.length);const moov=root.find(b=>b.type==='moov');if(!moov)return false;
 let videoTracks=0;
 for(const track of boxes(moov.start,moov.end).filter(b=>b.type==='trak')){
 const mdia=boxes(track.start,track.end).find(b=>b.type==='mdia');if(!mdia)continue;
 const children=boxes(mdia.start,mdia.end),handler=children.find(b=>b.type==='hdlr');
 if(!handler||handler.start+12>handler.end||text(handler.start+8,handler.start+12)!=='vide')continue;
 videoTracks++;
 const minf=children.find(b=>b.type==='minf');if(!minf)return false;
 const stbl=boxes(minf.start,minf.end).find(b=>b.type==='stbl');if(!stbl)return false;
 const stsd=boxes(stbl.start,stbl.end).find(b=>b.type==='stsd');if(!stsd||stsd.start+8>stsd.end)return false;
 const entries=boxes(stsd.start+8,stsd.end),count=view.getUint32(stsd.start+4);
 if(!count||count!==entries.length||entries.some(e=>!['avc1','avc3'].includes(e.type)||e.end-e.start<78))return false;
 }
 return videoTracks>0;
 }catch{return false}
}

export function detectMedia(bytes){
 const text=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {ext:'jpg',type:'image'};
 if(text(0,8)==='\x89PNG\r\n\x1a\n')return {ext:'png',type:'image'};
 if(text(0,4)==='RIFF'&&text(8,12)==='WEBP')return {ext:'webp',type:'image'};
 if(['GIF87a','GIF89a'].includes(text(0,6)))return {ext:'gif',type:'image',animated:true};
 if(bytes.length>=16&&text(4,8)==='ftyp'){
 const brands=[];for(let i=8;i<Math.min(bytes.length,64);i+=4)if(i!==12)brands.push(text(i,i+4));
 if(brands.some(b=>['isom','iso2','mp41','mp42','avc1','M4V ','dash'].includes(b))&&hasH264Video(bytes))return {ext:'mp4',type:'video'};
 }
 return null;
}

export function parse(text=''){const match=text.match(/^\/upload(?:@\w+)?\s+([\s\S]+)$/i);if(!match)return null;const parts=match[1].split('|').map(x=>x.trim());if(!parts[0]||parts[0].length>200)return null;return {title:parts[0],medium:parts.slice(1).join(' · ').slice(0,800)}}
function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}
const encode=text=>b64(new TextEncoder().encode(text));
async function equal(a,b){const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const x=await hash(a),y=await hash(b);return x.reduce((v,n,i)=>v|(n^y[i]),0)===0}
async function telegram(env,method,body){const r=await fetch('https://api.telegram.org/bot'+env.BOT_TOKEN+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok||!data.ok)throw Error('Telegram request failed');return data.result}
async function gh(env,path,method='GET',body){const r=await fetch('https://api.github.com/repos/'+env.REPO+(path?'/'+path:''),{method,headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','User-Agent':'SarahArtworkUploader','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error('GitHub '+r.status+' '+method+' '+path);return r.json()}
export function deleteTitle(text=''){
 const match=text.match(/^\/delete(?:@\w+)?(?:\s+([\s\S]*))?$/i);
 return match?(match[1]||'').trim():null;
}
const normalizeTitle=value=>String(value).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
async function deleteArtwork(update,env,title,say){
 if(!title||title.length>200){await say('Use /delete Artwork title (title only, without medium or dimensions).');return}
 const id=String(update.update_id);let target=null;
 for(let attempt=0;attempt<4;attempt++){
 const ref=await gh(env,'git/ref/heads/main'),head=ref.object.sha;
 const commit=await gh(env,'git/commits/'+head);
 const decode=file=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
 const list=decode(await gh(env,'contents/artworks.json?ref='+head));
 let deleted=[];
 try{deleted=decode(await gh(env,'contents/telegram/deletions.json?ref='+head))}catch(error){if(!/^GitHub 404 /.test(error.message))throw error}
 if(!Array.isArray(list)||!Array.isArray(deleted))throw Error('Invalid manifest');
 if(deleted.some(entry=>entry.updateId===id)){await say('This delete command has already been completed.');return}
 const matches=list.filter(work=>normalizeTitle(work.title)===normalizeTitle(title));
 if(!matches.length){await say('No artwork found with that exact title: '+title);return}
 if(matches.length>1){await say('More than one artwork has that title. Nothing deleted. Rename duplicate titles before using /delete.');return}
 const match=matches[0],identity=JSON.stringify([match.uploadId||null,match.src]);
 if(target!==null&&target!==identity){await say('That artwork changed while deleting. Nothing deleted. Please check the title and try again.');return}
 target=identity;
 const remaining=list.filter(work=>work!==match);
 const ledger=[...deleted,{updateId:id,uploadId:match.uploadId||null,title:match.title,src:match.src,deletedAt:new Date().toISOString()}];
 const entries=[];
 for(const [path,value] of [['artworks.json',remaining],['telegram/deletions.json',ledger]]){
 const blob=await gh(env,'git/blobs','POST',{encoding:'base64',content:encode(JSON.stringify(value,null,2)+'\n')});
 entries.push({path,mode:'100644',type:'blob',sha:blob.sha});
 }
 const tree=await gh(env,'git/trees','POST',{base_tree:commit.tree.sha,tree:entries});
 const next=await gh(env,'git/commits','POST',{message:'Remove artwork from gallery via Telegram',tree:tree.sha,parents:[head]});
 try{await gh(env,'git/refs/heads/main','PATCH',{sha:next.sha,force:false})}catch(error){if(attempt<3&&/^GitHub (409|422) /.test(error.message))continue;throw error}
 await say('Removed from gallery: '+match.title+'\nThe website will update after GitHub Pages finishes publishing.');return;
 }
}

async function publishBlog(update,env,details,say){
 if(details.error){await say(details.error);return}
 const m=update.message,document=m.document||m.reply_to_message?.document;
 const fail=text=>say(text);
 if(!document||!/\.(txt|md|markdown)$/i.test(document.file_name||'')){await fail('Attach a UTF-8 .txt or .md file with /blog Article title | Category as the caption, or reply to the document with that command.');return}
 const maximum=256*1024;
 if(document.file_size>maximum){await fail('Blog documents must be under 256 KB.');return}
 const info=await telegram(env,'getFile',{file_id:document.file_id});
 const response=await fetch('https://api.telegram.org/file/bot'+env.BOT_TOKEN+'/'+info.file_path);if(!response.ok)throw Error('Document download failed');
 const reader=response.body.getReader();let total=0;const parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>maximum){await reader.cancel();await fail('Blog documents must be under 256 KB.');return}parts.push(value)}
 const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).trim()}catch{await fail('Please save the document as UTF-8 text and send it again.');return}
 if(!text||text.length>60000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)){await fail('Please send a non-empty text document with at most 60,000 characters.');return}
 const id=String(update.update_id),date=new Date().toISOString();
 const readJSON=async(path,head)=>{const file=await gh(env,'contents/'+path+'?ref='+head);return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))))};
 for(let attempt=0;attempt<4;attempt++){
 const ref=await gh(env,'git/ref/heads/main'),head=ref.object.sha;
 const commit=await gh(env,'git/commits/'+head);
 const posts=await readJSON('blog/posts.json',head);
 if(!Array.isArray(posts))throw Error('Invalid blog index');
 const existing=posts.find(post=>post.id===id);
 if(existing){await say('Already published: https://sarahwadmore.com'+existing.url);return}
 const artworks=await readJSON('artworks.json',head);
 if(!Array.isArray(artworks))throw Error('Invalid artwork manifest');
 const artwork=artworks.find(work=>typeof work.src==='string'&&/^artworks\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(work.src));
 const post=makePost(details,text,id,date,artwork?.src||null);
 if(artwork)post.coverAlt=artwork.title;
 const nextPosts=[post,...posts];
 const outputs=[
 ['blog/posts.json',JSON.stringify(nextPosts,null,2)+'\n'],
 ['blog/'+post.slug+'/index.html',renderArticle(post,text,nextPosts)],
 ['blog/index.html',renderIndex(nextPosts)],
 ['sitemap.xml',sitemap(nextPosts)],
 ['feed.xml',rss(nextPosts)]
 ];
 const entries=[];
 for(const [path,content] of outputs){
 const blob=await gh(env,'git/blobs','POST',{encoding:'base64',content:encode(content)});
 entries.push({path,mode:'100644',type:'blob',sha:blob.sha});
 }
 const tree=await gh(env,'git/trees','POST',{base_tree:commit.tree.sha,tree:entries});
 const next=await gh(env,'git/commits','POST',{message:'Publish blog article from Telegram',tree:tree.sha,parents:[head]});
 try{await gh(env,'git/refs/heads/main','PATCH',{sha:next.sha,force:false})}catch(error){if(attempt<3&&/^GitHub (409|422) /.test(error.message))continue;throw error}
 await say('Article saved: '+post.title+'\nhttps://sarahwadmore.com'+post.url+'\nThe URL and BLOG menu update after GitHub Pages finishes publishing.');return;
 }
}

async function handle(update,env){
 const m=update.message;if(!m||m.chat.type!=='private'||String(m.from?.id)!==env.SARAH_USER_ID)return;
 const say=text=>telegram(env,'sendMessage',{chat_id:m.chat.id,text});
 const text=m.caption||m.text||'';
 if(/^\/(start|help)(?:@\w+)?(?:\s|$)/i.test(text)){await say('Send one photo, GIF or MP4 video with this caption:\n/upload Artwork title | Medium | Dimensions\nOr reply with that command to the media. JPEG, PNG, WebP, GIF and MP4 files are supported (maximum 8 MB per file). For best video compatibility use H.264 video with AAC audio.\nRemove an artwork: /delete Artwork title (title only).\nPublish TXT/Markdown: /blog Article title | Category (document caption or reply).');return}
 const blogDetails=parseBlog(text);if(blogDetails!==null){await publishBlog(update,env,blogDetails,say);return}
 const titleToDelete=deleteTitle(text);if(titleToDelete!==null){await deleteArtwork(update,env,titleToDelete,say);return}
 const details=parse(text);if(!details){await say('Use /upload Artwork title | Medium | Dimensions as the media caption, or reply to the media with that command.');return}
 const media=m.photo||m.animation||m.video||m.document?m:m.reply_to_message;
 const file=media?.photo?.at(-1)||media?.animation||media?.video||media?.document;
 if(!file){await say('Please attach a photo, GIF or MP4 video, or reply to one with /upload and the details.');return}
 if((file.file_size||0)>LIMIT){await say('Please send a file smaller than 8 MB.');return}
 const info=await telegram(env,'getFile',{file_id:file.file_id});
 const response=await fetch('https://api.telegram.org/file/bot'+env.BOT_TOKEN+'/'+info.file_path);
 if(!response.ok)throw Error('Image download failed');
 const reader=response.body.getReader();const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>LIMIT){await reader.cancel();await say('Please send a file smaller than 8 MB.');return}chunks.push(value)}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 const detected=detectMedia(bytes);
 if(!detected){await say('Supported formats: JPEG, PNG, WebP, GIF and MP4. Convert MOV/HEVC videos to H.264 MP4 before uploading.');return}
 const {ext,type}=detected;
 const id=String(update.update_id),path='artworks/telegram-'+id+'.'+ext;
 // Commit image and manifest together, using the branch ref as a compare-and-swap.
 // A retry reloads the current tree, so concurrent uploads cannot overwrite each other.
 for(let attempt=0;attempt<4;attempt++){
 const ref=await gh(env,'git/ref/heads/main');const head=ref.object.sha;
 const commit=await gh(env,'git/commits/'+head);
 const manifest=await gh(env,'contents/artworks.json?ref='+head);
 const list=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(manifest.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
 if(!Array.isArray(list))throw Error('Invalid artwork manifest');
 let tombstones=[];
 try{const file=await gh(env,'contents/telegram/deletions.json?ref='+head);tombstones=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))))}catch(error){if(!/^GitHub 404 /.test(error.message))throw error}
 if(!Array.isArray(tombstones))throw Error('Invalid deletion ledger');
 if(tombstones.some(entry=>entry.uploadId===id||entry.src===path)){await say('This upload was deleted and will not be republished. Send the media again as a new message to upload it again.');return}
 if(list.some(w=>w.uploadId===id)){await say('This upload is already saved.');return}
 const entry={...details,src:path,type,animated:!!(detected.animated||media.animation),uploadId:id,uploadedAt:new Date().toISOString()};
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
 try{await handle(await request.json(),env);return new Response('OK')}catch(error){console.error(JSON.stringify({event:'upload_failed',code:/^GitHub [0-9]{3} /.test(error.message)?error.message:'processing_error'}));return new Response('Retry later',{status:503})}
}};

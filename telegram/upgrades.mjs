const ORIGIN='https://sarahwadmore.com';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const sharePath=work=>/^\d+$/.test(work.uploadId||'')?'art/'+work.uploadId+'/index.html':null;
export function renderSharePage(work){
 const path=sharePath(work);if(!path)throw Error('Invalid artwork ID');
 if(!/^artworks\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp|gif|mp4)$/i.test(work.src))throw Error('Invalid artwork path');
 const url=ORIGIN+'/'+path.replace('index.html',''),gallery=ORIGIN+'/?art='+encodeURIComponent(work.uploadId),src=ORIGIN+'/'+work.src;
 const description=work.title+' — Art by Sarah Wadmore (PFLY / PU51FLY), Graffiti Kings artist and Crypto Moongirls creator.'+(work.medium?' '+work.medium:'');
 const video=work.type==='video'||/\.mp4$/i.test(work.src);
 const mediaMeta=video?'<meta property="og:video" content="'+escape(src)+'"><meta property="og:video:type" content="video/mp4">':'<meta property="og:image" content="'+escape(src)+'"><meta property="og:image:alt" content="'+escape(work.title)+'"><meta name="twitter:image" content="'+escape(src)+'">';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(work.title)+' | Sarah Wadmore</title><meta name="description" content="'+escape(description)+'"><link rel="canonical" href="'+escape(url)+'"><meta property="og:type" content="'+(video?'video.other':'website')+'"><meta property="og:site_name" content="Art by Sarah Wadmore"><meta property="og:title" content="'+escape(work.title)+'"><meta property="og:description" content="'+escape(description)+'"><meta property="og:url" content="'+escape(url)+'">'+mediaMeta+'<meta name="twitter:card" content="'+(video?'summary':'summary_large_image')+'"><meta name="twitter:title" content="'+escape(work.title)+'"><meta name="twitter:description" content="'+escape(description)+'"><style>body{margin:0;padding:32px;background:#111;color:#eee;font:16px/1.6 Arial;text-align:center}img,video{max-width:100%;max-height:75vh}a{color:inherit}</style></head><body><main><h1>'+escape(work.title)+'</h1>'+(video?'<video controls src="'+escape(src)+'"></video>':'<img src="'+escape(src)+'" alt="'+escape(work.title)+'">')+'<p>'+escape(work.medium)+'</p><a href="'+escape(gallery)+'">View in Sarah’s gallery</a></main><script>location.replace('+JSON.stringify(gallery)+');</script></body></html>\n';
}
export function emojiUploadCaption(input){
 const emoji=input.trim().replace(/\s+/g,'');
 if(!emoji||!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(emoji)||/[^\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u200d\ufe0f\u20e3]/u.test(emoji))return null;
 const parts=Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(emoji));
 if(parts.length>3)return null;
 return '/upload #streetartist #SarahPFLY Wadmore '+emoji+'| 👁 | 🌼🌸🌺';
}
export async function guidedUpload(update,env,telegram,continueUpload){
 const m=update.message,text=m.caption||m.text||'',reply=m.reply_to_message;
 if(/^\/cancel(?:@\w+)?(?:\s|$)/i.test(text)){
 if(env.ART_DRAFTS&&reply)await env.ART_DRAFTS.delete('draft:'+m.chat.id+':'+reply.message_id);
 await telegram(env,'sendMessage',{chat_id:m.chat.id,text:'Cancelled this reply. Send a new photo to start again, or use /xxx for a manual upload.'});return true;
 }
 if(text.startsWith('/'))return false;
 if(!text&&(m.photo||m.animation||m.video||(m.document&&/\.(?:jpe?g|png|webp|gif|mp4)$/i.test(m.document.file_name||'')))&&!m.media_group_id){
 if(!env.ART_DRAFTS)return false;
 const file=m.photo?.at(-1)||m.animation||m.video||m.document;
 if(file.file_size>8*1024*1024){await telegram(env,'sendMessage',{chat_id:m.chat.id,text:'Please send a file smaller than 8 MB.'});return true}
 const sent=await telegram(env,'sendMessage',{chat_id:m.chat.id,text:'Reply to this message with 1–3 title emojis (for example 🌷🔥🌻). I will publish this artwork using Sarah’s default title and notes. Use different title emojis for each artwork. Reply /cancel to cancel. This prompt expires in one hour.',reply_parameters:{message_id:m.message_id},reply_markup:{force_reply:true,input_field_placeholder:'Your 1–3 title emojis'}});
 await env.ART_DRAFTS.put('draft:'+m.chat.id+':'+sent.message_id,JSON.stringify({updateId:update.update_id,message:m,createdAt:Date.now()}),{expirationTtl:3600});return true;
 }
 if(text&&!text.startsWith('/')&&reply&&env.ART_DRAFTS){
 const raw=await env.ART_DRAFTS.get('draft:'+m.chat.id+':'+reply.message_id);
 if(!raw)return false;
 const draft=JSON.parse(raw);
 if(Date.now()-draft.createdAt>3600000)return false;
 const caption=emojiUploadCaption(text);
 if(!caption){await telegram(env,'sendMessage',{chat_id:m.chat.id,text:'Please reply to the original emoji prompt with 1–3 emojis only, or reply /cancel. You can use /xxx for a custom title.'});return true}
 await continueUpload({update_id:draft.updateId,message:{...draft.message,caption,text:undefined}});
 return true;
 }
 return false;
}
export async function publicationStatus(env,gh){
 const decode=file=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
 const [ref,art,posts]=await Promise.all([gh(env,'git/ref/heads/main'),gh(env,'contents/artworks.json'),gh(env,'contents/blog/posts.json')]);
 const works=decode(art),blogs=decode(posts);
 let liveWorks,liveBlogs;
 try{
 const responses=await Promise.all(['artworks.json','blog/posts.json'].map(path=>fetch(ORIGIN+'/'+path+'?status='+Date.now(),{cache:'no-store'})));
 if(responses.some(r=>!r.ok))throw Error('Unavailable');
 [liveWorks,liveBlogs]=await Promise.all(responses.map(r=>r.json()));
 if(!Array.isArray(liveWorks)||!Array.isArray(liveBlogs))throw Error('Invalid index');
 }catch{return 'SAVED in the repository. The live website could not be checked right now. Try /status again shortly.'}
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 let previewLive=true;
 if(works[0]&&sharePath(works[0])){
 try{const preview=await fetch(ORIGIN+'/'+sharePath(works[0]).replace('index.html','')+'?status='+Date.now(),{cache:'no-store'});previewLive=preview.ok&&(await preview.text()).includes('property="og:title"')}catch{previewLive=false}
 }
 if(equal(works,liveWorks)&&equal(blogs,liveBlogs)&&previewLive)return 'LIVE — the website artwork and blog lists match the saved repository content.\nLatest artwork: '+(works[0]?.title||'None')+'\nLatest blog: '+(blogs[0]?.title||'None')+'\n'+ORIGIN+'/';
 let build;try{build=await gh(env,'pages/builds/latest')}catch{}
 if(build?.status==='errored'&&build.commit===ref.object.sha)return 'FAILED — the latest website build failed. Your content is saved in the repository. Ask GK to check GitHub Pages.\n'+(build.error?.message||'');
 return 'SAVED — content is safely in the repository, but the live artwork/blog lists have not caught up yet.\n'+(build?.status==='building'?'PUBLISHING — GitHub Pages is building the website.':'Publishing is pending or could not be confirmed.')+'\nTry /status again shortly.';
}

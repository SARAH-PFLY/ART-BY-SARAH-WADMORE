const normal=value=>String(value).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export function parseFeature(text=''){
 const match=text.match(/^\/feature(?:@\w+)?(?:\s+([\s\S]*))?$/i);
 return match?(match[1]||'').trim():null;
}
export function selectFeature(list,target){
 if(target==='off')return {list:list.map(({featured,...work})=>work),title:null};
 const matches=list.filter(w=>target.startsWith('id:')?String(w.uploadId)===target.slice(3):normal(w.title)===normal(target));
 if(matches.length!==1)return {error:matches.length?'More than one artwork matches. Use /feature id:UPLOAD_ID.':'No artwork found. Use the exact title, including emojis/number, or /feature id:UPLOAD_ID.'};
 const chosen=matches[0];
 return {list:list.map(work=>{const {featured,...rest}=work;return work===chosen?{...rest,featured:true}:rest}),title:chosen.title,id:chosen.uploadId||chosen.src};
}
export async function featureArtwork(update,env,target,say,gh,encode){
 const decode=file=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
 let identity=null;
 for(let attempt=0;attempt<4;attempt++){
  const ref=await gh(env,'git/ref/heads/main'),head=ref.object.sha;
  const list=decode(await gh(env,'contents/artworks.json?ref='+head));
  if(!Array.isArray(list))throw Error('Invalid gallery');
  if(!target){await say('Featured: '+(list.find(w=>w.featured)?.title||'None')+'\nUse /feature Exact artwork title or /feature id:UPLOAD_ID. Use /feature off to return to newest-first.');return}
  let ledger=[];
  try{ledger=decode(await gh(env,'contents/telegram/features.json?ref='+head))}catch(e){if(!/^GitHub 404 /.test(e.message))throw e}
  if(!Array.isArray(ledger))throw Error('Invalid feature ledger');
  if(ledger.some(e=>e.updateId===String(update.update_id))){await say('This featured-artwork change is already saved.');return}
  const result=selectFeature(list,target);if(result.error){await say(result.error);return}
  if(identity&&identity!==result.id){await say('The selected artwork changed. Check it and try again.');return}identity=result.id;
  const commit=await gh(env,'git/commits/'+head),entries=[];
  ledger.push({updateId:String(update.update_id),uploadId:result.id||null,updatedAt:new Date().toISOString()});
  for(const [path,value] of [['artworks.json',result.list],['telegram/features.json',ledger]]){
   const blob=await gh(env,'git/blobs','POST',{encoding:'base64',content:encode(JSON.stringify(value,null,2)+'\n')});entries.push({path,mode:'100644',type:'blob',sha:blob.sha});
  }
  const tree=await gh(env,'git/trees','POST',{base_tree:commit.tree.sha,tree:entries});
  const next=await gh(env,'git/commits','POST',{message:'Set featured artwork via Telegram',tree:tree.sha,parents:[head]});
  try{await gh(env,'git/refs/heads/main','PATCH',{sha:next.sha,force:false})}catch(e){if(attempt<3&&/^GitHub (409|422) /.test(e.message))continue;throw e}
  await say(result.title?'Featured artwork saved: '+result.title+'\nIt stays first when new art is uploaded. Send /status to check publication.':'Featured artwork cleared. The gallery returns to newest-first after publishing.');return;
 }
}

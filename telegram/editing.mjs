import {sharePath,renderSharePage} from './upgrades.mjs';
const normalize=value=>String(value).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export function parseEdit(text=''){
 const match=text.match(/^\/edit(?:@\w+)?(?:\s+([\s\S]*))?$/i);if(!match)return null;
 const parts=(match[1]||'').split('|').map(s=>s.trim());
 if(!parts[0]||parts.length<2)return {error:'Use /edit Current title | New title | New notes. Leave New title empty to keep it. Omit New notes to keep them; leave them empty to clear them.'};
 const [target,title,...notes]=parts;
 const medium=parts.length>=3?notes.join(' · '):undefined;
 const length=Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(title)).length;
 if(target.length>300||length>38||medium?.length>800)return {error:'Edit rejected: title maximum 38 visible characters; notes maximum 800 characters. Existing artwork unchanged.'};
 return {target,title:title||undefined,medium};
}
export function applyEdit(list,details,expected){
 const matches=list.filter(w=>details.target.startsWith('id:')?String(w.uploadId)===details.target.slice(3):normalize(w.title)===normalize(details.target));
 if(matches.length!==1)return {error:matches.length?'More than one artwork matches. Use /edit id:UPLOAD_ID | New title | Notes.':'No artwork found. Use its exact current title (including number/emojis), or id:UPLOAD_ID.'};
 const work=matches[0],identity=JSON.stringify([work.uploadId||null,work.src,work.title,work.medium||'']);
 if(expected&&expected!==identity)return {error:'Artwork changed while editing. Nothing overwritten. Check its current title/notes and try again.'};
 const title=details.title??work.title,medium=details.medium??work.medium;
 if(list.some(w=>w!==work&&normalize(w.title)===normalize(title)))return {error:'Edit rejected: another artwork already has that title. Choose a different title.'};
 const updated={...work,title,...(medium!==undefined?{medium}:{})};
 return {work:updated,identity,list:list.map(w=>w===work?updated:w)};
}
export async function editArtwork(update,env,details,say,gh,encode){
 if(details.error){await say(details.error);return}
 let expected=null;
 const decode=file=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
 const id=String(update.update_id);
 for(let attempt=0;attempt<4;attempt++){
 const ref=await gh(env,'git/ref/heads/main'),head=ref.object.sha;
 const commit=await gh(env,'git/commits/'+head);
 const list=decode(await gh(env,'contents/artworks.json?ref='+head));
 let edits=[];try{edits=decode(await gh(env,'contents/telegram/edits.json?ref='+head))}catch(e){if(!/^GitHub 404 /.test(e.message))throw e}
 if(!Array.isArray(list)||!Array.isArray(edits))throw Error('Invalid edit state');
 if(edits.some(e=>e.updateId===id)){await say('This edit has already been saved. Send /status to check website publication.');return}
 const result=applyEdit(list,details,expected);if(result.error){await say(result.error);return}
 expected=result.identity;
 const editedAt=new Date().toISOString();
 const work={...result.work,editedAt};result.list=result.list.map(w=>w===result.work?work:w);
 edits.push({updateId:id,uploadId:work.uploadId||null,src:work.src,editedAt});
 const outputs=[['artworks.json',JSON.stringify(result.list,null,2)+'\n'],['telegram/edits.json',JSON.stringify(edits,null,2)+'\n']];
 if(sharePath(work))outputs.push([sharePath(work),renderSharePage(work)]);
 const entries=[];
 for(const [path,content] of outputs){const blob=await gh(env,'git/blobs','POST',{encoding:'base64',content:encode(content)});entries.push({path,mode:'100644',type:'blob',sha:blob.sha})}
 const tree=await gh(env,'git/trees','POST',{base_tree:commit.tree.sha,tree:entries});
 const next=await gh(env,'git/commits','POST',{message:'Edit artwork title and notes via Telegram',tree:tree.sha,parents:[head]});
 try{await gh(env,'git/refs/heads/main','PATCH',{sha:next.sha,force:false})}catch(e){if(attempt<3&&/^GitHub (409|422) /.test(e.message))continue;throw e}
 await say('Updated: '+work.title+'\nNotes: '+(work.medium||'(none)')+'\nImage and gallery position kept. Publishing now; send /status to check.');return;
 }
}

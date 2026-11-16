import assert from 'node:assert/strict';
import worker,{deleteTitle} from './worker.mjs';
const env={BotFathertoken:'test',GitHubtoken:'test',WEBHOOK_SECRET:'secret',SARAH_USER_ID:'123',REPO:'owner/repo'};
assert.equal(deleteTitle('/delete Title with spaces'),'Title with spaces');
assert.equal(deleteTitle('/delete@sarahs_artbot Café'),'Café');
assert.equal(deleteTitle('/delete'),'');
assert.equal(deleteTitle('/upload Title'),null);
const original=globalThis.fetch;
async function scenario(list,commands,{conflict=false}={}){
 let ledger=[],writes=0,head=0,tree=[],replies=[],blobs=new Map(),conflicted=false;
 globalThis.fetch=async(url,options={})=>{
 const body=options.body?JSON.parse(options.body):{};
 if(url.endsWith('/sendMessage')){replies.push(body.text);return Response.json({ok:true,result:{}})}
 if(url.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:String(head)}});
 if(/\/git\/commits\/\d+$/.test(url))return Response.json({tree:{sha:'base'}});
 const encoded=value=>Response.json({content:btoa(unescape(encodeURIComponent(JSON.stringify(value))))});
 if(url.includes('/contents/artworks.json'))return encoded(list);
 if(url.includes('/contents/telegram/deletions.json')){if(!ledger.length)return Response.json({message:'Not found'},{status:404});return encoded(ledger)}
 if(url.endsWith('/git/blobs')){const sha='b'+blobs.size;blobs.set(sha,JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.content),c=>c.charCodeAt(0)))));return Response.json({sha})}
 if(url.endsWith('/git/trees')){tree=body.tree;return Response.json({sha:'tree'})}
 if(url.endsWith('/git/commits'))return Response.json({sha:'next'});
 if(url.endsWith('/git/refs/heads/main')){
 if(conflict&&!conflicted){conflicted=true;list=[{title:'Concurrent upload',src:'new.jpg'},...list];head++;return Response.json({message:'Conflict'},{status:422})}
 for(const entry of tree){if(entry.path==='artworks.json')list=blobs.get(entry.sha);else ledger=blobs.get(entry.sha)}
 head++;writes++;return Response.json({});
 }
 throw Error('Unexpected route '+url);
 };
 try{
 for(const cmd of commands){
 const response=await worker.fetch(new Request('https://test/telegram',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':'secret'},body:JSON.stringify({update_id:cmd.id||50,message:{text:cmd.text,chat:{id:123,type:cmd.group?'group':'private'},from:{id:cmd.user||123}}})}),env);
 assert.equal(response.status,200);
 }
 return {list,ledger,writes,replies};
 }finally{globalThis.fetch=original}
}
const work={title:'Café Sunset',src:'artworks/photo.jpg',uploadId:'1'},other={title:'Other',src:'other.gif'};
let r=await scenario([work,other],[{text:'/delete café   sunset'}]);
assert.deepEqual(r.list,[other]);assert.equal(r.writes,1);assert.equal(r.ledger.length,1);
r=await scenario([work],[{text:'/delete Missing'}]);assert.equal(r.writes,0);assert.match(r.replies[0],/No artwork/);
r=await scenario([work,{...work,src:'duplicate.jpg'}],[{text:'/delete Café Sunset'}]);assert.equal(r.writes,0);assert.match(r.replies[0],/More than one/);
r=await scenario([work],[{text:'/delete'}]);assert.equal(r.writes,0);assert.match(r.replies[0],/title only/);
r=await scenario([work],[{text:'/delete Café Sunset',user:456},{text:'/delete Café Sunset',group:true}]);assert.equal(r.writes,0);assert.equal(r.replies.length,0);
r=await scenario([work],[{text:'/delete Café Sunset'},{text:'/delete Café Sunset'}]);assert.equal(r.writes,1);assert.match(r.replies[1],/already/);
r=await scenario([work,other],[{text:'/delete Café Sunset'}],{conflict:true});assert.equal(r.list[0].title,'Concurrent upload');assert.equal(r.list[1].title,'Other');assert.equal(r.writes,1);
r=await scenario([work],[{text:'/delete Café Sunset'}]);assert.deepEqual(r.list,[]);
console.log('Passed delete success, no-match, duplicate title, syntax, authorization, retry, conflict and last-artwork checks');

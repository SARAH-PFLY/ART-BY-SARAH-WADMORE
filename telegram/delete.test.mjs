import assert from 'node:assert/strict';
import worker,{deleteTitle} from './worker.mjs';
const env={BotFathertoken:'test',GitHubtoken:'test',WEBHOOK_SECRET:'secret',SARAH_USER_ID:'123',REPO:'owner/repo'};
assert.equal(deleteTitle('/delete Title with spaces'),'Title with spaces');
assert.equal(deleteTitle('/delete@sarahs_artbot Café'),'Café');
assert.equal(deleteTitle('/delete'),'');
assert.equal(deleteTitle('/upload Title'),null);
const original=globalThis.fetch;
async function scenario(list,commands,{conflict=false,deleteDuringConflict=false,duplicateDuringConflict=false,insertOnDownload=false}={}){
 let ledger=[],writes=0,head=0,tree=[],replies=[],blobs=new Map(),conflicted=false,downloads=0;
 globalThis.fetch=async(url,options={})=>{
 const body=options.body?JSON.parse(options.body):{};
 if(url.endsWith('/getFile')){downloads++;if(insertOnDownload){list=[{title:'Original',src:'artworks/winner.gif',uploadId:'99'}];head++}return Response.json({ok:true,result:{file_path:'media'}})}
 if(url.includes('/file/bot'))return new Response(new TextEncoder().encode('GIF89a123456'));
 if(url.endsWith('/sendMessage')){replies.push(body.text);return Response.json({ok:true,result:{}})}
 if(url.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:String(head)}});
 if(/\/git\/commits\/\d+$/.test(url))return Response.json({tree:{sha:'base'}});
 const encoded=value=>Response.json({content:btoa(unescape(encodeURIComponent(JSON.stringify(value))))});
 if(url.includes('/contents/artworks.json'))return encoded(list);
 if(url.includes('/contents/telegram/deletions.json')){if(!ledger.length)return Response.json({message:'Not found'},{status:404});return encoded(ledger)}
 if(url.endsWith('/git/blobs')){const sha='b'+blobs.size;blobs.set(sha,atob(body.content).startsWith('[')?JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.content),c=>c.charCodeAt(0)))):body.content);return Response.json({sha})}
 if(url.endsWith('/git/trees')){tree=body.tree;return Response.json({sha:'tree'})}
 if(url.endsWith('/git/commits'))return Response.json({sha:'next'});
 if(url.endsWith('/git/refs/heads/main')){
 if(conflict&&!conflicted){conflicted=true;if(deleteDuringConflict){list=[];ledger=[{updateId:'999',uploadId:'1',src:'artworks/telegram-1.gif'}]}else if(duplicateDuringConflict)list=[{title:'Original',src:'artworks/winner.gif',uploadId:'99'},...list];else list=[{title:'Concurrent upload',src:'new.jpg'},...list];head++;return Response.json({message:'Conflict'},{status:422})}
 for(const entry of tree){if(entry.path==='artworks.json')list=blobs.get(entry.sha);else if(entry.path==='telegram/deletions.json')ledger=blobs.get(entry.sha)}
 head++;writes++;return Response.json({});
 }
 throw Error('Unexpected route '+url);
 };
 try{
 for(const cmd of commands){
 const response=await worker.fetch(new Request('https://test/telegram',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':'secret'},body:JSON.stringify({update_id:cmd.id??50,message:{text:cmd.text,...(cmd.media?{animation:{file_id:'gif',file_size:12}}:{}),chat:{id:123,type:cmd.group?'group':'private'},from:{id:cmd.user||123}}})}),env);
 assert.equal(response.status,200);
 }
 return {list,ledger,writes,replies,downloads};
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

r=await scenario([],[{id:1,text:'/upload Original',media:true},{id:2,text:'/delete Original'},{id:1,text:'/upload Original',media:true}]);
assert.deepEqual(r.list,[]);assert.equal(r.writes,2);assert.equal(r.ledger[0].uploadId,'1');assert.match(r.replies[2],/will not be republished/);
r=await scenario([],[{id:1,text:'/upload Original',media:true},{id:2,text:'/delete Original'},{id:3,text:'/upload Original',media:true}]);
assert.equal(r.list.length,1);assert.equal(r.list[0].uploadId,'3');
r=await scenario([],[{id:1,text:'/upload Original',media:true}],{conflict:true,deleteDuringConflict:true});
assert.deepEqual(r.list,[]);assert.equal(r.writes,0);assert.match(r.replies[0],/will not be republished/);
console.log('Passed upload-delete-redelivery, fresh reupload and concurrent deletion tombstone checks');

const current={title:'Original',src:'artworks/first.gif',uploadId:'10',uploadedAt:'2026-11-16T00:00:00.000Z'};
for(const title of ['Original','original','  ORIGINAL   ','ＯＲＩＧＩＮＡＬ']){
 r=await scenario([current],[{id:11,text:'/upload '+title+' | Different medium',media:true}]);
 assert.equal(r.writes,0);assert.equal(r.downloads,0);assert.equal(r.list.length,1);assert.match(r.replies[0],/Upload rejected/);assert.match(r.replies[0],/2026-11-16T00:00:00.000Z/);
}
r=await scenario([current],[{id:10,text:'/upload Original',media:true}]);assert.equal(r.downloads,0);assert.match(r.replies[0],/already saved/);
r=await scenario([current],[{id:20,text:'/delete Original'},{id:21,text:'/upload original',media:true}]);
assert.equal(r.list.length,1);assert.equal(r.list[0].uploadId,'21');assert.equal(r.writes,2);assert.ok(Number.isFinite(Date.parse(r.list[0].titleCheckedAt)));assert.equal(r.list[0].titleCheckedHead,'1');
r=await scenario([],[{id:1,text:'/upload Original',media:true}],{conflict:true,duplicateDuringConflict:true});
assert.equal(r.writes,0);assert.equal(r.list.length,1);assert.equal(r.list[0].uploadId,'99');assert.match(r.replies[0],/Upload rejected/);
r=await scenario([],[{id:1,text:'/upload Original',media:true}],{insertOnDownload:true});
assert.equal(r.writes,0);assert.equal(r.list.length,1);assert.match(r.replies[0],/Upload rejected/);
console.log('Passed duplicate title rejection before download, normalized names, idempotent retries, reuse after deletion, UTC check record and concurrent race checks');

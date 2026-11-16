import assert from 'node:assert/strict';
import worker,{detectMedia,parse,uploadTitleLength} from './worker.mjs';
const bytes=s=>Uint8Array.from(s,c=>c.charCodeAt(0));
assert.equal(detectMedia(bytes('GIF89a123456')).ext,'gif');
assert.equal(detectMedia(bytes('GIF87a123456')).ext,'gif');

assert.equal(detectMedia(bytes('0000ftypheic0000mif1')),null);
assert.equal(detectMedia(bytes('0000ftypqt  0000qt  ')),null);
assert.equal(detectMedia(bytes('not media')),null);
assert.equal(parse('/upload Film | Digital').title,'Film');
function box(type,...parts){
 const payload=Buffer.concat(parts.map(p=>Buffer.from(p))),head=Buffer.alloc(8);
 head.writeUInt32BE(payload.length+8);head.write(type,4);return Buffer.concat([head,payload]);
}
function mp4(codec='avc1',extraTrack=null){
 const makeTrack=c=>box('trak',box('mdia',box('hdlr',Buffer.concat([Buffer.alloc(8),Buffer.from('vide'),Buffer.alloc(12)])),box('minf',box('stbl',box('stsd',Buffer.from([0,0,0,0,0,0,0,1]),box(c,Buffer.alloc(78)))))));
 return Buffer.concat([box('ftyp',Buffer.from('isom'),Buffer.alloc(4),Buffer.from('mp42')),box('moov',makeTrack(codec),...(extraTrack?[makeTrack(extraTrack)]:[])),box('mdat',Buffer.from('avc1 decoy'))]);
}

assert.equal(detectMedia(mp4()).type,'video');
assert.equal(detectMedia(mp4('avc3')).type,'video');
assert.equal(detectMedia(mp4('hvc1')),null);
assert.equal(detectMedia(mp4('hev1')),null);
assert.equal(detectMedia(mp4('avc1','hvc1')),null);
assert.equal(detectMedia(mp4().subarray(0,50)),null);
assert.equal(detectMedia(bytes('0000ftypisom0000mp42avc1')),null);
const env={BotFathertoken:'test',GitHubtoken:'test',WEBHOOK_SECRET:'test',SARAH_USER_ID:'123',REPO:'owner/repo'};
const original=globalThis.fetch;
async function run(message,body){
 let saved,tree,reply;const calls=[];
 globalThis.fetch=async(url,options={})=>{
 calls.push(url);const data=options.body?JSON.parse(options.body):{};
 const json=value=>Response.json(value);
 if(url.endsWith('/getFile'))return json({ok:true,result:{file_path:'file'}});
 if(url.includes('/file/bot'))return new Response(body);
 if(url.endsWith('/sendMessage')){reply=data.text;return json({ok:true,result:{}})}
 if(url.endsWith('/git/ref/heads/main'))return json({object:{sha:'head'}});
 if(url.endsWith('/git/commits/head'))return json({tree:{sha:'base'}});
 if(url.includes('/contents/telegram/deletions.json'))return Response.json({message:'Not found'},{status:404});
 if(url.includes('/contents/artworks.json'))return json({content:btoa(JSON.stringify([{title:'Existing',src:'existing.jpg'}]))});
 if(url.endsWith('/git/blobs')){if(data.encoding==='base64'){const decoded=atob(data.content);if(decoded.startsWith('['))saved=JSON.parse(new TextDecoder().decode(Uint8Array.from(decoded,c=>c.charCodeAt(0))))}return json({sha:'blob'})}
 if(url.endsWith('/git/trees')){tree=data;return json({sha:'tree'})}
 if(url.endsWith('/git/commits'))return json({sha:'next'});
 if(url.endsWith('/git/refs/heads/main'))return json({object:{sha:'next'}});
 throw Error('Unexpected mock route');
 };
 try{
 const response=await worker.fetch(new Request('https://test/telegram',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':'test'},body:JSON.stringify({update_id:42,message:{chat:{id:123,type:'private'},from:{id:123},...message}})}),env);
 assert.equal(response.status,200);return {saved,tree,reply,calls};
 }finally{globalThis.fetch=original}
}
let result=await run({caption:'/upload GIF art | Digital',animation:{file_id:'a',file_size:12}},bytes('GIF89a123456'));
assert.equal(result.saved[0].src,'artworks/telegram-42.gif');
assert.equal(result.saved[0].animated,true);
assert.equal(result.saved[1].title,'Existing');
assert.equal(result.tree.tree.length,2);
result=await run({caption:'/upload Video art',video:{file_id:'v',file_size:20}},mp4());
assert.equal(result.saved[0].type,'video');
assert.equal(result.saved[0].animated,false);
result=await run({text:'/upload Reply animation',reply_to_message:{animation:{file_id:'a',file_size:20}}},mp4());
assert.equal(result.saved[0].type,'video');assert.equal(result.saved[0].animated,true);
result=await run({caption:'/upload Large',video:{file_id:'v',file_size:9*1024*1024}},new Uint8Array());
assert.equal(result.saved,undefined);assert.match(result.reply,/8 MB/);assert.equal(result.calls.length,1);
result=await run({caption:'/upload Invalid',document:{file_id:'x',file_size:10}},bytes('not media'));
assert.equal(result.saved,undefined);assert.match(result.reply,/Supported formats/);
result=await run({caption:'/upload Blocked',from:{id:456},video:{file_id:'x'}},new Uint8Array());
assert.equal(result.calls.length,0);
console.log('Passed media detection and 6 mocked webhook upload scenarios');

result=await run({caption:'/upload HEVC rejected',video:{file_id:'h',file_size:300}},mp4('hvc1'));
assert.equal(result.saved,undefined);assert.match(result.reply,/H.264/);

assert.equal(parse('/upload '+ 'A'.repeat(36)).title.length,36);
assert.equal(parse('/upload '+ 'A'.repeat(37)),null);
assert.equal(parse('/upload@Sarahs_artbot '+ 'A'.repeat(36)+' | '+ 'M'.repeat(200)).medium.length,200);
assert.equal(uploadTitleLength('👩‍🎨'),1);
assert.equal(parse('/upload '+ '👩‍🎨'.repeat(36)).title,'👩‍🎨'.repeat(36));
assert.equal(parse('/upload '+ '👩‍🎨'.repeat(37)),null);
for(const message of [
 {caption:'/upload '+ 'A'.repeat(37),photo:[{file_id:'x'}]},
 {text:'/upload '+ 'A'.repeat(37),reply_to_message:{photo:[{file_id:'x'}]}}
]){
 const result=await run(message,new Uint8Array());
 assert.equal(result.saved,undefined);
 assert.equal(result.calls.length,1);
 assert.match(result.reply,/Upload rejected.*37.*Maximum 36/);
}
console.log('36-character boundaries, emoji and pre-download rejection passed');

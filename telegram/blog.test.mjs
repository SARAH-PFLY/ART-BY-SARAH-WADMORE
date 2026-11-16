import assert from 'node:assert/strict';
import worker from './worker.mjs';
import {parseBlog,slugify,markdown,makePost,renderArticle,renderIndex,sitemap} from './blog.mjs';
assert.equal(parseBlog('/upload test'),null);
assert.ok(parseBlog('/blog').error);
assert.deepEqual(parseBlog('/blog@sarahs_artbot Café notes | Process'),{title:'Café notes',category:'Process'});
assert.equal(slugify('Café & colour',12),'cafe-colour-12');
const evil='</script><img src=x onerror=alert(1)>';
assert.ok(!markdown(evil).includes('<img'));
assert.ok(!markdown('[bad](javascript:alert(1))').includes('href='));
assert.match(markdown('## Materials\n\n- Paint\n- Paper\n\n> Slow down'),/<h3>Materials<\/h3>/);
const post=makePost({title:evil,category:'Notes'},'# Studio\n\nWords & ideas.',1,'2026-11-16T00:00:00.000Z');
const page=renderArticle(post,'# Studio\n\n'+evil,[post]);
assert.equal((page.match(/<h1>/g)||[]).length,1);
assert.ok(!page.includes('<img src=x'));
assert.match(page,/rel="canonical"/);assert.match(page,/BlogPosting/);assert.match(page,/og:description/);
assert.match(renderIndex([]),/New stories/);assert.match(sitemap([post]),/sarahwadmore.com\/blog\//);
const env={BotFathertoken:'test',GitHubtoken:'test',WEBHOOK_SECRET:'secret',SARAH_USER_ID:'123',REPO:'owner/repo'};
const original=globalThis.fetch;
async function scenario(commands,{conflict=false}={}){
 let posts=[],head=0,blobs=new Map(),tree=[],files={},writes=0,replies=[],conflicted=false;
 const existing=makePost({title:'Concurrent story',category:'Notes'},'Another story',99,'2026-11-16T00:00:00Z');
 globalThis.fetch=async(url,options={})=>{
 const body=options.body?JSON.parse(options.body):{};
 const doc=commands.find(c=>c.file===body.file_id);
 if(url.endsWith('/getFile'))return Response.json({ok:true,result:{file_path:body.file_id}});
 if(url.includes('/file/bot')){const id=url.split('/').at(-1),c=commands.find(c=>c.file===id);return new Response(c.content??'# Studio\n\nThe story behind this artwork.')}
 if(url.endsWith('/sendMessage')){replies.push(body.text);return Response.json({ok:true,result:{}})}
 if(url.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:String(head)}});
 if(/\/git\/commits\/\d+$/.test(url))return Response.json({tree:{sha:'base'}});
 const encoded=value=>Response.json({content:Buffer.from(JSON.stringify(value)).toString('base64')});
 if(url.includes('/contents/blog/posts.json'))return encoded(posts);
 if(url.includes('/contents/artworks.json'))return encoded([{title:'Artwork cover',src:'artworks/cover.jpg'}]);
 if(url.endsWith('/git/blobs')){const sha='b'+blobs.size;blobs.set(sha,Buffer.from(body.content,'base64').toString('utf8'));return Response.json({sha})}
 if(url.endsWith('/git/trees')){tree=body.tree;return Response.json({sha:'tree'})}
 if(url.endsWith('/git/commits'))return Response.json({sha:'next'});
 if(url.endsWith('/git/refs/heads/main')){
 if(conflict&&!conflicted){conflicted=true;posts=[existing];head++;return Response.json({message:'Conflict'},{status:422})}
 for(const entry of tree)files[entry.path]=blobs.get(entry.sha);
 posts=JSON.parse(files['blog/posts.json']);head++;writes++;return Response.json({});
 }
 throw Error('Unexpected route '+url);
 };
 try{
 for(const c of commands){
 const document=c.file?{file_id:c.file,file_name:c.name||'story.md',file_size:c.size||100}:undefined;
 const response=await worker.fetch(new Request('https://test/telegram',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':'secret'},body:JSON.stringify({update_id:c.id||1,message:{chat:{id:123,type:c.group?'group':'private'},from:{id:c.user||123},...(c.reply?{text:c.command,reply_to_message:{document}}:{caption:c.command,document})}})}),env);
 assert.equal(response.status,200);
 }
 return {posts,files,writes,replies};
 }finally{globalThis.fetch=original}
}
let result=await scenario([{command:'/blog My studio | Process',file:'one'}]);
assert.equal(result.writes,1);assert.equal(result.posts[0].cover,'artworks/cover.jpg');
assert.match(result.files['blog/my-studio-1/index.html'],/<h1>My studio<\/h1>/);
assert.match(result.files['blog/index.html'],/my-studio-1/);assert.match(result.files['sitemap.xml'],/my-studio-1/);
assert.match(result.replies[0],/https:\/\/sarahwadmore.com\/blog\/my-studio-1\//);
result=await scenario([{command:'/blog Repeated',file:'one'},{command:'/blog Repeated',file:'one'}]);assert.equal(result.writes,1);assert.match(result.replies[1],/Already/);
result=await scenario([{id:1,command:'/blog Same title',file:'one'},{id:2,command:'/blog Same title',file:'two',reply:true}]);assert.equal(result.posts.length,2);assert.notEqual(result.posts[0].url,result.posts[1].url);
result=await scenario([{command:'/blog Latest',file:'one'}],{conflict:true});assert.equal(result.posts.length,2);assert.equal(result.posts[0].title,'Latest');assert.equal(result.posts[1].id,'99');
for(const change of [{name:'story.pdf'},{size:300000},{content:''},{content:new Uint8Array([255,255])},{content:'\u0000binary'}]){
 result=await scenario([{command:'/blog Invalid',file:'one',...change}]);assert.equal(result.writes,0);
}
result=await scenario([{command:'/blog No file'}]);assert.equal(result.writes,0);
result=await scenario([{command:'/blog Blocked',file:'one',user:456},{command:'/blog Blocked',file:'one',group:true}]);assert.equal(result.writes,0);assert.equal(result.replies.length,0);
console.log('Passed blog parsing, HTML safety, SEO metadata, upload/reply, duplicate delivery, slug collisions, concurrency, validation and authorization');

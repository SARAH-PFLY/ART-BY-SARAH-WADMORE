import assert from 'node:assert/strict';
import {parseEdit,applyEdit,editArtwork} from './editing.mjs';
const work={uploadId:'42',src:'artworks/telegram-42.jpg',thumbnail:'artworks/thumbnails/telegram-42.jpg',title:'Old 🌻01',medium:'Ink',uploadedAt:'2026-01-01'};
const other={uploadId:'43',src:'artworks/telegram-43.jpg',title:'Other',medium:'Paint'};
assert.equal(parseEdit('/hello'),null);assert.ok(parseEdit('/edit').error);
assert.ok(parseEdit('/edit Old | '+'a'.repeat(39)).error);
assert.equal(parseEdit('/edit Old | |').medium,'');
const list=[work,other];
let result=applyEdit(list,parseEdit('/edit Old 🌻01 | New 🌹01 | New notes'));
assert.equal(result.work.title,'New 🌹01');assert.equal(result.work.src,work.src);assert.equal(result.work.thumbnail,work.thumbnail);assert.equal(result.list[0].uploadedAt,work.uploadedAt);assert.equal(result.list[1],other);
assert.equal(applyEdit(list,parseEdit('/edit id:42 | | Notes')).work.title,work.title);
assert.equal(applyEdit(list,parseEdit('/edit Old 🌻01 | New')).work.medium,'Ink');
assert.ok(applyEdit(list,parseEdit('/edit Old 🌻01 | other')).error);
assert.ok(applyEdit(list,parseEdit('/edit Missing | New')).error);
assert.ok(applyEdit([work,{...work,src:'duplicate.jpg'}],parseEdit('/edit Old 🌻01 | New')).error);
assert.ok(applyEdit([{...work,medium:'Changed'},other],parseEdit('/edit Old 🌻01 | New'),result.identity).error);
const encoded=x=>({content:Buffer.from(JSON.stringify(x)).toString('base64')});
const encode=x=>Buffer.from(x).toString('base64');
let saved,ledger=[],conflict=false,changeTarget=false,blobs=[],trees=[],reply;
const gh=async(_env,path,method='GET',body)=>{
 if(path==='git/ref/heads/main')return {object:{sha:'head'}};
 if(path==='git/commits/head')return {tree:{sha:'base'}};
 if(path.startsWith('contents/artworks.json'))return encoded(saved||list);
 if(path.startsWith('contents/telegram/edits.json'))return encoded(ledger);
 if(path==='git/blobs'){const content=Buffer.from(body.content,'base64').toString();blobs.push(content);return {sha:'blob'+blobs.length}}
 if(path==='git/trees'){trees.push(body);return {sha:'tree'}}
 if(path==='git/commits')return {sha:'next'};
 if(path==='git/refs/heads/main'){
 if(conflict){conflict=false;saved=[changeTarget?{...work,medium:'Concurrent change'}:work,other,{title:'Concurrent upload',src:'artworks/new.jpg'}];throw Error('GitHub 409 PATCH conflict')}
 saved=JSON.parse(blobs.at(-3));ledger=JSON.parse(blobs.at(-2));return {};
 }
 throw Error('Unexpected route '+path);
};
await editArtwork({update_id:1},{},parseEdit('/edit Old 🌻01 | New 🌹01 | Notes'),async t=>reply=t,gh,encode);
assert.match(reply,/Updated/);assert.equal(saved[0].title,'New 🌹01');assert.equal(trees[0].tree.length,3);assert.ok(blobs.at(-1).includes('New 🌹01'));
await editArtwork({update_id:1},{},parseEdit('/edit Old 🌻01 | Changed again'),async t=>reply=t,gh,encode);assert.match(reply,/already been saved/);
saved=null;ledger=[];conflict=true;
await editArtwork({update_id:2},{},parseEdit('/edit Old 🌻01 | Retry'),async t=>reply=t,gh,encode);assert.equal(saved.length,3);assert.equal(saved[2].title,'Concurrent upload');assert.equal(saved[0].title,'Retry');
saved=null;ledger=[];conflict=true;changeTarget=true;
await editArtwork({update_id:3},{},parseEdit('/edit Old 🌻01 | Overwrite'),async t=>reply=t,gh,encode);assert.match(reply,/Artwork changed/);assert.equal(saved[0].medium,'Concurrent change');
console.log('Edit parsing, title/notes preservation, duplicate protection, retries, concurrent uploads/edits and static social preview updates passed');

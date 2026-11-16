export function numberedTitle(base,index){
 if(!Number.isInteger(index)||index<1||index>20)throw Error('Batch number must be 1–20');
 if(Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(base)).length>36)throw Error('Base title maximum 36 characters');
 return base+String(index).padStart(2,'0');
}
export class BulkEngine {
 constructor(storage,send,schedule,upload,parse,defaultTemplate,emojiCaption){Object.assign(this,{storage,send,schedule,upload,parse,defaultTemplate,emojiCaption})}
 get(){return this.storage.get()}
 put(s){this.storage.put(s)}
 async event(update){
 const m=update.message,text=m.caption||m.text||'',start=text.match(/^\/bulk(?:@\w+)?(?:\s+([\s\S]*))?$/i);
 let s=this.get();
 if(start){
 if(s?.status==='processing'){await this.send('Batch still processing. Use /bulkstatus, or /cancel to stop remaining images.');return true}
 const input=(start[1]||'').trim(),command=!input?this.defaultTemplate:input.startsWith('/upload')?input:this.emojiCaption(input);
 const details=command&&this.parse(command);
 if(!details){await this.send('Use /bulk for the default, /bulk 🌷🔥🌻 to change emojis, or /bulk /upload Title | Notes. Base title maximum 36 characters.');return true}
 s={id:String(update.update_id),chatId:m.chat.id,details,items:[],next:0,status:'collecting',createdAt:Date.now()};this.put(s);
 await this.send('Bulk mode ready. Send up to 20 images (two albums of up to 10, or individual photos). Then send /done to publish one at a time. Titles end 01–20, with no extra space. /bulkstatus checks progress; /cancel stops the batch.');return true;
 }
 if(/^\/bulkstatus(?:@\w+)?$/i.test(text)){await this.send(s?'Batch '+s.status+': '+s.items.length+' collected, '+s.next+' processed. Base title: '+s.details.title:'No batch. Send /bulk to start.');return true}
 if(/^\/done(?:@\w+)?$/i.test(text)){
 if(!s||!s.items.length||s.status==='cancelled'||s.status==='complete'){await this.send('No pending batch. Use /bulk, send images, then /done.');return true}
 s.status='processing';this.put(s);await this.schedule();
 await this.send('Processing '+s.items.length+' images one at a time. Each image gets its own Saved/rejected reply and numbered title. /bulkstatus shows progress.');return true;
 }
 if(/^\/cancel(?:@\w+)?$/i.test(text)&&s&&['collecting','processing'].includes(s.status)){s.status='cancelled';this.put(s);await this.send('Batch cancelled. An image already being saved may finish. Earlier uploads remain in the gallery.');return true}
 const image=m.photo||m.document&&/\.(?:jpe?g|png|webp|gif)$/i.test(m.document.file_name||'');
 if(!image||!s||!['collecting','processing'].includes(s.status))return false;
 if(s.status==='processing'){await this.send('The batch is already processing. Wait for completion, then start another /bulk.');return true}
 if(Date.now()-s.createdAt>7200000){s.status='cancelled';this.put(s);await this.send('Batch expired after two hours. Send /bulk and resend the images.');return true}
 if(text.startsWith('/')&&!text.startsWith('/upload'))return false;
 if(s.items.some(x=>x.update_id===update.update_id))return true;
 if(s.items.length>=20){await this.send('Maximum 20 images collected. Send /done. Extra images were not added.');return true}
 const file=m.photo?.at(-1)||m.document;
 if(file.file_size>8*1024*1024){await this.send('Image rejected: maximum 8 MB.');return true}
 const number=s.items.length+1,title=numberedTitle(s.details.title,number);
 s.items.push({update_id:update.update_id,message:{...m,caption:'/upload '+title+' | '+s.details.medium,text:undefined}});
 this.put(s);await this.send('Collected '+number+'/20 — '+title+'. Send /done when ready.');return true;
 }
 async alarm(){
 let s=this.get();if(s?.status!=='processing')return;
 if(s.next>=s.items.length)return;
 const id=s.id,index=s.next;
 try{await this.upload(s.items[index])}
 catch(error){await this.send('Batch paused at image '+(index+1)+' after a temporary error. It will retry automatically; /done can resume it if needed.');throw error}
 s=this.get();if(s.id!==id||s.status!=='processing')return;
 s.next=index+1;
 if(s.next>=s.items.length)s.status='complete';
 this.put(s);
 if(s.status==='complete')await this.send('Batch complete: '+s.next+' images processed. Check individual Saved/rejected replies. /status checks website publication. Use each full numbered title with /delete.');
 else await this.schedule();
 }
}

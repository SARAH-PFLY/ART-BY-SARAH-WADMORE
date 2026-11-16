// Prefer Telegram's already-generated smaller files; never alter the full upload.
export function selectThumbnail(media,maxWidth=800){
 const original=media.photo?.at(-1)||media.animation||media.video||media.document;
 if(!original)return null;
 if(media.photo?.length>1){
 const candidates=media.photo.filter(p=>p.file_id!==original.file_id&&p.width>0&&p.height>0).sort((a,b)=>a.width-b.width);
 return candidates.filter(p=>p.width<=maxWidth).at(-1)||candidates[0]||null;
 }
 return media.document?.thumbnail||media.animation?.thumbnail||media.video?.thumbnail||null;
}
export async function downloadThumbnail(media,env,telegram,maxWidth=800){
 const file=selectThumbnail(media,maxWidth);if(!file||file.file_size>1024*1024)return null;
 try{
 const info=await telegram(env,'getFile',{file_id:file.file_id});
 const response=await fetch('https://api.telegram.org/file/bot'+env.BOT_TOKEN+'/'+info.file_path);
 if(!response.ok||!response.body)return null;
 const reader=response.body.getReader(),chunks=[];let total=0;
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>1024*1024){await reader.cancel();return null}chunks.push(value)}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)return null;
 return {bytes,width:file.width,height:file.height};
 }catch{return null}
}

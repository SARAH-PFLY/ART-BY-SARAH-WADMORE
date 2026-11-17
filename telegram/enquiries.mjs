// Public, user-initiated enquiries are separate from Sarah's admin commands.
export async function handleEnquiry(update,env,telegram,gh){
 const m=update.message;if(!m||m.chat.type!=='private'||!m.from||m.from.is_bot)return false;
 const text=m.text||'',match=text.match(/^\/start(?:@\w+)?\s+enquire_(\d+)$/i),say=message=>telegram(env,'sendMessage',{chat_id:m.chat.id,text:message});
 if(match){
  if(!env.ART_DRAFTS){await say('Enquiries are temporarily unavailable. Please try again later.');return true}
  const file=await gh(env,'contents/artworks.json'),list=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
  const work=list.find(w=>String(w.uploadId)===match[1]);if(!work){await say('That artwork is no longer listed. Open the gallery to choose a current artwork.');return true}
  const date=new Date().toISOString().slice(0,10),limitKey='enquiry-limit:'+m.from.id+':'+date;
  const count=Number(await env.ART_DRAFTS.get(limitKey)||0);
  if(count>=3){await say('You have reached today’s enquiry limit. Please try again tomorrow.');return true}
  await env.ART_DRAFTS.put(limitKey,String(count+1),{expirationTtl:86400});
  const url='https://sarahwadmore.com/?art='+work.uploadId;
  const prompt=await telegram(env,'sendMessage',{chat_id:m.chat.id,text:'Enquire about: '+work.title+'\n'+url+'\n\nReply to this message with your question about the original, prints or a commission (10–1,500 characters). Your message, Telegram name/username and this artwork link will be sent to Sarah. Send contact details only if you want Sarah to use them. Reply /cancel to cancel. This prompt expires in one hour.',reply_markup:{force_reply:true,input_field_placeholder:'Your question for Sarah'}});
  await env.ART_DRAFTS.put('enquiry:'+m.from.id+':'+prompt.message_id,JSON.stringify({title:work.title,id:work.uploadId,url,createdAt:Date.now()}),{expirationTtl:3600});
  return true;
 }
 if(!m.reply_to_message||!env.ART_DRAFTS)return false;
 const pendingKey='enquiry:'+m.from.id+':'+m.reply_to_message.message_id,raw=await env.ART_DRAFTS.get(pendingKey);
 if(!raw)return false;
 if(text==='/cancel'){await env.ART_DRAFTS.delete(pendingKey);await say('Enquiry cancelled. Nothing sent.');return true}
 const draft=JSON.parse(raw);
 if(Date.now()-draft.createdAt>3600000){await say('Enquiry expired. Open the artwork’s Enquire button again.');return true}
 if(text.trim().length<10||text.length>1500){await say('Please reply to the enquiry prompt with a question between 10 and 1,500 characters, or /cancel.');return true}
 const receipt='enquiry-sent:'+update.update_id;
 if(await env.ART_DRAFTS.get(receipt)){await say('This enquiry has already been sent.');return true}
 const name=[m.from.first_name,m.from.last_name].filter(Boolean).join(' ')||'Visitor';
 const sender=name+(m.from.username?' (@'+m.from.username+')':'')+' · Telegram ID '+m.from.id;
 await telegram(env,'sendMessage',{chat_id:env.SARAH_USER_ID,text:'ARTWORK ENQUIRY\nFrom: '+sender+'\nArtwork: '+draft.title+'\n'+draft.url+'\n\n'+text.trim(),link_preview_options:{is_disabled:true}});
 await env.ART_DRAFTS.put(receipt,'sent',{expirationTtl:86400});
 await env.ART_DRAFTS.delete(pendingKey);
 await say('Your enquiry has been sent to Sarah with the artwork title and link. Thank you.');return true;
}

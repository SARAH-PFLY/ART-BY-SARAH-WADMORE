import {DurableObject} from 'cloudflare:workers';
import {BulkEngine} from './bulk.mjs';
import {parse,UPLOAD_TEMPLATE,runBulkUpload,sendBulkMessage} from './worker.mjs';
import {emojiUploadCaption} from './upgrades.mjs';
export class BulkUploads extends DurableObject{
 constructor(ctx,env){
 super(ctx,env);
 ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, body TEXT NOT NULL)');
 const storage={get:()=>{const row=ctx.storage.sql.exec('SELECT body FROM state WHERE id=1').toArray()[0];return row?JSON.parse(row.body):null},put:s=>ctx.storage.sql.exec('INSERT OR REPLACE INTO state(id,body) VALUES(1,?)',JSON.stringify(s))};
 this.engine=new BulkEngine(storage,text=>{const s=storage.get();return sendBulkMessage(env,s?.chatId||env.SARAH_USER_ID,text)},()=>ctx.storage.setAlarm(Date.now()+1500),update=>runBulkUpload(update,env),parse,UPLOAD_TEMPLATE,emojiUploadCaption);
 }
 async event(update){return this.engine.event(update)}
 async alarm(){return this.engine.alarm()}
}

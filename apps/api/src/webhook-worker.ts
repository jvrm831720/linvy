import {randomUUID} from 'node:crypto';
import {and,eq,sql as dsql} from 'drizzle-orm';
import {pathToFileURL} from 'node:url';
import {config} from './config.js';
import {db as defaultDb} from './db.js';
import {events,webhookDeliveries,webhooks} from './db/schema.js';
import {decryptWebhookSecret} from './webhook-secret.js';
import {WebhookHttpError,WebhookHttpTransport,WebhookHttpResult} from './webhook-http.js';
import {classifyStatus,retryDelay,signWebhook,stableJson} from './webhook-signing.js';
export {classifyStatus,retryDelay,signWebhook,stableJson} from './webhook-signing.js';
type Database=typeof defaultDb;
export type ClaimedDelivery={id:string;eventId:string;webhookId:string;attempts:number;lockedBy:string};
export type WebhookTransport={post(url:string,body:string,headers:Record<string,string>,timeoutMs:number):Promise<WebhookHttpResult>};
export type DispatchConfig={leaseMs:number;maxAttempts:number;retryBaseMs:number;retryMaxMs:number;timeoutMs:number;masterKey:Buffer};
const defaults:DispatchConfig={leaseMs:config.WEBHOOK_LEASE_MS,maxAttempts:config.WEBHOOK_MAX_ATTEMPTS,retryBaseMs:config.WEBHOOK_RETRY_BASE_MS,retryMaxMs:config.WEBHOOK_RETRY_MAX_MS,timeoutMs:config.WEBHOOK_TIMEOUT_MS,masterKey:config.WEBHOOK_MASTER_KEY};

export async function claimWebhookDelivery(database:Database,workerId:string,now=new Date(),leaseMs=defaults.leaseMs):Promise<ClaimedDelivery|undefined>{const cutoff=new Date(now.getTime()-leaseMs);return database.transaction(async tx=>{const rows=await tx.execute(dsql`select id,event_id,webhook_id,attempts from webhook_deliveries where next_attempt_at<=${now.toISOString()}::timestamptz and (status='pending' or (status='processing' and locked_at<${cutoff.toISOString()}::timestamptz)) order by next_attempt_at,id for update skip locked limit 1`);const row=rows[0] as {id:string;event_id:string;webhook_id:string;attempts:number}|undefined;if(!row)return;await tx.update(webhookDeliveries).set({status:'processing',lockedAt:now,lockedBy:workerId,attempts:row.attempts+1}).where(eq(webhookDeliveries.id,row.id));return{id:row.id,eventId:row.event_id,webhookId:row.webhook_id,attempts:row.attempts+1,lockedBy:workerId};});}

export async function dispatchClaimedDelivery(database:Database,transport:WebhookTransport,claim:ClaimedDelivery,options:Partial<DispatchConfig>={},now=new Date(),logger:(record:Record<string,unknown>)=>void=record=>console.info(JSON.stringify(record))){
  const settings={...defaults,...options};const[event]=await database.select().from(events).where(eq(events.id,claim.eventId)).limit(1);const[hook]=await database.select().from(webhooks).where(eq(webhooks.id,claim.webhookId)).limit(1);const finish=async(status:'pending'|'delivered'|'failed',values:Record<string,unknown>)=>database.update(webhookDeliveries).set({status,lockedAt:null,lockedBy:null,...values}).where(and(eq(webhookDeliveries.id,claim.id),eq(webhookDeliveries.lockedBy,claim.lockedBy)));
  if(!event||!hook||!hook.enabled){await finish('failed',{lastError:!hook?'Webhook not found':'Webhook is disabled'});return;}
  const rawBody=stableJson({id:event.id,type:event.type,created_at:event.createdAt.toISOString(),data:event.data});const timestamp=Math.floor(now.getTime()/1000).toString();let secret:string;
  try{secret=decryptWebhookSecret(hook.encryptedSecret,settings.masterKey);}catch{await finish('failed',{lastError:'Webhook secret cannot be decrypted'});return;}
  const headers={'Content-Type':'application/json','User-Agent':'Linvy-Webhooks/0.2','Linvy-Event-Id':event.id,'Linvy-Delivery-Id':claim.id,'Linvy-Timestamp':timestamp,'Linvy-Signature':signWebhook(secret,timestamp,rawBody)};let result:WebhookHttpResult;
  try{result=await transport.post(hook.url,rawBody,headers,settings.timeoutMs);}catch(error){const retryable=error instanceof WebhookHttpError?error.retryable:true;const message=error instanceof Error?error.message:'Webhook request failed';const exhausted=claim.attempts>=settings.maxAttempts;if(retryable&&!exhausted)await finish('pending',{lastError:message,nextAttemptAt:new Date(now.getTime()+retryDelay(claim.attempts,settings.retryBaseMs,settings.retryMaxMs,undefined,now))});else await finish('failed',{lastError:exhausted?'Maximum delivery attempts exhausted':message});logger({delivery_id:claim.id,event_id:event.id,organization_id:event.organizationId,request_id:event.requestId,attempt:claim.attempts,outcome:retryable&&!exhausted?'retry':'failed'});return;}
  const classification=classifyStatus(result.status);if(classification==='success')await finish('delivered',{responseStatus:result.status,lastError:null,deliveredAt:new Date()});else if(classification==='retryable'&&claim.attempts<settings.maxAttempts)await finish('pending',{responseStatus:result.status,lastError:`HTTP ${result.status}`,nextAttemptAt:new Date(now.getTime()+retryDelay(claim.attempts,settings.retryBaseMs,settings.retryMaxMs,result.retryAfter,now))});else await finish('failed',{responseStatus:result.status,lastError:classification==='retryable'?'Maximum delivery attempts exhausted':`HTTP ${result.status}`});logger({delivery_id:claim.id,event_id:event.id,organization_id:event.organizationId,request_id:event.requestId,attempt:claim.attempts,response_status:result.status,duration_ms:result.durationMs,outcome:classification});
}

export function startWebhookWorker(database:Database=defaultDb,transport:WebhookTransport=new WebhookHttpTransport()){const workerId=`whw_${randomUUID()}`;let stopped=false;let running=false;const tick=async()=>{if(stopped||running)return;running=true;try{const claim=await claimWebhookDelivery(database,workerId);if(claim)await dispatchClaimedDelivery(database,transport,claim);}finally{running=false;}};const timer=setInterval(()=>void tick(),config.WEBHOOK_POLL_MS);void tick();return()=>{stopped=true;clearInterval(timer);};}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)startWebhookWorker();

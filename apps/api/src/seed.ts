import {createHash} from 'node:crypto';
import {db,sql} from './db.js';
import {apiKeys,assignments,lines,organizations,people,providers} from './db/schema.js';
import {config} from './config.js';
import {createWebhookRegistration} from './webhook-service.js';

await db.insert(organizations).values({id:'org_acme',name:'Acme Operações'}).onConflictDoNothing();
await db.insert(providers).values({id:'prv_sandbox',organizationId:'org_acme',kind:'sandbox',name:'Linvy Sandbox'}).onConflictDoNothing();
await db.insert(people).values({id:'per_carlos',organizationId:'org_acme',name:'Carlos Mendes'}).onConflictDoNothing();
await db.insert(lines).values([
  {id:'lin_5521',organizationId:'org_acme',providerId:'prv_sandbox',phoneNumber:'+55 21 98888-5521',region:'RJ',simType:'esim',status:'active'},
  {id:'lin_5522',organizationId:'org_acme',providerId:'prv_sandbox',phoneNumber:'+55 21 98888-5522',region:'RJ',simType:'esim',status:'available'},
]).onConflictDoNothing();
await db.insert(assignments).values({id:'asn_carlos',organizationId:'org_acme',lineId:'lin_5521',personId:'per_carlos',deviceId:'dev_iphone',costCenter:'OPS-RJ'}).onConflictDoNothing();
await db.insert(apiKeys).values({id:'key_bootstrap',organizationId:'org_acme',name:'Development bootstrap administrator',prefix:config.LINVY_BOOTSTRAP_API_KEY.slice(0,12),keyHash:createHash('sha256').update(config.LINVY_BOOTSTRAP_API_KEY).digest('hex'),scopes:['lines:read','providers:read','people:read','people:write','assignments:read','assignments:write','incidents:read','incidents:write','replacements:read','replacements:write','provider_orders:read','events:read','webhooks:read','webhooks:write','webhook_deliveries:read','api_keys:read','api_keys:write']}).onConflictDoNothing();
const existingWebhook=await db.query.webhooks.findFirst({where:(table,{eq})=>eq(table.organizationId,'org_acme')});
if(!existingWebhook){const created=await createWebhookRegistration('org_acme','https://example.invalid/linvy',config.WEBHOOK_MASTER_KEY,db);console.log(`Development webhook secret (shown once): ${created.secret}`);}
await sql.end();
console.log('Linvy sandbox data seeded.');

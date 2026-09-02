import {createHash} from 'node:crypto';
import {db,sql} from './db.js';
import {apiKeys,assignments,lines,organizations,people,providers} from './db/schema.js';
import {config} from './config.js';

await db.insert(organizations).values({id:'org_acme',name:'Acme Operações'}).onConflictDoNothing();
await db.insert(providers).values({id:'prv_sandbox',organizationId:'org_acme',kind:'sandbox',name:'Linvy Sandbox'}).onConflictDoNothing();
await db.insert(people).values({id:'per_carlos',organizationId:'org_acme',name:'Carlos Mendes'}).onConflictDoNothing();
await db.insert(lines).values([
  {id:'lin_5521',organizationId:'org_acme',providerId:'prv_sandbox',phoneNumber:'+55 21 98888-5521',region:'RJ',simType:'esim',status:'active'},
  {id:'lin_5522',organizationId:'org_acme',providerId:'prv_sandbox',phoneNumber:'+55 21 98888-5522',region:'RJ',simType:'esim',status:'available'},
]).onConflictDoNothing();
await db.insert(assignments).values({id:'asn_carlos',organizationId:'org_acme',lineId:'lin_5521',personId:'per_carlos',deviceId:'dev_iphone',costCenter:'OPS-RJ'}).onConflictDoNothing();
await db.insert(apiKeys).values({id:'key_bootstrap',organizationId:'org_acme',prefix:config.LINVY_BOOTSTRAP_API_KEY.slice(0,12),keyHash:createHash('sha256').update(config.LINVY_BOOTSTRAP_API_KEY).digest('hex'),scopes:['lines:read','incidents:write','replacements:read','replacements:write']}).onConflictDoNothing();
await sql.end();
console.log('Linvy sandbox data seeded.');

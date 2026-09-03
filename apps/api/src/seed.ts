import {createHash} from 'node:crypto';
import {db,sql} from './db.js';
import {apiKeys,assignments,guardPlaybooks,guardRules,lines,organizations,people,providerConnections,providers} from './db/schema.js';
import {config} from './config.js';
import {createWebhookRegistration} from './webhook-service.js';
import {encryptProviderCredentials} from './provider-credentials.js';

await db.insert(organizations).values({id:'org_acme',name:'Acme Operações'}).onConflictDoNothing();
await db.insert(providers).values({id:'prv_sandbox',organizationId:'org_acme',kind:'sandbox',name:'Linvy Sandbox'}).onConflictDoNothing();
await db.insert(providers).values({id:'prv_sandbox_secondary',organizationId:'org_acme',kind:'sandbox',name:'Linvy Sandbox Secondary'}).onConflictDoNothing();
await db.insert(providerConnections).values([{id:'pcn_sandbox',organizationId:'org_acme',providerId:'prv_sandbox',adapterType:'sandbox',encryptedCredentials:encryptProviderCredentials({},config.PROVIDER_MASTER_KEY)},{id:'pcn_sandbox_secondary',organizationId:'org_acme',providerId:'prv_sandbox_secondary',adapterType:'sandbox',encryptedCredentials:encryptProviderCredentials({},config.PROVIDER_MASTER_KEY)}]).onConflictDoNothing();
await db.insert(people).values({id:'per_carlos',organizationId:'org_acme',name:'Carlos Mendes'}).onConflictDoNothing();
await db.insert(lines).values([
  {id:'lin_5521',organizationId:'org_acme',providerId:'prv_sandbox',phoneNumber:'+55 21 98888-5521',region:'RJ',simType:'esim',status:'active'},
  {id:'lin_5522',organizationId:'org_acme',providerId:'prv_sandbox',phoneNumber:'+55 21 98888-5522',region:'RJ',simType:'esim',status:'available'},
]).onConflictDoNothing();
await db.insert(assignments).values({id:'asn_carlos',organizationId:'org_acme',lineId:'lin_5521',personId:'per_carlos',deviceId:'dev_iphone',costCenter:'OPS-RJ'}).onConflictDoNothing();
await db.insert(apiKeys).values({id:'key_bootstrap',organizationId:'org_acme',name:'Development bootstrap administrator',prefix:config.LINVY_BOOTSTRAP_API_KEY.slice(0,12),keyHash:createHash('sha256').update(config.LINVY_BOOTSTRAP_API_KEY).digest('hex'),scopes:['lines:read','providers:read','people:read','people:write','assignments:read','assignments:write','incidents:read','incidents:write','replacements:read','replacements:write','provider_orders:read','events:read','webhooks:read','webhooks:write','webhook_deliveries:read','api_keys:read','api_keys:write','guard:read','guard:signals:read','guard:risk:read','guard:rules:read','guard:rules:write','guard:playbooks:read','guard:alerts:read','guard:alerts:write','guard:actions:read','guard:actions:write','guard:policy:read','guard:policy:write']}).onConflictDoNothing();
await db.insert(guardPlaybooks).values([
 {id:'gpb_provider_outage',systemOwned:true,name:'PROVIDER_OUTAGE',triggerType:'provider_health',description:'Confirm provider degradation, stop new automated activations only after approval, notify owners, and monitor recovery.',steps:['validate evidence','request activation pause approval','notify owners','monitor recovery']},
 {id:'gpb_sim_failure',systemOwned:true,name:'SIM_FAILURE',triggerType:'line_health',description:'Validate SIM failure and preserve evidence before any replacement.',steps:['validate line state','inspect incident recurrence','request manual decision']},
 {id:'gpb_activation_wave',systemOwned:true,name:'ACTIVATION_FAILURE_WAVE',triggerType:'incident_wave',description:'Correlate activation failures and avoid multiplying operations against a degraded provider.',steps:['correlate incidents','inspect provider health','request safe action approval']},
 {id:'gpb_outcome_unknown',systemOwned:true,name:'OUTCOME_UNKNOWN',triggerType:'provider_order_unknown',description:'Never repeat activate blindly; preserve target and reconcile by stable operation key.',steps:['preserve target','start reconciliation','query operation status','escalate if still unknown']},
 {id:'gpb_reconciliation',systemOwned:true,name:'RECONCILIATION_REQUIRED',triggerType:'reconciliation_required',description:'Escalate an unresolved provider outcome for manual reconciliation.',steps:['freeze automation','collect provider evidence','manual reconciliation']},
 {id:'gpb_compliance',systemOwned:true,name:'COMPLIANCE_REVIEW',triggerType:'compliance',description:'Freeze automation and require manual compliance review. No replacement or bypass.',steps:['freeze automation','preserve evidence','manual review']},
]).onConflictDoNothing();
await db.insert(guardRules).values([
 {id:'grl_provider_degraded',organizationId:'org_acme',name:'Provider degraded at 10 percent',type:'provider_health',conditions:{metric:'provider.failure_rate',operator:'>=',value:.10,minimum_sample:10,window:'15m'},severity:'high',actionPolicy:'approval_required'},
 {id:'grl_provider_critical',organizationId:'org_acme',name:'Provider critical at 25 percent',type:'provider_health',conditions:{metric:'provider.failure_rate',operator:'>=',value:.25,minimum_sample:10,window:'15m'},severity:'critical',actionPolicy:'approval_required'},
]).onConflictDoNothing();
const existingWebhook=await db.query.webhooks.findFirst({where:(table,{eq})=>eq(table.organizationId,'org_acme')});
if(!existingWebhook){const created=await createWebhookRegistration('org_acme','https://example.invalid/linvy',config.WEBHOOK_MASTER_KEY,db);console.log(`Development webhook secret (shown once): ${created.secret}`);}
await sql.end();
console.log('Linvy sandbox data seeded.');

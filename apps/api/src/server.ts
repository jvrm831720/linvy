import {createHash,randomUUID} from 'node:crypto';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {and,eq,sql as dsql} from 'drizzle-orm';
import {pathToFileURL} from 'node:url';
import {z} from 'zod';
import auth from './auth.js';
import {config} from './config.js';
import {db as defaultDb} from './db.js';
import {idempotencyKeys,incidents,jobs,lines,replacements,webhooks} from './db/schema.js';
import {assertReplacementAllowed} from './domain.js';
import {createWebhookRegistration} from './webhook-service.js';
type Database=typeof defaultDb;
const id=(prefix:string)=>`${prefix}_${randomUUID().replaceAll('-','')}`;
const scope=(scopes:string[],required:string)=>{if(!scopes.includes(required))throw Object.assign(new Error(`Missing required scope: ${required}`),{code:'FORBIDDEN',statusCode:403});};
const notFound=()=>Object.assign(new Error('Resource not found.'),{code:'RESOURCE_NOT_FOUND',statusCode:404});

export async function buildApp(database:Database=defaultDb){
  const app=Fastify({logger:false,genReqId:req=>String(req.headers['x-request-id']??id('req'))});
  app.decorate('database',database);
  await app.register(swagger,{openapi:{openapi:'3.1.0',info:{title:'Linvy API',version:'0.2.2'},components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer'}}},security:[{bearerAuth:[]}]}});
  await app.register(swaggerUi,{routePrefix:'/docs'});
  await app.register(auth,{database});
  app.get('/health',async()=>({status:'ok'}));
  app.get('/openapi.json',async(_req,reply)=>reply.send(app.swagger()));
  app.get('/v1/lines',async req=>{scope(req.scopes,'lines:read');return database.select().from(lines).where(eq(lines.organizationId,req.organizationId));});
  app.post('/v1/incidents',async(req,reply)=>{
    scope(req.scopes,'incidents:write');const body=z.object({line_id:z.string(),reason:z.string().min(1)}).parse(req.body);
    const[line]=await database.select({id:lines.id}).from(lines).where(and(eq(lines.organizationId,req.organizationId),eq(lines.id,body.line_id))).limit(1);if(!line)throw notFound();
    const row={id:id('inc'),organizationId:req.organizationId,lineId:line.id,reason:body.reason};await database.insert(incidents).values(row);return reply.code(201).send({id:row.id,status:'open',line_id:row.lineId});
  });
  app.post('/v1/lines/:lineId/replacements',async(req,reply)=>{
    scope(req.scopes,'replacements:write');const body=z.object({reason:z.string(),incident_id:z.string().optional()}).parse(req.body);assertReplacementAllowed(body.reason);
    const lineId=(req.params as {lineId:string}).lineId;const key=z.string().min(8).parse(req.headers['idempotency-key']);const route=`POST:/v1/lines/${lineId}/replacements`;const hash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const result=await database.transaction(async tx=>{
      await tx.execute(dsql`select pg_advisory_xact_lock(hashtext(${`${req.organizationId}:${route}:${key}`}))`);
      const[cached]=await tx.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.organizationId,req.organizationId),eq(idempotencyKeys.route,route),eq(idempotencyKeys.key,key))).limit(1);
      if(cached){if(cached.requestHash!==hash)return{status:409,response:{error:{code:'IDEMPOTENCY_CONFLICT',message:'Key was already used with a different request.',request_id:req.id}}};return{status:cached.statusCode,response:cached.response};}
      const[source]=await tx.select().from(lines).where(and(eq(lines.organizationId,req.organizationId),eq(lines.id,lineId))).limit(1);if(!source)throw notFound();
      if(body.incident_id){const[incident]=await tx.select().from(incidents).where(and(eq(incidents.organizationId,req.organizationId),eq(incidents.id,body.incident_id),eq(incidents.lineId,lineId))).limit(1);if(!incident)throw notFound();}
      const replacement={id:id('rep'),organizationId:req.organizationId,incidentId:body.incident_id,sourceLineId:lineId,reason:body.reason,requestId:req.id};const response={id:replacement.id,status:'pending',source_line_id:lineId};
      await tx.insert(replacements).values(replacement);await tx.insert(jobs).values({id:id('job'),organizationId:req.organizationId,type:'replacement.execute',payload:{replacementId:replacement.id}});await tx.insert(idempotencyKeys).values({id:id('idem'),organizationId:req.organizationId,key,route,requestHash:hash,statusCode:202,response});return{status:202,response};
    });
    if(result.status===202)reply.header('location',`/v1/replacements/${(result.response as {id:string}).id}`);return reply.code(result.status).send(result.response);
  });
  app.get('/v1/replacements/:id',async(req,reply)=>{scope(req.scopes,'replacements:read');const[row]=await database.select().from(replacements).where(and(eq(replacements.organizationId,req.organizationId),eq(replacements.id,(req.params as {id:string}).id))).limit(1);if(!row)throw notFound();return reply.send({...row,duration_seconds:row.completedAt?Math.floor((row.completedAt.getTime()-row.createdAt.getTime())/1000):null});});
  app.post('/v1/webhooks',{schema:{tags:['Webhooks'],body:{type:'object',required:['url'],additionalProperties:false,properties:{url:{type:'string',format:'uri'}}},response:{201:{type:'object',required:['id','url','secret'],properties:{id:{type:'string'},url:{type:'string'},secret:{type:'string',description:'Shown once. It cannot be retrieved later.'}}}}}},async(req,reply)=>{scope(req.scopes,'webhooks:write');const body=z.object({url:z.url()}).parse(req.body);const created=await createWebhookRegistration(req.organizationId,body.url,config.WEBHOOK_MASTER_KEY,database);return reply.code(201).send(created);});
  app.get('/v1/webhooks',{schema:{tags:['Webhooks']}},async req=>{scope(req.scopes,'webhooks:read');const rows=await database.select({id:webhooks.id,url:webhooks.url,enabled:webhooks.enabled,created_at:webhooks.createdAt,disabled_at:webhooks.disabledAt}).from(webhooks).where(eq(webhooks.organizationId,req.organizationId));return rows;});
  app.delete('/v1/webhooks/:id',{schema:{tags:['Webhooks']}},async(req,reply)=>{scope(req.scopes,'webhooks:write');const[row]=await database.update(webhooks).set({enabled:false,disabledAt:new Date()}).where(and(eq(webhooks.organizationId,req.organizationId),eq(webhooks.id,(req.params as {id:string}).id))).returning({id:webhooks.id});if(!row)throw notFound();return reply.code(204).send();});
  app.setErrorHandler((error,req,reply)=>{const e=error as Error&{code?:string;statusCode?:number};reply.code(e.statusCode??500).send({error:{code:e.code??'INTERNAL_ERROR',message:e.message,request_id:req.id}});});
  return app;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){const app=await buildApp();await app.listen({port:config.PORT,host:'0.0.0.0'});}

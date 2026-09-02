import {createHash,timingSafeEqual} from 'node:crypto';
import fp from 'fastify-plugin';
import {eq} from 'drizzle-orm';
import {db as defaultDb} from './db.js';
import {apiKeys} from './db/schema.js';
declare module 'fastify'{interface FastifyRequest{organizationId:string;scopes:string[]}interface FastifyInstance{database:typeof defaultDb}}
export const hashKey=(key:string)=>createHash('sha256').update(key).digest('hex');
const unauthorized=()=>Object.assign(new Error('Invalid or missing API key.'),{code:'UNAUTHORIZED',statusCode:401});
export default fp<{database?:typeof defaultDb}>(async(app,options)=>{const database=options.database??defaultDb;app.decorateRequest('organizationId','');app.decorateRequest('scopes',null as unknown as string[]);app.addHook('preHandler',async req=>{if(req.url==='/health'||req.url.startsWith('/docs')||req.url==='/openapi.json')return;const raw=req.headers.authorization?.replace(/^Bearer /,'');if(!raw)throw unauthorized();const hash=hashKey(raw);const[record]=await database.select().from(apiKeys).where(eq(apiKeys.keyHash,hash)).limit(1);if(!record||record.revokedAt||!timingSafeEqual(Buffer.from(record.keyHash),Buffer.from(hash)))throw unauthorized();req.organizationId=record.organizationId;req.scopes=record.scopes;await database.update(apiKeys).set({lastUsedAt:new Date()}).where(eq(apiKeys.id,record.id));});});

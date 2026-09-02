import {z} from 'zod';

export const PUBLIC_SCOPES=['lines:read','providers:read','people:read','people:write','assignments:read','assignments:write','incidents:read','incidents:write','replacements:read','replacements:write','provider_orders:read','events:read','webhooks:read','webhooks:write','webhook_deliveries:read','api_keys:read','api_keys:write'] as const;
export const publicScopeSchema=z.enum(PUBLIC_SCOPES);
export const paginationSchema=z.object({limit:z.coerce.number().int().min(1).max(100).default(25),cursor:z.string().optional()});
type Cursor={created_at?:string;id:string};
export function encodeCursor(cursor:Cursor){return Buffer.from(JSON.stringify(cursor)).toString('base64url');}
export function decodeCursor(value:string|undefined,withDate:boolean):Cursor|undefined{if(!value)return;try{const parsed=JSON.parse(Buffer.from(value,'base64url').toString('utf8')) as Cursor;if(typeof parsed.id!=='string'||!parsed.id||(withDate&&(typeof parsed.created_at!=='string'||Number.isNaN(Date.parse(parsed.created_at)))))throw new Error();return parsed;}catch{throw new z.ZodError([{code:'custom',path:['cursor'],message:'Invalid cursor'}]);}}
export function page<T extends {id:string}>(rows:T[],limit:number,cursor:(row:T)=>Cursor){const hasMore=rows.length>limit;const data=hasMore?rows.slice(0,limit):rows;return{data,next_cursor:hasMore?encodeCursor(cursor(data[data.length-1]!)):null};}
export const iso=(value:Date|null|undefined)=>value?.toISOString()??null;
export const lineDto=(row:any)=>({id:row.id,phone_number:row.phoneNumber,provider_id:row.providerId,region:row.region,sim_type:row.simType,status:row.status,created_at:iso(row.createdAt),updated_at:iso(row.updatedAt)});
export const assignmentDto=(row:any)=>({id:row.id,line_id:row.lineId,person_id:row.personId,device_id:row.deviceId??null,cost_center:row.costCenter??null,started_at:iso(row.startedAt),ended_at:iso(row.endedAt)});
export const incidentDto=(row:any)=>({id:row.id,line_id:row.lineId,reason:row.reason,status:row.status,created_at:iso(row.createdAt),resolved_at:iso(row.resolvedAt)});
export const replacementDto=(row:any)=>({id:row.id,status:row.status,reason:row.reason,incident_id:row.incidentId??null,source_line_id:row.sourceLineId,target_line_id:row.targetLineId??null,failure_code:row.failureCode??null,request_id:row.requestId,created_at:iso(row.createdAt),completed_at:iso(row.completedAt),duration_seconds:row.completedAt?Math.floor((row.completedAt.getTime()-row.createdAt.getTime())/1000):null});
export const providerOrderDto=(row:any)=>({id:row.id,replacement_id:row.replacementId,provider_id:row.providerId,operation:row.operation,resource_id:row.resourceId,status:row.status,provider_reference:row.providerReference??null,error:row.error??null,created_at:iso(row.createdAt),completed_at:iso(row.completedAt)});
export const eventDto=(row:any)=>({id:row.id,type:row.type,aggregate_id:row.aggregateId,data:row.data,request_id:row.requestId,created_at:iso(row.createdAt)});
export const webhookDeliveryDto=(row:any)=>({id:row.id,event_id:row.eventId,webhook_id:row.webhookId,status:row.status,attempts:row.attempts,response_status:row.responseStatus??null,last_error:row.lastError??null,next_attempt_at:iso(row.nextAttemptAt),delivered_at:iso(row.deliveredAt)});
export const apiKeyDto=(row:any)=>({id:row.id,name:row.name,prefix:row.prefix,scopes:row.scopes,last_used_at:iso(row.lastUsedAt),created_at:iso(row.createdAt),revoked_at:iso(row.revokedAt)});

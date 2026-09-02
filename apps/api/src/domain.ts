export const replacementReasons = ['sim_failure','lost_or_stolen','device_change','provider_failure'] as const;
export type ReplacementReason = typeof replacementReasons[number];
export type LineState = 'available'|'provisioning'|'active'|'suspended'|'terminated'|'replaced';
const transitions: Record<LineState,readonly LineState[]> = {available:['provisioning'],provisioning:['active','available'],active:['suspended','replaced','terminated'],suspended:['active','replaced','terminated'],terminated:[],replaced:[]};
export class DomainError extends Error { constructor(public readonly code:string,message:string,public readonly retryable=false,public readonly statusCode=409){super(message);} }
export function assertTransition(from:LineState,to:LineState){if(!transitions[from].includes(to))throw new DomainError('INVALID_STATE_TRANSITION',`Cannot transition line from ${from} to ${to}`);}
export function assertSourceReplaceable(status:LineState){if(status!=='active'&&status!=='suspended')throw new DomainError('INVALID_STATE_TRANSITION',`Source line in ${status} cannot be replaced`);}
export function assertReplacementAllowed(reason:string):asserts reason is ReplacementReason {if(['policy_block','fraud','abuse'].includes(reason))throw new DomainError('RISK_REVIEW_REQUIRED','Replacement requires risk review.');if(!replacementReasons.includes(reason as ReplacementReason))throw new DomainError('VALIDATION_ERROR','Unsupported replacement reason.',false,400);}
export type EligibleResource={id:string;organizationId:string;region:string;simType:string;status:LineState};
export type SourceRequirements={id:string;organizationId:string;region:string;simType:string};
export function isEligibleTarget(source:SourceRequirements,target:EligibleResource){return target.organizationId===source.organizationId&&target.status==='available'&&target.id!==source.id&&target.region===source.region&&target.simType===source.simType;}
export function retryDelayMs(attempt:number,baseMs:number){return Math.min(baseMs*(2**Math.max(0,attempt-1)),60_000);}

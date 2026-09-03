import { z } from 'zod';
const defaultDevelopmentKey = Buffer.alloc(32, 7).toString('base64');
export const config = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  DATABASE_URL: z.string().min(1), PORT: z.coerce.number().default(3333),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(1000),
  JOB_LEASE_MS: z.coerce.number().int().positive().default(30_000),
  JOB_HEARTBEAT_MS: z.coerce.number().int().positive().default(10_000),
  PROVIDER_OPERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  GUARD_POLL_MS: z.coerce.number().int().positive().default(1_000),
  GUARD_LEASE_MS: z.coerce.number().int().positive().default(30_000),
  GUARD_HEARTBEAT_MS: z.coerce.number().int().positive().default(10_000),
  GUARD_BATCH_SIZE: z.coerce.number().int().positive().max(500).default(100),
  MAX_RECONCILIATION_ATTEMPTS: z.coerce.number().int().positive().default(5),
  MAX_JOB_ATTEMPTS: z.coerce.number().int().positive().default(3),
  JOB_RETRY_BASE_MS: z.coerce.number().int().positive().default(1_000),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  WEBHOOK_POLL_MS: z.coerce.number().int().positive().default(1_000),
  WEBHOOK_LEASE_MS: z.coerce.number().int().positive().default(30_000),
  WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  WEBHOOK_RETRY_BASE_MS: z.coerce.number().int().positive().default(1_000),
  WEBHOOK_RETRY_MAX_MS: z.coerce.number().int().positive().default(3_600_000),
  WEBHOOK_MASTER_KEY: z.string().default(defaultDevelopmentKey).transform((value, ctx) => {
    const key = Buffer.from(value, 'base64');
    if (key.length !== 32) { ctx.addIssue({ code: 'custom', message: 'WEBHOOK_MASTER_KEY must be 32 bytes in base64' }); return z.NEVER; }
    return key;
  }),
  PROVIDER_MASTER_KEY: z.string().default(defaultDevelopmentKey).transform((value, ctx) => {const key=Buffer.from(value,'base64');if(key.length!==32){ctx.addIssue({code:'custom',message:'PROVIDER_MASTER_KEY must be 32 bytes in base64'});return z.NEVER;}return key;}),
  GUARD_CHANNEL_MASTER_KEY: z.string().default(defaultDevelopmentKey).transform((value, ctx) => {const key=Buffer.from(value,'base64');if(key.length!==32){ctx.addIssue({code:'custom',message:'GUARD_CHANNEL_MASTER_KEY must be 32 bytes in base64'});return z.NEVER;}return key;}),
  LINVY_BOOTSTRAP_API_KEY: z.string().min(16),
}).refine(value=>value.JOB_HEARTBEAT_MS<value.JOB_LEASE_MS,{message:'JOB_HEARTBEAT_MS must be less than JOB_LEASE_MS',path:['JOB_HEARTBEAT_MS']}).refine(value=>value.GUARD_HEARTBEAT_MS<value.GUARD_LEASE_MS,{message:'GUARD_HEARTBEAT_MS must be less than GUARD_LEASE_MS',path:['GUARD_HEARTBEAT_MS']}).parse(process.env);

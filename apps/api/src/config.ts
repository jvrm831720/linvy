import { z } from 'zod';
export const config = z.object({DATABASE_URL:z.string().url(),PORT:z.coerce.number().default(3333),WORKER_POLL_MS:z.coerce.number().default(1000),WEBHOOK_TIMEOUT_MS:z.coerce.number().default(5000),LINVY_BOOTSTRAP_API_KEY:z.string().min(16)}).parse(process.env);

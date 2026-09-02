import {randomBytes,randomUUID} from 'node:crypto';
import {db as defaultDb} from './db.js';
import {webhooks} from './db/schema.js';
import {encryptWebhookSecret} from './webhook-secret.js';
export async function createWebhookRegistration(organizationId:string,url:string,masterKey:Buffer,database:typeof defaultDb=defaultDb){const secret=`whsec_${randomBytes(24).toString('base64url')}`;const row={id:`whk_${randomUUID().replaceAll('-','')}`,organizationId,url,encryptedSecret:encryptWebhookSecret(secret,masterKey),secretKeyVersion:1};await database.insert(webhooks).values(row);return{id:row.id,url,secret};}

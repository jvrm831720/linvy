import {createServer} from 'node:http';
import {createHmac} from 'node:crypto';
import {afterEach,describe,expect,it} from 'vitest';
import {isPublicAddress,resolveSafeWebhookUrl,WebhookHttpTransport} from '../src/webhook-http.js';
import {classifyStatus,retryDelay,signWebhook,stableJson} from '../src/webhook-signing.js';

describe('webhook delivery primitives',()=>{
  const servers:ReturnType<typeof createServer>[]=[];afterEach(()=>servers.splice(0).forEach(server=>server.close()));
  it('serializes canonical payloads deterministically',()=>{expect(stableJson({z:1,data:{b:2,a:1},a:3})).toBe(stableJson({a:3,data:{a:1,b:2},z:1}));});
  it('signs timestamp dot raw body with HMAC-SHA256',()=>{const expected=createHmac('sha256','whsec_test').update('123.{"x":1}').digest('hex');expect(signWebhook('whsec_test','123','{"x":1}')).toBe(`v1=${expected}`);});
  it('classifies HTTP retry behavior',()=>{expect(classifyStatus(204)).toBe('success');expect(classifyStatus(408)).toBe('retryable');expect(classifyStatus(425)).toBe('retryable');expect(classifyStatus(429)).toBe('retryable');expect(classifyStatus(503)).toBe('retryable');expect(classifyStatus(400)).toBe('terminal');expect(classifyStatus(302)).toBe('terminal');});
  it('caps exponential backoff and Retry-After',()=>{expect(retryDelay(3,100,1000,undefined)).toBe(400);expect(retryDelay(1,100,1000,'10')).toBe(1000);});
  it('blocks localhost and private IPv4',()=>{expect(isPublicAddress('127.0.0.1')).toBe(false);expect(isPublicAddress('10.2.3.4')).toBe(false);expect(isPublicAddress('192.168.1.4')).toBe(false);expect(isPublicAddress('8.8.8.8')).toBe(true);});
  it('rejects private addresses returned by DNS',async()=>{await expect(resolveSafeWebhookUrl('https://hook.test',async()=>[{address:'10.0.0.1',family:4}])).rejects.toMatchObject({code:'SSRF_BLOCKED',retryable:false});});
  it('requires HTTPS in production mode',async()=>{await expect(resolveSafeWebhookUrl('http://hook.test',async()=>[{address:'8.8.8.8',family:4}])).rejects.toMatchObject({code:'HTTPS_REQUIRED'});});
  it('does not follow redirects',async()=>{const server=createServer((_req,res)=>{res.statusCode=302;res.setHeader('Location','http://127.0.0.1/metadata');res.end();});servers.push(server);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;const result=await new WebhookHttpTransport({allowHttp:true,allowPrivateAddresses:true,resolver:async()=>[{address:'127.0.0.1',family:4}]}).post(`http://hook.test:${port}`,'{}',{},1000);expect(result.status).toBe(302);});
  it('times out a controlled HTTP endpoint',async()=>{const server=createServer(()=>{});servers.push(server);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;await expect(new WebhookHttpTransport({allowHttp:true,allowPrivateAddresses:true,resolver:async()=>[{address:'127.0.0.1',family:4}]}).post(`http://hook.test:${port}`,'{}',{},20)).rejects.toMatchObject({code:'TIMEOUT',retryable:true});});
});

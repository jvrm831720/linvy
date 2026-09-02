import {lookup as dnsLookup} from 'node:dns/promises';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {BlockList,isIP} from 'node:net';

export type ResolvedAddress={address:string;family:4|6};
export type Resolver=(hostname:string)=>Promise<ResolvedAddress[]>;
export type WebhookHttpResult={status:number;retryAfter?:string;durationMs:number};

const blocked=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked.addSubnet(address,prefix,'ipv4');
for(const [address,prefix] of [['::',128],['::1',128],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32]] as const)blocked.addSubnet(address,prefix,'ipv6');

export function isPublicAddress(address:string){
  const mapped=/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  const normalized=mapped??address;const family=isIP(normalized);
  if(family===6){const first=Number.parseInt(normalized.split(':')[0]||'0',16);if(first<0x2000||first>0x3fff)return false;}
  return family!==0&&!blocked.check(normalized,family===4?'ipv4':'ipv6');
}

export async function resolveSafeWebhookUrl(rawUrl:string,resolver:Resolver=async hostname=>(await dnsLookup(hostname,{all:true,verbatim:true})).map(item=>({address:item.address,family:item.family as 4|6})),options:{allowHttp?:boolean;allowPrivateAddresses?:boolean}={}){
  let url:URL;try{url=new URL(rawUrl);}catch{throw new WebhookHttpError('INVALID_URL','Webhook URL is invalid',false);}
  if(url.username||url.password||!['https:','http:'].includes(url.protocol))throw new WebhookHttpError('INVALID_URL','Webhook URL is invalid',false);
  if(url.protocol!=='https:'&&!options.allowHttp)throw new WebhookHttpError('HTTPS_REQUIRED','Webhook URL must use HTTPS',false);
  let addresses:ResolvedAddress[];try{addresses=await resolver(url.hostname);}catch{throw new WebhookHttpError('DNS_FAILURE','Webhook hostname could not be resolved',true);}
  if(addresses.length===0)throw new WebhookHttpError('DNS_FAILURE','Webhook hostname returned no addresses',true);
  if(!options.allowPrivateAddresses&&addresses.some(item=>!isPublicAddress(item.address)))throw new WebhookHttpError('SSRF_BLOCKED','Webhook destination is not public',false);
  return{url,address:addresses[0]!};
}

export class WebhookHttpError extends Error{constructor(public code:string,message:string,public retryable:boolean){super(message);}}

export class WebhookHttpTransport{
  constructor(private options:{resolver?:Resolver;allowHttp?:boolean;allowPrivateAddresses?:boolean}={}){}
  async post(rawUrl:string,body:string,headers:Record<string,string>,timeoutMs:number):Promise<WebhookHttpResult>{
    const{url,address}=await resolveSafeWebhookUrl(rawUrl,this.options.resolver, this.options);const started=Date.now();
    return new Promise((resolve,reject)=>{
      const request=(url.protocol==='https:'?httpsRequest:httpRequest)(url,{method:'POST',headers:{...headers,'Content-Length':Buffer.byteLength(body)},lookup:(_hostname,_options,callback)=>callback(null,address.address,address.family),servername:url.hostname},response=>{
        response.resume();response.once('end',()=>resolve({status:response.statusCode??0,retryAfter:Array.isArray(response.headers['retry-after'])?response.headers['retry-after'][0]:response.headers['retry-after'],durationMs:Date.now()-started}));
      });
      request.setTimeout(timeoutMs,()=>request.destroy(new WebhookHttpError('TIMEOUT','Webhook request timed out',true)));
      request.once('error',error=>reject(error instanceof WebhookHttpError?error:new WebhookHttpError('NETWORK_ERROR',error.message,true)));
      request.end(body);
    });
  }
}

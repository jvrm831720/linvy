import {describe,expect,it} from 'vitest';
import {assertSourceReplaceable,isEligibleTarget,retryDelayMs} from '../src/domain.js';
import {decryptWebhookSecret,encryptWebhookSecret} from '../src/webhook-secret.js';
import {SandboxProvider} from '../src/provider.js';
describe('V0.2.1 hardening domain',()=>{
  it('requires same tenant, region and SIM type',()=>{const source={id:'src',organizationId:'a',region:'RJ',simType:'esim'};expect(isEligibleTarget(source,{id:'ok',organizationId:'a',region:'RJ',simType:'esim',status:'available'})).toBe(true);expect(isEligibleTarget(source,{id:'x',organizationId:'b',region:'RJ',simType:'esim',status:'available'})).toBe(false);expect(isEligibleTarget(source,{id:'x',organizationId:'a',region:'SP',simType:'esim',status:'available'})).toBe(false);});
  it('only replaces active or suspended sources',()=>{expect(()=>assertSourceReplaceable('available')).toThrow(/cannot be replaced/);expect(()=>assertSourceReplaceable('active')).not.toThrow();});
  it('uses capped exponential backoff',()=>{expect(retryDelayMs(1,1000)).toBe(1000);expect(retryDelayMs(4,1000)).toBe(8000);expect(retryDelayMs(20,1000)).toBe(60000);});
  it('encrypts webhook secrets with authenticated encryption',()=>{const key=Buffer.alloc(32,9);const encrypted=encryptWebhookSecret('whsec_private',key);expect(encrypted).not.toContain('whsec_private');expect(decryptWebhookSecret(encrypted,key)).toBe('whsec_private');expect(()=>decryptWebhookSecret(encrypted,Buffer.alloc(32,8))).toThrow();});
  it('deduplicates sandbox side effects by operation key',async()=>{const provider=new SandboxProvider();const one=await provider.activate({resourceId:'a',operationKey:'stable'});const two=await provider.activate({resourceId:'b',operationKey:'stable'});expect(two).toEqual(one);});
});

import{decryptSecret,encryptSecret}from'../secret-envelope.js';
export const encryptChannelCredentials=(value:Record<string,unknown>,key:Buffer)=>encryptSecret(JSON.stringify(value),key);
export const decryptChannelCredentials=(value:string,key:Buffer)=>JSON.parse(decryptSecret(value,key))as Record<string,unknown>;

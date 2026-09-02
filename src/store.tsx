import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { initialState } from './data';
import type { AppState, Line, LineStatus } from './types';

const KEY='linvy-demo-v1';
type Store = { state:AppState; setLineStatus:(id:string,status:LineStatus)=>void; replace:(sourceId:string,targetId:string,reason:string)=>{id:string;seconds:number}; reset:()=>void };
const Ctx=createContext<Store|null>(null);
const clone=()=>JSON.parse(JSON.stringify(initialState)) as AppState;
export function StoreProvider({children}:{children:ReactNode}){
 const [state,setState]=useState<AppState>(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'') as AppState}catch{return clone()}});
 const save=(next:AppState)=>{setState(next);localStorage.setItem(KEY,JSON.stringify(next))};
 const setLineStatus=(id:string,status:LineStatus)=>save({...state,lines:state.lines.map(l=>l.id===id?{...l,status}:l),audit:[{id:crypto.randomUUID(),type:'line',title:`Linha ${status==='active'?'reativada':'suspensa'}`,detail:id,time:'agora',actor:'Você'},...state.audit]});
 const replace=(sourceId:string,targetId:string,reason:string)=>{const source=state.lines.find(l=>l.id===sourceId)!;const target=state.lines.find(l=>l.id===targetId)!;const seconds=277;const rid=`REP-${String(state.replacements.length+104).padStart(4,'0')}`;const oid=`ORD-${Math.floor(9000+Math.random()*900)}`;const lines:Line[]=state.lines.map(l=>l.id===sourceId?{...l,status:'retired',personId:undefined,team:undefined,costCenter:undefined,device:undefined}:l.id===targetId?{...l,status:'active',personId:source.personId,team:source.team,costCenter:source.costCenter,device:source.device,activatedAt:'agora'}:l);save({...state,lines,incidents:state.incidents.map(i=>i.lineId===sourceId&&i.status!=='resolved'?{...i,status:'resolved',resolvedAt:'agora',duration:'4m 37s'}:i),orders:[{id:oid,operation:'REPLACE',provider:target.provider,source:sourceId,target:targetId,status:'completed',createdAt:'agora',completedAt:'agora'},...state.orders],replacements:[{id:rid,sourceLineId:sourceId,targetLineId:targetId,personId:source.personId,reason,status:'completed',durationSeconds:seconds,createdAt:new Date().toISOString()},...state.replacements],audit:[{id:crypto.randomUUID(),type:'replace',title:'Substituição concluída',detail:`${sourceId} → ${targetId} · 4m 37s`,time:'agora',actor:'Linvy'},{id:crypto.randomUUID(),type:'provider',title:'Provider confirmou ativação',detail:`${oid} · ${target.provider}`,time:'agora',actor:'Provider'},...state.audit]});return{id:rid,seconds}};
 const value=useMemo(()=>({state,setLineStatus,replace,reset:()=>{const n=clone();save(n)}}),[state]);return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useStore=()=>{const v=useContext(Ctx);if(!v)throw new Error('StoreProvider missing');return v};

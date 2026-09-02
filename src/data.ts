import type { AppState } from './types';

const people = [
  {id:'p1',name:'Carlos Souza',initials:'CS',role:'Técnico de campo',team:'Field Service RJ',email:'carlos.souza@acme.com',location:'Rio de Janeiro'},
  {id:'p2',name:'Fernanda Lima',initials:'FL',role:'Executiva de contas',team:'Vendas Sudeste',email:'fernanda.lima@acme.com',location:'São Paulo'},
  {id:'p3',name:'Rafael Alves',initials:'RA',role:'Supervisor operacional',team:'Operações SP',email:'rafael.alves@acme.com',location:'São Paulo'},
  {id:'p4',name:'Marina Costa',initials:'MC',role:'Analista de logística',team:'Logística RJ',email:'marina.costa@acme.com',location:'Rio de Janeiro'},
  {id:'p5',name:'Lucas Martins',initials:'LM',role:'Técnico de campo',team:'Field Service RJ',email:'lucas.martins@acme.com',location:'Rio de Janeiro'},
];

export const initialState: AppState = {
 people,
 lines:[
  {id:'LIN-2187',number:'+55 21 99999-1111',provider:'Vivo Empresas',providerColor:'#7557ff',status:'incident',plan:'Controle 30 GB',dataUsed:18.4,dataLimit:30,simType:'eSIM',iccid:'895501•••••••2187',eid:'890490•••••••0119',personId:'p1',team:'Field Service RJ',costCenter:'OPS-RJ-04',device:'Samsung Galaxy A55',region:'RJ'},
  {id:'LIN-8392',number:'+55 11 98876-8392',provider:'Vivo Empresas',providerColor:'#7557ff',status:'active',plan:'Controle 30 GB',dataUsed:8.2,dataLimit:30,simType:'eSIM',iccid:'895501•••••••8392',personId:'p2',team:'Vendas Sudeste',costCenter:'VEN-SP-02',device:'iPhone 15',region:'SP',activatedAt:'28 ago 2026'},
  {id:'LIN-4418',number:'+55 11 97732-4418',provider:'Claro Corp',providerColor:'#ea2330',status:'active',plan:'Empresas 20 GB',dataUsed:19.1,dataLimit:20,simType:'SIM físico',iccid:'895505•••••••4418',personId:'p3',team:'Operações SP',costCenter:'OPS-SP-01',device:'Motorola Edge 50',region:'SP'},
  {id:'LIN-6074',number:'+55 21 99654-6074',provider:'Vivo Empresas',providerColor:'#7557ff',status:'active',plan:'Controle 30 GB',dataUsed:12.7,dataLimit:30,simType:'eSIM',iccid:'895501•••••••6074',personId:'p4',team:'Logística RJ',costCenter:'LOG-RJ-02',device:'Samsung Galaxy S24',region:'RJ'},
  {id:'LIN-5521',number:'+55 21 98888-5521',provider:'Vivo Empresas',providerColor:'#7557ff',status:'available',plan:'Controle 30 GB',dataUsed:0,dataLimit:30,simType:'eSIM',iccid:'895501•••••••5521',region:'RJ'},
  {id:'LIN-5522',number:'+55 21 98888-5522',provider:'Vivo Empresas',providerColor:'#7557ff',status:'available',plan:'Controle 30 GB',dataUsed:0,dataLimit:30,simType:'eSIM',iccid:'895501•••••••5522',region:'RJ'},
  {id:'LIN-7730',number:'+55 11 96666-7730',provider:'Claro Corp',providerColor:'#ea2330',status:'available',plan:'Empresas 20 GB',dataUsed:0,dataLimit:20,simType:'SIM físico',iccid:'895505•••••••7730',region:'SP'},
  {id:'LIN-1190',number:'+55 21 97777-1190',provider:'Vivo Empresas',providerColor:'#7557ff',status:'suspended',plan:'Controle 15 GB',dataUsed:2.3,dataLimit:15,simType:'SIM físico',iccid:'895501•••••••1190',personId:'p5',team:'Field Service RJ',costCenter:'OPS-RJ-04',device:'Samsung Galaxy A34',region:'RJ'},
  {id:'LIN-9081',number:'+55 11 95555-9081',provider:'Claro Corp',providerColor:'#ea2330',status:'provisioning',plan:'Empresas 20 GB',dataUsed:0,dataLimit:20,simType:'eSIM',iccid:'895505•••••••9081',region:'SP'},
 ],
 incidents:[
  {id:'INC-291',lineId:'LIN-2187',title:'Conectividade indisponível',reason:'SIM/eSIM com falha',severity:'critical',status:'open',source:'Cliente',detectedAt:'Hoje, 23:41'},
  {id:'INC-287',lineId:'LIN-4418',title:'Franquia acima de 90%',reason:'Consumo elevado',severity:'warning',status:'investigating',source:'Linvy',detectedAt:'Hoje, 18:12'},
  {id:'INC-281',lineId:'LIN-1190',title:'Suspensão pelo provider',reason:'Falha administrativa',severity:'warning',status:'resolved',source:'Provider',detectedAt:'Ontem, 14:20',resolvedAt:'Ontem, 15:03',duration:'43 min'},
 ],
 orders:[{id:'ORD-8912',operation:'PROVISION',provider:'Claro Corp',source:'—',target:'LIN-9081',status:'waiting_provider',createdAt:'Hoje, 22:54'}],
 replacements:[],
 audit:[
  {id:'e1',type:'line',title:'Linha reativada',detail:'LIN-8392 · +55 11 98876-8392',time:'23:01',actor:'Ana Oliveira'},
  {id:'e2',type:'replace',title:'Substituição concluída',detail:'LIN-7210 → LIN-6074 · 4m 37s',time:'22:58',actor:'Linvy'},
  {id:'e3',type:'provider',title:'Provider confirmou provisionamento',detail:'ORD-8881 · Vivo Empresas',time:'22:57',actor:'Provider'},
  {id:'e4',type:'incident',title:'Incidente aberto',detail:'INC-291 · LIN-2187',time:'22:42',actor:'Carlos Souza'},
  {id:'e5',type:'person',title:'Responsável atribuído',detail:'Marina Costa → LIN-6074',time:'21:16',actor:'Ana Oliveira'},
 ]
};

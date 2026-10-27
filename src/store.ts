import type {Database} from './domain.js';
import {demoDatabase,emptyDatabase} from './seed.js';

/**
 * Two storage paths behind one API.
 *
 * - Live: the branch workspace in Postgres, reached through /api/state with a
 *   shared access key. Every write carries the revision it was based on, so a
 *   second device cannot silently overwrite the first.
 * - Offline: the original localStorage path, used when no database is
 *   configured or the API cannot be reached. It is labelled in the interface.
 */
export const STORAGE_KEY='bigbrew-branchwork-v1';
const DAMAGE_KEY=`${STORAGE_KEY}:unreadable`;
const ACCESS_KEY='bigbrew-branchwork-key';
const CONFIG_API='/api/config';
const STATE_API='/api/state';

export type SyncKind='connecting'|'live'|'local'|'saving'|'offline'|'error';
export interface SyncInfo{kind:SyncKind;detail:string;revision:number;updatedAt:string}
export class LockedError extends Error{}

let accessKey=readSessionKey();
let live=false;
let revision=0;
let info:SyncInfo={kind:'connecting',detail:'Checking where this workspace is stored',revision:0,updatedAt:''};
let queue:Promise<void>=Promise.resolve();
let remoteListener:((db:Database)=>void)|null=null;
const listeners=new Set<()=>void>();

function readSessionKey(){
 try{return sessionStorage.getItem(ACCESS_KEY)||'';}catch{return '';}
}
function setInfo(patch:Partial<SyncInfo>){
 info={...info,...patch};
 listeners.forEach(listener=>listener());
}
export const syncInfo=()=>info;
export function onSyncChange(listener:()=>void){
 listeners.add(listener);return ()=>{listeners.delete(listener);};
}
export function setAccessKey(value:string){
 accessKey=value.trim();
 try{
  if(accessKey)sessionStorage.setItem(ACCESS_KEY,accessKey);else sessionStorage.removeItem(ACCESS_KEY);
 }catch{/* private mode: the key lives for this page only */}
}
export function hasAccessKey(){return accessKey.length>0;}
export function onRemoteChange(listener:(db:Database)=>void){remoteListener=listener;}
export const isLive=()=>live;
export const currentRevision=()=>revision;

function isDatabase(value:unknown):value is Database {
 if(!value||typeof value!=='object')return false;
 const data=value as Partial<Database>;
 return data.version===1
  && (data.mode==='sample'||data.mode==='local'||data.mode==='live')
  && typeof data.branchName==='string'
  && Array.isArray(data.ingredients)
  && Array.isArray(data.orders)
  && Array.isArray(data.movements)
  && Array.isArray(data.employees)
  && Array.isArray(data.checklists)
  && Array.isArray(data.trainings)
  && !!data.costs && typeof data.costs==='object';
}
function preserve(raw:string){
 try{localStorage.setItem(`${DAMAGE_KEY}:${Date.now()}`,raw);}catch{/* storage may be full or disabled */}
}
export let storageIssue='';
function loadLocal():Database{
 let raw='';
 try {
  raw=localStorage.getItem(STORAGE_KEY)||'';
  if(!raw)return demoDatabase();
  const data:unknown=JSON.parse(raw);
  if(!isDatabase(data))throw Error('Invalid storage format');
  return data;
 }catch{
  if(raw)preserve(raw);
  storageIssue='Stored data was unreadable. A sample workspace is shown; the original record was kept under a separate backup key where storage allows.';
  return demoDatabase();
 }
}
function saveLocal(db:Database){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db));}
 catch{storageIssue='Browser storage is unavailable or full. Recent changes might not survive a refresh.';}
}

function workspaceError(payload:unknown,fallback:string){
 if(payload&&typeof payload==='object'&&'message' in payload&&typeof (payload as {message?:unknown}).message==='string'){
  return (payload as {message:string}).message;
 }
 return fallback;
}

async function readConfig(){
 const response=await fetch(CONFIG_API,{headers:{Accept:'application/json'},cache:'no-store'});
 if(!response.ok)throw Error('unavailable');
 return response.json() as Promise<{mode:'live'|'local';requiresKey:boolean;storage:string}>;
}

async function pull(){
 const headers:Record<string,string>={Accept:'application/json'};
 if(accessKey)headers['x-branchwork-key']=accessKey;
 const response=await fetch(STATE_API,{headers,cache:'no-store'});
 const payload=await response.json().catch(()=>null);
 if(response.status===401)throw new LockedError('This branch workspace needs its access key.');
 if(!response.ok)throw Error(workspaceError(payload,'The branch database did not answer.'));
 if(!payload||!isDatabase(payload.data))throw Error('The branch database returned an unreadable workspace.');
 return {database:payload.data as Database,revision:Number(payload.revision)||1,updatedAt:String(payload.updatedAt||'')};
}

/** First load. Falls back to the labelled offline workspace when the API is absent. */
export async function init():Promise<Database>{
 live=false;
 let config:{mode:'live'|'local';requiresKey:boolean;storage:string};
 try{
  config=await readConfig();
 }catch{
  const db=loadLocal();
  setInfo({kind:'local',detail:'Saved in this browser only',revision:0,updatedAt:''});
  return db;
 }
 if(config.mode!=='live'){
  const db=loadLocal();
  setInfo({kind:'local',detail:'No branch database configured',revision:0,updatedAt:''});
  return db;
 }
 if(config.requiresKey&&!accessKey)throw new LockedError('This branch workspace needs its access key.');
 let remote;
 try{
  remote=await pull();
 }catch(error){
  if(error instanceof LockedError)throw error;
  const db=loadLocal();
  setInfo({kind:'offline',detail:'Branch database unreachable — changes stay in this browser',revision:0,updatedAt:''});
  return db;
 }
 live=true;revision=remote.revision;
 setInfo({kind:'live',detail:'Synced to the branch database',revision:remote.revision,updatedAt:remote.updatedAt});
 return remote.database;
}

/** Load the newest server copy, if it is newer than what this tab has. */
export async function refresh():Promise<Database|null>{
 if(!live)return null;
 try{
  const remote=await pull();
  if(remote.revision<=revision)return null;
  revision=remote.revision;
  setInfo({kind:'live',detail:'Updated from another device',revision,updatedAt:remote.updatedAt});
  return remote.database;
 }catch(error){
  if(error instanceof LockedError){setInfo({kind:'error',detail:'Access key rejected — reload to unlock'});}
  else setInfo({kind:'error',detail:'Could not reach the branch database',revision,updatedAt:info.updatedAt});
  return null;
 }
}

async function push(db:Database){
 if(!live)return;
 setInfo({kind:'saving',detail:'Saving to the branch database'});
 try{
  const response=await fetch(STATE_API,{
   method:'PUT',
   headers:{'Content-Type':'application/json','x-branchwork-key':accessKey},
   body:JSON.stringify({revision,data:db}),
  });
  const payload=await response.json().catch(()=>null);
  if(response.status===409){
   const data=payload?.data;
   if(isDatabase(data)){
    revision=Number(payload.revision)||revision+1;
    setInfo({kind:'live',detail:'Another device saved first — this workspace caught up',revision,updatedAt:String(payload.updatedAt||'')});
    remoteListener?.(data);
    return;
   }
   setInfo({kind:'error',detail:'Save conflict — reload before editing',revision,updatedAt:info.updatedAt});
   return;
  }
  if(!response.ok){
   setInfo({kind:'error',detail:workspaceError(payload,'Changes are not saved to the branch database'),revision,updatedAt:info.updatedAt});
   return;
  }
  revision=Number(payload?.revision)||revision+1;
  setInfo({kind:'live',detail:'Saved to the branch database',revision,updatedAt:String(payload?.updatedAt||'')});
 }catch{
  setInfo({kind:'error',detail:'Offline — changes stay in this tab until the database answers',revision,updatedAt:info.updatedAt});
 }
}

/** Writes are serialised so two quick edits cannot send the same revision. */
export function save(db:Database){
 if(!live){saveLocal(db);setInfo({kind:'local',detail:'Saved in this browser only',revision:0,updatedAt:''});return;}
 queue=queue.then(()=>push(db)).catch(()=>{/* push reports its own failure */});
}

export function blank():Database {const db=emptyDatabase(live?'live':'local');save(db);return db;}
export function sample():Database {const db=demoDatabase();save(db);return db;}
export function exportData(db:Database){return JSON.stringify(db,null,2);}
export {loadLocal as load};

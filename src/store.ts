import type {Database} from './domain.js';
import {demoDatabase,emptyDatabase} from './seed.js';
export const STORAGE_KEY='bigbrew-branchwork-v1';
const DAMAGE_KEY=`${STORAGE_KEY}:unreadable`;
export let storageIssue='';
function isDatabase(value:unknown):value is Database {
  if(!value||typeof value!=='object')return false;
  const data=value as Partial<Database>;
  return data.version===1
    && (data.mode==='sample'||data.mode==='local')
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
export function load():Database{
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
export function save(db:Database){
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(db));storageIssue='';}
  catch {storageIssue='Browser storage is unavailable or full. Recent changes might not survive a refresh.';}
}
export function blank():Database {const db=emptyDatabase();save(db);return db;}
export function sample():Database {const db=demoDatabase();save(db);return db;}
export function exportData(db:Database){return JSON.stringify(db,null,2);}

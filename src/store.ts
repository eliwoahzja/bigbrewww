import type {Database} from './domain.js';
import {demoDatabase,emptyDatabase} from './seed.js';
const KEY='bigbrew-branchwork-v1';
export let storageIssue='';
export function load():Database{
  try {
   const raw=localStorage.getItem(KEY);
   if(!raw)return demoDatabase();
   const data=JSON.parse(raw) as Database;
   if(data.version!==1||!Array.isArray(data.ingredients)||!Array.isArray(data.orders)||!Array.isArray(data.movements)||!Array.isArray(data.employees)||!Array.isArray(data.checklists)||!Array.isArray(data.trainings)||!data.costs)throw Error('Invalid storage format');
   return data;
  }catch{storageIssue='Stored data was unreadable. A fresh demonstration workspace was loaded without overwriting the damaged record.';return demoDatabase();}
}
export function save(db:Database){
  try {localStorage.setItem(KEY,JSON.stringify(db));storageIssue='';}
  catch {storageIssue='Browser storage is unavailable or full. Recent changes might not survive a refresh.';}
}
export function blank():Database {const db=emptyDatabase();save(db);return db;}
export function sample():Database {const db=demoDatabase();save(db);return db;}
export function exportData(db:Database){return JSON.stringify(db,null,2);}

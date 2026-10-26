export type EmployeeRole = 'Manager'|'Staff'|'Supervisor';
export type StockAction = 'opening'|'receive'|'consume'|'waste'|'count';
export type OrderStatus = 'queued'|'verification'|'needs-fix'|'completed'|'cancelled';
export type Channel = 'Walk-in'|'Pickup'|'Delivery';
export type ChecklistType = 'Opening'|'Closing'|'Stock count'|'Order quality';
export type TrainingStatus = 'assigned'|'completed';
export interface Ingredient {id:string;name:string;category:string;unit:string;qty:number;min:number;unitCost:number;bestBefore:string;notes:string;archived:boolean;}
export interface StockMovement {id:string;ingredientId:string;action:StockAction;before:number;after:number;delta:number;note:string;actorId:string;at:string;unitCost:number;}
export interface Employee {id:string;name:string;role:EmployeeRole;active:boolean;}
export interface OrderLine {id:string;drink:string;qty:number;details:string;}
export interface Verification {id:string;actorId:string;at:string;passed:boolean;issueType:string;notes:string;}
export interface Order {id:string;code:string;channel:Channel;lines:OrderLine[];status:OrderStatus;createdAt:string;preparedBy:string;createdBy:string;verifications:Verification[];cancelReason:string;}
export interface ChecklistItem {id:string;label:string;done:boolean;}
export interface ChecklistRun {id:string;type:ChecklistType;items:ChecklistItem[];createdAt:string;completedAt:string;startedBy:string;completedBy:string;}
export interface Training {id:string;employeeId:string;moduleId:string;status:TrainingStatus;assignedAt:string;completedAt:string;}
export interface CostScenario {setup:number;training:number;monthlyTool:number;wasteSavings:number;refundSavings:number;addedMargin:number;}
export interface Database {version:1;mode:'sample'|'local';branchName:string;ingredients:Ingredient[];movements:StockMovement[];employees:Employee[];orders:Order[];checklists:ChecklistRun[];trainings:Training[];costs:CostScenario;}
export const trainingModules=[
  {id:'onboarding',name:'New staff onboarding',description:'Workstation setup, drink specifications, and shift responsibilities',level:'Foundation'},
  {id:'inventory',name:'Inventory handling & counts',description:'Stock receipts, counts, adjustment records, and waste controls',level:'Operations'},
  {id:'quality',name:'Order accuracy & cup sealing',description:'Double-checking modifiers, add-ons, drink labeling, and dispatch',level:'Quality'}
] as const;
export const templates:Record<ChecklistType,string[]>={
  'Opening':['Sanitize the preparation station','Check refrigerator and storage conditions','Review low-stock ingredients','Verify packaging and cup-lid supplies','Confirm equipment is ready for service'],
  'Closing':['Record remaining inventory and discrepancies','Log waste or expired ingredients','Clean drink-preparation equipment','Secure ingredients and supplies','Confirm station close-out is complete'],
  'Stock count':['Count each designated ingredient physically','Compare observed stock against the digital ledger','Record all count adjustments with a reason','Flag shortages or expiring stock for the next shift'],
  'Order quality':['Compare items and quantities to the order','Check customizations and requested add-ons','Inspect cup lid and seal','Confirm correct label and delivery packaging']
};
export const uid=()=>globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const now=()=>new Date().toISOString();
export const clamp2=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function nonnegative(v:unknown,label:string):number {
  const n=Number(v);
  if(v===null||v===undefined||String(v).trim()===''||!Number.isFinite(n)||n<0)throw Error(`${label} must be a valid non-negative number.`);
  return clamp2(n);
}
export function positive(v:unknown,label:string):number {
  const n=nonnegative(v,label);
  if(n<=0)throw Error(`${label} must be greater than zero.`);
  return n;
}
export function textRequired(v:unknown,label:string,max=100):string {
  const s=String(v??'').trim();
  if(!s||s.length>max)throw Error(`${label} is required and must be at most ${max} characters.`);
  return s;
}
export function stockChange(db:Database,id:string,action:StockAction,amount:number,note:string,actorId:string):Database {
  const item=db.ingredients.find(i=>i.id===id&&!i.archived);
  if(!item)throw Error('Ingredient was not found or is archived.');
  if(!Number.isFinite(amount)||amount<0)throw Error('Enter a valid stock quantity.');
  if(action!=='count'&&action!=='opening'&&amount===0)throw Error('Quantity must be greater than zero.');
  const after=clamp2(action==='count'?amount:item.qty+(action==='receive'||action==='opening'?amount:-amount));
  if(after<0)throw Error(`Insufficient stock. Available: ${item.qty} ${item.unit}.`);
  const movement:StockMovement={id:uid(),ingredientId:id,action,before:item.qty,after,delta:clamp2(after-item.qty),note,actorId,at:now(),unitCost:item.unitCost};
  return {...db,ingredients:db.ingredients.map(i=>i.id===id?{...i,qty:after}:i),movements:[movement,...db.movements]};
}
export function verifyOrder(db:Database,id:string,actorId:string,passed:boolean,issueType:string,notes:string):Database {
  const order=db.orders.find(o=>o.id===id);
  if(!order||order.status!=='verification')throw Error('Only orders awaiting verification can be checked.');
  if(actorId===order.preparedBy)throw Error('The verifier must be different from the preparer.');
  if(!db.employees.some(e=>e.id===actorId&&e.active))throw Error('Select an active employee to verify the order.');
  if(!passed&&!issueType)throw Error('Select an issue category for the failed check.');
  if(!passed&&!notes.trim())throw Error('Describe the issue before submitting a failed check.');
  const record:Verification={id:uid(),actorId,at:now(),passed,issueType:passed?'':issueType,notes};
  return {...db,orders:db.orders.map(o=>o.id===id?{...o,status:passed?'completed':'needs-fix',verifications:[...o.verifications,record]}:o)};
}
export function getStats(db:Database){
  const active=db.ingredients.filter(i=>!i.archived);
  const low=active.filter(i=>i.qty<=i.min);
  const verified=db.orders.filter(o=>o.verifications.length>0&&o.status!=='cancelled');
  const withIssues=verified.filter(o=>o.verifications.some(v=>!v.passed));
  const counts=db.movements.filter(m=>m.action==='count');
  const discrepancies=counts.filter(m=>m.delta!==0);
  const waste=db.movements.filter(m=>m.action==='waste');
  const wasteCost=clamp2(waste.reduce((s,m)=>s+(-m.delta*m.unitCost),0));
  const firstPass=verified.filter(o=>o.verifications[0]?.passed).length;
  return {low,verified:verified.length,withIssues:withIssues.length,errorRate:verified.length?clamp2(withIssues.length/verified.length*100):null,firstPassRate:verified.length?clamp2(firstPass/verified.length*100):null,counts:counts.length,discrepancies:discrepancies.length,wasteCost,openOrders:db.orders.filter(o=>!['cancelled','completed'].includes(o.status)).length,checklistsDone:db.checklists.filter(c=>!!c.completedAt).length};
}
export function forecast(c:CostScenario){
  const upfront=clamp2(c.setup+c.training);
  const monthlyBenefit=clamp2(c.wasteSavings+c.refundSavings+c.addedMargin);
  const monthlyNet=clamp2(monthlyBenefit-c.monthlyTool);
  const payback=monthlyNet>0?clamp2(upfront/monthlyNet):null;
  return {upfront,monthlyBenefit,monthlyNet,payback};
}
export function csv(rows:(string|number)[][]):string {
  return rows.map(r=>r.map(v=>{
    const raw=typeof v==='string'&&/^[\s]*[=+@-]/.test(v)?`'${v}`:String(v);
    return `"${raw.replaceAll('"','""')}"`;
  }).join(',')).join('\r\n');
}

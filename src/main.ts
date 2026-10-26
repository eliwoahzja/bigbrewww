import type {Database,Ingredient,Order,OrderLine,StockAction,EmployeeRole,ChecklistType} from './domain.js';
import {uid,now,nonnegative,positive,textRequired,stockChange,verifyOrder,csv,trainingModules,templates} from './domain.js';
import {appView,icon} from './views.js';
import type {Page,UIState} from './views.js';
import {load,save,blank,sample,exportData,storageIssue} from './store.js';

let db:Database=load();
let ui:UIState={page:'overview',search:'',filter:'all',modal:'',modalId:'',mobileOpen:false,actorId:db.employees.find(e=>e.active)?.id||''};
const root=document.getElementById('app');
if(!root)throw Error('App mount point is missing');
const app:HTMLElement=root;
let toastTimer:ReturnType<typeof setTimeout>|undefined;
function notify(message:string,isError=false){
 const elem=document.getElementById('toast');if(!elem)return;
 elem.innerHTML=`${icon(isError?'alert':'check',18)} <span>${message.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</span>`;
 elem.className=`toast show ${isError?'error':''}`;
 if(toastTimer)clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>{elem.classList.remove('show');},3900);
}
function render(resetScroll=false){
 const y=window.scrollY;
 app.innerHTML=appView(db,ui);
 document.body.classList.toggle('modal-active',!!ui.modal||ui.mobileOpen);
 if(resetScroll)window.scrollTo({top:0,behavior:'instant'});
 else window.scrollTo({top:y,behavior:'instant'});
 if(storageIssue)notify(storageIssue,true);
}
function commit(next:Database,message='Saved to this browser'){
 db=next;save(db);
 if(!db.employees.some(e=>e.id===ui.actorId&&e.active))ui.actorId=db.employees.find(e=>e.active)?.id||'';
 render();notify(message,!!storageIssue);
}
function open(kind:string,id=''){ui.modal=kind;ui.modalId=id;render();queueMicrotask(()=>document.querySelector<HTMLElement>('.modal-card input:not([type=hidden]),.modal-card select,.modal-card textarea,.modal-card button')?.focus());}
function close(){ui.modal='';ui.modalId='';render();document.getElementById('main-content')?.focus();}
function actor(){if(!ui.actorId||!db.employees.some(e=>e.id===ui.actorId&&e.active))throw Error('Add or select an active employee in the top bar first.');return ui.actorId;}
function download(name:string,mime:string,text:string){
 const blob=new Blob([text],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 notify(`${name} exported`);
}
function nextCode(){const ids=db.orders.map(o=>Number(o.code.split('-').pop())).filter(n=>Number.isFinite(n));return `BB-${Math.max(1000,...ids)+1}`;}
function fValue(form:HTMLFormElement,name:string){return String(new FormData(form).get(name)??'');}
function data(form:HTMLFormElement,name:string){return fValue(form,name).trim();}
function setError(form:HTMLFormElement,message:string){const el=form.querySelector<HTMLElement>('#form-error');if(el){el.textContent=message;el.hidden=false;}else notify(message,true);}
function ingredientsFromForm(form:HTMLFormElement,existing?:Ingredient):Ingredient{
 const name=textRequired(data(form,'name'),'Ingredient name');
 if(db.ingredients.some(i=>!i.archived&&i.name.toLowerCase()===name.toLowerCase()&&i.id!==existing?.id))throw Error('An active ingredient with this name already exists.');
 return {id:existing?.id||uid(),name,category:textRequired(data(form,'category'),'Category',60),unit:textRequired(data(form,'unit'),'Unit',20),qty:existing?.qty??nonnegative(data(form,'qty'),'Opening quantity'),min:nonnegative(data(form,'min'),'Reorder point'),unitCost:nonnegative(data(form,'unitCost'),'Unit cost'),bestBefore:data(form,'bestBefore'),notes:data(form,'notes').slice(0,250),archived:false};
}
function handleSubmit(form:HTMLFormElement){
 try{
  const kind=form.dataset.form||'';const id=ui.modalId;
  if(kind==='ingredient-add'){
   const by=actor();const i=ingredientsFromForm(form);
   const opening=i.qty>0?[{id:uid(),ingredientId:i.id,action:'opening' as const,before:0,after:i.qty,delta:i.qty,note:'Opening stock balance',actorId:by,at:now(),unitCost:i.unitCost}]:[];
   ui.modal='';commit({...db,ingredients:[...db.ingredients,i],movements:[...opening,...db.movements]},'Ingredient added');return;
  }
  if(kind==='ingredient-edit'){
   const current=db.ingredients.find(i=>i.id===id);if(!current)throw Error('Ingredient missing.');
   const updated=ingredientsFromForm(form,current);
   ui.modal='';commit({...db,ingredients:db.ingredients.map(i=>i.id===id?updated:i)},'Ingredient updated');return;
  }
  if(kind==='stock-move'){
   const action=data(form,'action') as StockAction;
   if(!['receive','consume','waste','count'].includes(action))throw Error('Invalid movement type.');
   const qty=action==='count'?nonnegative(data(form,'amount'),'Count'):positive(data(form,'amount'),'Quantity');
   const note=textRequired(data(form,'note'),'Movement reason',160);
   const next=stockChange(db,id,action,qty,note,actor());ui.modal='';commit(next,'Stock balance and movement saved');return;
  }
  if(kind==='archive-ingredient'){
   const i=db.ingredients.find(x=>x.id===id);if(!i)throw Error('Ingredient no longer exists.');
   ui.modal='';commit({...db,ingredients:db.ingredients.map(x=>x.id===id?{...x,archived:true}:x)},'Ingredient archived');return;
  }
  if(kind==='order-add'){
   const channel=data(form,'channel') as Order['channel'];if(!['Walk-in','Pickup','Delivery'].includes(channel))throw Error('Select a valid order channel.');
   const drinks=Array.from(form.querySelectorAll<HTMLInputElement>('input[name="drink[]"]'));
   const quantities=Array.from(form.querySelectorAll<HTMLInputElement>('input[name="qty[]"]'));
   const details=Array.from(form.querySelectorAll<HTMLInputElement>('input[name="details[]"]'));
   if(!drinks.length||drinks.length>20)throw Error('Include between 1 and 20 order lines.');
   const lines:OrderLine[]=drinks.map((d,index)=>{const raw=Number(quantities[index].value);if(!Number.isInteger(raw)||raw<1||raw>99)throw Error('Each line needs a quantity from 1 to 99.');return {id:uid(),drink:textRequired(d.value,'Drink name',80),qty:raw,details:(details[index]?.value||'').trim().slice(0,200)};});
   const createdBy=actor();const order:Order={id:uid(),code:nextCode(),channel,lines,status:'queued',createdAt:now(),createdBy,preparedBy:'',verifications:[],cancelReason:''};
   ui.modal='';commit({...db,orders:[order,...db.orders]},`${order.code} created`);return;
  }
  if(kind==='order-verify'){
   const checks=[0,1,2,3].map(n=>(form.elements.namedItem(`check-${n}`) as HTMLInputElement|null)?.checked===true);
   const passed=data(form,'result')==='pass';
   if(passed&&!checks.every(Boolean))throw Error('Confirm all four checks to pass the order, or select a failed result.');
   const issue=passed?'':data(form,'issue');
   const notes=data(form,'notes');
   const next=verifyOrder(db,id,actor(),passed,issue,notes);
   ui.modal='';commit(next,passed?'Order verified and completed':'Issue logged. Order returned for correction');return;
  }
  if(kind==='order-cancel'){
   const reason=textRequired(data(form,'reason'),'Cancellation reason',240);
   ui.modal='';commit({...db,orders:db.orders.map(o=>o.id===id&&o.status!=='completed'?{...o,status:'cancelled',cancelReason:reason}:o)},'Order cancelled');return;
  }
  if(kind==='employee-add'||kind==='employee-edit'){
   const name=textRequired(data(form,'name'),'Employee name',80);const role=data(form,'role') as EmployeeRole;
   if(!['Manager','Staff','Supervisor'].includes(role))throw Error('Invalid employee role.');
   if(kind==='employee-add'){
    const employee={id:uid(),name,role,active:true};ui.modal='';commit({...db,employees:[...db.employees,employee]},'Employee added');return;
   }
   const emp=db.employees.find(e=>e.id===id);if(!emp)throw Error('Employee missing.');
   const active=data(form,'active')==='yes';
   ui.modal='';commit({...db,employees:db.employees.map(e=>e.id===id?{...e,name,role,active}:e)},'Employee updated');return;
  }
  if(kind==='training-assign'){
   const employeeId=data(form,'employeeId');const moduleId=data(form,'moduleId');
   if(!db.employees.some(e=>e.id===employeeId&&e.active)||!trainingModules.some(m=>m.id===moduleId))throw Error('Choose a valid employee and module.');
   if(db.trainings.some(t=>t.employeeId===employeeId&&t.moduleId===moduleId&&t.status==='assigned'))throw Error('The employee already has an open assignment for this module.');
   const assignment={id:uid(),employeeId,moduleId,status:'assigned' as const,assignedAt:now(),completedAt:''};
   ui.modal='';commit({...db,trainings:[assignment,...db.trainings]},'Training assigned');return;
  }
  if(kind==='scenario'){
   const fields=['setup','training','monthlyTool','wasteSavings','refundSavings','addedMargin'] as const;
   const costs={...db.costs};for(const name of fields)costs[name]=nonnegative(data(form,name),name);
   commit({...db,costs},'Scenario assumptions updated');return;
  }
  if(kind==='confirm-blank'){
   ui.modal='';db=blank();ui.actorId='';ui.page='overview';ui.search='';ui.filter='all';render(true);notify('Empty workspace started');return;
  }
  if(kind==='confirm-sample'){
   ui.modal='';db=sample();ui.actorId=db.employees[0]?.id||'';ui.page='overview';ui.search='';ui.filter='all';render(true);notify('Example workspace loaded');return;
  }
  throw Error('This form action is unsupported.');
 }catch(err){setError(form,err instanceof Error?err.message:'Unable to save the record.');}
}
function clickHandler(event:MouseEvent){
 const t=event.target as HTMLElement;
 if(t.classList.contains('modal-overlay')){close();return;}
 const el=t.closest<HTMLElement>('[data-action]');if(!el)return;
 const action=el.dataset.action||'';const id=el.dataset.id||'';
 try{
  if(action==='nav'){ui.page=(el.dataset.page||'overview') as Page;ui.search='';ui.filter='all';ui.mobileOpen=false;ui.modal='';render(true);return;}
  if(action==='mobile-toggle'){ui.mobileOpen=!ui.mobileOpen;render();return;}
  if(action==='close-modal'){close();return;}
  if(action==='set-filter'){ui.filter=el.dataset.filter||'all';render();return;}
  if(action==='go-inventory'||action==='go-checklists'||action==='go-orders'){
   ui.page=action==='go-inventory'?'inventory':action==='go-checklists'?'checklists':'orders';ui.filter='all';ui.search='';ui.modal='';render(true);return;
  }
  if(action==='add-ingredient'){actor();open('ingredient-add');return;}
  if(action==='move-stock'){actor();open('stock-move',id);return;}
  if(action==='edit-ingredient'){open('ingredient-edit',id);return;}
  if(action==='history-stock'){open('stock-history',id);return;}
  if(action==='archive-prompt'){open('archive-confirm',id);return;}
  if(action==='new-order'){actor();open('order-add');return;}
  if(action==='verify-order'){actor();open('order-verify',id);return;}
  if(action==='view-order'){open('order-detail',id);return;}
  if(action==='cancel-prompt'){open('order-cancel',id);return;}
  if(action==='prepare-order'){
   const o=db.orders.find(o=>o.id===id);if(!o||!['queued','needs-fix'].includes(o.status))throw Error('Order is not waiting for preparation.');
   const by=actor();ui.modal='';commit({...db,orders:db.orders.map(order=>order.id===id?{...order,preparedBy:by,status:'verification'}:order)},'Order is ready for a separate verifier');return;
  }
  if(action==='add-order-line'){
   const el=document.getElementById('line-items');if(!el)return;
   if(el.querySelectorAll('.line-fields').length>=20)throw Error('Maximum 20 order lines.');
   const row=document.createElement('div');row.className='line-fields';row.innerHTML=`<label>Drink / product<input name="drink[]" maxlength="80" required placeholder="e.g. Coffee"></label><label>Qty<input name="qty[]" type="number" min="1" max="99" step="1" required value="1"></label><label>Customizations / toppings<input name="details[]" maxlength="200" placeholder="Special request"></label><button type="button" data-action="remove-order-line" class="remove-line" aria-label="Remove order line">${icon('close',16)}</button>`;
   el.append(row);row.querySelector('input')?.focus();return;
  }
  if(action==='remove-order-line'){el.closest('.line-fields')?.remove();return;}
  if(action==='start-checklist'){
   const type=el.dataset.kind as ChecklistType;if(!templates[type])throw Error('Unknown checklist template.');
   const run={id:uid(),type,items:templates[type].map(label=>({id:uid(),label,done:false})),createdAt:now(),completedAt:'',startedBy:actor(),completedBy:''};
   commit({...db,checklists:[run,...db.checklists]},`${type} checklist started`);return;
  }
  if(action==='complete-checklist'){
   const run=db.checklists.find(c=>c.id===id);if(!run||!!run.completedAt||run.items.some(i=>!i.done))throw Error('Complete all checklist steps before signing off.');
   const by=actor();commit({...db,checklists:db.checklists.map(r=>r.id===id?{...r,completedAt:now(),completedBy:by}:r)},'Checklist completed and signed off');return;
  }
  if(action==='add-employee'){open('employee-add');return;}
  if(action==='edit-employee'){open('employee-edit',id);return;}
  if(action==='assign-training'){
   if(!db.employees.some(e=>e.active))throw Error('Add an active employee before assigning training.');
   open('training-assign');return;
  }
  if(action==='complete-training'){
   const assignment=db.trainings.find(t=>t.id===id);if(!assignment||assignment.status!=='assigned')throw Error('Assignment is not open.');
   actor();commit({...db,trainings:db.trainings.map(t=>t.id===id?{...t,status:'completed',completedAt:now()}:t)},'Training marked complete');return;
  }
  if(action==='confirm-blank'||action==='confirm-sample'){open(action);return;}
  if(action==='export-json'){download('branchwork-backup.json','application/json',exportData(db));return;}
  if(action==='export-stock'){
   const rows:[string,...Array<string|number>][]=[['Date','Ingredient','Movement','Before','After','Change','Unit','Recorded unit cost PHP','Reason','Recorded by']];
   db.movements.forEach(m=>{const ing=db.ingredients.find(i=>i.id===m.ingredientId);rows.push([m.at,ing?.name||m.ingredientId,m.action,m.before,m.after,m.delta,ing?.unit||'',m.unitCost,m.note,db.employees.find(e=>e.id===m.actorId)?.name||m.actorId]);});
   download('branchwork-stock-ledger.csv','text/csv;charset=utf-8',csv(rows));return;
  }
  if(action==='export-orders'){
   const rows:[string,...Array<string|number>][]=[['Order code','Created','Channel','Status','Items','Prepared by','Verification attempts','Failed checks','Cancellation reason']];
   db.orders.forEach(o=>rows.push([o.code,o.createdAt,o.channel,o.status,o.lines.map(l=>`${l.qty}x ${l.drink} (${l.details})`).join(' | '),db.employees.find(e=>e.id===o.preparedBy)?.name||'',o.verifications.length,o.verifications.filter(v=>!v.passed).length,o.cancelReason]));
   download('branchwork-orders.csv','text/csv;charset=utf-8',csv(rows));return;
  }
 }catch(err){notify(err instanceof Error?err.message:'This action did not complete.',true);}
}
app.addEventListener('click',clickHandler);
app.addEventListener('submit',event=>{const form=(event.target as HTMLElement).closest<HTMLFormElement>('form[data-form]');if(form){event.preventDefault();handleSubmit(form);}});
app.addEventListener('input',event=>{
 const target=event.target as HTMLInputElement;
 if(target.id==='page-search'){
  ui.search=target.value;const pos=target.selectionStart;
  render();const input=document.getElementById('page-search') as HTMLInputElement|null;
  if(input){input.focus();if(pos!==null)try{input.setSelectionRange(pos,pos);}catch{/* search type unsupported */}}
 }
});
app.addEventListener('change',event=>{
 const input=event.target as HTMLInputElement;
 if(input.id==='operator'){ui.actorId=input.value;render();return;}
 if(input.matches('input[data-check]')){
  const id=input.dataset.check,itemId=input.dataset.item;
  const run=db.checklists.find(c=>c.id===id);if(!run||!!run.completedAt)return;
  const updated=db.checklists.map(c=>c.id===id?{...c,items:c.items.map(i=>i.id===itemId?{...i,done:input.checked}:i)}:c);
  db={...db,checklists:updated};save(db);render();
 }
});
document.addEventListener('keydown',event=>{
 if(ui.modal&&event.key==='Tab'){
   const modal=document.querySelector('.modal-card');
   const focusable=Array.from(modal?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')||[]).filter(x=>x.getClientRects().length>0);
   if(focusable.length){const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 }
 if(event.key==='Escape'&&(ui.modal||ui.mobileOpen)){ui.modal='';ui.mobileOpen=false;render();}
});
render();
// Simple external test hook with non-mutating operational summaries only.
Object.defineProperty(window,'__branchworkDiagnostics',{value:()=>({mode:db.mode,ingredients:db.ingredients.length,orders:db.orders.length,checklists:db.checklists.length,trainings:db.trainings.length,activeOperator:ui.actorId,storedMovements:db.movements.length}),configurable:false});

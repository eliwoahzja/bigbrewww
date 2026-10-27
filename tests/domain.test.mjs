import test from 'node:test';
import assert from 'node:assert/strict';
import {demoDatabase,emptyDatabase} from '../dist/seed.js';
import {stockChange,verifyOrder,getStats,forecast,csv,positive,nonnegative,createOrder,prepareOrder,cancelOrder,startChecklist,toggleChecklistItem,completeChecklist,assignTraining,completeTraining,nextOrderCode} from '../dist/domain.js';

test('demo records are clearly flagged as samples',()=>{
 const demo=demoDatabase(),empty=emptyDatabase();
 assert.equal(demo.mode,'sample');assert.equal(empty.mode,'local');
 assert.equal(empty.orders.length,0);assert.equal(empty.ingredients.length,0);
});
test('stock receipts and waste affect balances and keep audit history',()=>{
 const db=demoDatabase(),item=db.ingredients[0];
 const receipt=stockChange(db,item.id,'receive',2.5,'Delivery','st-a');
 assert.equal(receipt.ingredients[0].qty,11);
 assert.equal(receipt.movements[0].delta,2.5);
 const waste=stockChange(receipt,item.id,'waste',1.2,'Expired','st-a');
 assert.equal(waste.ingredients[0].qty,9.8);
 assert.equal(waste.movements[0].unitCost,item.unitCost);
 assert.equal(waste.movements.length,db.movements.length+2);
 assert.equal(db.ingredients[0].qty,item.qty,'original database should be unchanged');
});
test('stock counts capture signed discrepancy, zero allowed, negative stock rejected',()=>{
 const db=demoDatabase(),item=db.ingredients[0];
 const next=stockChange(db,item.id,'count',0,'Count verified','st-a');
 assert.equal(next.ingredients[0].qty,0);
 assert.equal(next.movements[0].delta,-item.qty);
 assert.throws(()=>stockChange(db,item.id,'consume',999,'sale','st-a'),/Insufficient stock/);
 assert.throws(()=>stockChange(db,item.id,'waste',0,'waste','st-a'),/greater than zero/);
});
test('verifier must be distinct and completion needs awaiting-verification status',()=>{
 const db=demoDatabase();
 assert.throws(()=>verifyOrder(db,'ord-1','st-b',true,'',''),/different from/);
 const checked=verifyOrder(db,'ord-1','st-a',true,'','');
 assert.equal(checked.orders.find(o=>o.id==='ord-1').status,'completed');
 assert.equal(checked.orders.find(o=>o.id==='ord-1').verifications.length,1);
 assert.throws(()=>verifyOrder(checked,'ord-1','st-a',true,'',''),/awaiting verification/);
});
test('failed verification is recorded and contributes to error rate',()=>{
 const db=demoDatabase();
 const checked=verifyOrder(db,'ord-1','st-a',false,'Missing topping','Pearls absent');
 assert.equal(checked.orders.find(o=>o.id==='ord-1').status,'needs-fix');
 const stats=getStats(checked);
 assert.equal(stats.verified,2);
 assert.equal(stats.withIssues,1);
 assert.equal(stats.errorRate,50);
 assert.equal(stats.firstPassRate,50);
});
test('scenario payback uses only saved scenario input',()=>{
 assert.deepEqual(forecast({setup:500,training:300,monthlyTool:100,wasteSavings:250,refundSavings:200,addedMargin:50}),{upfront:800,monthlyBenefit:500,monthlyNet:400,payback:2});
 assert.equal(forecast({setup:0,training:0,monthlyTool:0,wasteSavings:0,refundSavings:0,addedMargin:0}).payback,null);
});
test('multi-item order keeps every line and prepares through a separate actor',()=>{
 const db=demoDatabase();
 const next=createOrder(db,'Pickup',[{drink:'Milk tea',qty:'2',details:'Less ice'},{drink:'Coffee',qty:1,details:''}],'st-b');
 const order=next.orders[0];
 assert.equal(order.code,nextOrderCode(db.orders));
 assert.equal(order.status,'queued');
 assert.equal(order.lines.length,2);
 assert.equal(order.lines[0].qty,2);
 assert.equal(order.lines[1].details,'');
 const prepared=prepareOrder(next,order.id,'st-b');
 assert.equal(prepared.orders[0].status,'verification');
 assert.equal(prepared.orders[0].preparedBy,'st-b');
 assert.throws(()=>prepareOrder(prepared,order.id,'st-b'),/waiting for preparation/);
});

test('a failed check returns the order for correction, then a new check completes it',()=>{
 const db=demoDatabase();
 const failed=verifyOrder(db,'ord-1','st-a',false,'Seal','Lid not sealed');
 assert.equal(failed.orders.find(o=>o.id==='ord-1').status,'needs-fix');
 const corrected=prepareOrder(failed,'ord-1','st-b');
 assert.equal(corrected.orders.find(o=>o.id==='ord-1').status,'verification');
 assert.throws(()=>verifyOrder(corrected,'ord-1','st-b',true,'',''),/different from/);
 const passed=verifyOrder(corrected,'ord-1','st-a',true,'','');
 const order=passed.orders.find(o=>o.id==='ord-1');
 assert.equal(order.status,'completed');
 assert.equal(order.verifications.length,2);
 assert.equal(order.verifications[1].passed,true);
 const stats=getStats(passed);
 assert.equal(stats.errorRate,50,'history keeps the earlier failure');
 assert.equal(stats.firstPassRate,50,'first-check result is not rewritten by the later pass');
});

test('cancellation requires a reason and is refused after completion',()=>{
 const db=demoDatabase();
 assert.throws(()=>cancelOrder(db,'ord-1','  '),/required/);
 const cancelled=cancelOrder(db,'ord-1','Customer left');
 assert.equal(cancelled.orders.find(o=>o.id==='ord-1').status,'cancelled');
 assert.equal(cancelled.orders.find(o=>o.id==='ord-1').cancelReason,'Customer left');
 assert.throws(()=>cancelOrder(cancelled,'ord-1','again'),/cannot be cancelled/);
 assert.throws(()=>cancelOrder(db,'ord-2','too late'),/cannot be cancelled/);
 assert.equal(getStats(cancelled).verified,1,'cancelled orders leave the verified denominator');
});

test('checklist needs every step and a valid sign-off actor',()=>{
 const db=demoDatabase();
 assert.throws(()=>startChecklist(db,'Unknown','st-a'),/Unknown/);
 const started=startChecklist(db,'Opening','st-b');
 const run=started.checklists[0];
 assert.equal(run.items.every(i=>!i.done),true);
 assert.throws(()=>completeChecklist(started,run.id,'st-a'),/Complete all checklist steps/);
 const partial=toggleChecklistItem(started,run.id,run.items[0].id,true);
 assert.equal(partial.checklists[0].items[0].done,true);
 assert.equal(partial.checklists[0].items[1].done,false);
 assert.throws(()=>toggleChecklistItem(partial,'missing',run.items[0].id,true),/cannot be changed/);
 const ready=run.items.reduce((acc,item)=>toggleChecklistItem(acc,run.id,item.id,true),started);
 assert.throws(()=>completeChecklist(ready,run.id,'st-missing'),/active employee/);
 const signed=completeChecklist(ready,run.id,'st-a');
 assert.ok(signed.checklists[0].completedAt);
 assert.equal(signed.checklists[0].completedBy,'st-a');
 assert.equal(getStats(signed).checklistsDone,1);
 assert.throws(()=>toggleChecklistItem(signed,run.id,run.items[0].id,false),/cannot be changed/);
});

test('training assignment is unique per open module and can be completed once',()=>{
 const db=demoDatabase();
 assert.throws(()=>assignTraining(db,'st-a','nope'),/valid active employee/);
 assert.throws(()=>assignTraining(db,'st-c','quality'),/already has an open assignment/);
 const assigned=assignTraining(db,'st-a','quality');
 assert.equal(assigned.trainings.length,db.trainings.length+1);
 assert.equal(assigned.trainings[0].status,'assigned');
 const done=completeTraining(assigned,assigned.trainings[0].id);
 assert.equal(done.trainings[0].status,'completed');
 assert.ok(done.trainings[0].completedAt);
 assert.throws(()=>completeTraining(done,done.trainings[0].id),/not open/);
});

test('stock ledger records the actor and previous balance for every movement',()=>{
 const db=demoDatabase(),item=db.ingredients[1];
 const next=stockChange(db,item.id,'consume',0.25,'Service use','st-b');
 const latest=next.movements[0];
 assert.equal(latest.action,'consume');
 assert.equal(latest.before,item.qty);
 assert.equal(latest.after,item.qty-0.25);
 assert.equal(latest.actorId,'st-b');
 assert.equal(latest.at.length>0,true);
 assert.throws(()=>stockChange(db,'missing','receive',1,'x','st-a'),/not found/);
 assert.throws(()=>stockChange(db,item.id,'receive',1,'x','st-missing'),/active employee/);
});

test('local storage round-trips the schema and quarantines unreadable data',async()=>{
 const memory=new Map();
 globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
 const store=await import('../dist/store.js');
 const empty=store.blank();
 assert.equal(empty.mode,'local');
 assert.equal(store.load().mode,'local');
 const sample=store.sample();
 assert.equal(sample.mode,'sample');
 assert.equal(store.load().orders.length,sample.orders.length);
 memory.set(store.STORAGE_KEY,'{not json');
 const recovered=store.load();
 assert.equal(recovered.mode,'sample');
 assert.ok([...memory.keys()].some(k=>k.includes('unreadable')),'unreadable payload is preserved for recovery');
 assert.ok(store.storageIssue.length>0);
 memory.set(store.STORAGE_KEY,JSON.stringify({version:99}));
 assert.equal(store.load().mode,'sample');
 assert.equal(JSON.parse(store.exportData(sample)).version,1);
 delete globalThis.localStorage;
});

test('number validation and CSV quote escaping',()=>{
 assert.throws(()=>positive('0','Quantity'),/greater than zero/);
 assert.throws(()=>nonnegative('Infinity','Quantity'),/non-negative/);
 assert.equal(csv([['Hello, "world"',1]]),'"Hello, ""world""","1"');
 assert.equal(csv([['=SUM(1,2)']]), `"'=SUM(1,2)"`);
});

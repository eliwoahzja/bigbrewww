import test from 'node:test';
import assert from 'node:assert/strict';
import {demoDatabase,emptyDatabase} from '../dist/seed.js';
import {stockChange,verifyOrder,getStats,forecast,csv,positive,nonnegative} from '../dist/domain.js';

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
test('number validation and CSV quote escaping',()=>{
 assert.throws(()=>positive('0','Quantity'),/greater than zero/);
 assert.throws(()=>nonnegative('Infinity','Quantity'),/non-negative/);
 assert.equal(csv([['Hello, "world"',1]]),'"Hello, ""world""","1"');
 assert.equal(csv([['=SUM(1,2)']]), `"'=SUM(1,2)"`);
});

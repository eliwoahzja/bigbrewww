<?php
declare(strict_types=1);
require dirname(__DIR__).'/app/validation.php';
require dirname(__DIR__).'/app/auth.php';
date_default_timezone_set('Asia/Manila');
$cases=[
 ['date today', valid_date(date('Y-m-d'))],
 ['date future rejected',!valid_date(date('Y-m-d',strtotime('+1 day')))],
 ['date invalid leap rejected',!valid_date('2025-02-29')],
 ['date leap accepted',valid_date('2024-02-29')],
 ['date malformed',!valid_date('26-10-27')],
 ['money zero allowed',valid_money('0')],
 ['positive money required',!valid_money('0',false)],
 ['money decimals bound',!valid_money('1.999')],
 ['money negative refused',!valid_money('-1')],
 ['money scientific notation refused',!valid_money('1e3')],
 ['shift valid',valid_shift('opening')&&valid_shift('mid')&&valid_shift('closing')],
 ['shift invalid',!valid_shift('night')],
 ['shift opening default',current_shift(new DateTimeImmutable('2026-01-01 06:00:00'))==='opening' && current_shift(new DateTimeImmutable('2026-01-01 11:59:59'))==='opening'],
 ['shift mid default',current_shift(new DateTimeImmutable('2026-01-01 12:00:00'))==='mid' && current_shift(new DateTimeImmutable('2026-01-01 17:59:59'))==='mid'],
 ['shift closing default',current_shift(new DateTimeImmutable('2026-01-01 18:00:00'))==='closing' && current_shift(new DateTimeImmutable('2026-01-01 05:59:59'))==='closing'],
 ['notes limits',valid_notes(str_repeat('a',2000))&&!valid_notes(str_repeat('a',2001))],
 ['username valid',valid_username('manager_01')],
 ['username invalid',!valid_username('../manager')],
 ['password minimum',valid_password(str_repeat('a',8))&&!valid_password(str_repeat('a',7))],
 ['inventory good',valid_inventory(['item_name'=>'Milk','category'=>'Dairy','quantity'=>'2.50','unit'=>'L','par_level'=>'5','unit_cost'=>'45.90'])===null],
 ['inventory missing unit',valid_inventory(['item_name'=>'Milk','category'=>'Dairy','quantity'=>'2','unit'=>'','par_level'=>'5','unit_cost'=>'45'])!==null],
 ['inventory negative quantity',valid_inventory(['item_name'=>'Milk','category'=>'Dairy','quantity'=>'-1','unit'=>'L','par_level'=>'5','unit_cost'=>'45'])!==null],
 ['sale positive',valid_sale(['sale_date'=>date('Y-m-d'),'amount'=>'30.25','notes'=>'Walk-in'])===null],
 ['sale future rejected',valid_sale(['sale_date'=>date('Y-m-d',strtotime('+1 day')),'amount'=>'30','notes'=>''])!==null],
 ['sale zero rejected',valid_sale(['sale_date'=>date('Y-m-d'),'amount'=>'0','notes'=>''])!==null],
 ['sale notes limited',valid_sale(['sale_date'=>date('Y-m-d'),'amount'=>'1','notes'=>str_repeat('a',256)])!==null],
 ['sale notes truncated',sales_notes(str_repeat('a',300))===str_repeat('a',255)],
 ['sale notes Unicode truncation',sales_notes(str_repeat('é',300))===str_repeat('é',255)],
 ['sale Unicode notes accepted',valid_sale(['sale_date'=>date('Y-m-d'),'amount'=>'1','notes'=>str_repeat('é',255)])===null],
 ['sale empty notes',sales_notes('   ')===''],
 ['handover accepted',valid_shift_entry(['shift_date'=>date('Y-m-d'),'shift_type'=>'closing','notes'=>'Chiller checked.'])===null],
 ['handover blank rejected',valid_shift_entry(['shift_date'=>date('Y-m-d'),'shift_type'=>'closing','notes'=>'   '])!==null],
 ['output escaped',esc('<script>')==='&lt;script&gt;'],
 ['password hashing',password_verify('secure-password',password_hash('secure-password',PASSWORD_BCRYPT))],
];
$failed=0;foreach($cases as [$label,$ok]){echo ($ok?'PASS':'FAIL')." $label\n";if(!$ok)$failed++;}echo count($cases)-$failed.'/'.count($cases)." passed\n";exit($failed?1:0);

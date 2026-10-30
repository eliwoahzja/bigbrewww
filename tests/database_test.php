<?php
declare(strict_types=1);
require dirname(__DIR__).'/app/database.php';
require dirname(__DIR__).'/app/validation.php';
date_default_timezone_set('Asia/Manila');
$pdo=db();
$passed=0;
$failed=0;
function check_database(string $label, bool $condition): void {
    global $passed,$failed;
    echo ($condition?'PASS':'FAIL').' '.$label.PHP_EOL;
    if ($condition) $passed++; else $failed++;
}
function rejects_database(callable $operation): bool {
    try { $operation(); return false; } catch (PDOException $error) { return true; }
}
$version=(string)$pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
check_database('MySQL 8 engine',strpos($version,'8.')===0 && stripos($version,'MariaDB')===false);
$pdo->beginTransaction();
try {
    $name='test_'.bin2hex(random_bytes(8));
    execute_sql('INSERT INTO users(username,password,role) VALUES(?,?,?)',[$name,password_hash('testpass',PASSWORD_BCRYPT),'staff']);
    $userId=(int)$pdo->lastInsertId();
    execute_sql('INSERT INTO inventory(item_name,category,quantity,unit,par_level,unit_cost) VALUES(?,?,?,?,?,?)',[$name,'Test','2.50','L','5.00','10.00']);
    $itemId=(int)$pdo->lastInsertId();
    $item=query_one('SELECT quantity-par_level AS variance,quantity<=par_level AS low_stock FROM inventory WHERE id=?',[$itemId]);
    check_database('Stock variance from par',(string)$item['variance']==='-2.50');
    check_database('Below-par alert',(int)$item['low_stock']===1);
    execute_sql('UPDATE inventory SET quantity=par_level WHERE id=?',[$itemId]);
    check_database('At-par alert',(int)query_one('SELECT quantity<=par_level AS low_stock FROM inventory WHERE id=?',[$itemId])['low_stock']===1);
    check_database('Negative stock rejected',rejects_database(fn()=>execute_sql('UPDATE inventory SET quantity=-1 WHERE id=?',[$itemId])));
    $today=date('Y-m-d');
    $yesterday=date('Y-m-d',strtotime('-1 day'));
    $notes=sales_notes(str_repeat('é',300));
    execute_sql('INSERT INTO sales(sale_date,amount,notes,created_by) VALUES(?,?,?,?)',[$today,'29.00',$notes,$userId]);
    $saleId=(int)$pdo->lastInsertId();
    execute_sql('INSERT INTO sales(sale_date,amount,notes,created_by) VALUES(?,?,?,?)',[$yesterday,'39.00','Test',$userId]);
    check_database('Unicode sales notes stored',query_one('SELECT notes FROM sales WHERE id=?',[$saleId])['notes']===str_repeat('é',255));
    $total=query_one('SELECT SUM(amount) AS total,COUNT(*) AS entries FROM sales WHERE created_by=? AND sale_date BETWEEN ? AND ?',[$userId,$today,$today]);
    check_database('Date-filtered sales totals',(string)$total['total']==='29.00' && (int)$total['entries']===1);
    check_database('Zero sale rejected',rejects_database(fn()=>execute_sql('INSERT INTO sales(sale_date,amount,created_by) VALUES(?,?,?)',[$today,'0',$userId])));
    execute_sql('INSERT INTO shift_logs(user_id,shift_date,shift_type,notes) VALUES(?,?,?,?)',[$userId,$today,'mid','Test handover']);
    check_database('Shift author deletion restricted',rejects_database(fn()=>execute_sql('DELETE FROM users WHERE id=?',[$userId])));
    execute_sql('DELETE FROM shift_logs WHERE user_id=?',[$userId]);
    execute_sql('DELETE FROM users WHERE id=?',[$userId]);
    check_database('Sale author set null on delete',query_one('SELECT created_by FROM sales WHERE id=?',[$saleId])['created_by']===null);
} finally {
    if ($pdo->inTransaction()) $pdo->rollBack();
}
echo $passed.'/'.($passed+$failed).' passed; test data rolled back.'.PHP_EOL;
exit($failed?1:0);

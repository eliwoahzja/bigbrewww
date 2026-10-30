<?php
require dirname(__DIR__).'/app/bootstrap.php';
$user=require_login();
if ($_SERVER['REQUEST_METHOD']==='POST') {
  verify_csrf();
  $row=['sale_date'=>(string)($_POST['sale_date']??''),'amount'=>(string)($_POST['amount']??''),'notes'=>sales_notes((string)($_POST['notes']??''))];
  if ($err=valid_sale($row)) flash('error',$err);
  else {
    try {
      execute_sql('INSERT INTO sales(sale_date,amount,notes,created_by) VALUES(?,?,?,?)',[$row['sale_date'],$row['amount'],$row['notes']!==''?$row['notes']:null,(int)$user['id']]);
      flash('success','Sale recorded.');
    } catch (PDOException $e) { error_log((string)$e); flash('error','Could not record sale.'); }
  }
  redirect('/sales.php');
}
$today=date('Y-m-d');
$from=(string)($_GET['from']??'');
$to=(string)($_GET['to']??'');
$filterError='';
if (($from!=='' && !valid_date($from)) || ($to!=='' && !valid_date($to))) $filterError='Choose valid filter dates that are not in the future.';
elseif ($from!=='' && $to!=='' && $from>$to) $filterError='The start date cannot be after the end date.';
$summaryEnd=$filterError==='' && $to!==''?$to:$today;
$summaryStart=date('Y-m-d',strtotime($summaryEnd.' -6 days'));
$weeklyStart=$filterError==='' && $from!=='' && $from>$summaryStart?$from:$summaryStart;
$weekly=$filterError!==''?[]:query_all('SELECT sale_date,COALESCE(SUM(amount),0) AS total,COUNT(*) AS entries FROM sales WHERE sale_date BETWEEN ? AND ? GROUP BY sale_date ORDER BY sale_date DESC',[$weeklyStart,$summaryEnd]);
$byDate=[];foreach($weekly as $row)$byDate[$row['sale_date']]=$row;
$sql='SELECT s.id,s.sale_date,s.amount,s.notes,s.created_at,u.username FROM sales s LEFT JOIN users u ON u.id=s.created_by WHERE 1=1';
$params=[];
if ($filterError==='' && $from!=='') {$sql.=' AND s.sale_date>=?';$params[]=$from;}
if ($filterError==='' && $to!=='') {$sql.=' AND s.sale_date<=?';$params[]=$to;}
$sql.=' ORDER BY s.created_at DESC,s.id DESC LIMIT 50';
$recent=$filterError!==''?[]:query_all($sql,$params);
render_header('Sales',$user);
page_heading('Transaction register','Sales','Record sale amounts manually, review the last seven days, and track who entered each transaction. No payment processing is performed.');
?>
<section class="panel sales-filters" aria-labelledby="sales-filter-title"><h2 id="sales-filter-title">Filter sales by date</h2>
<?php if($filterError!==''):?><p class="field-error" role="alert"><?=esc($filterError)?></p><?php endif ?>
<form method="get" class="filter-row"><label class="field"><span>From <em>(optional)</em></span><input type="date" name="from" max="<?=$today?>" value="<?=esc(valid_date($from)?$from:'')?>"></label><label class="field"><span>To <em>(optional)</em></span><input type="date" name="to" max="<?=$today?>" value="<?=esc(valid_date($to)?$to:'')?>"></label><button class="btn btn-light" type="submit">Filter</button></form>
<a class="text-link" href="<?=esc(site_url('/sales.php'))?>">Clear filters</a><p class="muted">Filters apply to the summary and transaction history. The summary shows the seven days ending on the selected end date, or today.</p></section>
<div class="two-column">
<section class="panel"><div class="panel-heading"><h2>Record a sale</h2><span class="mini-label">Manual entry</span></div>
<form method="post" class="stack-form"><?=csrf_input()?><label class="field"><span>Date</span><input type="date" name="sale_date" max="<?=$today?>" value="<?=$today?>" required></label>
<label class="field"><span>Sale amount (₱)</span><input type="number" name="amount" step="0.01" min="0.01" max="99999999" placeholder="0.00" inputmode="decimal" required></label>
<label class="field"><span>Notes <em>(optional)</em></span><input name="notes" maxlength="255" placeholder="Walk-in, delivery, remarks"></label>
<button class="btn btn-primary" type="submit">Record sale</button></form></section>
<section class="panel"><div class="panel-heading"><h2>Seven-day summary</h2><span class="mini-label">Ending <?=esc($summaryEnd)?></span></div>
<?php if($filterError!==''):?><p class="muted">Correct the date filters to view totals.</p><?php else: ?>
<div class="table-wrap" role="region" aria-label="Seven-day sales summary" tabindex="0"><table class="data-table"><caption class="sr-only">Sales totals grouped by date, newest first</caption><thead><tr><th scope="col">Date</th><th scope="col">Entries</th><th scope="col">Total</th></tr></thead><tbody><?php for($offset=0;$offset<7;$offset++):$date=date('Y-m-d',strtotime($summaryEnd." -$offset days"));if($from!=='' && $date<$from)continue;$r=$byDate[$date]??['total'=>0,'entries'=>0];?><tr><td><?=esc($date)?></td><td><?=esc($r['entries'])?></td><td><strong><?=money($r['total'])?></strong></td></tr><?php endfor; ?></tbody></table></div><?php endif ?></section>
</div>
<section class="panel recent-sales"><div class="panel-heading"><h2>Recent transactions</h2><span class="mini-label">Latest 50 entries · PHP</span></div>
<?php if(!$recent): empty_state('No sales recorded','Sales will appear here once staff submit their first entry.');else:?>
<div class="table-wrap"><table class="data-table"><caption class="sr-only">Recent sales transactions</caption><thead><tr><th scope="col">Date</th><th scope="col">Amount</th><th scope="col">Notes</th><th scope="col">Recorded by</th><th scope="col">Timestamp</th></tr></thead><tbody>
<?php foreach($recent as $sale): ?><tr><td data-label="Date"><?=esc($sale['sale_date'])?></td><td data-label="Amount"><strong><?=money($sale['amount'])?></strong></td><td data-label="Notes"><?=esc($sale['notes']?:'—')?></td><td data-label="Recorded by"><?=esc($sale['username']?:'Former user')?></td><td data-label="Timestamp"><?=esc($sale['created_at'])?></td></tr><?php endforeach ?></tbody></table></div><?php endif; ?></section>
<?php render_footer(); ?>

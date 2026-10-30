<?php
require dirname(__DIR__).'/app/bootstrap.php';
$user=require_login();
$today=date('Y-m-d');
$todaySales=query_one('SELECT COALESCE(SUM(amount),0) amount FROM sales WHERE sale_date=?',[$today]);
$month=date('Y-m');
$monthSales=query_one("SELECT COALESCE(SUM(amount),0) amount FROM sales WHERE sale_date >= ? AND sale_date < DATE_ADD(?,INTERVAL 1 MONTH)",[$month.'-01',$month.'-01']);
$low=query_all('SELECT id,item_name,category,quantity,unit,par_level FROM inventory WHERE quantity<=par_level ORDER BY (par_level-quantity) DESC,item_name');
$lowCount=query_one('SELECT COUNT(*) count FROM inventory WHERE quantity<=par_level');
$logs=query_all('SELECT s.shift_date,s.shift_type,s.notes,s.created_at,u.username FROM shift_logs s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC,s.id DESC LIMIT 5');
render_header('Dashboard',$user);
page_heading('Today · '.date('l, F j'),'Shift overview','Sales entered, stock requiring attention, and the latest staff handovers. All figures come from saved branch records.');
?>
<div class="dashboard-grid stat-grid">
 <section class="panel stat-card"><h2>Today's sales</h2><strong class="stat-value"><?=money($todaySales['amount'])?></strong><a class="text-link" href="<?=esc(site_url('/sales.php'))?>">Record sale →</a></section>
 <section class="panel stat-card"><h2>This month's sales</h2><strong class="stat-value"><?=money($monthSales['amount'])?></strong><span class="muted"><?=esc(date('F Y'))?></span></section>
 <section class="panel stat-card <?=$lowCount['count']>0?'stock-alert':''?>"><h2>Low-stock alerts</h2><strong class="stat-value"><?=esc($lowCount['count'])?></strong><a class="text-link" href="<?=esc(site_url('/inventory.php'))?>">Review items →</a></section>
</div>
<div class="dashboard-grid secondary">
 <?php if ($low): ?><section class="panel stock-alert"><div class="panel-heading"><h2>Low-stock watch</h2><span class="mini-label">Quantity vs minimum</span></div>
 <ul class="watch-list"><?php foreach ($low as $row): ?><li><div><strong><?=esc($row['item_name'])?></strong><small><?=esc($row['category'])?></small></div><div class="align-right"><strong><?=esc($row['quantity'])?> <?=esc($row['unit'])?></strong><small>Par <?=esc($row['par_level'])?></small></div></li><?php endforeach; ?></ul></section><?php endif; ?>
 <section class="panel"><div class="panel-heading"><h2>Recent shift handovers</h2><a class="text-link" href="<?=esc(site_url('/shiftlog.php'))?>">All logs →</a></div>
 <?php if (!$logs): empty_state('No handovers yet','Record the first opening, mid, or closing shift handover.'); else: ?>
 <div class="table-wrap" role="region" aria-label="Recent shift logs" tabindex="0"><table class="data-table"><caption class="sr-only">Five most recent shift logs</caption><thead><tr><th scope="col">Date</th><th scope="col">Shift</th><th scope="col">User</th><th scope="col">Notes</th></tr></thead><tbody><?php foreach ($logs as $row): ?><tr><td><?=esc($row['shift_date'])?></td><td><?=esc(ucfirst($row['shift_type']))?></td><td><?=esc($row['username'])?></td><td class="notes-cell"><?=nl2br(esc($row['notes']))?></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?></section>
</div>
<?php render_footer(); ?>

<?php
require dirname(__DIR__).'/app/bootstrap.php';
$user=require_login();
if ($_SERVER['REQUEST_METHOD']==='POST') {
  verify_csrf();
  $row=['shift_date'=>(string)($_POST['shift_date']??''), 'shift_type'=>(string)($_POST['shift_type']??''), 'notes'=>trim((string)($_POST['notes']??''))];
  if ($err=valid_shift_entry($row)) flash('error',$err);
  else {
    try {
      execute_sql('INSERT INTO shift_logs(user_id,shift_date,shift_type,notes) VALUES(?,?,?,?)',[(int)$user['id'],$row['shift_date'],$row['shift_type'],$row['notes']]);
      flash('success','Handover saved.');
    } catch (PDOException $e) { error_log((string)$e); flash('error',"Couldn't save the handover."); }
  }
  redirect('/shiftlog.php');
}
$filter = (string)($_GET['shift']??'all');
if (!in_array($filter,['all','opening','mid','closing'],true)) $filter='all';
$filterDate = (string)($_GET['date']??'');
if ($filterDate !== '' && !valid_date($filterDate)) $filterDate='';
$sql='SELECT l.id,l.shift_date,l.shift_type,l.notes,l.created_at,u.username FROM shift_logs l JOIN users u ON u.id=l.user_id WHERE 1=1';
$params=[];
if ($filter!=='all') {$sql.=' AND l.shift_type=?';$params[]=$filter;}
if ($filterDate!=='') {$sql.=' AND l.shift_date=?';$params[]=$filterDate;}
$sql.=' ORDER BY l.created_at DESC,l.id DESC LIMIT 50';
$logs=query_all($sql,$params);
render_header('Shift log',$user);
page_heading('Shift handovers','Shift log','Write down what the next shift needs to know.');
?>
<div class="two-column shift-layout">
 <section class="panel"><div class="panel-heading"><h2>New handover</h2><span class="mini-label">Signed as <?=esc($user['username'])?></span></div>
 <form method="post" class="stack-form"><?=csrf_input()?><label class="field"><span>Shift date</span><input name="shift_date" type="date" max="<?=date('Y-m-d')?>" value="<?=date('Y-m-d')?>" required></label>
  <label class="field"><span>Shift</span><select name="shift_type" required><?php foreach(['opening'=>'Opening','mid'=>'Mid','closing'=>'Closing'] as $key=>$label):?><option value="<?=esc($key)?>" <?=current_shift()===$key?'selected':''?>><?=esc($label)?></option><?php endforeach ?></select></label>
 <label class="field"><span>Handover notes</span><textarea name="notes" rows="6" minlength="1" maxlength="2000" required placeholder="Machine issues, deliveries, and anything left undone"></textarea><small>1–2000 characters. Saved with your name and the time.</small></label>
 <button class="btn btn-primary" type="submit">Save handover</button></form></section>
 <section class="panel history-panel"><div class="panel-heading"><h2>Earlier handovers</h2><span class="mini-label">Latest 50 matching entries</span></div>
 <form class="filter-row" method="get"><label class="field"><span>Shift</span><select name="shift"><?php foreach(['all'=>'All shifts','opening'=>'Opening','mid'=>'Mid','closing'=>'Closing'] as $key=>$label):?><option value="<?=esc($key)?>" <?=$filter===$key?'selected':''?>><?=esc($label)?></option><?php endforeach ?></select></label><label class="field"><span>Date</span><input name="date" type="date" max="<?=date('Y-m-d')?>" value="<?=esc($filterDate)?>"></label><button class="btn btn-light" type="submit">Filter</button></form>
 <?php if (!$logs): empty_state('No handovers found','Change the filters or add the first one.'); else: ?>
  <div class="table-wrap" role="region" aria-label="Shift log history" tabindex="0"><table class="data-table"><caption class="sr-only">Latest 50 matching shift logs</caption><thead><tr><th scope="col">Date</th><th scope="col">Shift</th><th scope="col">User</th><th scope="col">Notes</th><th scope="col">Timestamp</th></tr></thead><tbody><?php foreach($logs as $log): ?><tr><td><?=esc($log['shift_date'])?></td><td><?=esc(ucfirst($log['shift_type']))?></td><td><?=esc($log['username'])?></td><td class="notes-cell"><?=nl2br(esc($log['notes']))?></td><td><?=esc($log['created_at'])?></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?>
 </section>
</div>
<?php render_footer(); ?>

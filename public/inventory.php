<?php
require dirname(__DIR__).'/app/bootstrap.php';
$user=require_login();
$manager=$user['role']==='manager';
if ($_SERVER['REQUEST_METHOD']==='POST') {
  verify_csrf();
  $action=(string)($_POST['action']??'');
  try {
    if ($action==='count') {
      $id=filter_var($_POST['id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
      $quantity=(string)($_POST['quantity']??'');
      if (!$id || !valid_money($quantity)) throw new InvalidArgumentException('Enter a valid quantity (0 or higher; two decimals maximum).');
      if (execute_sql('UPDATE inventory SET quantity=? WHERE id=?',[$quantity,$id])<1) {
         if (!query_one('SELECT id FROM inventory WHERE id=?',[$id])) throw new InvalidArgumentException('Inventory item no longer exists.');
      }
      flash('success','Physical quantity updated.');
    } elseif (in_array($action,['add','edit','delete'],true)) {
      require_manager($user);
      $id=filter_var($_POST['id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
      if ($action==='delete') {
        if (!$id) throw new InvalidArgumentException('Item not found.');
        execute_sql('DELETE FROM inventory WHERE id=?',[$id]);
        flash('success','Inventory item deleted.');
      } else {
        $row=['item_name'=>trim((string)($_POST['item_name']??'')), 'category'=>trim((string)($_POST['category']??'')), 'quantity'=>(string)($_POST['quantity']??''), 'unit'=>trim((string)($_POST['unit']??'')), 'par_level'=>(string)($_POST['par_level']??''), 'unit_cost'=>(string)($_POST['unit_cost']??'')];
        if ($message=valid_inventory($row)) throw new InvalidArgumentException($message);
        if ($action==='add') {
          execute_sql('INSERT INTO inventory(item_name,category,quantity,unit,par_level,unit_cost) VALUES(?,?,?,?,?,?)',array_values($row));
          flash('success','Inventory item added.');
        } else {
          if (!$id) throw new InvalidArgumentException('Item not found.');
          execute_sql('UPDATE inventory SET item_name=?,category=?,quantity=?,unit=?,par_level=?,unit_cost=? WHERE id=?',[...array_values($row),$id]);
          flash('success','Inventory item updated.');
        }
      }
    } else throw new InvalidArgumentException('Unsupported action.');
  } catch (InvalidArgumentException $e) { flash('error',$e->getMessage()); }
    catch (PDOException $e) { error_log((string)$e); flash('error','Could not save inventory change.'); }
  redirect('/inventory.php');
}
$sort=(string)($_GET['sort']??'category');
$sortColumns=['category'=>'category','item'=>'item_name','quantity'=>'quantity','variance'=>'variance'];
if (!isset($sortColumns[$sort])) $sort='category';
$direction=(string)($_GET['direction']??'asc');
if (!in_array($direction,['asc','desc'],true)) $direction='asc';
$items=query_all('SELECT *,quantity-par_level AS variance FROM inventory ORDER BY '.$sortColumns[$sort].' '.strtoupper($direction).',item_name,id');
$editing=null;
$editId=filter_var($_GET['edit']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
if ($manager && $editId) $editing=query_one('SELECT * FROM inventory WHERE id=?',[$editId]);
render_header('Inventory',$user);
page_heading('Stock control','Inventory','Update counted quantities, spot items below minimum, and keep a consistent inventory master.');
?>
<div class="panel-headline"><h2>Current stock <span class="counter"><?=count($items)?></span></h2><span class="muted">Staff can record counts · Managers maintain items</span></div>
<section class="panel inventory-panel">
<form method="get" class="filter-row inventory-sort"><label class="field"><span>Sort stock by</span><select name="sort"><?php foreach(['category'=>'Category','item'=>'Item name','quantity'=>'Quantity','variance'=>'Variance from par'] as $key=>$label):?><option value="<?=esc($key)?>" <?=$sort===$key?'selected':''?>><?=esc($label)?></option><?php endforeach ?></select></label><label class="field"><span>Order</span><select name="direction"><option value="asc" <?=$direction==='asc'?'selected':''?>>Ascending</option><option value="desc" <?=$direction==='desc'?'selected':''?>>Descending</option></select></label><button class="btn btn-light" type="submit">Sort</button></form>
<?php if (!$items): empty_state('No inventory items','A manager can create the first item using the form below.'); else: ?>
<div class="table-wrap" role="region" aria-label="Inventory table" tabindex="0"><table class="data-table"><caption class="sr-only">Inventory, thresholds and quantity updates</caption><thead><tr><th scope="col">Item</th><th scope="col">Quantity / par</th><th scope="col">Variance from par</th><th scope="col">Unit cost</th><th scope="col">Record physical count</th><?php if($manager):?><th scope="col">Manage</th><?php endif ?></tr></thead><tbody>
<?php foreach($items as $item): $low=(float)$item['quantity']<=(float)$item['par_level']; ?><tr class="<?= $low?'low-stock':'' ?>"><td data-label="Item"><strong><?=esc($item['item_name'])?></strong><small><?=esc($item['category'])?></small><?php if ($low): ?><span class="stock-warning">At / below par</span><?php endif ?></td><td data-label="Quantity / par"><strong><?=esc($item['quantity'])?> <?=esc($item['unit'])?></strong><small>Par <?=esc($item['par_level'])?> <?=esc($item['unit'])?></small></td>
<td data-label="Variance from par"><strong><?=(float)$item['variance']>0?'+':''?><?=esc($item['variance'])?> <?=esc($item['unit'])?></strong><small>Quantity minus par</small></td>
<td data-label="Unit cost"><?=money($item['unit_cost'])?></td><td data-label="Count"><form class="inline-form" method="post"><?=csrf_input()?><input type="hidden" name="action" value="count"><input type="hidden" name="id" value="<?=esc($item['id'])?>"><label class="sr-only" for="count-<?=esc($item['id'])?>">Physical count for <?=esc($item['item_name'])?></label><input id="count-<?=esc($item['id'])?>" name="quantity" type="number" step="0.01" min="0" max="99999999" value="<?=esc($item['quantity'])?>" required><button type="submit" class="btn btn-small">Save</button></form></td>
<?php if($manager):?><td data-label="Manage"><div class="actions"><a class="text-link" href="?edit=<?=esc($item['id'])?>#item-form">Edit</a><form method="post" data-confirm="Delete this item permanently?"><?=csrf_input()?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?=esc($item['id'])?>"><button class="danger-link" type="submit">Delete</button></form></div></td><?php endif; ?></tr><?php endforeach; ?>
</tbody></table></div><?php endif; ?>
</section>
<?php if($manager): $i=$editing??['item_name'=>'','category'=>'','quantity'=>'0','unit'=>'pcs','par_level'=>'0','unit_cost'=>'0']; ?>
<section class="panel edit-panel" id="item-form"><div class="panel-heading"><h2><?= $editing?'Edit item':'Add inventory item'?></h2><?php if($editing):?><a class="text-link" href="<?=esc(site_url('/inventory.php#item-form'))?>">Cancel edit</a><?php endif ?></div>
<form method="post" class="grid-form"><?=csrf_input()?><input type="hidden" name="action" value="<?=$editing?'edit':'add'?>"><?php if($editing):?><input type="hidden" name="id" value="<?=esc($editing['id'])?>"><?php endif; ?>
<label class="field"><span>Item name</span><input name="item_name" required maxlength="100" value="<?=esc($i['item_name'])?>"></label>
<label class="field"><span>Category</span><input name="category" required maxlength="50" placeholder="Coffee, Dairy, Syrup…" value="<?=esc($i['category'])?>"></label>
<label class="field"><span>Quantity</span><input name="quantity" type="number" min="0" max="99999999" step="0.01" required value="<?=esc($i['quantity'])?>"></label>
<label class="field"><span>Unit</span><input name="unit" required maxlength="20" value="<?=esc($i['unit'])?>"></label>
<label class="field"><span>Par level</span><input name="par_level" type="number" min="0" step="0.01" max="99999999" required value="<?=esc($i['par_level'])?>"></label>
<label class="field"><span>Unit cost (₱)</span><input name="unit_cost" type="number" min="0" step="0.01" max="99999999" required value="<?=esc($i['unit_cost'])?>"></label>
<div class="form-submit"><button class="btn btn-primary" type="submit"><?= $editing?'Save changes':'Add item' ?></button></div></form></section><?php endif; ?>
<?php render_footer(); ?>

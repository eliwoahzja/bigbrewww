<?php
require dirname(__DIR__).'/app/bootstrap.php';
$actor=require_login();require_manager($actor);
if($_SERVER['REQUEST_METHOD']==='POST'){
 verify_csrf();
 $action=(string)($_POST['action']??'');
 try {
  if ($action==='create') {
   $name=trim((string)($_POST['username']??''));$pass=(string)($_POST['password']??'');$role=(string)($_POST['role']??'staff');
   if(!valid_username($name))throw new InvalidArgumentException('Use 3–50 letters, numbers, dots, dashes, or underscores.');
   if(!valid_password($pass))throw new InvalidArgumentException('Use 8–128 characters.');
   if(!in_array($role,['staff','manager'],true))throw new InvalidArgumentException('Pick a valid role.');
   execute_sql('INSERT INTO users(username,password,role) VALUES(?,?,?)',[$name,password_hash($pass,PASSWORD_BCRYPT),$role]);
   flash('success','Account created.');
  } elseif ($action==='status') {
   $id=filter_var($_POST['id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
   $active=(string)($_POST['active']??'');
   if (!$id || !in_array($active,['0','1'],true)) throw new InvalidArgumentException("That status change isn't valid.");
   if($id===(int)$actor['id'] && $active==='0')throw new InvalidArgumentException("You can't deactivate your own account.");
   execute_sql('UPDATE users SET active=? WHERE id=?',[$active,$id]);
   flash('success','Access updated.');
  } elseif ($action==='reset') {
   $id=filter_var($_POST['id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
   $pass=(string)($_POST['password']??'');
   if(!$id || !valid_password($pass)) throw new InvalidArgumentException('Use 8–128 characters.');
   if(execute_sql('UPDATE users SET password=? WHERE id=?',[password_hash($pass,PASSWORD_BCRYPT),$id])===0)throw new InvalidArgumentException("That account doesn't exist.");
   flash('success','Password updated.');
  } else throw new InvalidArgumentException("That action isn't supported.");
 }catch(InvalidArgumentException $e){flash('error',$e->getMessage());}
  catch(PDOException $e){error_log((string)$e);flash('error',"Couldn't update the account. The username may already be taken.");}
 redirect('/users.php');
}
$users=query_all('SELECT id,username,role,active,created_at FROM users ORDER BY role,username');
render_header('User management',$actor);
page_heading('Manager access','User management','Add staff accounts and set their role. Switch access off when someone leaves.');
?>
<div class="two-column">
<section class="panel"><div class="panel-heading"><h2>Create account</h2><span class="mini-label">Manager only</span></div>
<form method="post" class="stack-form"><?=csrf_input()?><input type="hidden" name="action" value="create"><label class="field"><span>Username</span><input name="username" minlength="3" maxlength="50" pattern="[A-Za-z0-9_.-]{3,50}" required autocomplete="off"></label><label class="field"><span>Password</span><input name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label><label class="field"><span>Role</span><select name="role"><option value="staff">Staff: counts, handovers, sales</option><option value="manager">Manager: all pages, plus accounts</option></select></label><button class="btn btn-primary" type="submit">Create account</button></form></section>
<section class="panel history-panel"><div class="panel-heading"><h2>Accounts</h2><span class="mini-label"><?=count($users)?> accounts</span></div>
<?php if(!$users): empty_state('No accounts','Create the first manager with the setup tool.');else:?>
<ul class="user-list"><?php foreach($users as $entry): ?><li><div class="user-meta"><strong><?=esc($entry['username'])?></strong><small><?=esc(ucfirst($entry['role']))?> · <?= (int)$entry['active']===1?'Active':'Inactive' ?></small></div>
<?php if((int)$entry['id']!==(int)$actor['id']):?><form method="post"><?=csrf_input()?><input type="hidden" name="action" value="status"><input type="hidden" name="id" value="<?=esc($entry['id'])?>"><input type="hidden" name="active" value="<?= (int)$entry['active']===1?'0':'1' ?>"><button class="btn btn-small btn-light" type="submit"><?= (int)$entry['active']===1?'Disable':'Enable' ?></button></form><?php endif; ?>
<form method="post" class="reset-form"><?=csrf_input()?><input type="hidden" name="action" value="reset"><input type="hidden" name="id" value="<?=esc($entry['id'])?>"><label class="sr-only" for="password-<?=esc($entry['id'])?>">New password for <?=esc($entry['username'])?></label><input id="password-<?=esc($entry['id'])?>" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required placeholder="New password"><button class="btn btn-small" type="submit">Reset</button></form>
</li><?php endforeach ?></ul><?php endif ?></section>
</div>
<?php render_footer(); ?>

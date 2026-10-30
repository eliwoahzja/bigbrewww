<?php
require dirname(__DIR__).'/app/bootstrap.php';
$actor=require_login();require_manager($actor);
if($_SERVER['REQUEST_METHOD']==='POST'){
 verify_csrf();
 $action=(string)($_POST['action']??'');
 try {
  if ($action==='create') {
   $name=trim((string)($_POST['username']??''));$pass=(string)($_POST['password']??'');$role=(string)($_POST['role']??'staff');
   if(!valid_username($name))throw new InvalidArgumentException('Username must contain 3–50 letters, numbers, dots, dashes, or underscores.');
   if(!valid_password($pass))throw new InvalidArgumentException('Password must contain 8–128 characters.');
   if(!in_array($role,['staff','manager'],true))throw new InvalidArgumentException('Invalid role.');
   execute_sql('INSERT INTO users(username,password,role) VALUES(?,?,?)',[$name,password_hash($pass,PASSWORD_BCRYPT),$role]);
   flash('success','Account created.');
  } elseif ($action==='status') {
   $id=filter_var($_POST['id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
   $active=(string)($_POST['active']??'');
   if (!$id || !in_array($active,['0','1'],true)) throw new InvalidArgumentException('Invalid status change.');
   if($id===(int)$actor['id'] && $active==='0')throw new InvalidArgumentException('You cannot deactivate your own account.');
   execute_sql('UPDATE users SET active=? WHERE id=?',[$active,$id]);
   flash('success','Account status updated.');
  } elseif ($action==='reset') {
   $id=filter_var($_POST['id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
   $pass=(string)($_POST['password']??'');
   if(!$id || !valid_password($pass)) throw new InvalidArgumentException('Password must contain 8–128 characters.');
   if(execute_sql('UPDATE users SET password=? WHERE id=?',[password_hash($pass,PASSWORD_BCRYPT),$id])===0)throw new InvalidArgumentException('Account not found.');
   flash('success','Password updated.');
  } else throw new InvalidArgumentException('Unsupported account action.');
 }catch(InvalidArgumentException $e){flash('error',$e->getMessage());}
  catch(PDOException $e){error_log((string)$e);flash('error','Could not update account (username may already exist).');}
 redirect('/users.php');
}
$users=query_all('SELECT id,username,role,active,created_at FROM users ORDER BY role,username');
render_header('User management',$actor);
page_heading('Manager access','User management','Create staff accounts, assign roles, and disable access when employees leave. Only managers can access this page.');
?>
<div class="two-column">
<section class="panel"><div class="panel-heading"><h2>Create account</h2><span class="mini-label">Manager only</span></div>
<form method="post" class="stack-form"><?=csrf_input()?><input type="hidden" name="action" value="create"><label class="field"><span>Username</span><input name="username" minlength="3" maxlength="50" pattern="[A-Za-z0-9_.-]{3,50}" required autocomplete="off"></label><label class="field"><span>Password</span><input name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label><label class="field"><span>Permission level</span><select name="role"><option value="staff">Staff · counts, logs, sales</option><option value="manager">Manager · all modules</option></select></label><button class="btn btn-primary" type="submit">Create account</button></form></section>
<section class="panel history-panel"><div class="panel-heading"><h2>Accounts</h2><span class="mini-label"><?=count($users)?> recorded</span></div>
<?php if(!$users): empty_state('No accounts','Create an initial manager through the CLI setup tool.');else:?>
<ul class="user-list"><?php foreach($users as $entry): ?><li><div class="user-meta"><strong><?=esc($entry['username'])?></strong><small><?=esc(ucfirst($entry['role']))?> · <?= (int)$entry['active']===1?'Active':'Inactive' ?></small></div>
<?php if((int)$entry['id']!==(int)$actor['id']):?><form method="post"><?=csrf_input()?><input type="hidden" name="action" value="status"><input type="hidden" name="id" value="<?=esc($entry['id'])?>"><input type="hidden" name="active" value="<?= (int)$entry['active']===1?'0':'1' ?>"><button class="btn btn-small btn-light" type="submit"><?= (int)$entry['active']===1?'Disable':'Enable' ?></button></form><?php endif; ?>
<form method="post" class="reset-form"><?=csrf_input()?><input type="hidden" name="action" value="reset"><input type="hidden" name="id" value="<?=esc($entry['id'])?>"><label class="sr-only" for="password-<?=esc($entry['id'])?>">New password for <?=esc($entry['username'])?></label><input id="password-<?=esc($entry['id'])?>" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required placeholder="New password"><button class="btn btn-small" type="submit">Reset</button></form>
</li><?php endforeach ?></ul><?php endif ?></section>
</div>
<?php render_footer(); ?>

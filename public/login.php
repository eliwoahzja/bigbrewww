<?php
require dirname(__DIR__).'/app/bootstrap.php';
try { if (current_user()) redirect('/dashboard.php'); }
catch (Throwable $e) { }
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $username = trim((string)($_POST['username'] ?? ''));
    $password = (string)($_POST['password'] ?? '');
    try {
        if (login_attempt($username, $password)) redirect('/dashboard.php');
        $error = 'Invalid credentials or temporarily locked. Please try again later.';
    } catch (Throwable $e) {
        error_log((string)$e);
        $error = 'Database unavailable. Check the deployment configuration.';
    }
}
render_header('Log in', null);
?>
<section class="login-shell">
<div class="login-intro"><h1>Every shift, accounted for.</h1><p class="lead">Sign in to record inventory counts, handover notes, and daily sales. Staff and managers have different permissions.</p><div class="login-context"><span class="context-rule"></span><p>Phase 1 · Branch operations<br><strong>Inventory / Shift log / Sales</strong></p></div></div>
<div class="panel login-panel"><h2>Sign in</h2><?php if ($error): ?><p class="field-error" role="alert"><?=esc($error)?></p><?php endif; ?>
<form method="post" autocomplete="on"><?=csrf_input()?>
<label class="field"><span>Username</span><input name="username" autocomplete="username" maxlength="50" required autofocus value="<?=esc((string)($_POST['username']??''))?>"></label>
<label class="field"><span>Password</span><span class="password-wrap"><input id="login-password" name="password" type="password" autocomplete="current-password" required><button type="button" class="show-password" data-show-password aria-label="Show password">Show</button></span></label>
<button class="btn btn-primary full" type="submit">Sign in</button>
</form><p class="form-foot">Access is created by a manager. There is no public registration.</p></div>
</section>
<?php render_footer(); ?>

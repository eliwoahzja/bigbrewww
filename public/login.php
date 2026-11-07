<?php
require dirname(__DIR__).'/app/bootstrap.php';
try { if (current_user()) redirect('/dashboard.php'); }
catch (Throwable $e) { error_log('[BBOMS session check] ' . (string)$e); }
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $username = trim((string)($_POST['username'] ?? ''));
    $password = (string)($_POST['password'] ?? '');
    try {
        if (login_attempt($username, $password)) redirect('/dashboard.php');
        $error = "That username and password don't match, or sign-in is locked. Try again in a few minutes.";
    } catch (PDOException|RuntimeException $e) {
        error_log('[BBOMS database login error] ' . (string)$e);
        $local = in_array((string)($_SERVER['REMOTE_ADDR'] ?? ''), ['127.0.0.1', '::1'], true);
        $error = $local
            ? 'Database connection failed. Check XAMPP MySQL and the bboms database. If needed, change the local database settings.'
            : 'Database unavailable. Contact your system administrator.';
    } catch (Throwable $e) {
        error_log('[BBOMS unexpected login error] ' . (string)$e);
        $error = 'Sign-in failed unexpectedly. Check the PHP error log.';
    }
}
render_header('Log in', null);
?>
<section class="login-shell">
<div class="login-intro"><h1>Every shift, accounted for.</h1><p class="lead">One screen for stock counts, handovers, and daily sales.</p></div>
<div class="panel login-panel"><h2>Sign in</h2><?php if ($error): ?><p class="field-error" role="alert"><?=esc($error)?></p><?php endif; ?>
<form method="post" autocomplete="on"><?=csrf_input()?>
<label class="field"><span>Username</span><input name="username" autocomplete="username" maxlength="50" required autofocus value="<?=esc((string)($_POST['username']??''))?>"></label>
<label class="field"><span>Password</span><span class="password-wrap"><input id="login-password" name="password" type="password" autocomplete="current-password" required><button type="button" class="show-password" data-show-password aria-label="Show password">Show</button></span></label>
<button class="btn btn-primary full" type="submit">Sign in</button>
</form></div>
</section>
<?php render_footer(); ?>

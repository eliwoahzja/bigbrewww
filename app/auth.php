<?php
declare(strict_types=1);

function esc(string|int|float|null $s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function site_url(string $path): string {
    $base = str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/login.php')));
    $base = $base === '/' || $base === '.' ? '' : rtrim($base, '/');
    return $base.'/'.ltrim($path, '/');
}
function redirect(string $path): never {
    header('Location: '.site_url($path), true, 303); exit;
}
function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return (string)$_SESSION['csrf'];
}
function csrf_input(): string { return '<input type="hidden" name="csrf" value="'.esc(csrf_token()).'">'; }
function verify_csrf(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !hash_equals(csrf_token(), (string)($_POST['csrf'] ?? ''))) {
        http_response_code(403); exit('Your form session expired. Go back, reload, and try again.');
    }
}
function flash(string $kind, string $msg): void { $_SESSION['flash'] = [$kind, $msg]; }
function take_flash(): ?array {
    $message = $_SESSION['flash'] ?? null; unset($_SESSION['flash']); return $message;
}
function current_user(): ?array {
    if (empty($_SESSION['user_id'])) return null;
    if (time() - (int)($_SESSION['activity'] ?? 0) > 1800) {
        unset($_SESSION['user_id'], $_SESSION['activity']); return null;
    }
    $user = query_one('SELECT id, username, role, active FROM users WHERE id=?', [(int)$_SESSION['user_id']]);
    if (!$user || (int)$user['active'] !== 1) {
        unset($_SESSION['user_id'], $_SESSION['activity']); return null;
    }
    $_SESSION['activity'] = time();
    return $user;
}
function require_login(): array {
    $u = current_user(); if (!$u) redirect('/login.php'); return $u;
}
function require_manager(array $u): void {
    if ($u['role'] !== 'manager') { http_response_code(403); exit('Manager permissions are required.'); }
}
function login_attempt(string $username, string $password): bool {
    $until = (int)($_SESSION['login_locked_until'] ?? 0);
    if ($until > time()) return false;
    $user = query_one('SELECT id, password, active FROM users WHERE username=? LIMIT 1', [$username]);
    $valid = $user && (int)$user['active']===1 && password_verify($password, (string)$user['password']);
    if (!$valid) {
        $_SESSION['login_attempts'] = (int)($_SESSION['login_attempts'] ?? 0) + 1;
        if ($_SESSION['login_attempts'] >= 6) {
            $_SESSION['login_locked_until'] = time()+900;
            $_SESSION['login_attempts'] = 0;
        }
        return false;
    }
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['activity'] = time();
    unset($_SESSION['login_attempts'], $_SESSION['login_locked_until']);
    return true;
}

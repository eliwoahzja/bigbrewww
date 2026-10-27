<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Manila');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.use_only_cookies', '1');
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('BBOMS_SESSION');
    session_set_cookie_params([
        'lifetime'=>0, 'path'=>'/', 'secure'=>$https,
        'httponly'=>true, 'samesite'=>'Lax',
    ]);
    session_start();
}
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'");
require_once __DIR__.'/validation.php';
require_once __DIR__.'/database.php';
require_once __DIR__.'/auth.php';
require_once __DIR__.'/view.php';

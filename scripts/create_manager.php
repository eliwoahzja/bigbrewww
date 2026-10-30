<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }
require dirname(__DIR__).'/app/validation.php';
require dirname(__DIR__).'/app/database.php';
$name = trim((string)($argv[1]??''));
if (!valid_username($name)) {fwrite(STDERR,"Usage: php scripts/create_manager.php USERNAME (3–50 letters/numbers/._-)\n");exit(2);}
if (!function_exists('stream_get_contents')) exit(2);
fwrite(STDOUT,"New manager password (8+ characters): ");
if (DIRECTORY_SEPARATOR === '/' && function_exists('shell_exec') && stream_isatty(STDIN)) {
    shell_exec('stty -echo');
    try { $password = rtrim((string)fgets(STDIN), "\r\n"); }
    finally { shell_exec('stty echo');fwrite(STDOUT,"\n"); }
} else $password = rtrim((string)fgets(STDIN), "\r\n");
if (!valid_password($password)) {fwrite(STDERR,"Password length must be 8–128 characters.\n");exit(2);}
try {
    $hash = password_hash($password,PASSWORD_BCRYPT);
    $count = query_one('SELECT COUNT(*) AS n FROM users');
    if ((int)$count['n'] > 0) {fwrite(STDERR,"Initial manager bootstrap is only allowed when no accounts exist. Use the Users page thereafter.\n");exit(1);}
    execute_sql('INSERT INTO users(username,password,role) VALUES(?,?,?)',[$name,$hash,'manager']);
    fwrite(STDOUT,"Initial manager account created.\n");
} catch (Throwable $e) {fwrite(STDERR,"Could not create manager. Verify MySQL configuration and the schema.\n");exit(1);}

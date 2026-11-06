<?php
declare(strict_types=1);

function db(): PDO {
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;

    $root = dirname(__DIR__);
    $privatePath = $root . '/config.local.php';
    // XAMPP defaults are used only from the same machine (or from PHP CLI).
    // Never apply the passwordless local MySQL defaults to a public deployment.
    $localAddresses = ['127.0.0.1', '::1'];
    $serverAddress = (string) ($_SERVER['SERVER_ADDR'] ?? '');
    $remoteAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    $isLocal = PHP_SAPI === 'cli'
        || in_array($serverAddress, $localAddresses, true)
        || ($serverAddress === '' && in_array($remoteAddress, $localAddresses, true));

    if (is_file($privatePath)) {
        $path = $privatePath;
    } elseif ($isLocal) {
        $path = $root . '/config.xampp.php';
    } else {
        throw new RuntimeException('Database configuration missing. Set up config.local.php on this server.');
    }

    if (!is_file($path)) {
        throw new RuntimeException('Database configuration missing. Configure config.local.php or the local XAMPP defaults.');
    }
    $config = require $path;
    if (!is_array($config)) throw new RuntimeException('Database configuration is invalid.');

    $host = (string) ($config['db_host'] ?? '127.0.0.1');
    $port = (string) ($config['db_port'] ?? '3306');
    $name = (string) ($config['db_name'] ?? 'bboms');
    if (!preg_match('/^\\d+$/D', $port) || (int) $port < 1 || (int) $port > 65535) {
        throw new RuntimeException('Invalid database port.');
    }
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4",
        (string) ($config['db_user'] ?? ''),
        (string) ($config['db_pass'] ?? ''),
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 4,
        ]
    );
    $pdo->exec("SET time_zone = '+08:00'");
    return $pdo;
}
function query_all(string $sql, array $params=[]): array {
    $stmt = db()->prepare($sql); $stmt->execute($params);
    return $stmt->fetchAll();
}
function query_one(string $sql, array $params=[]): ?array {
    $stmt = db()->prepare($sql); $stmt->execute($params);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}
function execute_sql(string $sql, array $params=[]): int {
    $stmt = db()->prepare($sql); $stmt->execute($params);
    return $stmt->rowCount();
}

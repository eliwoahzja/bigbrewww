<?php
declare(strict_types=1);

function valid_date(string $value): bool {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) return false;
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    return $d !== false && $d->format('Y-m-d') === $value && $value <= date('Y-m-d');
}
function valid_money(string $value, bool $allowZero = true): bool {
    if (!preg_match('/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/D', $value)) return false;
    return $allowZero || (float)$value > 0;
}
function valid_username(string $s): bool {
    return (bool)preg_match('/^[A-Za-z0-9_.-]{3,50}$/D', $s);
}
function valid_password(string $s): bool { return strlen($s) >= 8 && strlen($s) <= 128; }
function valid_shift(string $s): bool { return in_array($s, ['opening','mid','closing'], true); }
function current_shift(?DateTimeImmutable $now = null): string {
    $hour = (int)($now ?? new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('G');
    if ($hour >= 6 && $hour < 12) return 'opening';
    if ($hour >= 12 && $hour < 18) return 'mid';
    return 'closing';
}
function sales_notes(string $notes): string {
    $notes = trim($notes);
    return preg_match('/\A.{0,255}/us', $notes, $matches) ? $matches[0] : substr($notes, 0, 255);
}
function valid_notes(string $s): bool { return strlen($s) >= 1 && strlen($s) <= 2000; }
function valid_inventory(array $row): ?string {
    foreach (['item_name'=>100,'category'=>50,'unit'=>20] as $name=>$max) {
        $value = trim((string)($row[$name] ?? ''));
        if ($value === '' || strlen($value) > $max) return "Enter a valid $name.";
    }
    foreach (['quantity','par_level','unit_cost'] as $field) {
        if (!valid_money((string)($row[$field] ?? ''))) return "Enter a valid nonnegative $field (up to 2 decimals).";
    }
    return null;
}
function valid_sale(array $row): ?string {
    if (!valid_date((string)($row['sale_date'] ?? ''))) return 'Choose a valid date that is not in the future.';
    if (!valid_money((string)($row['amount'] ?? ''), false)) return 'Enter an amount greater than zero, with up to 2 decimals.';
    if (!preg_match('/\A.{0,255}\z/us', (string)($row['notes'] ?? ''))) return 'Notes cannot exceed 255 characters.';
    return null;
}
function valid_shift_entry(array $row): ?string {
    if (!valid_date((string)($row['shift_date'] ?? ''))) return 'Choose a valid date that is not in the future.';
    if (!valid_shift((string)($row['shift_type'] ?? ''))) return 'Choose opening, mid, or closing.';
    if (!valid_notes(trim((string)($row['notes'] ?? '')))) return 'Handover notes must contain 1–2000 characters.';
    return null;
}

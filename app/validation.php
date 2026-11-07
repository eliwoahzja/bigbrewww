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
    foreach (['item_name'=>['item name',100],'category'=>['category',50],'unit'=>['unit',20]] as $name=>[$label,$max]) {
        $value = trim((string)($row[$name] ?? ''));
        if ($value === '') return "Enter the $label.";
        if (strlen($value) > $max) return "Keep the $label to $max characters or fewer.";
    }
    foreach (['quantity'=>'quantity','par_level'=>'par level','unit_cost'=>'unit cost'] as $field=>$label) {
        if (!valid_money((string)($row[$field] ?? ''))) return "Enter a $label of 0 or more, with up to two decimals.";
    }
    return null;
}
function valid_sale(array $row): ?string {
    if (!valid_date((string)($row['sale_date'] ?? ''))) return "Pick a valid date. Future dates aren't allowed.";
    if (!valid_money((string)($row['amount'] ?? ''), false)) return 'Enter an amount above zero, with up to two decimals.';
    if (!preg_match('/\A.{0,255}\z/us', (string)($row['notes'] ?? ''))) return 'Keep notes to 255 characters or fewer.';
    return null;
}
function valid_shift_entry(array $row): ?string {
    if (!valid_date((string)($row['shift_date'] ?? ''))) return "Pick a valid date. Future dates aren't allowed.";
    if (!valid_shift((string)($row['shift_type'] ?? ''))) return 'Pick opening, mid, or closing.';
    if (!valid_notes(trim((string)($row['notes'] ?? '')))) return 'Write between 1 and 2000 characters.';
    return null;
}

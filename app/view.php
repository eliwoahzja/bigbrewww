<?php
declare(strict_types=1);
function money(string|float|int|null $amount): string { return '₱'.number_format((float)$amount, 2); }
function render_header(string $page, ?array $user): void {
    $title = esc($page);
    $display = $user ? esc($user['username']) : '';
    $role = $user ? esc(ucfirst($user['role'])) : '';
    $nav = ['dashboard.php'=>'Dashboard','inventory.php'=>'Inventory','shiftlog.php'=>'Shift log','sales.php'=>'Sales'];
    if ($user && $user['role'] === 'manager') $nav['users.php']='Users';
    $css_version = (string) (filemtime(dirname(__DIR__).'/public/assets/styles.css') ?: '1');
    $js_version = (string) (filemtime(dirname(__DIR__).'/public/assets/app.js') ?: '1');
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#faf6ef"><meta name="description" content="Independent educational prototype of the BigBrew Operational Management System"><title>'.$title.' · BBOMS</title><link rel="icon" type="image/png" href="'.esc(site_url('/assets/favicon.png')).'"><link rel="stylesheet" href="'.esc(site_url('/assets/styles.css')).'?v='.esc($css_version).'"><script defer src="'.esc(site_url('/assets/app.js')).'?v='.esc($js_version).'"></script></head><body>';
    echo '<a href="#content" class="skip">Skip to content</a><header class="site-head"><div class="head-row"><a class="brand" href="'.esc(site_url('/dashboard.php')).'" aria-label="BBOMS home"><img class="brand-logo" src="'.esc(site_url('/assets/bigbrew-icon.png')).'" alt="BigBrew icon" width="46" height="46"><span>BigBrew</span></a>';
    if ($user) {
        echo '<div class="account"><span><strong>'.$display.'</strong><small>'.$role.'</small></span><form method="post" action="'.esc(site_url('/logout.php')).'">'.csrf_input().'<button class="signout" type="submit">Log out</button></form></div>';
    }
    echo '</div>';
    if ($user) {
        echo '<nav class="site-nav" aria-label="Primary"><div class="nav-scroll">';
        foreach ($nav as $url=>$name) {
            $current = basename($_SERVER['SCRIPT_NAME']??'') === $url;
            echo '<a href="'.esc(site_url('/'.$url)).'"'.($current?' class="active" aria-current="page"':'').'>'.esc($name).'</a>';
        }
        echo '</div></nav>';
    }
    echo '</header><main id="content" class="container">';
    $alert = take_flash();
    if ($alert) echo '<div role="status" class="flash '.($alert[0]==='error'?'error':'success').'">'.esc($alert[1]).'</div>';
}
function render_footer(): void {
    echo '</main></body></html>';
}
function page_heading(string $kicker, string $title, string $lead): void {
    echo '<header class="page-head"><p class="kicker">'.esc($kicker).'</p><h1>'.esc($title).'</h1><p class="lead">'.esc($lead).'</p></header>';
}
function empty_state(string $title, string $copy): void {
    echo '<div class="empty"><strong>'.esc($title).'</strong><p>'.esc($copy).'</p></div>';
}

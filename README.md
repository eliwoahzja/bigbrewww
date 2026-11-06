# BBOMS — BigBrew Operational Management System

**Standalone PHP 8.x / MySQL 8.x / HTML5 / CSS3 / vanilla JavaScript implementation of the Mini Capstone Phase 1 specification.** Independent educational prototype; not an official BigBrew service. All data entered by users; no fabricated sales, field surveys, or official integration. The bundled code intentionally contains no sample sales records.

## Architecture

- **Presentation:** server-rendered semantic HTML5, responsive CSS3, minimal vanilla JS for confirmation and password visibility. No React, TypeScript, TSX, npm build step or UI framework.
- **Application:** procedural PHP 8.x (PDO prepared statements, sessions, bcrypt passwords, CSRF protection, session regeneration, idle expiry, server-verified Manager/Staff permissions).
- **Database:** MySQL 8.x with InnoDB foreign keys, four capstone Phase 1 entities: `users`, `inventory`, `shift_logs`, `sales`.
- **Hosting:** Apache shared hosting with document root set to `public/`. HTTPS required for a production installation.

**This is a new PHP/MySQL implementation.** The earlier Vercel/Supabase project is architecturally different. This application **cannot be deployed to Vercel's standard static/Node setup or wired directly to Supabase PostgreSQL** without changing the report's stack.

## XAMPP localhost setup (manual phpMyAdmin import)

1. Put this repository in `C:\xampp\htdocs\bigbrew\` and start **Apache** and **MySQL** in XAMPP.
2. Visit `http://localhost/phpmyadmin/`, create a database named `bboms` with `utf8mb4_unicode_ci` collation, then select **Import** and import `database.sql`. If the database already contains your records, do not import again.
3. Visit `http://localhost/bigbrew/` to sign in. For standard XAMPP defaults, **you do not need to copy or create a PHP config file**: the committed `config.xampp.php` supplies host `127.0.0.1`, port `3306`, user `root`, and an empty password when Apache is serving localhost.
4. If MySQL uses a different account, password, or port, make a private `config.local.php` from `config.example.php` and enter your actual settings. A pre-existing `config.local.php` always takes priority over `config.xampp.php`. The previously migrated dedicated MySQL 8 database listens on port `3307` and requires its original private credentials.
5. If login fails, check `C:\xampp\apache\logs\error.log` and confirm that `bboms` contains the `users`, `inventory`, `shift_logs`, and `sales` tables.

The committed `config.xampp.php` contains **no private credentials**. Do not commit `config.local.php` or place a passwordless root MySQL account on the public internet. This is an Apache/PHP/MySQL application, **not** a Vercel Node project.

## Setup

For this already-migrated local installation, see [MYSQL8_MIGRATION.md](MYSQL8_MIGRATION.md) for the dedicated MySQL 8 instance and its startup command. The generic fresh-install instructions below do not replace that connection configuration.

1. Provide a PHP 8.0+ host with `pdo_mysql`, `session`, `openssl` and MySQL 8.0+; enable HTTPS.
2. Create a **dedicated empty MySQL database** (example `bboms`) and a least-privileged user with SELECT/INSERT/UPDATE/DELETE on that database. Import `database.sql` through phpMyAdmin or MySQL Workbench.
3. Copy `config.example.php` to `config.local.php` at the project root and enter the database connection details. Keep this file **outside the web document root**, as specified below; never commit it.
4. Run the one-time initial manager creation from a terminal/SSH (password is prompted, not stored in source):

   ```sh
   php scripts/create_manager.php manager
   ```

   This tool refuses to create further managers after any account exists. Additional staff/manager accounts must be created from the authenticated **Users** page by a Manager.
5. Point Apache's public document root to `public/`, rather than the project root; set your domain's HTTPS configuration. Visit `/login.php` and sign in.

**Shared hosting path:** Keep `app/`, `database.sql`, `scripts/`, `tests/`, `config.local.php` outside `public_html`; copy only contents of `public/` into `public_html`. If your host cannot configure a matching document root, adjust the `require dirname(__DIR__).'/app/bootstrap.php'` paths to reach the private `app/` folder outside the public directory, or configure Apache to use `public/` directly. Do not expose source, config, database dumps, or initialization scripts as URLs.

For local development:

```sh
php -S localhost:8000 -t public
```

The PHP built-in server is only for local development; use Apache+HTTPS for production.

## Required modules implemented

| Module | Screen | Behavior |
| --- | --- | --- |
| Authentication / accounts | `login.php`, `users.php` | Bcrypt password login, Manager-only account management, inactive-account rejection, sessions/logout. |
| Inventory | `inventory.php` | Manager item create/edit/delete, Staff/Manager physical count entry, nonnegative quantities, par alerts, PHP/MySQL persistence. |
| Shift logs | `shiftlog.php` | Dated opening/mid/closing handover notes (1–2000 chars), login attribution, timestamps, filtering, latest 50. |
| Sales | `sales.php` | Manual positive PHP sales entry, user/date attribution, notes <=255 chars, seven-day totals and latest 50. No POS. |
| Dashboard/reporting | `dashboard.php` | Today's sales, current-month sales, low-stock count/items, five recent shift logs based on database records. |

Role enforcement is checked in PHP for every restricted write. Hiding buttons alone is not relied upon for permission enforcement.

**Scope:** The PDF identifies advanced dual-signature order verification as a later phase, not a substitute for the required Shift Log and Sales modules. This Phase 1 implementation intentionally does **not** include payments, delivery-service APIs, or full POS functionality.

## Validation and known limitations

```sh
find app public scripts tests -name '*.php' -exec php -l {} \;
php tests/validation_test.php
php tests/database_test.php
```

- `validation_test.php` checks input validation, malformed dates, money, password hashing, shift defaults, Unicode sales-note truncation, and escaping without needing MySQL.
- `database_test.php` requires the configured MySQL 8 database. It checks stock variance, date-filtered totals, Unicode notes, constraints, and foreign-key behavior inside a transaction; inserted test rows are rolled back.
- Database-integrated auth, foreign-key, CSRF, and cross-device persistence scenarios require a real MySQL test database and a running Apache/PHP host. Do not claim those integration tests passed without executing them.
- No inventory count **audit-history** table: the submitted Phase 1 ERD lists inventory as a standalone entity and reserves a full `inventory_log` for Phase 2.
- There is one active branch database per deployment, matching the branch-level scope. This version does not implement multi-branch tenancy or head-office cross-branch reporting.
- Password protection includes basic per-session throttling; for exposure to the open Internet, add an edge/network-based per-IP rate limit, automated backups, an admin audit log, and operational monitoring.
- PHP/MySQL implementation uses procedural server rendering; the existing TypeScript system has not been overwritten or silently migrated. Existing Supabase JSON workspace data are **not** automatically copied into MySQL.

## Capstone requirement references

`Copy of MINI CAPSTONE (2).pdf`: sections 4.2.1–4.2.4 (roles, five core modules, PHP/MySQL), 5.2.2–5.3.1 (relational schema), 5.4.1–5.4.8 (screen and responsive requirements), 6.1 (PHP/SQL/HTML/CSS/JS implementation).

## Local XAMPP test ZIP

Use `START_HERE_XAMPP.txt` for the demo build with two bcrypt-hashed test accounts and a preconfigured local `config.local.php`. The original PHP/MySQL business logic remains unchanged. This demo packaging is **for localhost only**, not a production deployment.

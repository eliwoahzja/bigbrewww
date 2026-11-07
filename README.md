# BBOMS | BigBrew Operations Management System

A standalone PHP 8.x, MySQL/MariaDB, HTML, CSS and JavaScript application for a school mini-capstone project. Runs locally using XAMPP and phpMyAdmin. No Node.js, npm, Vercel or Supabase required.

## Local XAMPP installation

1. Put the project folder at `C:\xampp\htdocs\bigbrew\`.
2. Open the XAMPP Control Panel and start **Apache** and **MySQL**.
3. Open `http://localhost/phpmyadmin/`.
4. Create a database named **bboms** with collation `utf8mb4_unicode_ci`.
5. Select **bboms**, choose **Import**, and import the repository's `database.sql`. This creates `users`, `inventory`, `shift_logs`, and `sales` and adds two local demo accounts. **Skip importing if your existing bboms database already has tables and records.**
6. Open `http://localhost/bigbrew/`. The root `index.php` forwards into `public/`, and every link stays inside that folder.

If you prefer clean URLs, point an Apache virtual host's `DocumentRoot` at this project's `public/` folder. Both layouts work.

The committed `config.local.php` sets local connection defaults:

| Setting | Local default |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `3306` |
| Database | `bboms` |
| Username | `root` |
| Password | Empty |

The application reads `config.local.php` for localhost. The committed file contains no secret password. If you need custom credentials, copy `config.example.php` to `config.private.php` and keep that file out of Git. This repository has no `.gitignore`, so check `git status` before committing.

**Existing installations:** Back up any existing `config.local.php` before replacing project files, especially if you used a separate MySQL instance on port `3307`. Restore those credentials into a local `config.private.php` as needed. A private configuration takes priority over the committed defaults. Databases are not migrated or synchronized automatically.

Only localhost defaults belong in the committed `config.local.php`. Never commit real database passwords. Keep custom credentials in `config.private.php` and never stage that file; there is no `.gitignore` to hide it.

### Demo sign-in

Importing `database.sql` into a new, empty database adds:

| Role | Username | Password |
| --- | --- | --- |
| Manager | `manager` | `Bigbrew12345` |
| Staff | `staff` | `Bigbrew12345` |

These accounts are for local testing only. Change the demo credentials before allowing anyone else to access the system. Importing into a database with existing users does not reset their passwords.

## Android preview with KSWEB

1. Install or open KSWEB and enable the web server, PHP and MySQL/MariaDB.
2. Download the repository ZIP from GitHub and extract it to your configured KSWEB web root, typically `/sdcard/htdocs/bigbrew/`. The folder must contain `index.php`, `app/` and `public/`.
3. In a local phpMyAdmin instance connected to KSWEB's database, create `bboms` and import `database.sql`. Do not re-import over an existing database with real records.
4. Visit `http://localhost:8080/bigbrew/` using KSWEB's default Lighttpd port (adjust if you changed the port).
5. If KSWEB uses MySQL host `127.0.0.1`, port `3306`, user `root` and an empty password, the committed `config.local.php` works directly. Otherwise, create `config.private.php` with your database credentials and keep it out of Git.

The web server's configured web root must be the extracted project's parent folder for this URL to work. KSWEB's Lighttpd does not read Apache `.htaccess` files. Keep the local test server restricted to your own device.

## Application features

- **Login and user management:** bcrypt-hashed passwords, PHP sessions, CSRF protection and Manager/Staff permissions.
- **Inventory:** items, quantities, unit costs, par levels and physical counts.
- **Shift logs:** dated notes for opening, mid and closing shifts.
- **Sales:** manual transaction entries and reports.
- **Dashboard:** sales totals, inventory alerts and recent activity.

## Troubleshooting

- If the page is blank or unstyled, verify the files are at `C:\xampp\htdocs\bigbrew\` and visit `http://localhost/bigbrew/`.
- If signing in shows a database error, confirm MySQL is running and the `bboms` database has been imported. Check any existing `config.local.php` for a wrong host, port or password.
- Check `C:\xampp\apache\logs\error.log` for the specific PHP or PDO error.
- Ensure PHP's `pdo_mysql` extension is enabled.

## Project structure

- `app/` contains PHP authentication, database and application logic.
- `public/` contains the web pages and required images, CSS and JavaScript.
- `database.sql` is the schema and starter account import for phpMyAdmin.
- `config.local.php` contains safe local defaults for XAMPP and Android KSWEB.
- `config.example.php` is a template for a private `config.private.php` override.
- `scripts/create_manager.php` creates the initial manager on a fresh database without demo accounts, using a command-line prompt.

Private application files and configuration should not be exposed as web pages. For public deployment, use a PHP/MySQL-compatible host, configure an Apache document root of `public/`, use private database credentials and replace the local demo accounts.

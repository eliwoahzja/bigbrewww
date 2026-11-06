# BBOMS | BigBrew Operations Management System

A standalone PHP 8.x, MySQL/MariaDB, HTML, CSS and JavaScript application for a school mini-capstone project. Runs locally using XAMPP and phpMyAdmin. No Node.js, npm, Vercel or Supabase required.

## Local XAMPP installation

1. Put the project folder at `C:\xampp\htdocs\bigbrew\`.
2. Open the XAMPP Control Panel and start **Apache** and **MySQL**.
3. Open `http://localhost/phpmyadmin/`.
4. Create a database named **bboms** with collation `utf8mb4_unicode_ci`.
5. Select **bboms**, choose **Import**, and import the repository's `database.sql`. This creates `users`, `inventory`, `shift_logs`, and `sales` and adds two local demo accounts. **Skip importing if your existing bboms database already has tables and records.**
6. Open `http://localhost/bigbrew/`.

The committed `config.xampp.php` sets local connection defaults:

| Setting | Local default |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `3306` |
| Database | `bboms` |
| Username | `root` |
| Password | Empty |

You do **not** need to create a separate config file if these settings match your XAMPP MySQL instance. The application reads `config.xampp.php` only on localhost when no private `config.local.php` exists.

**Existing installations:** If `config.local.php` already exists, it always takes priority. If you previously used a separate MySQL instance on port `3307`, keep or update that private configuration based on the database where your actual records reside. This project does not migrate or synchronize databases automatically.

For custom database credentials, copy `config.example.php` to `config.local.php`, update the values and keep `config.local.php` private. Never commit real database passwords to GitHub.

### Demo sign-in

Importing `database.sql` into a new, empty database adds:

| Role | Username | Password |
| --- | --- | --- |
| Manager | `manager` | `Bigbrew12345` |
| Staff | `staff` | `Bigbrew12345` |

These accounts are for local testing only. Change the demo credentials before allowing anyone else to access the system. Importing into a database with existing users does not reset their passwords.

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
- `config.xampp.php` contains safe defaults for local XAMPP.
- `config.example.php` is a template for custom private connections.
- `scripts/create_manager.php` creates the initial manager on a fresh database without demo accounts, using a command-line prompt.
- `tests/` contains regression checks for validation and database operations.

Private application files and configuration should not be exposed as web pages. For public deployment, use a PHP/MySQL-compatible host, configure an Apache document root of `public/`, use private database credentials and replace the local demo accounts.

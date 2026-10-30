# BBOMS XAMPP installation (complete demo build)

This local installation has been migrated to a dedicated MySQL 8 instance on port 3307. Follow [MYSQL8_MIGRATION.md](MYSQL8_MIGRATION.md) for startup and recovery; the generic fresh-install instructions below do not describe its current database connection.

1. Extract this archive to `C:\xampp\htdocs\`, producing `C:\xampp\htdocs\bigbrew\`.
2. Start **Apache** and **MySQL** in XAMPP.
3. Open `http://localhost/phpmyadmin/` and create a database named `bboms`.
4. Import `C:\xampp\htdocs\bigbrew\database.sql`. This creates the BBOMS tables **and** two local demo accounts. If you already imported the earlier schema, import `demo_users.sql` instead to add only the accounts.
5. Open `http://localhost/bigbrew/` to sign in.

**Manager**: `manager` / `Bigbrew12345`  
**Staff**: `staff` / `Bigbrew12345`

`config.local.php` is included for local XAMPP's usual MySQL configuration (`127.0.0.1`, port `3306`, `root`, blank password). Edit it if your MySQL setup differs.

The app's header and browser tab use a bundled BigBrew-style cup-and-moustache icon. Static files are served from `bigbrew/public/assets/`.

**Security:** These are known demonstration credentials. Do not deploy the demo database, accounts, or development database settings to a public server. For production, set Apache's document root to `public/`, remove demo accounts, and provide private database credentials.

**Troubleshooting:** If the page looks unstyled, use `http://localhost/bigbrew/`, not `app/database.php`, and check that `public/assets/styles.css` exists. If signing in fails, confirm you imported `database.sql`, configured MySQL, and used the demo credentials above. If the usernames already exist, `INSERT IGNORE` keeps their previous passwords unchanged.


## UI update: Users tab horizontal shift and stale cache

This release reserves scrollbar space on short and long pages, and automatically
adds file-modification timestamps to the CSS and JavaScript asset URLs. The
footer displays **UI v1.2** as an installation check. Replace the contents of
`C:\xampp\htdocs\bigbrew\` with the `bigbrew` folder from this ZIP, while
keeping any custom `config.local.php` connection settings. No SQL changes.

Skeleton placeholders appear only for network-bound PHP navigation, with no
simulated delay. Native reduced-motion preferences disable the shimmer and page
entry transform. If the footer still has no `UI v1.2` marker, the browser is
loading a different Apache document root or an older extracted copy.

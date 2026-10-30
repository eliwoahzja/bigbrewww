# BBOMS local MySQL 8 migration

BBOMS now uses the installed MySQL Community Server **8.0.45** binaries with its own data directory and a dedicated application account.

| Setting | Value |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `3307` |
| Database | `bboms` |
| Application account | `bboms_app` |
| Instance configuration | `C:\xampp\bigbrew-mysql8\my.ini` |
| Data directory | `C:\xampp\bigbrew-mysql8\data` |
| Error log | `C:\xampp\bigbrew-mysql8\mysql-error.log` |
| Private administrator credentials | `C:\xampp\bigbrew-mysql8\credentials.php` |
| Pre-migration SQL and connection backup | `C:\xampp\bigbrew-mysql8\backup-20261030-132427` |

The application password is in the ignored `config.local.php`. Do not publish that file, the private credentials, or the backup. The instance directory is restricted to the current Windows account, Administrators, and SYSTEM.

## Start after a reboot

Start Apache in XAMPP, then run this command from the project directory:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_mysql8.ps1
```

This starts only the dedicated BBOMS instance. It does not require administrator privileges or install a Windows service. XAMPP's MySQL button still controls its original MariaDB server, not the BBOMS instance on port 3307. Do not uninstall the shared MySQL binaries while BBOMS uses them.

## Verification and recovery

All source rows were compared field-for-field after copying, including user IDs, password hashes, timestamps, and account status. The migrated snapshot contained three users and zero inventory items, shift logs, or sales. Auto-increment counters and foreign-key actions were preserved.

MariaDB on port 3306 and its original BBOMS database were left unchanged. Other projects and the pre-existing `MySQL80` Windows service were not changed. New BBOMS writes now go only to MySQL 8; the old database is not a synchronized replica. Before any rollback, back up the current MySQL 8 data and reconcile changes rather than simply restoring the old connection file.

## Document alignment

Inventory history and dual-signature verification remain Phase 2 features, following the detailed Phase 1 ERD. Stock variance means current quantity minus par level; it is not a physical-count audit history.

The shift default uses Manila time: Opening 06:00–11:59, Mid 12:00–17:59, and Closing 18:00–05:59. Staff can override the selection; adjust `current_shift()` in `app/validation.php` if the branch uses different shift hours.

The requested eight-character password minimum, removed interface labels, 1.5-second skeleton minimum, and reduced-motion support remain in place.

$ErrorActionPreference = 'Stop'
$server = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
$settings = 'C:\xampp\bigbrew-mysql8\my.ini'
if (!(Test-Path $server) -or !(Test-Path $settings)) {
    throw 'The dedicated BBOMS MySQL 8 instance is not installed.'
}
$running = Get-CimInstance Win32_Process -Filter "Name='mysqld.exe'" | Where-Object { $_.CommandLine -like '*bigbrew-mysql8*' }
if ($running) {
    Write-Output 'BBOMS MySQL 8 is already running on port 3307.'
    exit 0
}
$process = Start-Process -FilePath $server -ArgumentList ('--defaults-file="' + $settings + '"') -WindowStyle Hidden -PassThru
$deadline = (Get-Date).AddSeconds(30)
do {
    $process.Refresh()
    if ($process.HasExited) { throw 'MySQL did not start. Check C:\xampp\bigbrew-mysql8\mysql-error.log.' }
    $dedicated = @(Get-CimInstance Win32_Process -Filter "Name='mysqld.exe'" | Where-Object { $_.CommandLine -like '*bigbrew-mysql8*' } | Select-Object -ExpandProperty ProcessId)
    $listener = Get-NetTCPConnection -State Listen -LocalPort 3307 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -in $dedicated }
    if ($listener) { Write-Output 'BBOMS MySQL 8 is running on port 3307.'; exit 0 }
    Start-Sleep -Milliseconds 250
} while ((Get-Date) -lt $deadline)
throw 'MySQL startup timed out. Check C:\xampp\bigbrew-mysql8\mysql-error.log.'

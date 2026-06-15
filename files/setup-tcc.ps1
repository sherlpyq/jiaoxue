$targetDir = "C:\tcc"
$zipPath = "$env:TEMP\tcc.zip"
$downloadUrl = "https://zzy.lcxa.online/files/tcc.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Tiny C Compiler (TCC) setup..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (Test-Path $targetDir) {
    Write-Host "Detected existing directory: $targetDir. Cleaning up..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $targetDir
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Write-Host "Downloading TCC package..." -ForegroundColor Green
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -ErrorAction Stop
} catch {
    Write-Host "Primary download failed. Trying backup..." -ForegroundColor Yellow
    $backupUrl = "http://download.savannah.gnu.org/releases/tinycc/tcc-0.9.27-win64-bin.zip"
    try {
        Invoke-WebRequest -Uri $backupUrl -OutFile $zipPath -ErrorAction Stop
    } catch {
        Write-Host "Download failed from all sources." -ForegroundColor Red
        Exit 1
    }
}

Write-Host "Extracting files..." -ForegroundColor Green
$tempExtract = "$env:TEMP\tcc_temp"
if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract }
New-Item -ItemType Directory -Force -Path $tempExtract | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $tempExtract -Force
Remove-Item -Force $zipPath

$subDirs = Get-ChildItem -Path $tempExtract -Directory
if ($subDirs.Count -eq 1) {
    Copy-Item -Path "$($subDirs[0].FullName)\*" -Destination $targetDir -Recurse -Force
} else {
    Copy-Item -Path "$tempExtract\*" -Destination $targetDir -Recurse -Force
}
Remove-Item -Recurse -Force $tempExtract

Write-Host "========================================" -ForegroundColor Cyan
$choice = Read-Host "Add TCC to User PATH? [Y/N]"
Write-Host "========================================" -ForegroundColor Cyan

if ($choice -eq 'Y' -or $choice -eq 'y') {
    $oldPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($oldPath -notlike "*$targetDir*") {
        $newPath = $oldPath
        if ($newPath -and -not $newPath.EndsWith(";")) {
            $newPath += ";"
        }
        $newPath += "$targetDir"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "PATH variable updated successfully." -ForegroundColor Green
        Write-Host "Please restart your terminal and type 'tcc' to verify!" -ForegroundColor Yellow
    } else {
        Write-Host "PATH already configured." -ForegroundColor Yellow
    }
}

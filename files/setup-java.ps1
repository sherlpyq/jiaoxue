$targetDir = "C:\openjdk17"
$zipPath = "$env:TEMP\openjdk17.zip"
$downloadUrl = "https://zzy.lcxa.online/files/openjdk17.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Java 17 environment setup..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (Test-Path $targetDir) {
    Write-Host "Detected existing directory: $targetDir. Cleaning up..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $targetDir
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Write-Host "Downloading OpenJDK 17 package..." -ForegroundColor Green
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -ErrorAction Stop
} catch {
    Write-Host "Primary download failed. Trying backup..." -ForegroundColor Yellow
    $backupUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.11%2B9/OpenJDK17U-jdk_x64_windows_hotspot_17.0.11_9.zip"
    try {
        Invoke-WebRequest -Uri $backupUrl -OutFile $zipPath -ErrorAction Stop
    } catch {
        Write-Host "Download failed from all sources." -ForegroundColor Red
        Exit 1
    }
}

Write-Host "Extracting files..." -ForegroundColor Green
$tempExtract = "$env:TEMP\java_temp"
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

Write-Host "Setting JAVA_HOME environment variable..." -ForegroundColor Green
[Environment]::SetEnvironmentVariable("JAVA_HOME", $targetDir, "User")

Write-Host "========================================" -ForegroundColor Cyan
$choice = Read-Host "Add Java to User PATH? [Y/N]"
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
        Write-Host "Please restart your terminal and type 'java -version' to verify!" -ForegroundColor Yellow
    } else {
        Write-Host "PATH already configured." -ForegroundColor Yellow
    }
}

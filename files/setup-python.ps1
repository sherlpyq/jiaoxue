$targetDir = "C:\python312"
$zipPath = "$env:TEMP\python312.zip"
$downloadUrl = "https://zzy.lcxa.online/files/python312.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Python 3.12 environment setup..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (Test-Path $targetDir) {
    Write-Host "Detected existing directory: $targetDir. Cleaning up..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $targetDir
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Write-Host "Downloading Python 3.12 package..." -ForegroundColor Green
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath

Write-Host "Extracting files..." -ForegroundColor Green
Expand-Archive -Path $zipPath -DestinationPath $targetDir -Force
Remove-Item -Force $zipPath

$pthFile = "$targetDir\python312._pth"
if (Test-Path $pthFile) {
    $pthContent = Get-Content $pthFile
    $pthContent = $pthContent -replace '#import site', 'import site'
    Set-Content $pthFile $pthContent
}

Write-Host "Installing pip package manager..." -ForegroundColor Green
$pipScript = "$env:TEMP\get-pip.py"
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $pipScript
Start-Process -FilePath "$targetDir\python.exe" -ArgumentList $pipScript -Wait -NoNewWindow
Remove-Item -Force $pipScript

Write-Host "========================================" -ForegroundColor Cyan
$choice = Read-Host "Environment extracted to C:\python312. Add it to User PATH? [Y/N]"
Write-Host "========================================" -ForegroundColor Cyan

if ($choice -eq 'Y' -or $choice -eq 'y') {
    $oldPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($oldPath -notlike "*$targetDir*") {
        $newPath = $oldPath
        if ($newPath -and -not $newPath.EndsWith(";")) {
            $newPath += ";"
        }
        $newPath += "$targetDir;$targetDir\Scripts"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "PATH variable updated successfully." -ForegroundColor Green
        Write-Host "Please restart your terminal and type 'python --version' to verify!" -ForegroundColor Yellow
    } else {
        Write-Host "PATH already configured." -ForegroundColor Yellow
    }
} else {
    Write-Host "Skipped. You can run Python directly via C:\python312\python.exe" -ForegroundColor Yellow
}

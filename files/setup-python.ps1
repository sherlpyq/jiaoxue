$targetDir = "C:\python312"
$zipPath = "$env:TEMP\python312.zip"
$downloadUrl = "https://zzy.lcxa.online/files/python312.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "开始配置 Python 3.12 绿色环境..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (Test-Path $targetDir) {
    Write-Host "检测到已存在目标目录: $targetDir，正在清理旧环境..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $targetDir
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Write-Host "正在从云盘下载 Python 3.12 压缩包..." -ForegroundColor Green
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath

Write-Host "正在解压环境..." -ForegroundColor Green
Expand-Archive -Path $zipPath -DestinationPath $targetDir -Force
Remove-Item -Force $zipPath

$pthFile = "$targetDir\python312._pth"
if (Test-Path $pthFile) {
    $pthContent = Get-Content $pthFile
    $pthContent = $pthContent -replace '#import site', 'import site'
    Set-Content $pthFile $pthContent
}

Write-Host "正在为绿色版 Python 自动安装 pip 包管理器..." -ForegroundColor Green
$pipScript = "$env:TEMP\get-pip.py"
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $pipScript
Start-Process -FilePath "$targetDir\python.exe" -ArgumentList $pipScript -Wait -NoNewWindow
Remove-Item -Force $pipScript

Write-Host "========================================" -ForegroundColor Cyan
$choice = Read-Host "环境已成功解压至 C:\python312。是否将其添加到用户环境变量 PATH 中? [Y/N]"
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
        Write-Host "环境变量已成功写入。" -ForegroundColor Green
        Write-Host "请重新打开终端（CMD/PowerShell），输入 python --version 验证是否配置成功！" -ForegroundColor Yellow
    } else {
        Write-Host "环境变量已存在，无需重复写入。" -ForegroundColor Yellow
    }
} else {
    Write-Host "已跳过环境变量配置。您可以直接通过 C:\python312\python.exe 运行绿色环境。" -ForegroundColor Yellow
}

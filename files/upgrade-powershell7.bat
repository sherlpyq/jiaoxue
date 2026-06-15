@echo off
setlocal EnableExtensions

set "PS7_EXE=C:\Program Files\PowerShell\7\pwsh.exe"
set "PS7_PROFILE_GUID={574e775e-4f2a-5b96-ac1e-a2962a402336}"
set "WT_SETTINGS=%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"

echo ========================================
echo PowerShell 7 Setup
echo ========================================
echo.

echo Setting execution policy for CurrentUser to RemoteSigned...
reg add "HKCU\SOFTWARE\Microsoft\PowerShell\1\ShellIds\Microsoft.PowerShell" /v ExecutionPolicy /t REG_SZ /d RemoteSigned /f >nul
if errorlevel 1 (
  echo Failed to set Windows PowerShell execution policy.
  exit /b 1
)
reg add "HKCU\SOFTWARE\Microsoft\PowerShellCore\ShellIds\Microsoft.PowerShell" /v ExecutionPolicy /t REG_SZ /d RemoteSigned /f >nul
if errorlevel 1 (
  echo Failed to set PowerShell 7 execution policy.
  exit /b 1
)
echo.

where winget >nul 2>nul
if errorlevel 1 (
  echo winget was not found. Cannot install or upgrade PowerShell 7.
  exit /b 1
)

echo Installing or upgrading PowerShell 7...
winget install --id Microsoft.PowerShell --exact --source winget --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo Failed to install or upgrade PowerShell 7.
  exit /b 1
)
echo.

if not exist "%PS7_EXE%" (
  echo PowerShell 7 executable was not found at:
  echo %PS7_EXE%
  exit /b 1
)

if exist "%WT_SETTINGS%" (
  echo Setting Windows Terminal default profile to PowerShell 7...
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
    "$path = [Environment]::ExpandEnvironmentVariables('%WT_SETTINGS%');" ^
    "$guid = '%PS7_PROFILE_GUID%';" ^
    "$json = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json;" ^
    "$json.defaultProfile = $guid;" ^
    "$json | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $path -Encoding UTF8"
  if errorlevel 1 (
    echo Failed to update Windows Terminal settings.
    exit /b 1
  )
) else (
  echo Windows Terminal settings file was not found. Skipping default profile update.
)
echo.

echo PowerShell 7 path:
echo %PS7_EXE%
echo.
echo Done.

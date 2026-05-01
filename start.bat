@echo off
setlocal
cd /d "%~dp0"

set PORT=8010

where python >nul 2>nul
if %errorlevel% equ 0 (
  start "F1 Server" cmd /k python -m http.server %PORT%
) else (
  start "F1 Server" cmd /k py -3 -m http.server %PORT%
)

timeout /t 2 /nobreak >nul
start "" http://localhost:%PORT%/?build=b2

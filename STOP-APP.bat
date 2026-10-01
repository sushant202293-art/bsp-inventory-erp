@echo off
rem ===========================================================================
rem  STOP-APP.bat  --  shut down the BSP Inventory ERP dev server
rem
rem  Finds whatever is listening on port 5173 and stops it.
rem ===========================================================================
setlocal
cd /d "%~dp0"

echo.
echo   Stopping BSP Inventory ERP...
echo.

rem --- Find the PID listening on 5173 ---------------------------------------
set "PID="
for /f "tokens=5" %%p in ('netstat -ano -p TCP ^| findstr "LISTENING" ^| findstr ":5173 "') do (
    if not "%%p"=="0" set "PID=%%p"
)

if not "%PID%"=="" (
    echo   Stopping process %PID% on port 5173...
    taskkill /PID %PID% /T /F >NUL 2>&1
    ping -n 2 127.0.0.1 >NUL 2>&1
    echo   [OK] Stopped.
) else (
    echo   Nothing was listening on port 5173.
)

rem --- Catch any stray vite/node dev process for this project ---------------
taskkill /FI "WINDOWTITLE eq BSP Inventory ERP*" /T /F >NUL 2>&1

echo.
ping -n 4 127.0.0.1 >NUL 2>&1
exit /b 0

@echo off
rem ===========================================================================
rem  START-APP.bat  --  one-click launcher for BSP Inventory ERP
rem
rem  This app is a Vite/React project. It CANNOT be opened by double-clicking
rem  index.html: browsers block ES modules over file:// and Vite emits absolute
rem  /assets paths, so you get a blank white page. It must be served over HTTP.
rem
rem  This script installs dependencies (first run), starts the dev server,
rem  waits until it actually answers, then opens your browser.
rem
rem  Stop it any time with STOP-APP.bat
rem ===========================================================================
setlocal
cd /d "%~dp0"

set "APP_URL=http://localhost:5173/"

echo.
echo   BSP Inventory ERP
echo   ==================
echo.

rem --- Already running? Then just open it. -----------------------------------
curl -s -o NUL --max-time 3 "http://localhost:5173/" 2>NUL
if %ERRORLEVEL%==0 (
    echo   Server is already running.
    start "" "%APP_URL%"
    echo   Opening %APP_URL%
    exit /b 0
)

rem --- First-run dependency install -----------------------------------------
if not exist "node_modules" (
    echo   First run detected. Installing dependencies, this takes a few minutes...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo   [X] npm install failed. See the messages above.
        pause
        exit /b 1
    )
    echo.
)

if not exist ".env" (
    echo   [X] .env file is missing.
    echo       Copy .env.example to .env and fill in your Supabase values.
    pause
    exit /b 1
)

rem --- Start the dev server in its own minimized window ----------------------
echo   Starting dev server...
start "BSP Inventory ERP" /min cmd /c "npm run dev > vite-dev.log 2>&1"

rem --- Wait for it to actually answer before opening the browser -------------
rem `timeout` is unreliable when stdin is redirected, so sleep via ping instead.
set /a tries=0
:wait
set /a tries+=1
curl -s -o NUL --max-time 2 "http://localhost:5173/" 2>NUL
if not %ERRORLEVEL%==0 goto :ready
if %tries% lss 90 (
    set /a mod=%tries% %% 10
    if %mod%==0 echo   Still waiting... please do not close this window.
    ping -n 2 127.0.0.1 >NUL 2>&1
    goto :wait
)
echo.
echo   [X] The server did not start within 90 seconds.
echo       Check "%~dp0vite-dev.log" for the error.
pause
exit /b 1

:ready
echo.
echo   [OK] Server is up.
echo.
echo     URL  : %APP_URL%
echo     Login: admin@bspinventory.com / Admin@12345
echo     Log  : "%~dp0vite-dev.log"
echo.
echo   This window will stay open. Close it, or run STOP-APP.bat, to shut down.
echo.
start "" "%APP_URL%"
ping -n 9 127.0.0.1 >NUL 2>&1
exit /b 0

@echo off
setlocal
cd /d "%~dp0"
title Site - local server
set LOG=local-run.log
set COREPACK_ENABLE_DOWNLOAD_PROMPT=0
set NEXT_TELEMETRY_DISABLED=1
echo [%date% %time%] START > "%LOG%"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js is not installed.
  echo  Install Node.js LTS from https://nodejs.org and run this file again.
  echo NODE_NOT_FOUND >> "%LOG%"
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo NODE %%v >> "%LOG%"

set PNPM=corepack pnpm
call corepack pnpm -v >> "%LOG%" 2>&1
if errorlevel 1 set PNPM=npx -y pnpm@10.34.3
echo PNPM_CMD %PNPM% >> "%LOG%"

echo.
echo  [1/3] Installing dependencies (can take a few minutes)...
echo STEP install >> "%LOG%"
call %PNPM% install >> "%LOG%" 2>&1
if errorlevel 1 goto fail

echo  [2/3] Building the site...
echo STEP build >> "%LOG%"
call %PNPM% build >> "%LOG%" 2>&1
if errorlevel 1 goto fail

echo  [3/3] Starting server: http://localhost:3000
echo  Close this window to stop the site.
echo.
echo STEP start >> "%LOG%"
call %PNPM% start
pause
exit /b 0

:fail
echo FAILED >> "%LOG%"
echo.
echo  Something went wrong. Last lines of local-run.log:
echo.
powershell -NoProfile -Command "Get-Content -Tail 30 local-run.log"
pause
exit /b 1

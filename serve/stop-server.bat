@echo off
REM ============================================================
REM  stop-server.bat  --  stop the local web server
REM
REM  Use this if you started the server with serve-hidden.vbs
REM  and need to shut it down without restarting the PC.
REM
REM  The actual work is in stop-server.ps1 (see the comments there
REM  for why it is not done in pure batch).
REM
REM  Note: this stops whatever is listening on port 8000.
REM ============================================================

title Stop local server

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-server.ps1"

echo.
pause

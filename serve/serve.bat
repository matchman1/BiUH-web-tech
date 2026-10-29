@echo off
REM ============================================================
REM  serve.bat  --  start a local web server for this folder
REM
REM  Why this is needed:
REM    The pages load nav.html / footer.html with fetch().
REM    Browsers block fetch() on file:// URLs (CORS), so opening
REM    index.html by double-clicking will show NO nav and NO footer.
REM    fetch needs a real HTTP server. That is the whole reason
REM    this file exists.
REM
REM  Usage: double-click this file. Keep the window open while
REM         you are looking at the site. Close it to stop.
REM
REM  Site address:  http://127.0.0.1:8000/index.html
REM ============================================================

title Local server - BiUH-web  (close this window to stop)

cd /d "%~dp0"

echo.
echo   Serving folder: %CD%
echo   Open this in your browser:
echo.
echo       http://127.0.0.1:8000/index.html
echo.
echo   Keep this window open while browsing.
echo   Press Ctrl+C or just close this window to stop the server.
echo.

python -m http.server 8000 --bind 127.0.0.1 --directory "%CD%"

REM If we get here the server stopped (or python was not found).
echo.
echo   Server stopped.
pause

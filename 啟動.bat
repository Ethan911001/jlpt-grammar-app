@echo off
chcp 65001 >nul
title JLPT 文法練習
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo.
echo ============================================
echo    JLPT 文法練習 App
echo ============================================
echo.
echo Starting dev server...
echo.
echo [Close this window to stop the server]
echo.

start "" /b cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:5174"

npm run dev

echo.
echo Server stopped. Press any key to close...
pause >nul

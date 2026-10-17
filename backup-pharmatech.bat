@echo off
chcp 65001 >nul
title PharmaTech — النسخ الاحتياطي لقاعدة بيانات الصيدلية

echo.
echo ========================================================
echo   💾 أداة النسخ الاحتياطي التلقائي لنظام فارماتك
echo   PharmaTech Automated Enterprise Backup Tool
echo ========================================================
echo.

node "%~dp0scripts\backup-data.mjs"

if %errorlevel% neq 0 (
    echo.
    echo [خطأ] تعذر إتمام النسخ الاحتياطي!
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo اضغط أي مفتاح لإغلاق هذه النافذة...
pause >nul
exit /b 0

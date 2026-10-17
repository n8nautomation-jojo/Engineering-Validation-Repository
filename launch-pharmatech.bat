@echo off
chcp 65001 >nul
title PharmaTech — تشغيل نظام فارماتك للصيدليات

echo.
echo ========================================================
echo   🏥 منظومة فارماتك الذكية لإدارة الصيدليات ونقاط البيع
echo   PharmaTech POS & Enterprise Management Launcher
echo ========================================================
echo.

:: Check Node.js existence
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطأ] تعذر العثور على Node.js على هذا الجهاز!
    echo يُرجى التأكد من تثبيت Node.js v22 أو أحدث لتشغيل النظام.
    echo.
    pause
    exit /b 1
)

echo [1/2] جاري فحص بيئة التشغيل والخادم المحلي...
node "%~dp0scripts\launch-desktop.mjs"

if %errorlevel% neq 0 (
    echo.
    echo [خطأ] حدثت مشكلة أثناء محاولة تشغيل النظام.
    echo.
    pause
    exit /b %errorlevel%
)

exit /b 0

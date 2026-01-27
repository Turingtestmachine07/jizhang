@echo off
chcp 65001 >nul
title Diagnostic Tool
cd /d "%~dp0"

echo ========================================
echo 诊断工具 - 财务管理系统
echo ========================================
echo.

echo [1] 检查 Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo    ❌ Node.js 未安装
    pause
    exit /b 1
) else (
    echo    ✓ Node.js 已安装
    node -v
)
echo.

echo [2] 检查项目目录...
if exist "server\src\app.js" (
    echo    ✓ 后端文件存在
) else (
    echo    ❌ 后端文件不存在: server\src\app.js
)

if exist "client\package.json" (
    echo    ✓ 前端文件存在
) else (
    echo    ❌ 前端文件不存在: client\package.json
)
echo.

echo [3] 检查依赖安装...
if exist "server\node_modules" (
    echo    ✓ 后端依赖已安装
) else (
    echo    ⚠ 后端依赖未安装
)

if exist "client\node_modules" (
    echo    ✓ 前端依赖已安装
) else (
    echo    ⚠ 前端依赖未安装
)
echo.

echo [4] 测试后端启动...
echo    正在测试后端...
cd server
start /min cmd /c "node src/app.js > ..\backend-test.log 2>&1"
cd ..
timeout /t 3 /nobreak >nul

if exist "backend-test.log" (
    echo    后端日志:
    type backend-test.log
    del backend-test.log
)
echo.

echo [5] 检查端口占用...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo    ✓ 端口 3000 已被占用（后端可能在运行）
) else (
    echo    ⚠ 端口 3000 未被占用
)

netstat -ano | findstr ":8888" >nul
if %errorlevel% equ 0 (
    echo    ✓ 端口 8888 已被占用（前端可能在运行）
) else (
    echo    ⚠ 端口 8888 未被占用
)
echo.

echo ========================================
echo 诊断完成
echo ========================================
pause

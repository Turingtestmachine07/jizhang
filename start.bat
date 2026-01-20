@echo off
setlocal
:: 设置编码为 UTF-8 以支持 Emoji 显示
chcp 65001 >nul

:: 设置标题
title 财务管理记账系统启动器

:: 切换到脚本所在目录
cd /d "%~dp0"

echo 🚀 正在启动财务管理记账系统...
echo.

:: 检查 node 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

:: 检查文件夹是否存在
if not exist "server\\data" (
    mkdir "server\\data"
)

:: 启动后端服务
echo 📦 启动后端服务...
cd server
if not exist "node_modules" (
    echo    安装后端依赖...
    call npm install
)
:: start "窗口标题" 命令  (/min 表示最小化启动，去掉 /min 则正常显示窗口)
start "财务系统-后端" npm run dev
cd ..

:: 等待后端启动 (2秒)
timeout /t 2 /nobreak >nul

:: 启动前端服务
echo 🎨 启动前端服务...
cd client
if not exist "node_modules" (
    echo    安装前端依赖...
    call npm install
)
start "财务系统-前端" npm run dev
cd ..

:: 等待前端启动 (3秒)
timeout /t 3 /nobreak >nul

:: 打开浏览器
echo.
echo 🌐 正在打开浏览器...
start http://localhost:5173

echo.
echo ✅ 系统已启动!
echo    前端地址: http://localhost:5173
echo    后端地址: http://localhost:3000
echo.
echo ⚠️  注意: 后端和前端已在新的命令窗口中运行。
echo    若要停止服务，请直接关闭弹出的两个命令窗口。
echo.

pause
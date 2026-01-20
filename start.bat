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
    echo    下载地址: https://nodejs.org/
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
    echo    安装后端依赖，请稍候...
    call npm install
)
:: 使用 /min 最小化启动，减少干扰
start /min "财务系统-后端" cmd /c "npm start"
cd ..

:: 等待后端启动 (3秒)
timeout /t 3 /nobreak >nul

:: 启动前端服务
echo 🎨 启动前端服务...
cd client
if not exist "node_modules" (
    echo    安装前端依赖，请稍候...
    call npm install
)
:: 使用 /min 最小化启动，减少干扰
start /min "财务系统-前端" cmd /c "npm run dev"
cd ..

:: 等待前端启动 (5秒)
timeout /t 5 /nobreak >nul

:: 获取本机IP地址
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "LOCAL_IP=%%a"
    goto :ip_found
)
:ip_found
:: 去除IP地址前后的空格
for /f "tokens=* delims= " %%a in ("%LOCAL_IP%") do set LOCAL_IP=%%a

:: 打开浏览器
echo.
echo 🌐 正在打开浏览器...
start http://localhost:8888

echo.
echo ✅ 系统已启动成功！
echo.
echo 📍 访问地址:
echo    本地访问: http://localhost:8888
if defined LOCAL_IP (
    echo    内网访问: http://%LOCAL_IP%:8888
    echo.
    echo 💡 提示: 同一局域网内的其他设备可使用内网地址访问
)
echo.
echo 🔧 后端服务: http://localhost:3000
echo.
echo ⚠️  注意事项:
echo    - 后端和前端服务已在后台运行（最小化窗口）
echo    - 若要停止服务，请在任务栏找到对应窗口并关闭
echo    - 或者使用任务管理器结束 node.exe 进程
echo.
echo 按任意键关闭此窗口...
pause >nul
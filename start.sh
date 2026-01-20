#!/bin/bash

# 财务管理记账系统 - 一键启动脚本

cd "$(dirname "$0")"

echo "🚀 正在启动财务管理记账系统..."
echo ""

# 检查 node 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查文件夹存在
if [ ! -d "server/data" ]; then
    echo "   创建后端数据文件夹..."
    mkdir -p server/data
fi

# 启动后端服务
echo "📦 启动后端服务..."
cd server
if [ ! -d "node_modules" ]; then
    echo "   安装后端依赖..."
    npm install
fi
npm run dev &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 2

# 启动前端服务
echo "🎨 启动前端服务..."
cd client
if [ ! -d "node_modules" ]; then
    echo "   安装前端依赖..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

# 等待前端启动
sleep 3

# 打开浏览器
echo ""
echo "🌐 正在打开浏览器..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:8888
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:8888
fi

echo ""
echo "✅ 系统已启动!"
echo "   前端地址: http://localhost:8888"
echo "   后端地址: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo ''; echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait

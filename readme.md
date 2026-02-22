# 财务管理记账系统

一个功能完整的财务管理系统，支持订单管理、产品管理、客户管理、支出管理和统计报表等功能。

## 技术栈

### 后端
- Node.js + Express
- SQLite (better-sqlite3)
- ExcelJS (Excel 导出)
- Multer (文件上传)

### 前端
- Vue 3
- Element Plus
- Pinia (状态管理)
- Vue Router
- Axios

## 功能特性

- **订单管理**: 创建、编辑、删除订单，支持订单状态和付款跟踪
- **产品管理**: 产品信息维护，支持分类、规格、图片上传
- **客户管理**: 客户信息管理，查看客户订单历史和消费统计
- **支出管理**: 支出记录和分类管理，支持多种支付方式
- **统计报表**: 销售统计、产品统计、客户统计、应收账款等多维度报表
- **数据导出**: 支持导出订单、支出和统计数据到 Excel
- **数据备份**: 数据库备份和恢复功能
- **响应式设计**: 支持移动端和桌面端
- **暗黑模式**: 支持明暗主题切换

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd jizhang
```

2. 安装后端依赖
```bash
cd server
npm install
```

3. 安装前端依赖
```bash
cd ../client
npm install
```

### 启动项目

#### Windows

使用提供的启动脚本:
```bash
# 在项目根目录下
start.bat
```

#### macOS/Linux

使用提供的启动脚本:
```bash
# 在项目根目录下
chmod +x start.sh
./start.sh
```

#### 手动启动

1. 启动后端服务器
```bash
cd server
npm run dev
```

2. 启动前端开发服务器（新终端窗口）
```bash
cd client
npm run dev
```

3. 访问应用

- 前端: http://localhost:8888
- 后端API: http://localhost:3000

## 项目结构

```
jizhang/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── api/           # API 接口
│   │   ├── components/    # 公共组件
│   │   ├── router/        # 路由配置
│   │   ├── stores/        # 状态管理
│   │   ├── views/         # 页面视图
│   │   ├── App.vue        # 根组件
│   │   └── main.js        # 入口文件
│   └── package.json
├── server/                 # 后端项目
│   ├── src/
│   │   ├── config/        # 配置文件
│   │   ├── database/      # 数据库
│   │   ├── middleware/    # 中间件
│   │   ├── routes/        # 路由
│   │   ├── utils/         # 工具函数
│   │   └── app.js         # 应用入口
│   ├── data/              # 数据库文件
│   ├── uploads/           # 上传文件
│   └── package.json
├── start.bat              # Windows 启动脚本
├── start.sh               # macOS/Linux 启动脚本
└── readme.md
```

## API 文档

### 订单 API

- `GET    /api/orders` - 获取订单列表 (支持分页)
- `GET    /api/orders/:id` - 获取订单详情
- `POST   /api/orders` - 创建订单
- `PUT    /api/orders/:id` - 更新订单
- `PATCH  /api/orders/:id/status` - 更新订单状态
- `PATCH  /api/orders/:id/payment` - 更新付款金额
- `DELETE /api/orders/:id` - 删除订单
- `GET    /api/orders/export/excel` - 导出订单到 Excel

### 产品 API

- `GET    /api/products` - 获取产品列表 (支持分页)
- `GET    /api/products/:id` - 获取产品详情
- `GET    /api/products/categories` - 获取产品分类
- `GET    /api/products/:id/orders` - 获取产品订单历史
- `GET    /api/products/:id/stats` - 获取产品销售统计
- `POST   /api/products` - 创建产品 (支持图片上传)
- `PUT    /api/products/:id` - 更新产品
- `DELETE /api/products/:id` - 删除产品

### 客户 API

- `GET    /api/customers` - 获取客户列表 (支持分页)
- `GET    /api/customers/:id` - 获取客户详情
- `GET    /api/customers/:id/orders` - 获取客户订单历史
- `GET    /api/customers/:id/stats` - 获取客户消费统计
- `POST   /api/customers` - 创建客户
- `PUT    /api/customers/:id` - 更新客户
- `DELETE /api/customers/:id` - 删除客户

### 支出 API

- `GET    /api/expenses` - 获取支出列表 (支持分页)
- `GET    /api/expenses/:id` - 获取支出详情
- `GET    /api/expenses/categories` - 获取支出分类
- `POST   /api/expenses` - 创建支出
- `POST   /api/expenses/categories` - 创建支出分类
- `PUT    /api/expenses/:id` - 更新支出
- `DELETE /api/expenses/:id` - 删除支出
- `DELETE /api/expenses/categories/:id` - 删除支出分类
- `GET    /api/expenses/export/excel` - 导出支出到 Excel

### 统计 API

- `GET /api/stats/dashboard` - 仪表盘统计
- `GET /api/stats/sales` - 销售统计
- `GET /api/stats/products` - 产品统计
- `GET /api/stats/customers` - 客户统计
- `GET /api/stats/receivables` - 应收账款统计
- `GET /api/stats/expenses` - 支出统计
- `GET /api/stats/expenses/categories` - 支出分类统计
- `GET /api/stats/export/excel` - 导出统计报表到 Excel

### 备份 API

- `GET    /api/backup` - 获取备份列表
- `POST   /api/backup` - 创建备份
- `POST   /api/backup/restore/:filename` - 恢复备份
- `DELETE /api/backup/:filename` - 删除备份
- `GET    /api/backup/download/:filename` - 下载备份

## 配置说明

### 后端配置

在 `server/.env` 文件中配置：

```env
PORT=3000                  # 服务器端口
NODE_ENV=development       # 环境 (development/production)
DB_PATH=./data/jizhang.db # 数据库路径
UPLOAD_DIR=./uploads       # 上传目录
MAX_FILE_SIZE=5242880      # 最大文件大小 (字节)
LOG_LEVEL=info             # 日志级别
CORS_ORIGIN=*              # CORS 配置
```

### 前端配置

前端使用 Vite 的代理功能，在开发环境中自动代理 API 请求到后端。

生产环境需要配置 Nginx 或其他反向代理。

## 最近更新 (v1.1.0)

### 安全性改进
- ✅ 修复 SQL 注入漏洞 (stats.js 中的 groupBy 参数)
- ✅ 添加输入验证中间件
- ✅ 添加请求体大小限制

### 功能增强
- ✅ 添加分页功能 (订单、产品、客户、支出列表)
- ✅ 完善错误处理机制
- ✅ 添加请求日志记录
- ✅ 添加环境变量配置

### 代码质量
- ✅ 清理调试代码
- ✅ 统一错误响应格式
- ✅ 优化代码结构

## 开发指南

### 数据库

项目使用 SQLite 数据库，数据库文件位于 `server/data/jizhang.db`。

数据库表结构会在首次启动时自动创建。

### 添加新功能

1. 后端：在 `server/src/routes/` 中添加新的路由文件
2. 前端：在 `client/src/views/` 中添加新的页面组件
3. API：在 `client/src/api/index.js` 中添加 API 调用函数

### 构建生产版本

前端构建：
```bash
cd client
npm run build
```

构建产物会生成在 `client/dist/` 目录。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请提交 Issue。

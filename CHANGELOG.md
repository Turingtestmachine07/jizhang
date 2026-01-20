# 更新日志 (CHANGELOG)

## [1.1.0] - 2026-01-20

### 安全性改进 🔐

#### 修复 SQL 注入漏洞
- **问题**: [server/src/routes/stats.js:107-120,247-260](server/src/routes/stats.js) 中的 `groupBy` 参数直接拼接到 SQL 语句中,存在 SQL 注入风险
- **修复**: 添加白名单验证,仅允许 `['day', 'month', 'year']` 作为有效值
- **影响范围**: `/api/stats/sales` 和 `/api/stats/expenses` 接口

#### 添加输入验证
- 新增验证中间件: [server/src/middleware/validation.js](server/src/middleware/validation.js)
  - `validateRequired` - 验证必填字段
  - `validateNumber` - 验证数字类型
  - `validateDate` - 验证日期格式
  - `validateEnum` - 验证枚举值
  - `validateId` - 验证ID参数
  - `sanitizeString` - 防止XSS攻击

#### 请求体大小限制
- 添加 JSON 和 URL 编码请求体大小限制 (10MB)
- 防止大型请求导致的拒绝服务攻击

### 功能增强 ✨

#### 分页功能
- **新增文件**: [server/src/utils/pagination.js](server/src/utils/pagination.js)
- **更新的路由**:
  - [server/src/routes/orders.js:19-65](server/src/routes/orders.js#L19-L65) - 订单列表分页
  - [server/src/routes/products.js:37-66](server/src/routes/products.js#L37-L66) - 产品列表分页
  - [server/src/routes/customers.js:8-33](server/src/routes/customers.js#L8-L33) - 客户列表分页
  - [server/src/routes/expenses.js:51-97](server/src/routes/expenses.js#L51-L97) - 支出列表分页
- **默认设置**: 每页20条,最大100条
- **查询参数**: `?page=1&pageSize=20`
- **响应格式**:
  ```json
  {
    "data": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```

#### 错误处理改进
- **新增文件**: [server/src/middleware/errorHandler.js](server/src/middleware/errorHandler.js)
- **自定义错误类**:
  - `AppError` - 基础错误类
  - `BadRequestError` - 400 错误
  - `NotFoundError` - 404 错误
  - `ValidationError` - 422 验证错误
- **统一错误响应格式**
- **结构化日志记录** (JSON格式)
- **404 路由处理**
- **数据库约束错误处理**

#### 请求日志
- 自动记录所有API请求
- 记录内容:
  - HTTP方法和URL
  - 响应状态码
  - 请求耗时
  - 客户端IP
- 日志格式: JSON (便于日志分析工具解析)

#### 环境变量配置
- **新增文件**:
  - [server/.env.example](server/.env.example) - 环境变量模板
  - [server/.env](server/.env) - 实际配置文件
  - [server/src/config/index.js](server/src/config/index.js) - 配置管理模块
- **可配置项**:
  - `PORT` - 服务器端口
  - `NODE_ENV` - 运行环境
  - `DB_PATH` - 数据库路径
  - `UPLOAD_DIR` - 上传目录
  - `MAX_FILE_SIZE` - 最大文件大小
  - `LOG_LEVEL` - 日志级别
  - `CORS_ORIGIN` - CORS配置

### 代码质量提升 📈

#### 清理调试代码
- 移除 [server/src/routes/stats.js](server/src/routes/stats.js) 中的所有 `console.log` 和 `console.error`
- 代码位置:
  - Line 138-140: 销售统计调试日志
  - Line 143: 错误日志
  - Line 475: Excel导出错误日志

#### 代码结构优化
- 创建 `middleware/` 目录存放中间件
- 创建 `utils/` 目录存放工具函数
- 创建 `config/` 目录存放配置文件
- 改进模块化和代码复用

#### 文档完善
- **更新**: [readme.md](readme.md) - 完整的项目文档
  - 项目介绍和技术栈
  - 快速开始指南
  - API文档
  - 配置说明
  - 开发指南
- **新增**: [CHANGELOG.md](CHANGELOG.md) - 更新日志

### 性能优化 ⚡

#### 数据库查询优化
- 分页查询避免全表扫描
- 使用 `COUNT(*)` 单独查询总数
- 保持现有的索引优化

### 破坏性变更 ⚠️

#### API 响应格式变更
以下接口的响应格式从数组变更为分页对象:

**之前**:
```json
[{...}, {...}]
```

**现在**:
```json
{
  "data": [{...}, {...}],
  "pagination": {...}
}
```

**受影响的接口**:
- `GET /api/orders`
- `GET /api/products`
- `GET /api/customers`
- `GET /api/expenses`

**迁移指南**:
前端需要更新 API 调用代码以处理新的分页响应格式:

```javascript
// 之前
const orders = await orderApi.getAll()

// 现在
const response = await orderApi.getAll({ page: 1, pageSize: 20 })
const orders = response.data
const pagination = response.pagination
```

### 待办事项 📝

以下功能暂未实现,将在后续版本中添加:

- [ ] 用户认证和权限管理系统
- [ ] 前端全局错误拦截器
- [ ] API 请求的输入验证中间件应用
- [ ] 单元测试和集成测试
- [ ] 数据导入功能
- [ ] 定时任务(自动备份、报表生成)
- [ ] 操作日志审计
- [ ] 性能监控和分析

### 技术债务 🔧

- 前端尚未适配新的分页响应格式
- 输入验证中间件已创建但未应用到路由
- 配置文件已创建但未在所有模块中使用
- 缺少生产环境的部署文档

---

## [1.0.0] - 初始版本

### 功能
- ✅ 订单管理
- ✅ 产品管理
- ✅ 客户管理
- ✅ 支出管理
- ✅ 统计报表
- ✅ Excel 导出
- ✅ 数据库备份与恢复
- ✅ 响应式设计
- ✅ 暗黑模式

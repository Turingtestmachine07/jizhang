import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import orderRoutes from './routes/orders.js';
import statsRoutes from './routes/stats.js';
import backupRoutes from './routes/backup.js';
import expenseRoutes from './routes/expenses.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// 请求日志
app.use(requestLogger);

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 - 图片访问
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 前端静态文件服务
const clientDistPath = process.env.CLIENT_DIST_PATH || path.join(__dirname, '../../client/dist');
console.log('Serving static files from:', clientDistPath);
app.use(express.static(clientDistPath));

// API 路由
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/expenses', expenseRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

// SPA 路由支持 - 所有非 API 请求返回 index.html
app.get('*', (req, res, next) => {
  // 跳过 API 路由
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // 返回 index.html
  const clientDistPath = process.env.CLIENT_DIST_PATH || path.join(__dirname, '../../client/dist');
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// 404 处理（只处理 API 路由）
app.use(notFoundHandler);

// 统一错误处理
app.use(errorHandler);

// 如果不是被导入（直接运行），则启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`内网访问地址: http://<本机IP>:${PORT}`);
  });
}

// 导出 app 供 Electron 使用
export default app;

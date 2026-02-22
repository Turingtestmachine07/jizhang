import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import orderRoutes from './routes/orders.js';
import statsRoutes from './routes/stats.js';
import backupRoutes from './routes/backup.js';
import backupConfigRoutes from './routes/backup-config.js';
import uploadSessionRoutes from './routes/upload-session.js';
import expenseRoutes from './routes/expenses.js';
import imageCleanerRoutes from './routes/image-cleaner.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler.js';
import backupScheduler from './services/backup-scheduler.js';

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

// API 路由
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/backup/config', backupConfigRoutes);
app.use('/api/upload-session', uploadSessionRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/image-cleaner', imageCleanerRoutes);

// 获取本机内网IP地址
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部（即127.0.0.1）和非IPv4地址
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

// 获取外部访问地址配置
app.get('/api/config/external-url', (req, res) => {
  // 如果配置了EXTERNAL_URL，直接使用
  if (process.env.EXTERNAL_URL) {
    return res.json({ externalUrl: process.env.EXTERNAL_URL });
  }

  // 否则返回本机IP，让前端自己决定端口
  const localIP = getLocalIP();
  res.json({
    externalUrl: null,  // 没有配置完整URL
    ip: localIP         // 只返回IP地址
  });
});

// SPA 路由支持 - 所有非 API、非静态文件的请求返回 index.html
app.use((req, res, next) => {
  // 1. 跳过 API 路由（/api/ 开头）
  // 2. 跳过静态文件路由（/uploads/ 开头，避免图片请求被拦截）
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }

  // 3. 只处理 GET 请求（SPA 前端路由都是 GET 请求，过滤其他无用请求）
  if (req.method !== 'GET') {
    return next();
  }

  // 4. 返回 index.html
  const clientDistPath = process.env.CLIENT_DIST_PATH || path.join(__dirname, '../../client/dist');
  const indexHtmlPath = path.join(clientDistPath, 'index.html');

  // 5. 安全发送文件，错误传递给统一错误处理中间件
  res.sendFile(indexHtmlPath, (err) => {
    if (err) {
      next(err);
    }
  });
});

// 404 处理（只处理 API 路由）
app.use(notFoundHandler);

// 统一错误处理
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);

  // 检查并执行每日备份
  backupScheduler.checkAndBackup();
});

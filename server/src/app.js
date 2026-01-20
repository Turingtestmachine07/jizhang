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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 图片访问
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

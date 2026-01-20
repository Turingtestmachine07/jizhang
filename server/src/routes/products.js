import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// 配置图片上传
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product_${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式 (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// 获取所有产品
router.get('/', (req, res) => {
  try {
    const { category, keyword } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (keyword) {
      sql += ' AND (name LIKE ? OR spec LIKE ? OR description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';
    const products = db.prepare(sql).all(...params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取产品分类列表 - 必须放在 /:id 路由之前
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category'
    ).all();
    res.json(categories.map(c => c.category));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个产品
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取产品的订单历史
router.get('/:id/orders', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let sql = `
      SELECT o.*, oi.quantity, oi.unit_price as item_price, oi.subtotal, c.name as customer_name
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE oi.product_id = ?
    `;
    const params = [req.params.id];

    if (startDate) {
      sql += ' AND o.order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND o.order_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY o.order_date DESC';
    const orders = db.prepare(sql).all(...params);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取产品销售统计
router.get('/:id/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COALESCE(SUM(oi.quantity), 0) as total_quantity,
        COALESCE(SUM(oi.subtotal), 0) as total_amount,
        COALESCE(AVG(oi.unit_price), 0) as avg_price,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? AND o.status != '已取消'
    `).get(req.params.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建产品
router.post('/', upload.single('photo'), (req, res) => {
  try {
    const { name, category, spec, unit, unit_price, description } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const result = db.prepare(`
      INSERT INTO products (name, category, spec, unit, unit_price, photo, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, category, spec, unit, unit_price || 0, photo, description);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新产品
router.put('/:id', upload.single('photo'), (req, res) => {
  try {
    const { name, category, spec, unit, unit_price, description } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : req.body.photo;

    db.prepare(`
      UPDATE products
      SET name = ?, category = ?, spec = ?, unit = ?, unit_price = ?, photo = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, category, spec, unit, unit_price || 0, photo, description, req.params.id);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除产品
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

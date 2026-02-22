import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';

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
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype) || file.mimetype === 'image/heic' || file.mimetype === 'image/heif';
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式 (jpeg, jpg, png, gif, webp, heic, heif)'));
    }
  }
});

// 图片处理中间件：转换为WebP格式并限制尺寸
const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const inputPath = req.file.path;
    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '.webp');
    const outputPath = path.join(__dirname, '../../uploads', outputFilename);

    // 处理图片：转WebP + 限制尺寸到2000px
    await sharp(inputPath)
      .rotate() // 自动根据EXIF信息旋转图片
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(outputPath);

    // 删除原文件
    fs.unlinkSync(inputPath);

    // 更新 req.file 信息
    req.file.filename = outputFilename;
    req.file.path = outputPath;

    next();
  } catch (error) {
    // 如果处理失败，删除上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// 获取所有产品
router.get('/', (req, res) => {
  try {
    const { category, keyword } = req.query;
    const { page, pageSize, offset } = getPaginationParams(req);

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

    // 获取总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countSql).get(...params);

    // 获取分页数据
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const products = db.prepare(sql).all(...params, pageSize, offset);

    res.json(createPaginatedResponse(products, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取产品分类列表 - 必须放在 /:id 路由之前
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(
      'SELECT * FROM product_categories ORDER BY created_at DESC'
    ).all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建产品分类
router.post('/categories', (req, res) => {
  try {
    const { name } = req.body;
    const result = db.prepare('INSERT INTO product_categories (name) VALUES (?)').run(name);
    const category = db.prepare('SELECT * FROM product_categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除产品分类
router.delete('/categories/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM product_categories WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
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

// 获取产品价格历史
router.get('/:id/price-history', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT * FROM product_price_history
      WHERE product_id = ?
      ORDER BY changed_at DESC
    `).all(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建产品
router.post('/', upload.single('photo'), processImage, (req, res) => {
  try {
    const { name, category, spec, unit, unit_price, description, param_option, product_type, color } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : (req.body.photo || null);

    console.log('创建产品 - req.file:', req.file);
    console.log('创建产品 - req.body.photo:', req.body.photo);
    console.log('创建产品 - 最终photo值:', photo);

    const result = db.prepare(`
      INSERT INTO products (name, category, spec, unit, unit_price, photo, description, param_option, product_type, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, category, spec, unit, unit_price || 0, photo, description, param_option, product_type, color);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新产品
router.put('/:id', upload.single('photo'), processImage, (req, res) => {
  try {
    const { name, category, spec, unit, unit_price, description, param_option, product_type, color } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : req.body.photo;

    console.log('更新产品 - req.file:', req.file);
    console.log('更新产品 - req.body.photo:', req.body.photo);
    console.log('更新产品 - 最终photo值:', photo);

    // 获取旧价格
    const oldProduct = db.prepare('SELECT unit_price FROM products WHERE id = ?').get(req.params.id);
    const newPrice = parseFloat(unit_price) || 0;
    const oldPrice = oldProduct ? parseFloat(oldProduct.unit_price) : null;

    // 更新产品
    db.prepare(`
      UPDATE products
      SET name = ?, category = ?, spec = ?, unit = ?, unit_price = ?, photo = ?, description = ?, param_option = ?, product_type = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, category, spec, unit, newPrice, photo, description, param_option, product_type, color, req.params.id);

    // 如果价格发生变化，记录价格历史
    if (oldPrice !== null && oldPrice !== newPrice) {
      db.prepare(`
        INSERT INTO product_price_history (product_id, old_price, new_price)
        VALUES (?, ?, ?)
      `).run(req.params.id, oldPrice, newPrice);
    }

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

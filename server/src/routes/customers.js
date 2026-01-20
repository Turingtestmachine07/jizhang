import express from 'express';
import db from '../database/index.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';

const router = express.Router();

// 获取所有客户
router.get('/', (req, res) => {
  try {
    const { keyword } = req.query;
    const { page, pageSize, offset } = getPaginationParams(req);

    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR phone LIKE ? OR address LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 获取总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countSql).get(...params);

    // 获取分页数据
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const customers = db.prepare(sql).all(...params, pageSize, offset);

    res.json(createPaginatedResponse(customers, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个客户
router.get('/:id', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: '客户不存在' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取客户的订单历史
router.get('/:id/orders', (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    let sql = 'SELECT * FROM orders WHERE customer_id = ?';
    const params = [req.params.id];

    if (startDate) {
      sql += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND order_date <= ?';
      params.push(endDate);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY order_date DESC';
    const orders = db.prepare(sql).all(...params);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取客户消费统计
router.get('/:id/stats', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let sql = `
      SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as paid_amount,
        COALESCE(SUM(total_amount) - SUM(paid_amount), 0) as unpaid_amount
      FROM orders
      WHERE customer_id = ? AND status != '已取消'
    `;
    const params = [req.params.id];

    if (startDate) {
      sql += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND order_date <= ?';
      params.push(endDate);
    }

    const stats = db.prepare(sql).get(...params);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建客户
router.post('/', (req, res) => {
  try {
    const { name, phone, address, note } = req.body;

    const result = db.prepare(`
      INSERT INTO customers (name, phone, address, note)
      VALUES (?, ?, ?, ?)
    `).run(name, phone, address, note);

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新客户
router.put('/:id', (req, res) => {
  try {
    const { name, phone, address, note } = req.body;

    db.prepare(`
      UPDATE customers
      SET name = ?, phone = ?, address = ?, note = ?
      WHERE id = ?
    `).run(name, phone, address, note, req.params.id);

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除客户
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量删除客户
router.post('/batch/delete', (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的客户ID列表' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM customers WHERE id IN (${placeholders})`).run(...ids);

    res.json({
      message: '批量删除成功',
      deletedCount: result.changes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

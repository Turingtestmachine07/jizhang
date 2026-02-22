import express from 'express';
import ExcelJS from 'exceljs';
import db from '../database/index.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';

const router = express.Router();

// 生成订单编号
const generateOrderNo = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${y}${m}${d}${random}`;
};

// 获取所有订单
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, customerId, keyword } = req.query;
    const { page, pageSize, offset } = getPaginationParams(req);

    let sql = `
      SELECT o.*, c.name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND o.order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND o.order_date <= ?';
      params.push(endDate);
    }
    if (customerId) {
      sql += ' AND o.customer_id = ?';
      params.push(customerId);
    }
    if (keyword) {
      sql += ' AND (o.order_no LIKE ? OR o.note LIKE ? OR c.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 获取总数
    const countSql = sql.replace('SELECT o.*, c.name as customer_name', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countSql).get(...params);

    // 获取分页数据
    sql += ' ORDER BY o.order_date DESC, o.created_at DESC LIMIT ? OFFSET ?';
    const orders = db.prepare(sql).all(...params, pageSize, offset);

    res.json(createPaginatedResponse(orders, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个订单详情
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 获取订单明细
    const items = db.prepare(`
      SELECT oi.*, p.name as product_name, p.spec as product_spec, p.photo as product_photo
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(req.params.id);

    res.json({ ...order, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建订单
router.post('/', (req, res) => {
  try {
    const { customer_id, items, order_date, note } = req.body;

    // 计算总金额
    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const insertOrder = db.transaction(() => {
      // 插入订单
      const orderResult = db.prepare(`
        INSERT INTO orders (order_no, customer_id, total_amount, order_date, note)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        generateOrderNo(),
        customer_id || null,
        total_amount,
        order_date || new Date().toISOString().split('T')[0],
        note
      );

      const orderId = orderResult.lastInsertRowid;

      // 插入订单明细
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        insertItem.run(
          orderId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price,
          item.note || null
        );
      }

      return orderId;
    });

    const orderId = insertOrder();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新订单
router.put('/:id', (req, res) => {
  try {
    const { customer_id, items, order_date, note } = req.body;

    // 计算总金额
    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const updateOrder = db.transaction(() => {
      // 更新订单
      db.prepare(`
        UPDATE orders
        SET customer_id = ?, total_amount = ?, order_date = ?, note = ?
        WHERE id = ?
      `).run(
        customer_id || null,
        total_amount,
        order_date,
        note,
        req.params.id
      );

      // 删除原有明细
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id);

      // 插入新明细
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        insertItem.run(
          req.params.id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price,
          item.note || null
        );
      }
    });

    updateOrder();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除订单
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量删除订单
router.post('/batch/delete', (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的订单ID列表' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM orders WHERE id IN (${placeholders})`).run(...ids);

    res.json({
      message: '批量删除成功',
      deletedCount: result.changes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导出订单到Excel
router.get('/export/excel', async (req, res) => {
  try {
    const { startDate, endDate, customerId } = req.query;
    let sql = `
      SELECT o.*, c.name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND o.order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND o.order_date <= ?';
      params.push(endDate);
    }
    if (customerId) {
      sql += ' AND o.customer_id = ?';
      params.push(customerId);
    }

    sql += ' ORDER BY o.order_date DESC';
    const orders = db.prepare(sql).all(...params);

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('订单列表');

    // 设置列
    worksheet.columns = [
      { header: '订单编号', key: 'order_no', width: 20 },
      { header: '客户名称', key: 'customer_name', width: 15 },
      { header: '订单日期', key: 'order_date', width: 12 },
      { header: '订单金额', key: 'total_amount', width: 12 },
      { header: '备注', key: 'note', width: 20 }
    ];

    // 添加数据
    orders.forEach(order => {
      worksheet.addRow(order);
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=orders_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

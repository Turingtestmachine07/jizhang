import express from 'express';
import ExcelJS from 'exceljs';
import db from '../database/index.js';

const router = express.Router();

// 仪表盘统计
router.get('/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // 今日收入统计
    const todayStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM orders WHERE order_date = ? AND status != '已取消'
    `).get(today);

    // 本周收入统计
    const weekStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM orders WHERE order_date >= ? AND status != '已取消'
    `).get(weekAgo);

    // 本月收入统计
    const monthStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM orders WHERE order_date >= ? AND status != '已取消'
    `).get(monthStart);

    // 待收款金额
    const unpaidAmount = db.prepare(`
      SELECT COALESCE(SUM(total_amount - paid_amount), 0) as amount
      FROM orders WHERE status IN ('待付款', '已付款') AND total_amount > paid_amount
    `).get();

    // 今日支出统计
    const todayExpense = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
      FROM expenses WHERE expense_date = ?
    `).get(today);

    // 本周支出统计
    const weekExpense = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
      FROM expenses WHERE expense_date >= ?
    `).get(weekAgo);

    // 本月支出统计
    const monthExpense = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
      FROM expenses WHERE expense_date >= ?
    `).get(monthStart);

    // 最近10条订单
    const recentOrders = db.prepare(`
      SELECT o.*, c.name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC LIMIT 10
    `).all();

    // 热销产品TOP5
    const hotProducts = db.prepare(`
      SELECT p.id, p.name, p.photo, SUM(oi.quantity) as total_quantity, SUM(oi.subtotal) as total_amount
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != '已取消'
      GROUP BY p.id
      ORDER BY total_quantity DESC
      LIMIT 5
    `).all();

    // 最近5条支出
    const recentExpenses = db.prepare(`
      SELECT e.*, ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      ORDER BY e.created_at DESC LIMIT 5
    `).all();

    res.json({
      today: todayStats,
      week: weekStats,
      month: monthStats,
      unpaidAmount: unpaidAmount.amount,
      todayExpense,
      weekExpense,
      monthExpense,
      recentOrders,
      hotProducts,
      recentExpenses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 按时间段统计销售额
router.get('/sales', (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let dateFormat;
    switch (groupBy) {
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    let sql = `
      SELECT strftime('${dateFormat}', order_date) as date,
             COUNT(*) as order_count,
             COALESCE(SUM(total_amount), 0) as total_amount,
             COALESCE(SUM(paid_amount), 0) as paid_amount
      FROM orders
      WHERE status != '已取消'
    `;
    const params = [];

    if (startDate) {
      sql += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND order_date <= ?';
      params.push(endDate);
    }

    sql += ` GROUP BY strftime('${dateFormat}', order_date) ORDER BY date DESC`;
    console.log('Sales SQL:', sql, 'Params:', params);
    const stats = db.prepare(sql).all(...params);
    console.log('Sales Result:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Sales Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 按产品统计
router.get('/products', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT p.id, p.name, p.category,
             COALESCE(SUM(oi.quantity), 0) as total_quantity,
             COALESCE(SUM(oi.subtotal), 0) as total_amount,
             COUNT(DISTINCT oi.order_id) as order_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != '已取消'
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND (o.order_date >= ? OR o.order_date IS NULL)';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND (o.order_date <= ? OR o.order_date IS NULL)';
      params.push(endDate);
    }

    sql += ' GROUP BY p.id ORDER BY total_amount DESC';
    const stats = db.prepare(sql).all(...params);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 按客户统计
router.get('/customers', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT c.id, c.name, c.phone,
             COUNT(o.id) as order_count,
             COALESCE(SUM(o.total_amount), 0) as total_amount,
             COALESCE(SUM(o.paid_amount), 0) as paid_amount,
             COALESCE(SUM(o.total_amount - o.paid_amount), 0) as unpaid_amount
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status != '已取消'
    `;
    const params = [];

    if (startDate || endDate) {
      if (startDate) {
        sql += ' AND o.order_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        sql += ' AND o.order_date <= ?';
        params.push(endDate);
      }
    }

    sql += ' GROUP BY c.id ORDER BY total_amount DESC';
    const stats = db.prepare(sql).all(...params);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 应收账款统计
router.get('/receivables', (req, res) => {
  try {
    const receivables = db.prepare(`
      SELECT c.id, c.name, c.phone,
             COUNT(o.id) as order_count,
             SUM(o.total_amount - o.paid_amount) as unpaid_amount
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      WHERE o.total_amount > o.paid_amount AND o.status != '已取消'
      GROUP BY c.id
      HAVING unpaid_amount > 0
      ORDER BY unpaid_amount DESC
    `).all();

    const totalUnpaid = receivables.reduce((sum, r) => sum + r.unpaid_amount, 0);

    res.json({ receivables, totalUnpaid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 支出统计
router.get('/expenses', (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let dateFormat;
    switch (groupBy) {
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    let sql = `
      SELECT strftime('${dateFormat}', expense_date) as date,
             COUNT(*) as expense_count,
             COALESCE(SUM(amount), 0) as total_amount
      FROM expenses
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND expense_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND expense_date <= ?';
      params.push(endDate);
    }

    sql += ` GROUP BY strftime('${dateFormat}', expense_date) ORDER BY date DESC`;
    const stats = db.prepare(sql).all(...params);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 支出分类统计
router.get('/expenses/categories', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT ec.id, ec.name,
             COUNT(e.id) as expense_count,
             COALESCE(SUM(e.amount), 0) as total_amount
      FROM expense_categories ec
      LEFT JOIN expenses e ON ec.id = e.category_id
    `;
    const params = [];

    if (startDate || endDate) {
      sql += ' AND (1=1';
      if (startDate) {
        sql += ' AND e.expense_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        sql += ' AND e.expense_date <= ?';
        params.push(endDate);
      }
      sql += ')';
    }

    sql += ' GROUP BY ec.id ORDER BY total_amount DESC';
    const stats = db.prepare(sql).all(...params);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导出统计报表到Excel
router.get('/export/excel', async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '财务管理记账系统';
    workbook.created = new Date();

    if (type === 'sales' || !type) {
      // 销售统计
      const salesSheet = workbook.addWorksheet('销售统计');
      let sql = `
        SELECT order_date as date, COUNT(*) as order_count,
               COALESCE(SUM(total_amount), 0) as total_amount,
               COALESCE(SUM(paid_amount), 0) as paid_amount
        FROM orders WHERE status != '已取消'
      `;
      const params = [];
      if (startDate) {
        sql += ' AND order_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        sql += ' AND order_date <= ?';
        params.push(endDate);
      }
      sql += ' GROUP BY order_date ORDER BY date DESC';

      const salesData = db.prepare(sql).all(...params);

      salesSheet.columns = [
        { header: '日期', key: 'date', width: 15 },
        { header: '订单数', key: 'order_count', width: 10 },
        { header: '销售额', key: 'total_amount', width: 15 },
        { header: '已收款', key: 'paid_amount', width: 15 }
      ];

      // 设置表头样式
      salesSheet.getRow(1).font = { bold: true };
      salesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      salesData.forEach(row => salesSheet.addRow(row));

      // 添加汇总行
      if (salesData.length > 0) {
        const totalRow = salesSheet.addRow({
          date: '合计',
          order_count: salesData.reduce((sum, r) => sum + r.order_count, 0),
          total_amount: salesData.reduce((sum, r) => sum + r.total_amount, 0),
          paid_amount: salesData.reduce((sum, r) => sum + r.paid_amount, 0)
        });
        totalRow.font = { bold: true };
      }
    }

    if (type === 'products' || !type) {
      // 产品统计
      const productsSheet = workbook.addWorksheet('产品统计');
      let productsSql = `
        SELECT p.name, p.category,
               COALESCE(SUM(oi.quantity), 0) as total_quantity,
               COALESCE(SUM(oi.subtotal), 0) as total_amount
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status != '已取消'
      `;
      const productsParams = [];
      if (startDate) {
        productsSql += ' AND o.order_date >= ?';
        productsParams.push(startDate);
      }
      if (endDate) {
        productsSql += ' AND o.order_date <= ?';
        productsParams.push(endDate);
      }
      productsSql += ' GROUP BY p.id ORDER BY total_amount DESC';

      const productsData = db.prepare(productsSql).all(...productsParams);

      productsSheet.columns = [
        { header: '产品名称', key: 'name', width: 20 },
        { header: '分类', key: 'category', width: 15 },
        { header: '销量', key: 'total_quantity', width: 10 },
        { header: '销售额', key: 'total_amount', width: 15 }
      ];

      productsSheet.getRow(1).font = { bold: true };
      productsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      productsData.forEach(row => productsSheet.addRow(row));

      if (productsData.length > 0) {
        const totalRow = productsSheet.addRow({
          name: '合计',
          category: '',
          total_quantity: productsData.reduce((sum, r) => sum + (r.total_quantity || 0), 0),
          total_amount: productsData.reduce((sum, r) => sum + (r.total_amount || 0), 0)
        });
        totalRow.font = { bold: true };
      }
    }

    if (type === 'customers' || !type) {
      // 客户统计
      const customersSheet = workbook.addWorksheet('客户统计');
      let customersSql = `
        SELECT c.name, c.phone, COUNT(o.id) as order_count,
               COALESCE(SUM(o.total_amount), 0) as total_amount,
               COALESCE(SUM(o.total_amount - o.paid_amount), 0) as unpaid_amount
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id AND o.status != '已取消'
      `;
      const customersParams = [];
      if (startDate) {
        customersSql += ' AND o.order_date >= ?';
        customersParams.push(startDate);
      }
      if (endDate) {
        customersSql += ' AND o.order_date <= ?';
        customersParams.push(endDate);
      }
      customersSql += ' GROUP BY c.id ORDER BY total_amount DESC';

      const customersData = db.prepare(customersSql).all(...customersParams);

      customersSheet.columns = [
        { header: '客户名称', key: 'name', width: 15 },
        { header: '电话', key: 'phone', width: 15 },
        { header: '订单数', key: 'order_count', width: 10 },
        { header: '消费总额', key: 'total_amount', width: 15 },
        { header: '欠款金额', key: 'unpaid_amount', width: 15 }
      ];

      customersSheet.getRow(1).font = { bold: true };
      customersSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      customersData.forEach(row => customersSheet.addRow(row));

      if (customersData.length > 0) {
        const totalRow = customersSheet.addRow({
          name: '合计',
          phone: '',
          order_count: customersData.reduce((sum, r) => sum + (r.order_count || 0), 0),
          total_amount: customersData.reduce((sum, r) => sum + (r.total_amount || 0), 0),
          unpaid_amount: customersData.reduce((sum, r) => sum + (r.unpaid_amount || 0), 0)
        });
        totalRow.font = { bold: true };
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('导出Excel错误:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

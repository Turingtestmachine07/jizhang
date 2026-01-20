import express from 'express';
import ExcelJS from 'exceljs';
import db from '../database/index.js';

const router = express.Router();

// 生成支出编号
const generateExpenseNo = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EXP${y}${m}${d}${random}`;
};

// 获取所有支出分类
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM expense_categories ORDER BY name').all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建支出分类
router.post('/categories', (req, res) => {
  try {
    const { name, icon } = req.body;
    const result = db.prepare('INSERT INTO expense_categories (name, icon) VALUES (?, ?)').run(name, icon);
    const category = db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除支出分类
router.delete('/categories/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM expense_categories WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取所有支出
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, categoryId, keyword, paymentMethod } = req.query;
    let sql = `
      SELECT e.*, ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND e.expense_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND e.expense_date <= ?';
      params.push(endDate);
    }
    if (categoryId) {
      sql += ' AND e.category_id = ?';
      params.push(categoryId);
    }
    if (paymentMethod) {
      sql += ' AND e.payment_method = ?';
      params.push(paymentMethod);
    }
    if (keyword) {
      sql += ' AND (e.expense_no LIKE ? OR e.payee LIKE ? OR e.note LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';
    const expenses = db.prepare(sql).all(...params);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个支出
router.get('/:id', (req, res) => {
  try {
    const expense = db.prepare(`
      SELECT e.*, ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.id = ?
    `).get(req.params.id);

    if (!expense) {
      return res.status(404).json({ error: '支出记录不存在' });
    }
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建支出
router.post('/', (req, res) => {
  try {
    const { category_id, amount, expense_date, payee, payment_method, note } = req.body;

    const result = db.prepare(`
      INSERT INTO expenses (expense_no, category_id, amount, expense_date, payee, payment_method, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateExpenseNo(),
      category_id || null,
      amount,
      expense_date || new Date().toISOString().split('T')[0],
      payee,
      payment_method || '现金',
      note
    );

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新支出
router.put('/:id', (req, res) => {
  try {
    const { category_id, amount, expense_date, payee, payment_method, note } = req.body;

    db.prepare(`
      UPDATE expenses
      SET category_id = ?, amount = ?, expense_date = ?, payee = ?, payment_method = ?, note = ?
      WHERE id = ?
    `).run(
      category_id || null,
      amount,
      expense_date,
      payee,
      payment_method,
      note,
      req.params.id
    );

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除支出
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导出支出到Excel
router.get('/export/excel', async (req, res) => {
  try {
    const { startDate, endDate, categoryId } = req.query;
    let sql = `
      SELECT e.*, ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND e.expense_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND e.expense_date <= ?';
      params.push(endDate);
    }
    if (categoryId) {
      sql += ' AND e.category_id = ?';
      params.push(categoryId);
    }

    sql += ' ORDER BY e.expense_date DESC';
    const expenses = db.prepare(sql).all(...params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('支出列表');

    worksheet.columns = [
      { header: '支出编号', key: 'expense_no', width: 20 },
      { header: '分类', key: 'category_name', width: 15 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '支出日期', key: 'expense_date', width: 12 },
      { header: '收款方', key: 'payee', width: 15 },
      { header: '支付方式', key: 'payment_method', width: 12 },
      { header: '备注', key: 'note', width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    expenses.forEach(row => worksheet.addRow(row));

    if (expenses.length > 0) {
      const totalRow = worksheet.addRow({
        expense_no: '合计',
        category_name: '',
        amount: expenses.reduce((sum, r) => sum + r.amount, 0),
        expense_date: '',
        payee: '',
        payment_method: '',
        note: ''
      });
      totalRow.font = { bold: true };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=expenses_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

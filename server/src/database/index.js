import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/jizhang.db');

const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化表结构
const initDB = () => {
  // 产品表
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      spec TEXT,
      unit TEXT,
      unit_price DECIMAL(10,2) DEFAULT 0,
      photo TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 客户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 订单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      customer_id INTEGER,
      total_amount DECIMAL(10,2) DEFAULT 0,
      paid_amount DECIMAL(10,2) DEFAULT 0,
      status TEXT DEFAULT '待付款',
      order_date DATE DEFAULT CURRENT_DATE,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )
  `);

  // 订单明细表
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      quantity INTEGER DEFAULT 1,
      unit_price DECIMAL(10,2) DEFAULT 0,
      subtotal DECIMAL(10,2) DEFAULT 0,
      note TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
  `);

  // 支出分类表
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 支出表
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_no TEXT NOT NULL UNIQUE,
      category_id INTEGER,
      amount DECIMAL(10,2) NOT NULL,
      expense_date DATE DEFAULT CURRENT_DATE,
      payee TEXT,
      payment_method TEXT DEFAULT '现金',
      note TEXT,
      attachment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
    )
  `);

  // 支出索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
  `);

  // 初始化默认支出分类
  const existingCategories = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get();
  if (existingCategories.count === 0) {
    const defaultCategories = ['采购成本', '运输费用', '人工工资', '房租水电', '办公用品', '设备维护', '税费', '其他'];
    const insertCategory = db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)');
    for (const cat of defaultCategories) {
      insertCategory.run(cat);
    }
  }

  console.log('数据库初始化完成');
};

initDB();

export default db;

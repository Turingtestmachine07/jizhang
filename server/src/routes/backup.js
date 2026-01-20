import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const dataDir = path.join(__dirname, '../../data');
const backupDir = path.join(__dirname, '../../backups');
const dbPath = path.join(dataDir, 'jizhang.db');

// 确保备份目录存在
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 获取备份列表
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return {
          filename: f,
          size: stat.size,
          created: stat.mtime
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建备份
router.post('/', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `jizhang_backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);

    fs.copyFileSync(dbPath, backupPath);

    const stat = fs.statSync(backupPath);
    res.status(201).json({
      message: '备份成功',
      filename: backupFilename,
      size: stat.size,
      created: stat.mtime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 恢复备份
router.post('/restore/:filename', (req, res) => {
  try {
    const backupPath = path.join(backupDir, req.params.filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    // 先备份当前数据库
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const autoBackupPath = path.join(backupDir, `jizhang_auto_${timestamp}.db`);
    fs.copyFileSync(dbPath, autoBackupPath);

    // 恢复备份
    fs.copyFileSync(backupPath, dbPath);

    res.json({ message: '恢复成功，请重启服务以应用更改' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除备份
router.delete('/:filename', (req, res) => {
  try {
    const backupPath = path.join(backupDir, req.params.filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    fs.unlinkSync(backupPath);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 下载备份
router.get('/download/:filename', (req, res) => {
  try {
    const backupPath = path.join(backupDir, req.params.filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    res.download(backupPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

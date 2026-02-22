import express from 'express';
import backupScheduler from '../services/backup-scheduler.js';

const router = express.Router();

// 获取自动备份配置
router.get('/', (req, res) => {
  try {
    const config = backupScheduler.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新自动备份配置
router.put('/', (req, res) => {
  try {
    const { enabled, retentionDays } = req.body;

    // 验证参数
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled 必须是布尔值' });
    }
    if (typeof retentionDays !== 'number' || retentionDays < 1 || retentionDays > 365) {
      return res.status(400).json({ error: 'retentionDays 必须是 1-365 之间的数字' });
    }

    const config = backupScheduler.updateConfig({ enabled, retentionDays });
    res.json({ message: '配置已更新', config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

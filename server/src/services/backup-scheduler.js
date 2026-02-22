import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const backupDir = path.join(__dirname, '../../backups');
const dbPath = path.join(dataDir, 'jizhang.db');
const configPath = path.join(dataDir, 'backup-config.json');
const lastBackupPath = path.join(dataDir, 'last-backup-date.txt');

class BackupScheduler {
  constructor() {
    this.config = this.loadConfig();
  }

  // 加载配置
  loadConfig() {
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch (error) {
      console.error('加载备份配置失败:', error);
    }
    // 默认配置
    return { enabled: true, retentionDays: 14 };
  }

  // 保存配置
  saveConfig(config) {
    try {
      // 确保data目录存在
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      this.config = config;
    } catch (error) {
      console.error('保存备份配置失败:', error);
      throw error;
    }
  }

  // 获取上次备份日期
  getLastBackupDate() {
    try {
      if (fs.existsSync(lastBackupPath)) {
        return fs.readFileSync(lastBackupPath, 'utf-8').trim();
      }
    } catch (error) {
      console.error('读取上次备份日期失败:', error);
    }
    return null;
  }

  // 保存备份日期
  saveBackupDate(date) {
    try {
      // 确保data目录存在
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(lastBackupPath, date);
    } catch (error) {
      console.error('保存备份日期失败:', error);
    }
  }

  // 检查是否需要备份（今天是否已备份）
  shouldBackup() {
    if (!this.config.enabled) return false;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastBackup = this.getLastBackupDate();

    return lastBackup !== today;
  }

  // 执行备份
  performBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `jizhang_auto_${timestamp}.db`;
      const backupPath = path.join(backupDir, backupFilename);

      // 确保备份目录存在
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // 检查数据库文件是否存在
      if (!fs.existsSync(dbPath)) {
        console.log('⚠️  数据库文件不存在，跳过备份');
        return false;
      }

      // 复制数据库文件
      fs.copyFileSync(dbPath, backupPath);

      // 记录备份日期
      const today = new Date().toISOString().split('T')[0];
      this.saveBackupDate(today);

      console.log(`✅ 自动备份完成: ${backupFilename}`);
      return true;
    } catch (error) {
      console.error('❌ 自动备份失败:', error);
      return false;
    }
  }

  // 清理旧备份
  cleanOldBackups() {
    try {
      // 确保备份目录存在
      if (!fs.existsSync(backupDir)) {
        return;
      }

      const files = fs.readdirSync(backupDir);
      const now = Date.now();
      const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;

      let deletedCount = 0;

      files.forEach(file => {
        // 只处理自动备份文件
        if (!file.startsWith('jizhang_auto_') || !file.endsWith('.db')) {
          return;
        }

        const filePath = path.join(backupDir, file);
        const stat = fs.statSync(filePath);
        const age = now - stat.mtime.getTime();

        if (age > retentionMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️  删除过期备份: ${file}`);
        }
      });

      if (deletedCount > 0) {
        console.log(`✅ 清理完成，删除了 ${deletedCount} 个过期备份`);
      }
    } catch (error) {
      console.error('❌ 清理旧备份失败:', error);
    }
  }

  // 启动时检查并执行备份
  checkAndBackup() {
    if (this.shouldBackup()) {
      console.log('📦 执行每日自动备份...');
      this.performBackup();
      this.cleanOldBackups();
    } else {
      console.log('✓ 今日已备份，跳过');
    }
  }

  // 获取配置
  getConfig() {
    return this.config;
  }

  // 更新配置
  updateConfig(newConfig) {
    this.saveConfig(newConfig);
    return this.config;
  }
}

export default new BackupScheduler();

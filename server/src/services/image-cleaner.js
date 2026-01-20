import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');
const dbPath = path.join(__dirname, '../../data/jizhang.db');

class ImageCleaner {
  constructor() {
    this.db = null;
    this.uploadsDir = uploadsDir;
  }

  // 初始化数据库连接
  initDB() {
    if (!this.db) {
      this.db = new Database(dbPath);
    }
  }

  // 获取所有数据库中使用的图片
  getUsedImages() {
    this.initDB();

    const usedImages = new Set();

    // 从产品表获取使用的图片
    const products = this.db.prepare('SELECT photo FROM products WHERE photo IS NOT NULL').all();
    products.forEach(p => {
      if (p.photo) {
        // 提取文件名
        const filename = p.photo.replace('/uploads/', '');
        usedImages.add(filename);
      }
    });

    return usedImages;
  }

  // 获取uploads目录中的所有图片文件
  getUploadedImages() {
    if (!fs.existsSync(uploadsDir)) {
      return [];
    }

    return fs.readdirSync(uploadsDir).filter(file => {
      // 只处理图片文件
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
    });
  }

  // 清理未使用的图片
  cleanUnusedImages() {
    try {
      const usedImages = this.getUsedImages();
      const uploadedImages = this.getUploadedImages();

      const unusedImages = uploadedImages.filter(img => !usedImages.has(img));

      let deletedCount = 0;
      let deletedSize = 0;

      unusedImages.forEach(img => {
        const filePath = path.join(uploadsDir, img);
        try {
          const stats = fs.statSync(filePath);
          deletedSize += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️  删除未使用图片: ${img}`);
        } catch (error) {
          console.error(`删除图片失败 ${img}:`, error.message);
        }
      });

      if (deletedCount > 0) {
        const sizeMB = (deletedSize / (1024 * 1024)).toFixed(2);
        console.log(`✅ 图片清理完成: 删除 ${deletedCount} 个文件，释放 ${sizeMB} MB 空间`);
      } else {
        console.log('✓ 没有需要清理的图片');
      }

      return {
        deletedCount,
        deletedSize,
        unusedImages
      };
    } catch (error) {
      console.error('❌ 图片清理失败:', error);
      throw error;
    }
  }

  // 关闭数据库连接
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default new ImageCleaner();

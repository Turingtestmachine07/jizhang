import express from 'express';
import fs from 'fs';
import path from 'path';
import imageCleaner from '../services/image-cleaner.js';

const router = express.Router();

// 清理未使用的图片
router.post('/clean', (req, res) => {
  try {
    const result = imageCleaner.cleanUnusedImages();

    res.json({
      message: '清理完成',
      deletedCount: result.deletedCount,
      deletedSize: result.deletedSize,
      deletedSizeMB: (result.deletedSize / (1024 * 1024)).toFixed(2),
      unusedImages: result.unusedImages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取未使用图片的统计信息（不删除）
router.get('/stats', (req, res) => {
  try {
    const usedImages = imageCleaner.getUsedImages();
    const uploadedImages = imageCleaner.getUploadedImages();
    const unusedImages = uploadedImages.filter(img => !usedImages.has(img));

    let unusedSize = 0;

    unusedImages.forEach(img => {
      try {
        const stats = fs.statSync(path.join(imageCleaner.uploadsDir, img));
        unusedSize += stats.size;
      } catch (error) {
        // 忽略错误
      }
    });

    res.json({
      totalImages: uploadedImages.length,
      usedImages: usedImages.size,
      unusedImages: unusedImages.length,
      unusedSize,
      unusedSizeMB: (unusedSize / (1024 * 1024)).toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

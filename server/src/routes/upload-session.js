import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// 内存存储会话数据
const sessions = new Map();

// 配置图片上传
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product_${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB（移动端照片通常较大）
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype) || file.mimetype === 'image/heic' || file.mimetype === 'image/heif';
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式 (jpeg, jpg, png, gif, webp, heic, heif)'));
    }
  }
});

// 图片处理中间件（与products.js相同）
const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const inputPath = req.file.path;
    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '.webp');
    const outputPath = path.join(__dirname, '../../uploads', outputFilename);

    await sharp(inputPath)
      .rotate() // 自动根据EXIF信息旋转图片
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(outputPath);

    fs.unlinkSync(inputPath);

    req.file.filename = outputFilename;
    req.file.path = outputPath;

    next();
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// 定时清理过期会话（每5分钟）
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
      console.log(`清理过期会话: ${sessionId}`);
    }
  }
}, 5 * 60 * 1000);

// 创建上传会话
router.post('/', (req, res) => {
  try {
    const sessionId = uuidv4();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10分钟过期

    sessions.set(sessionId, {
      sessionId,
      createdAt: now,
      expiresAt,
      uploadedFile: null
    });

    res.status(201).json({ sessionId, expiresAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取会话状态
router.get('/:sessionId', (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: '会话不存在或已过期' });
    }

    // 检查是否过期
    if (Date.now() > session.expiresAt) {
      sessions.delete(req.params.sessionId);
      return res.status(404).json({ error: '会话已过期' });
    }

    res.json({
      sessionId: session.sessionId,
      hasUpload: !!session.uploadedFile,
      uploadedFile: session.uploadedFile
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传图片到会话
router.post('/:sessionId/upload', upload.single('photo'), processImage, (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: '会话不存在或已过期' });
    }

    if (Date.now() > session.expiresAt) {
      sessions.delete(req.params.sessionId);
      return res.status(404).json({ error: '会话已过期' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    // 保存上传的文件信息
    session.uploadedFile = {
      filename: req.file.filename,
      path: req.file.path,
      url: `/uploads/${req.file.filename}`
    };

    res.json({
      message: '上传成功',
      file: session.uploadedFile
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 清理会话
router.delete('/:sessionId', (req, res) => {
  try {
    sessions.delete(req.params.sessionId);
    res.json({ message: '会话已清理' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

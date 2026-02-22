/**
 * 环境变量配置管理
 */

// 注意: 在生产环境中应使用 dotenv 包来加载 .env 文件
// 目前使用 process.env 直接访问环境变量,配合启动脚本设置

export const config = {
  // 服务器配置
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库配置
  dbPath: process.env.DB_PATH || './data/jizhang.db',

  // 文件上传配置
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024, // 20MB

  // 日志配置
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS配置
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // 分页配置
  defaultPageSize: 20,
  maxPageSize: 100
};

export default config;

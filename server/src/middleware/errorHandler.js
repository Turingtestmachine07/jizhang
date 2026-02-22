/**
 * 错误处理中间件
 * 提供统一的错误响应格式和日志记录
 */

// 自定义错误类
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// HTTP错误类
export class BadRequestError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 422, details);
  }
}

// 日志工具
class Logger {
  log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    console.log(JSON.stringify(logEntry));
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }
}

export const logger = new Logger();

// 异步错误包装器
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 错误处理中间件
export const errorHandler = (err, req, res, next) => {
  // 记录错误日志
  logger.error(err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // 如果是操作性错误（我们主动抛出的）
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details
    });
  }

  // 数据库错误
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({
      error: '数据冲突，可能存在重复数据'
    });
  }

  // 未知错误，不暴露详细信息
  res.status(500).json({
    error: '服务器内部错误'
  });
};

// 404 错误处理
export const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`路由 ${req.url} 不存在`));
};

// 请求日志中间件
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
};

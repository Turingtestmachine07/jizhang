/**
 * 输入验证中间件
 * 用于验证和清理用户输入，防止注入攻击和数据错误
 */

// 验证必填字段
export const validateRequired = (fields) => (req, res, next) => {
  const missingFields = fields.filter(field => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: '缺少必填字段',
      missingFields
    });
  }

  next();
};

// 验证数字类型
export const validateNumber = (fields) => (req, res, next) => {
  const invalidFields = [];

  fields.forEach(field => {
    const value = req.body[field];
    if (value !== undefined && value !== null && value !== '') {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        invalidFields.push(field);
      }
    }
  });

  if (invalidFields.length > 0) {
    return res.status(400).json({
      error: '字段必须是有效的非负数字',
      invalidFields
    });
  }

  next();
};

// 验证日期格式 (YYYY-MM-DD)
export const validateDate = (fields) => (req, res, next) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const invalidFields = [];

  fields.forEach(field => {
    const value = req.body[field] || req.query[field];
    if (value && !dateRegex.test(value)) {
      invalidFields.push(field);
    }
  });

  if (invalidFields.length > 0) {
    return res.status(400).json({
      error: '日期格式必须为 YYYY-MM-DD',
      invalidFields
    });
  }

  next();
};

// 验证字符串长度
export const validateLength = (field, min, max) => (req, res, next) => {
  const value = req.body[field];

  if (value && typeof value === 'string') {
    if (value.length < min || value.length > max) {
      return res.status(400).json({
        error: `${field} 长度必须在 ${min} 到 ${max} 个字符之间`
      });
    }
  }

  next();
};

// 验证手机号格式
export const validatePhone = (field) => (req, res, next) => {
  const value = req.body[field];
  const phoneRegex = /^1[3-9]\d{9}$/;

  if (value && !phoneRegex.test(value)) {
    return res.status(400).json({
      error: '手机号格式不正确'
    });
  }

  next();
};

// 验证枚举值
export const validateEnum = (field, allowedValues) => (req, res, next) => {
  const value = req.body[field] || req.query[field];

  if (value && !allowedValues.includes(value)) {
    return res.status(400).json({
      error: `${field} 的值必须是以下之一: ${allowedValues.join(', ')}`,
      receivedValue: value
    });
  }

  next();
};

// 验证ID参数
export const validateId = (req, res, next) => {
  const id = Number(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      error: 'ID必须是有效的正整数'
    });
  }

  next();
};

// 清理字符串，防止XSS
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// 清理对象中的所有字符串
export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }
  next();
};

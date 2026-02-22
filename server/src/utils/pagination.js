/**
 * 分页工具函数
 */

// 解析分页参数
export const getPaginationParams = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
};

// 生成分页响应
export const createPaginatedResponse = (data, total, page, pageSize) => {
  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// 分页中间件
export const paginate = (req, res, next) => {
  req.pagination = getPaginationParams(req);
  next();
};

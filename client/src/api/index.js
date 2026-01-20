import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 产品 API
export const productApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getOrders: (id, params) => api.get(`/products/${id}/orders`, { params }),
  getStats: (id) => api.get(`/products/${id}/stats`),
  create: (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key])
      }
    })
    return api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  update: (id, data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key])
      }
    })
    return api.put(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  delete: (id) => api.delete(`/products/${id}`)
}

// 客户 API
export const customerApi = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  getOrders: (id, params) => api.get(`/customers/${id}/orders`, { params }),
  getStats: (id, params) => api.get(`/customers/${id}/stats`, { params }),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`)
}

// 订单 API
export const orderApi = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  updatePayment: (id, paid_amount) => api.patch(`/orders/${id}/payment`, { paid_amount }),
  delete: (id) => api.delete(`/orders/${id}`),
  exportExcel: (params) => api.get('/orders/export/excel', { params, responseType: 'blob' })
}

// 统计 API
export const statsApi = {
  getDashboard: () => api.get('/stats/dashboard'),
  getSales: (params) => api.get('/stats/sales', { params }),
  getProducts: (params) => api.get('/stats/products', { params }),
  getCustomers: (params) => api.get('/stats/customers', { params }),
  getReceivables: () => api.get('/stats/receivables'),
  getExpenses: (params) => api.get('/stats/expenses', { params }),
  getExpenseCategories: (params) => api.get('/stats/expenses/categories', { params }),
  exportExcel: (params) => api.get('/stats/export/excel', { params, responseType: 'blob' })
}

// 支出 API
export const expenseApi = {
  getAll: (params) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories'),
  createCategory: (data) => api.post('/expenses/categories', data),
  deleteCategory: (id) => api.delete(`/expenses/categories/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  exportExcel: (params) => api.get('/expenses/export/excel', { params, responseType: 'blob' })
}

// 备份 API
export const backupApi = {
  getAll: () => api.get('/backup'),
  create: () => api.post('/backup'),
  restore: (filename) => api.post(`/backup/restore/${filename}`),
  delete: (filename) => api.delete(`/backup/${filename}`),
  download: (filename) => `/api/backup/download/${filename}`
}

export default api

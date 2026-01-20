import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: '仪表盘' }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('../views/Orders.vue'),
    meta: { title: '订单管理' }
  },
  {
    path: '/expenses',
    name: 'Expenses',
    component: () => import('../views/Expenses.vue'),
    meta: { title: '支出管理' }
  },
  {
    path: '/products',
    name: 'Products',
    component: () => import('../views/Products.vue'),
    meta: { title: '产品管理' }
  },
  {
    path: '/customers',
    name: 'Customers',
    component: () => import('../views/Customers.vue'),
    meta: { title: '客户管理' }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('../views/Reports.vue'),
    meta: { title: '统计报表' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { title: '系统设置' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || '记账系统'} - 财务管理`
  next()
})

export default router

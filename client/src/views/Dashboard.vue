<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { statsApi } from '../api'

const router = useRouter()
const loading = ref(true)
const dashboardData = ref({
  today: { count: 0, amount: 0 },
  week: { count: 0, amount: 0 },
  month: { count: 0, amount: 0 },
  unpaidAmount: 0,
  recentOrders: [],
  hotProducts: []
})

const fetchDashboard = async () => {
  try {
    loading.value = true
    const { data } = await statsApi.getDashboard()
    dashboardData.value = data
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
  } finally {
    loading.value = false
  }
}

const formatMoney = (value) => {
  return Number(value || 0).toFixed(2)
}

const getStatusType = (status) => {
  const types = {
    '待付款': 'warning',
    '已付款': 'success',
    '已完成': 'info',
    '已取消': 'danger'
  }
  return types[status] || 'info'
}

onMounted(() => {
  fetchDashboard()
})
</script>

<template>
  <div class="dashboard" v-loading="loading">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="value">{{ dashboardData.today.count }}</div>
            <div class="label">今日订单</div>
            <div class="sub-value">¥{{ formatMoney(dashboardData.today.amount) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="value">{{ dashboardData.week.count }}</div>
            <div class="label">本周订单</div>
            <div class="sub-value">¥{{ formatMoney(dashboardData.week.amount) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="value">{{ dashboardData.month.count }}</div>
            <div class="label">本月订单</div>
            <div class="sub-value">¥{{ formatMoney(dashboardData.month.amount) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover">
          <div class="stat-card warning">
            <div class="value">¥{{ formatMoney(dashboardData.unpaidAmount) }}</div>
            <div class="label">待收款金额</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <!-- 最近订单 -->
      <el-col :xs="24" :lg="14">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>最近订单</span>
              <el-button text type="primary" @click="router.push('/orders')">
                查看全部 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="dashboardData.recentOrders" style="width: 100%" max-height="400">
            <el-table-column prop="order_no" label="订单编号" width="160" />
            <el-table-column prop="customer_name" label="客户" width="100">
              <template #default="{ row }">
                {{ row.customer_name || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="total_amount" label="金额" width="100">
              <template #default="{ row }">
                ¥{{ formatMoney(row.total_amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="order_date" label="日期" width="110" />
          </el-table>
        </el-card>
      </el-col>

      <!-- 热销产品 -->
      <el-col :xs="24" :lg="10">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>热销产品 TOP5</span>
              <el-button text type="primary" @click="router.push('/products')">
                查看全部 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="hot-products">
            <div
              v-for="(product, index) in dashboardData.hotProducts"
              :key="product.id"
              class="hot-product-item"
            >
              <div class="rank" :class="{ top3: index < 3 }">{{ index + 1 }}</div>
              <img
                v-if="product.photo"
                :src="product.photo"
                class="product-thumb"
                alt=""
              />
              <el-icon v-else class="product-thumb-placeholder"><Picture /></el-icon>
              <div class="product-info">
                <div class="name">{{ product.name }}</div>
                <div class="stats">
                  销量: {{ product.total_quantity }} | 金额: ¥{{ formatMoney(product.total_amount) }}
                </div>
              </div>
            </div>
            <el-empty v-if="!dashboardData.hotProducts?.length" description="暂无数据" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 0;
}

.stat-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 10px 0;
}

.stat-card .value {
  font-size: 32px;
  font-weight: bold;
  color: var(--el-color-primary);
}

.stat-card.warning .value {
  color: var(--el-color-warning);
}

.stat-card .label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

.stat-card .sub-value {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hot-products {
  padding: 0;
}

.hot-product-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.hot-product-item:last-child {
  border-bottom: none;
}

.rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-right: 12px;
}

.rank.top3 {
  background: var(--el-color-primary);
  color: #fff;
}

.product-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  margin-right: 12px;
}

.product-thumb-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: var(--el-fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 20px;
  color: var(--el-text-color-placeholder);
}

.product-info {
  flex: 1;
}

.product-info .name {
  font-weight: 500;
  margin-bottom: 4px;
}

.product-info .stats {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

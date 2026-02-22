<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { statsApi } from '../api'

const loading = ref(false)
const activeTab = ref('sales')

// 日期范围
const dateRange = ref([])

// 统计数据
const salesData = ref([])
const productsData = ref([])
const customersData = ref([])
const receivablesData = ref({ receivables: [], totalUnpaid: 0 })

// 统计粒度
const groupBy = ref('day')

// 获取销售统计
const fetchSales = async () => {
  try {
    loading.value = true
    const params = { groupBy: groupBy.value }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const { data } = await statsApi.getSales(params)
    salesData.value = data || []
  } catch (error) {
    console.error('获取销售统计失败:', error)
    ElMessage.error(error.response?.data?.error || '获取销售统计失败')
  } finally {
    loading.value = false
  }
}

// 获取产品统计
const fetchProducts = async () => {
  try {
    loading.value = true
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const { data } = await statsApi.getProducts(params)
    productsData.value = data || []
  } catch (error) {
    console.error('获取产品统计失败:', error)
    ElMessage.error(error.response?.data?.error || '获取产品统计失败')
  } finally {
    loading.value = false
  }
}

// 获取客户统计
const fetchCustomers = async () => {
  try {
    loading.value = true
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const { data } = await statsApi.getCustomers(params)
    customersData.value = data || []
  } catch (error) {
    console.error('获取客户统计失败:', error)
    ElMessage.error(error.response?.data?.error || '获取客户统计失败')
  } finally {
    loading.value = false
  }
}

// 获取应收账款
const fetchReceivables = async () => {
  try {
    loading.value = true
    const { data } = await statsApi.getReceivables()
    receivablesData.value = data
  } catch (error) {
    console.error('获取应收账款失败:', error)
    ElMessage.error(error.response?.data?.error || '获取应收账款失败')
  } finally {
    loading.value = false
  }
}

// Tab 切换
const handleTabChange = (tab) => {
  switch (tab) {
    case 'sales':
      fetchSales()
      break
    case 'products':
      fetchProducts()
      break
    case 'customers':
      fetchCustomers()
      break
    case 'receivables':
      fetchReceivables()
      break
  }
}

// 日期变化
const handleDateChange = () => {
  handleTabChange(activeTab.value)
}

// 导出Excel
const handleExport = async () => {
  try {
    const params = { type: activeTab.value }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const response = await statsApi.exportExcel(params)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `统计报表_${activeTab.value}_${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(error.response?.data?.error || '导出失败')
  }
}

const formatMoney = (value) => {
  return Number(value || 0).toFixed(5)
}

// 计算总计
const salesTotals = () => {
  return {
    order_count: salesData.value.reduce((sum, item) => sum + item.order_count, 0),
    total_amount: salesData.value.reduce((sum, item) => sum + item.total_amount, 0),
    paid_amount: salesData.value.reduce((sum, item) => sum + item.paid_amount, 0)
  }
}

const productsTotals = () => {
  return {
    total_quantity: productsData.value.reduce((sum, item) => sum + (item.total_quantity || 0), 0),
    total_amount: productsData.value.reduce((sum, item) => sum + (item.total_amount || 0), 0),
    order_count: productsData.value.reduce((sum, item) => sum + (item.order_count || 0), 0)
  }
}

const customersTotals = () => {
  return {
    order_count: customersData.value.reduce((sum, item) => sum + (item.order_count || 0), 0),
    total_amount: customersData.value.reduce((sum, item) => sum + (item.total_amount || 0), 0),
    unpaid_amount: customersData.value.reduce((sum, item) => sum + (item.unpaid_amount || 0), 0)
  }
}

onMounted(() => {
  fetchSales()
})
</script>

<template>
  <div class="reports-page">
    <!-- 筛选区 -->
    <el-card shadow="never" class="filter-card">
      <el-form inline>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item v-if="activeTab === 'sales'" label="统计粒度">
          <el-select v-model="groupBy" @change="fetchSales" style="width: 100px">
            <el-option label="按日" value="day" />
            <el-option label="按月" value="month" />
            <el-option label="按年" value="year" />
          </el-select>
        </el-form-item>
        <el-form-item style="float: right">
          <el-button type="primary" @click="handleExport">
            <el-icon><Download /></el-icon> 导出报表
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计内容 -->
    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 销售统计 -->
        <el-tab-pane label="销售统计" name="sales">
          <el-row :gutter="20" class="summary-row">
            <el-col :span="8">
              <el-statistic title="总订单数" :value="salesTotals().order_count" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="总销售额" :value="salesTotals().total_amount" prefix="¥" :precision="5" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="总收款额" :value="salesTotals().paid_amount" prefix="¥" :precision="5" />
            </el-col>
          </el-row>
          <el-table :data="salesData" v-loading="loading" show-summary>
            <el-table-column prop="date" label="日期" width="150" />
            <el-table-column prop="order_count" label="订单数" width="100" />
            <el-table-column prop="total_amount" label="销售额">
              <template #default="{ row }">
                ¥{{ formatMoney(row.total_amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="paid_amount" label="已收款">
              <template #default="{ row }">
                ¥{{ formatMoney(row.paid_amount) }}
              </template>
            </el-table-column>
            <el-table-column label="未收款">
              <template #default="{ row }">
                ¥{{ formatMoney(row.total_amount - row.paid_amount) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 产品统计 -->
        <el-tab-pane label="产品统计" name="products">
          <el-row :gutter="20" class="summary-row">
            <el-col :span="8">
              <el-statistic title="总销量" :value="productsTotals().total_quantity" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="总销售额" :value="productsTotals().total_amount" prefix="¥" :precision="5" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="涉及订单数" :value="productsTotals().order_count" />
            </el-col>
          </el-row>
          <el-table :data="productsData" v-loading="loading">
            <el-table-column prop="name" label="产品名称" min-width="150" />
            <el-table-column prop="category" label="分类" width="100">
              <template #default="{ row }">
                {{ row.category || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="total_quantity" label="销量" width="100">
              <template #default="{ row }">
                {{ row.total_quantity || 0 }}
              </template>
            </el-table-column>
            <el-table-column prop="order_count" label="订单数" width="100">
              <template #default="{ row }">
                {{ row.order_count || 0 }}
              </template>
            </el-table-column>
            <el-table-column prop="total_amount" label="销售额">
              <template #default="{ row }">
                ¥{{ formatMoney(row.total_amount) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 客户统计 -->
        <el-tab-pane label="客户统计" name="customers">
          <el-row :gutter="20" class="summary-row">
            <el-col :span="8">
              <el-statistic title="总订单数" :value="customersTotals().order_count" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="总消费额" :value="customersTotals().total_amount" prefix="¥" :precision="5" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="总欠款额" :value="customersTotals().unpaid_amount" prefix="¥" :precision="5" value-style="color: #f56c6c" />
            </el-col>
          </el-row>
          <el-table :data="customersData" v-loading="loading">
            <el-table-column prop="name" label="客户名称" min-width="120" />
            <el-table-column prop="phone" label="电话" width="130">
              <template #default="{ row }">
                {{ row.phone || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="order_count" label="订单数" width="100">
              <template #default="{ row }">
                {{ row.order_count || 0 }}
              </template>
            </el-table-column>
            <el-table-column prop="total_amount" label="消费总额">
              <template #default="{ row }">
                ¥{{ formatMoney(row.total_amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="paid_amount" label="已付金额">
              <template #default="{ row }">
                ¥{{ formatMoney(row.paid_amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="unpaid_amount" label="欠款金额">
              <template #default="{ row }">
                <span :class="{ 'text-danger': row.unpaid_amount > 0 }">
                  ¥{{ formatMoney(row.unpaid_amount) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 应收账款 -->
        <el-tab-pane label="应收账款" name="receivables">
          <el-alert
            :title="`当前应收账款总额: ¥${formatMoney(receivablesData.totalUnpaid)}`"
            type="warning"
            show-icon
            style="margin-bottom: 20px"
          />
          <el-table :data="receivablesData.receivables" v-loading="loading">
            <el-table-column prop="name" label="客户名称" min-width="120" />
            <el-table-column prop="phone" label="电话" width="130">
              <template #default="{ row }">
                {{ row.phone || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="order_count" label="欠款订单数" width="120" />
            <el-table-column prop="unpaid_amount" label="欠款金额">
              <template #default="{ row }">
                <span class="text-danger">¥{{ formatMoney(row.unpaid_amount) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.filter-card {
  margin-bottom: 20px;
}

.summary-row {
  margin-bottom: 20px;
  padding: 20px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.text-danger {
  color: var(--el-color-danger);
}
</style>

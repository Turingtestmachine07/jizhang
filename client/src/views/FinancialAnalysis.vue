<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { statsApi } from '../api'

const loading = ref(false)
const activeTab = ref('overview')

// 日期范围
const dateRange = ref([])
const groupBy = ref('month') // day, month, year

// 数据
const dashboardData = ref(null)
const salesData = ref([])
const expensesData = ref([])
const profitData = ref([])

// 初始化日期范围为最近30天
const initDateRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  dateRange.value = [
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0]
  ]
}

// 获取仪表盘数据
const fetchDashboard = async () => {
  try {
    const { data } = await statsApi.getDashboard()
    dashboardData.value = data
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
  }
}

// 获取销售数据
const fetchSalesData = async () => {
  try {
    loading.value = true
    const params = {
      groupBy: groupBy.value
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const { data } = await statsApi.getSales(params)
    salesData.value = data || []
  } catch (error) {
    ElMessage.error('获取销售数据失败')
  } finally {
    loading.value = false
  }
}

// 获取支出数据
const fetchExpensesData = async () => {
  try {
    const params = {
      groupBy: groupBy.value
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const { data } = await statsApi.getExpenses(params)
    expensesData.value = data || []
  } catch (error) {
    ElMessage.error('获取支出数据失败')
  }
}

// 合并计算利润数据
const calculateProfitData = () => {
  const salesMap = new Map()
  const expenseMap = new Map()

  salesData.value.forEach(item => {
    salesMap.set(item.date, {
      revenue: item.total_amount || 0,
      received: item.paid_amount || 0
    })
  })

  expensesData.value.forEach(item => {
    expenseMap.set(item.date, item.total_amount || 0)
  })

  const allDates = new Set([...salesMap.keys(), ...expenseMap.keys()])

  profitData.value = Array.from(allDates).map(date => {
    const sales = salesMap.get(date) || { revenue: 0, received: 0 }
    const expense = expenseMap.get(date) || 0

    return {
      date,
      revenue: sales.revenue,
      received: sales.received,
      expense,
      grossProfit: sales.revenue - expense,
      netProfit: sales.received - expense,
      profitRate: sales.revenue > 0 ? ((sales.revenue - expense) / sales.revenue * 100) : 0
    }
  }).sort((a, b) => a.date.localeCompare(b.date))
}

// 汇总统计
const summary = computed(() => {
  if (!profitData.value.length) return null

  const totalRevenue = profitData.value.reduce((sum, item) => sum + item.revenue, 0)
  const totalReceived = profitData.value.reduce((sum, item) => sum + item.received, 0)
  const totalExpense = profitData.value.reduce((sum, item) => sum + item.expense, 0)
  const totalGrossProfit = totalRevenue - totalExpense
  const totalNetProfit = totalReceived - totalExpense
  const receivableAmount = totalRevenue - totalReceived

  return {
    totalRevenue,
    totalReceived,
    totalExpense,
    totalGrossProfit,
    totalNetProfit,
    receivableAmount,
    grossProfitRate: totalRevenue > 0 ? (totalGrossProfit / totalRevenue * 100) : 0,
    netProfitRate: totalRevenue > 0 ? (totalNetProfit / totalRevenue * 100) : 0,
    expenseRate: totalRevenue > 0 ? (totalExpense / totalRevenue * 100) : 0
  }
})

// 支出分类数据
const expenseCategoryData = ref([])
const fetchExpenseCategoryData = async () => {
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const { data } = await statsApi.getExpenseCategories(params)
    expenseCategoryData.value = data || []
  } catch (error) {
    console.error('获取支出分类数据失败:', error)
  }
}

// 数据刷新
const refreshData = async () => {
  await Promise.all([
    fetchSalesData(),
    fetchExpensesData(),
    fetchExpenseCategoryData()
  ])
  calculateProfitData()
}

// 监听参数变化
watch([dateRange, groupBy], () => {
  refreshData()
}, { deep: true })

// 格式化货币
const formatMoney = (value) => {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 格式化百分比
const formatPercent = (value) => {
  return Number(value || 0).toFixed(2) + '%'
}

// 导出报表
const handleExport = async () => {
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const response = await statsApi.exportExcel(params)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `财务分析报表_${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  initDateRange()
  fetchDashboard()
  refreshData()
})
</script>

<template>
  <div class="financial-analysis">
    <!-- 筛选条件 -->
    <el-card shadow="never" class="filter-card">
      <el-form inline>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item label="统计粒度">
          <el-radio-group v-model="groupBy">
            <el-radio-button value="day">按天</el-radio-button>
            <el-radio-button value="month">按月</el-radio-button>
            <el-radio-button value="year">按年</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="refreshData">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon> 导出报表
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="analysis-tabs">
      <!-- 盈亏概览 -->
      <el-tab-pane label="盈亏概览" name="overview">
        <!-- 关键指标 -->
        <el-row :gutter="20" class="metrics-row" v-if="summary">
          <el-col :xs="12" :sm="8" :md="6">
            <el-card shadow="hover" class="metric-card revenue">
              <div class="metric-label">营业收入</div>
              <div class="metric-value">¥{{ formatMoney(summary.totalRevenue) }}</div>
              <div class="metric-desc">总订单金额</div>
            </el-card>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <el-card shadow="hover" class="metric-card received">
              <div class="metric-label">实收金额</div>
              <div class="metric-value">¥{{ formatMoney(summary.totalReceived) }}</div>
              <div class="metric-desc">已收款金额</div>
            </el-card>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <el-card shadow="hover" class="metric-card expense">
              <div class="metric-label">总支出</div>
              <div class="metric-value">¥{{ formatMoney(summary.totalExpense) }}</div>
              <div class="metric-desc">成本费用支出</div>
            </el-card>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <el-card shadow="hover" class="metric-card profit" :class="{ loss: summary.totalGrossProfit < 0 }">
              <div class="metric-label">毛利润</div>
              <div class="metric-value">¥{{ formatMoney(summary.totalGrossProfit) }}</div>
              <div class="metric-desc">收入 - 支出</div>
            </el-card>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <el-card shadow="hover" class="metric-card profit" :class="{ loss: summary.totalNetProfit < 0 }">
              <div class="metric-label">净利润</div>
              <div class="metric-value">¥{{ formatMoney(summary.totalNetProfit) }}</div>
              <div class="metric-desc">实收 - 支出</div>
            </el-card>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <el-card shadow="hover" class="metric-card receivable">
              <div class="metric-label">应收款</div>
              <div class="metric-value">¥{{ formatMoney(summary.receivableAmount) }}</div>
              <div class="metric-desc">待收款金额</div>
            </el-card>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <el-card shadow="hover" class="metric-card rate">
              <div class="metric-label">毛利率</div>
              <div class="metric-value">{{ formatPercent(summary.grossProfitRate) }}</div>
              <div class="metric-desc">毛利润/收入</div>
            </el-card>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <el-card shadow="hover" class="metric-card rate">
              <div class="metric-label">净利率</div>
              <div class="metric-value">{{ formatPercent(summary.netProfitRate) }}</div>
              <div class="metric-desc">净利润/收入</div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 趋势分析 -->
        <el-card shadow="never" class="chart-card">
          <template #header>
            <span>盈亏趋势分析</span>
          </template>
          <el-table :data="profitData" v-loading="loading" max-height="500">
            <el-table-column prop="date" label="日期" min-width="100" fixed />
            <el-table-column prop="revenue" label="营业收入" min-width="110">
              <template #default="{ row }">
                <span class="money-positive">¥{{ formatMoney(row.revenue) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="expense" label="总支出" min-width="110">
              <template #default="{ row }">
                <span class="money-negative">¥{{ formatMoney(row.expense) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="grossProfit" label="毛利润" min-width="110">
              <template #default="{ row }">
                <span :class="row.grossProfit >= 0 ? 'money-positive' : 'money-negative'">
                  ¥{{ formatMoney(row.grossProfit) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="netProfit" label="净利润" min-width="110">
              <template #default="{ row }">
                <span :class="row.netProfit >= 0 ? 'money-positive' : 'money-negative'">
                  ¥{{ formatMoney(row.netProfit) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="profitRate" label="毛利率" min-width="90">
              <template #default="{ row }">
                <el-tag :type="row.profitRate >= 20 ? 'success' : row.profitRate >= 0 ? 'warning' : 'danger'" size="small">
                  {{ formatPercent(row.profitRate) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="received" label="实收金额" min-width="110">
              <template #default="{ row }">
                <span class="money-info">¥{{ formatMoney(row.received) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 成本分析 -->
      <el-tab-pane label="成本分析" name="cost">
        <el-card shadow="never">
          <template #header>
            <span>支出分类统计</span>
          </template>
          <el-table :data="expenseCategoryData" max-height="600">
            <el-table-column prop="name" label="分类" min-width="120" />
            <el-table-column prop="expense_count" label="支出笔数" min-width="100" align="right" />
            <el-table-column prop="total_amount" label="总金额" min-width="140" align="right">
              <template #default="{ row }">
                <span class="money-negative">¥{{ formatMoney(row.total_amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="占比" min-width="120">
              <template #default="{ row }">
                <el-progress
                  :percentage="summary ? (row.total_amount / summary.totalExpense * 100) : 0"
                  :format="() => formatPercent(summary ? (row.total_amount / summary.totalExpense * 100) : 0)"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 现金流分析 -->
      <el-tab-pane label="现金流" name="cashflow">
        <el-card shadow="never">
          <template #header>
            <span>现金流量表</span>
          </template>
          <el-table :data="profitData" v-loading="loading" max-height="600">
            <el-table-column prop="date" label="日期" min-width="100" fixed />
            <el-table-column label="现金流入" min-width="110">
              <template #default="{ row }">
                <span class="money-positive">¥{{ formatMoney(row.received) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="现金流出" min-width="110">
              <template #default="{ row }">
                <span class="money-negative">¥{{ formatMoney(row.expense) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="净现金流" min-width="110">
              <template #default="{ row }">
                <span :class="(row.received - row.expense) >= 0 ? 'money-positive' : 'money-negative'">
                  ¥{{ formatMoney(row.received - row.expense) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="应收未收" min-width="110">
              <template #default="{ row }">
                <span class="money-warning">¥{{ formatMoney(row.revenue - row.received) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 经营分析 -->
      <el-tab-pane label="经营洞察" name="insights">
        <el-row :gutter="20" v-if="summary">
          <!-- 盈利能力分析 -->
          <el-col :span="12">
            <el-card shadow="never">
              <template #header>
                <span>盈利能力分析</span>
              </template>
              <div class="insight-item">
                <div class="insight-label">毛利率</div>
                <div class="insight-value">
                  <el-progress
                    :percentage="Math.min(100, summary.grossProfitRate)"
                    :color="summary.grossProfitRate >= 30 ? '#67c23a' : summary.grossProfitRate >= 15 ? '#e6a23c' : '#f56c6c'"
                  />
                </div>
                <div class="insight-desc">
                  {{ summary.grossProfitRate >= 30 ? '盈利能力优秀' : summary.grossProfitRate >= 15 ? '盈利能力良好' : '需要控制成本' }}
                </div>
              </div>
              <div class="insight-item">
                <div class="insight-label">净利率</div>
                <div class="insight-value">
                  <el-progress
                    :percentage="Math.min(100, summary.netProfitRate)"
                    :color="summary.netProfitRate >= 20 ? '#67c23a' : summary.netProfitRate >= 10 ? '#e6a23c' : '#f56c6c'"
                  />
                </div>
                <div class="insight-desc">
                  {{ summary.netProfitRate >= 20 ? '现金获取能力强' : summary.netProfitRate >= 10 ? '现金流健康' : '需加强回款' }}
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 成本控制分析 -->
          <el-col :span="12">
            <el-card shadow="never">
              <template #header>
                <span>成本控制分析</span>
              </template>
              <div class="insight-item">
                <div class="insight-label">成本率</div>
                <div class="insight-value">
                  <el-progress
                    :percentage="Math.min(100, summary.expenseRate)"
                    :color="summary.expenseRate <= 60 ? '#67c23a' : summary.expenseRate <= 80 ? '#e6a23c' : '#f56c6c'"
                  />
                </div>
                <div class="insight-desc">
                  {{ summary.expenseRate <= 60 ? '成本控制优秀' : summary.expenseRate <= 80 ? '成本控制良好' : '成本偏高，需优化' }}
                </div>
              </div>
              <div class="insight-item">
                <div class="insight-label">应收款占比</div>
                <div class="insight-value">
                  <el-progress
                    :percentage="summary.totalRevenue > 0 ? Math.min(100, summary.receivableAmount / summary.totalRevenue * 100) : 0"
                    :color="(summary.receivableAmount / summary.totalRevenue * 100) <= 20 ? '#67c23a' : (summary.receivableAmount / summary.totalRevenue * 100) <= 40 ? '#e6a23c' : '#f56c6c'"
                  />
                </div>
                <div class="insight-desc">
                  {{ (summary.receivableAmount / summary.totalRevenue * 100) <= 20 ? '回款及时' : (summary.receivableAmount / summary.totalRevenue * 100) <= 40 ? '回款正常' : '存在大量应收款' }}
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 经营建议 -->
        <el-card shadow="never" class="mt-20" v-if="summary">
          <template #header>
            <span>经营建议</span>
          </template>
          <el-alert
            v-if="summary.totalNetProfit < 0"
            title="亏损预警"
            type="error"
            :closable="false"
            show-icon
          >
            <p>当前净利润为负，建议：</p>
            <ul>
              <li>分析主要支出项目，控制非必要开支</li>
              <li>提高产品定价或优化产品结构</li>
              <li>加强应收款催收，改善现金流</li>
            </ul>
          </el-alert>

          <el-alert
            v-else-if="summary.netProfitRate < 10"
            title="利润率偏低"
            type="warning"
            :closable="false"
            show-icon
            class="mt-10"
          >
            <p>净利率低于10%，建议：</p>
            <ul>
              <li>优化成本结构，寻找降本增效机会</li>
              <li>提升高毛利产品销售占比</li>
              <li>改善运营效率，提高周转率</li>
            </ul>
          </el-alert>

          <el-alert
            v-if="summary.receivableAmount / summary.totalRevenue > 0.3"
            title="应收款占比较高"
            type="warning"
            :closable="false"
            show-icon
            class="mt-10"
          >
            <p>应收款占收入的{{ formatPercent(summary.receivableAmount / summary.totalRevenue * 100) }}，建议：</p>
            <ul>
              <li>加强客户信用管理，设置合理账期</li>
              <li>建立催收机制，定期跟进应收款</li>
              <li>考虑提供现款优惠，促进及时回款</li>
            </ul>
          </el-alert>

          <el-alert
            v-if="summary.totalNetProfit >= 0 && summary.netProfitRate >= 15"
            title="经营状况良好"
            type="success"
            :closable="false"
            show-icon
            class="mt-10"
          >
            <p>当前盈利能力良好，建议：</p>
            <ul>
              <li>保持当前经营策略，稳中求进</li>
              <li>考虑扩大市场份额或产品线</li>
              <li>建立现金储备，应对市场波动</li>
            </ul>
          </el-alert>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.filter-card {
  margin-bottom: 20px;
}

.analysis-tabs {
  background: white;
  padding: 20px;
  border-radius: 4px;
}

.metrics-row {
  margin-bottom: 20px;
}

.metric-card {
  text-align: center;
  padding: 20px 10px;
  border-left: 4px solid var(--el-color-primary);
}

.metric-card.revenue {
  border-left-color: #409eff;
}

.metric-card.received {
  border-left-color: #67c23a;
}

.metric-card.expense {
  border-left-color: #f56c6c;
}

.metric-card.profit {
  border-left-color: #67c23a;
}

.metric-card.profit.loss {
  border-left-color: #f56c6c;
}

.metric-card.receivable {
  border-left-color: #e6a23c;
}

.metric-card.rate {
  border-left-color: #909399;
}

.metric-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.metric-desc {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.chart-card {
  margin-top: 20px;
}

.money-positive {
  color: #67c23a;
  font-weight: 500;
}

.money-negative {
  color: #f56c6c;
  font-weight: 500;
}

.money-warning {
  color: #e6a23c;
  font-weight: 500;
}

.money-info {
  color: #409eff;
  font-weight: 500;
}

.mt-20 {
  margin-top: 20px;
}

.mt-10 {
  margin-top: 10px;
}

.insight-item {
  margin-bottom: 20px;
}

.insight-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 10px;
}

.insight-value {
  margin-bottom: 8px;
}

.insight-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

:deep(.el-alert ul) {
  margin: 10px 0 0 20px;
  padding: 0;
}

:deep(.el-alert li) {
  margin: 5px 0;
  list-style-type: disc;
}

@media screen and (max-width: 768px) {
  .metrics-row .el-col {
    margin-bottom: 10px;
  }

  .metric-value {
    font-size: 20px;
  }
}
</style>

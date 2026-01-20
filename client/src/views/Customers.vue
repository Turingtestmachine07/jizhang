<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { customerApi } from '../api'

const loading = ref(false)
const customers = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增客户')
const detailVisible = ref(false)
const currentCustomer = ref(null)
const customerStats = ref(null)
const customerOrders = ref([])

// 筛选条件
const filters = ref({
  keyword: ''
})

// 日期筛选
const dateRange = ref([])

// 表单数据
const form = ref({
  id: null,
  name: '',
  phone: '',
  address: '',
  note: ''
})

const formRef = ref()
const rules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }]
}

// 获取客户列表
const fetchCustomers = async () => {
  try {
    loading.value = true
    const { data } = await customerApi.getAll(filters.value)
    customers.value = data || []
  } catch (error) {
    ElMessage.error('获取客户列表失败')
  } finally {
    loading.value = false
  }
}

// 新增客户
const handleAdd = () => {
  dialogTitle.value = '新增客户'
  form.value = {
    id: null,
    name: '',
    phone: '',
    address: '',
    note: ''
  }
  dialogVisible.value = true
}

// 编辑客户
const handleEdit = (row) => {
  dialogTitle.value = '编辑客户'
  form.value = { ...row }
  dialogVisible.value = true
}

// 查看详情
const handleDetail = async (row) => {
  currentCustomer.value = row
  detailVisible.value = true
  dateRange.value = []
  await fetchCustomerDetail(row.id)
}

// 获取客户详情数据
const fetchCustomerDetail = async (id, params = {}) => {
  try {
    const [statsRes, ordersRes] = await Promise.all([
      customerApi.getStats(id, params),
      customerApi.getOrders(id, params)
    ])
    customerStats.value = statsRes.data
    customerOrders.value = ordersRes.data || []
  } catch (error) {
    ElMessage.error('获取客户详情失败')
  }
}

// 日期筛选改变
const handleDateChange = () => {
  if (currentCustomer.value) {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    fetchCustomerDetail(currentCustomer.value.id, params)
  }
}

// 删除客户
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该客户吗？', '提示', {
      type: 'warning'
    })
    await customerApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchCustomers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    if (form.value.id) {
      await customerApi.update(form.value.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await customerApi.create(form.value)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    fetchCustomers()
  } catch (error) {
    if (error !== false) {
      ElMessage.error('操作失败')
    }
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
  fetchCustomers()
})
</script>

<template>
  <div class="customers-page">
    <!-- 搜索筛选 -->
    <el-card shadow="never" class="filter-card">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="客户名称/电话/地址"
            clearable
            @keyup.enter="fetchCustomers"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchCustomers">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button @click="filters.keyword = ''; fetchCustomers()">
            重置
          </el-button>
        </el-form-item>
        <el-form-item style="float: right">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> 新增客户
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 客户列表 -->
    <el-card shadow="never">
      <el-table :data="customers" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="客户名称" min-width="120" />
        <el-table-column prop="phone" label="联系电话" width="140">
          <template #default="{ row }">
            {{ row.phone || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="address" label="地址" min-width="180">
          <template #default="{ row }">
            {{ row.address || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="150">
          <template #default="{ row }">
            {{ row.note || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleDetail(row)">
              详情
            </el-button>
            <el-button text type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" :rows="3" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 客户详情弹窗 -->
    <el-drawer v-model="detailVisible" title="客户详情" size="50%">
      <template v-if="currentCustomer">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客户名称">{{ currentCustomer.name }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentCustomer.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="地址" :span="2">{{ currentCustomer.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentCustomer.note || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>消费统计</el-divider>

        <div class="date-filter">
          <span>选择时段：</span>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </div>

        <el-row :gutter="20" v-if="customerStats" style="margin-top: 20px">
          <el-col :span="6">
            <el-statistic title="订单数" :value="customerStats.order_count" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="消费总额" :value="customerStats.total_amount" prefix="¥" :precision="2" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="已付金额" :value="customerStats.paid_amount" prefix="¥" :precision="2" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="欠款金额" :value="customerStats.unpaid_amount" prefix="¥" :precision="2" value-style="color: #f56c6c" />
          </el-col>
        </el-row>

        <el-divider>订单历史</el-divider>
        <el-table :data="customerOrders" max-height="300">
          <el-table-column prop="order_no" label="订单编号" width="160" />
          <el-table-column prop="total_amount" label="订单金额" width="100">
            <template #default="{ row }">
              ¥{{ formatMoney(row.total_amount) }}
            </template>
          </el-table-column>
          <el-table-column prop="paid_amount" label="已付金额" width="100">
            <template #default="{ row }">
              ¥{{ formatMoney(row.paid_amount) }}
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
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.filter-card {
  margin-bottom: 20px;
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>

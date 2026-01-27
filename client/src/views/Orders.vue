<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi, productApi, customerApi } from '../api'

const loading = ref(false)
const orders = ref([])
const products = ref([])
const customers = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('新建订单')
const detailVisible = ref(false)
const currentOrder = ref(null)
const selectedOrders = ref([])

// 快速新建客户弹窗
const quickCustomerVisible = ref(false)
const quickCustomerForm = ref({
  name: '',
  phone: '',
  address: '',
  note: ''
})

// 快速新建产品弹窗
const quickProductVisible = ref(false)
const quickProductForm = ref({
  name: '',
  category: '',
  spec: '',
  unit: '',
  unit_price: 0,
  description: ''
})
const categories = ref([])

// 筛选条件
const filters = ref({
  keyword: '',
  customerId: '',
  startDate: '',
  endDate: ''
})
const dateRange = ref([])

// 表单数据
const form = ref({
  id: null,
  customer_id: '',
  order_date: new Date().toISOString().split('T')[0],
  note: '',
  items: []
})

const formRef = ref()

// 计算订单总金额
const totalAmount = computed(() => {
  return form.value.items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unit_price || 0)
  }, 0)
})

// 获取订单列表
const fetchOrders = async () => {
  try {
    loading.value = true
    const params = { ...filters.value }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const { data } = await orderApi.getAll(params)
    orders.value = data || []
  } catch (error) {
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

// 获取产品和客户列表
const fetchBaseData = async () => {
  try {
    const [productsRes, customersRes, categoriesRes] = await Promise.all([
      productApi.getAll(),
      customerApi.getAll(),
      productApi.getCategories()
    ])
    products.value = Array.isArray(productsRes.data) ? productsRes.data : []
    customers.value = Array.isArray(customersRes.data) ? customersRes.data : []
    categories.value = Array.isArray(categoriesRes.data) ? categoriesRes.data : []
  } catch (error) {
    console.error('获取基础数据失败:', error)
    // 单独尝试获取每个数据
    try {
      const res = await customerApi.getAll()
      customers.value = Array.isArray(res.data) ? res.data : []
    } catch (e) {
      console.error('获取客户失败:', e)
    }
    try {
      const res = await productApi.getAll()
      products.value = Array.isArray(res.data) ? res.data : []
    } catch (e) {
      console.error('获取产品失败:', e)
    }
    try {
      const res = await productApi.getCategories()
      categories.value = Array.isArray(res.data) ? res.data : []
    } catch (e) {
      console.error('获取分类失败:', e)
    }
  }
}

// 新建订单
const handleAdd = () => {
  dialogTitle.value = '新建订单'
  form.value = {
    id: null,
    customer_id: '',
    order_date: new Date().toISOString().split('T')[0],
    note: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0, subtotal: 0, note: '' }]
  }
  dialogVisible.value = true
}

// 编辑订单
const handleEdit = async (row) => {
  try {
    const { data } = await orderApi.getById(row.id)
    dialogTitle.value = '编辑订单'
    form.value = {
      id: data.id,
      customer_id: data.customer_id || '',
      order_date: data.order_date,
      note: data.note || '',
      items: data.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal || (item.quantity * item.unit_price),
        note: item.note || ''
      }))
    }
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取订单详情失败')
  }
}

// 查看详情
const handleDetail = async (row) => {
  try {
    const { data } = await orderApi.getById(row.id)
    currentOrder.value = data
    detailVisible.value = true
  } catch (error) {
    ElMessage.error('获取订单详情失败')
  }
}

// 删除订单
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该订单吗？', '提示', {
      type: 'warning'
    })
    await orderApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchOrders()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 批量删除订单
const handleBatchDelete = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请选择要删除的订单')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedOrders.value.length} 个订单吗？`,
      '批量删除',
      { type: 'warning' }
    )

    const ids = selectedOrders.value.map(o => o.id)
    await orderApi.batchDelete(ids)
    ElMessage.success('批量删除成功')
    selectedOrders.value = []
    fetchOrders()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection
}

// 添加订单项
const addItem = () => {
  form.value.items.push({ product_id: '', quantity: 1, unit_price: 0, subtotal: 0, note: '' })
}

// 删除订单项
const removeItem = (index) => {
  form.value.items.splice(index, 1)
}

// 解析算术表达式（支持 2*3 这样的表达式）
const parseExpression = (value) => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return 0

  const str = value.trim()
  // 检查是否包含乘法运算
  if (str.includes('*')) {
    try {
      const parts = str.split('*').map(p => parseFloat(p.trim()))
      if (parts.length === 2 && !parts.some(isNaN)) {
        return parts[0] * parts[1]
      }
    } catch (e) {
      return 0
    }
  }

  return parseFloat(str) || 0
}

// 处理数量输入（支持算术表达式）
const handleQuantityInput = (index, value) => {
  const item = form.value.items[index]
  const parsedValue = parseExpression(value)
  item.quantity = parsedValue

  // 如果单价和数量都有值，自动计算总价
  if (item.unit_price > 0 && item.quantity > 0) {
    item.subtotal = item.unit_price * item.quantity
  }
}

// 处理单价变化
const handleUnitPriceChange = (index) => {
  const item = form.value.items[index]

  // 三填二逻辑：如果有数量，自动计算总价
  if (item.quantity > 0 && item.unit_price >= 0) {
    item.subtotal = item.unit_price * item.quantity
  } else if (item.subtotal > 0 && item.unit_price > 0) {
    // 如果有总价和单价，计算数量
    item.quantity = item.subtotal / item.unit_price
  }
}

// 处理数量变化
const handleQuantityChange = (index) => {
  const item = form.value.items[index]

  // 三填二逻辑：如果有单价，自动计算总价
  if (item.unit_price > 0 && item.quantity > 0) {
    item.subtotal = item.unit_price * item.quantity
  } else if (item.subtotal > 0 && item.quantity > 0) {
    // 如果有总价和数量，计算单价
    item.unit_price = item.subtotal / item.quantity
  }
}

// 处理总价变化
const handleSubtotalChange = (index) => {
  const item = form.value.items[index]

  // 三填二逻辑：根据已有的值计算缺失的值
  if (item.quantity > 0 && item.subtotal >= 0) {
    // 有数量和总价，计算单价
    item.unit_price = item.subtotal / item.quantity
  } else if (item.unit_price > 0 && item.subtotal > 0) {
    // 有单价和总价，计算数量
    item.quantity = item.subtotal / item.unit_price
  }
}

// 产品选择改变
const handleProductChange = (index) => {
  const item = form.value.items[index]
  const product = products.value.find(p => p.id === item.product_id)
  if (product) {
    item.unit_price = product.unit_price
    // 如果已经有数量，自动计算总价
    if (item.quantity > 0) {
      item.subtotal = item.unit_price * item.quantity
    }
  }
}

// 打开快速新建客户弹窗
const openQuickCustomer = () => {
  quickCustomerForm.value = {
    name: '',
    phone: '',
    address: '',
    note: ''
  }
  quickCustomerVisible.value = true
}

// 快速创建客户
const submitQuickCustomer = async () => {
  if (!quickCustomerForm.value.name) {
    ElMessage.warning('请输入客户名称')
    return
  }
  try {
    const { data } = await customerApi.create(quickCustomerForm.value)
    ElMessage.success('客户创建成功')
    customers.value.unshift(data)
    form.value.customer_id = data.id
    quickCustomerVisible.value = false
  } catch (error) {
    ElMessage.error('创建客户失败')
  }
}

// 打开快速新建产品弹窗
const openQuickProduct = () => {
  quickProductForm.value = {
    name: '',
    category: '',
    spec: '',
    unit: '',
    unit_price: 0,
    description: ''
  }
  quickProductVisible.value = true
}

// 快速创建产品
const submitQuickProduct = async () => {
  if (!quickProductForm.value.name) {
    ElMessage.warning('请输入产品名称')
    return
  }
  try {
    const { data } = await productApi.create(quickProductForm.value)
    ElMessage.success('产品创建成功')
    products.value.unshift(data)
    // 如果当前有空的产品项，自动选中新创建的产品
    const emptyItem = form.value.items.find(item => !item.product_id)
    if (emptyItem) {
      emptyItem.product_id = data.id
      emptyItem.unit_price = data.unit_price
    }
    quickProductVisible.value = false
  } catch (error) {
    ElMessage.error('创建产品失败')
  }
}

// 提交表单
const handleSubmit = async () => {
  if (form.value.items.length === 0 || !form.value.items.some(item => item.product_id)) {
    ElMessage.warning('请至少添加一个产品')
    return
  }

  try {
    const data = {
      ...form.value,
      customer_id: form.value.customer_id || null,
      items: form.value.items.filter(item => item.product_id)
    }

    if (form.value.id) {
      await orderApi.update(form.value.id, data)
      ElMessage.success('更新成功')
    } else {
      await orderApi.create(data)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    fetchOrders()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 导出Excel
const handleExport = async () => {
  try {
    const params = { ...filters.value }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const response = await orderApi.exportExcel(params)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `订单列表_${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 重置筛选
const resetFilters = () => {
  filters.value = {
    keyword: '',
    customerId: '',
    startDate: '',
    endDate: ''
  }
  dateRange.value = []
  fetchOrders()
}

const formatMoney = (value) => {
  return Number(value || 0).toFixed(5)
}

onMounted(() => {
  fetchOrders()
  fetchBaseData()
})
</script>

<template>
  <div class="orders-page">
    <!-- 搜索筛选 -->
    <el-card shadow="never" class="filter-card">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="订单编号/备注"
            clearable
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="filters.customerId" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchOrders">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
        <el-form-item style="float: right">
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon> 导出
          </el-button>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> 新建订单
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 批量操作栏 -->
      <div v-if="selectedOrders.length > 0" class="batch-actions">
        <span class="batch-info">已选择 {{ selectedOrders.length }} 项</span>
        <el-button
          type="danger"
          size="small"
          @click="handleBatchDelete"
        >
          <el-icon><Delete /></el-icon> 批量删除
        </el-button>
      </div>
    </el-card>

    <!-- 订单列表 -->
    <el-card shadow="never">
      <el-table
        :data="orders"
        v-loading="loading"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="order_no" label="订单编号" min-width="140" />
        <el-table-column prop="customer_name" label="客户" min-width="80">
          <template #default="{ row }">
            {{ row.customer_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="total_amount" label="订单金额" min-width="100">
          <template #default="{ row }">
            <span class="amount">¥{{ formatMoney(row.total_amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="order_date" label="订单日期" min-width="100" class-name="hide-on-mobile" />
        <el-table-column prop="note" label="备注" min-width="100" class-name="hide-on-mobile">
          <template #default="{ row }">
            {{ row.note || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="120" fixed="right">
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

    <!-- 新建/编辑订单弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="750px">
      <el-form ref="formRef" :model="form" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户">
              <div class="select-with-add">
                <el-select v-model="form.customer_id" placeholder="选择客户（可不选）" clearable filterable style="flex: 1">
                  <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id">
                    <span>{{ c.name }}</span>
                    <span v-if="c.phone" style="color: #999; margin-left: 10px">{{ c.phone }}</span>
                  </el-option>
                </el-select>
                <el-button type="primary" @click="openQuickCustomer" title="快速新建客户">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订单日期">
              <el-date-picker v-model="form.order_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-divider content-position="left">
          订单明细
          <el-button type="primary" link @click="openQuickProduct" style="margin-left: 10px">
            <el-icon><Plus /></el-icon> 新建产品
          </el-button>
        </el-divider>

        <div class="order-items">
          <div v-for="(item, index) in form.items" :key="index" class="order-item">
            <div class="order-item-field">
              <label class="field-label">产品</label>
              <el-select
                v-model="item.product_id"
                placeholder="选择产品"
                filterable
                style="width: 180px"
                @change="handleProductChange(index)"
              >
                <el-option
                  v-for="p in products"
                  :key="p.id"
                  :label="p.name"
                  :value="p.id"
                >
                  <span>{{ p.name }}</span>
                  <span style="color: #999; margin-left: 10px">¥{{ p.unit_price }}</span>
                </el-option>
              </el-select>
            </div>
            <div class="order-item-field">
              <label class="field-label">数量</label>
              <el-input
                v-model="item.quantity"
                placeholder="支持2*3"
                style="width: 140px"
                @blur="handleQuantityInput(index, item.quantity)"
                @change="handleQuantityChange(index)"
              />
            </div>
            <div class="order-item-field">
              <label class="field-label">单价</label>
              <el-input-number
                v-model="item.unit_price"
                :min="0"
                :precision="5"
                placeholder="单价"
                style="width: 150px"
                :controls="false"
                @change="handleUnitPriceChange(index)"
              />
            </div>
            <div class="order-item-field">
              <label class="field-label">总价</label>
              <el-input-number
                v-model="item.subtotal"
                :min="0"
                :precision="5"
                placeholder="总价"
                style="width: 150px"
                :controls="false"
                @change="handleSubtotalChange(index)"
              />
            </div>
            <div class="order-item-field">
              <label class="field-label">小计</label>
              <span class="item-subtotal-display">
                ¥{{ formatMoney(item.subtotal || item.quantity * item.unit_price) }}
              </span>
            </div>
            <el-button text type="danger" @click="removeItem(index)" style="margin-top: 20px;">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button type="primary" text @click="addItem">
            <el-icon><Plus /></el-icon> 添加产品行
          </el-button>
        </div>

        <el-form-item label="备注" style="margin-top: 20px">
          <el-input v-model="form.note" type="textarea" :rows="2" placeholder="订单备注" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <span class="total">订单总额: <strong>¥{{ formatMoney(totalAmount) }}</strong></span>
          <div>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSubmit">确定</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 快速新建客户弹窗 -->
    <el-dialog v-model="quickCustomerVisible" title="快速新建客户" width="450px" append-to-body>
      <el-form :model="quickCustomerForm" label-width="80px">
        <el-form-item label="客户名称" required>
          <el-input v-model="quickCustomerForm.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="quickCustomerForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="quickCustomerForm.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="quickCustomerForm.note" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quickCustomerVisible = false">取消</el-button>
        <el-button type="primary" @click="submitQuickCustomer">创建并选择</el-button>
      </template>
    </el-dialog>

    <!-- 快速新建产品弹窗 -->
    <el-dialog v-model="quickProductVisible" title="快速新建产品" width="450px" append-to-body>
      <el-form :model="quickProductForm" label-width="80px">
        <el-form-item label="产品名称" required>
          <el-input v-model="quickProductForm.name" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="quickProductForm.category" placeholder="选择或输入分类" filterable allow-create style="width: 100%">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="规格参数">
          <el-input v-model="quickProductForm.spec" placeholder="如: 500ml/瓶" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="quickProductForm.unit" placeholder="如: 个、件、箱" />
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="quickProductForm.unit_price" :min="0" :precision="5" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quickProductVisible = false">取消</el-button>
        <el-button type="primary" @click="submitQuickProduct">创建并使用</el-button>
      </template>
    </el-dialog>

    <!-- 订单详情抽屉 -->
    <el-drawer v-model="detailVisible" title="订单详情" size="50%">
      <template v-if="currentOrder">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单编号">{{ currentOrder.order_no }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ currentOrder.customer_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单金额">¥{{ formatMoney(currentOrder.total_amount) }}</el-descriptions-item>
          <el-descriptions-item label="订单日期">{{ currentOrder.order_date }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentOrder.created_at }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentOrder.note || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>订单明细</el-divider>
        <el-table :data="currentOrder.items">
          <el-table-column label="产品" width="80">
            <template #default="{ row }">
              <el-image
                v-if="row.product_photo"
                :src="row.product_photo"
                style="width: 40px; height: 40px; border-radius: 4px"
                fit="cover"
              />
              <el-icon v-else style="font-size: 40px; color: #ddd"><Picture /></el-icon>
            </template>
          </el-table-column>
          <el-table-column prop="product_name" label="产品名称" min-width="120" />
          <el-table-column prop="product_spec" label="规格" width="100">
            <template #default="{ row }">
              {{ row.product_spec || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unit_price" label="单价" width="100">
            <template #default="{ row }">
              ¥{{ formatMoney(row.unit_price) }}
            </template>
          </el-table-column>
          <el-table-column prop="subtotal" label="小计" width="100">
            <template #default="{ row }">
              ¥{{ formatMoney(row.subtotal) }}
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.filter-card {
  margin-bottom: 20px;
}

.order-items {
  background: var(--el-fill-color-light);
  padding: 15px;
  border-radius: 4px;
}

.order-item {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.order-item-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 12px;
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.item-subtotal {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  min-width: 100px;
}

.item-subtotal-display {
  color: var(--el-color-primary);
  font-weight: bold;
  font-size: 14px;
  min-width: 100px;
  padding: 8px 0;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total {
  font-size: 16px;
}

.total strong {
  color: var(--el-color-primary);
  font-size: 20px;
}

.amount.negative {
  color: var(--el-color-danger);
}

.select-with-add {
  display: flex;
  gap: 8px;
  width: 100%;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.batch-info {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-right: auto;
}

/* 移动端隐藏次要列 */
@media screen and (max-width: 768px) {
  .hide-on-mobile {
    display: none !important;
  }
}
</style>

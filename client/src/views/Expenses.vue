<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { expenseApi } from '../api'

const loading = ref(false)
const expenses = ref([])
const categories = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增支出')
const categoryDialogVisible = ref(false)

// 筛选条件
const filters = ref({
  keyword: '',
  categoryId: ''
})

const dateRange = ref([])

// 表单数据
const form = ref({
  id: null,
  category_id: '',
  amount: 0,
  expense_date: new Date().toISOString().split('T')[0],
  payee: '',
  note: ''
})

const categoryForm = ref({
  name: ''
})

const formRef = ref()
const rules = {
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  expense_date: [{ required: true, message: '请选择日期', trigger: 'change' }]
}

// 统计信息
const totalAmount = computed(() => {
  return expenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
})

// 获取支出列表
const fetchExpenses = async () => {
  try {
    loading.value = true
    const params = { ...filters.value }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const { data } = await expenseApi.getAll(params)
    expenses.value = data || []
  } catch (error) {
    ElMessage.error('获取支出列表失败')
  } finally {
    loading.value = false
  }
}

// 获取分类列表
const fetchCategories = async () => {
  try {
    const { data } = await expenseApi.getCategories()
    categories.value = data || []
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

// 重置筛选
const resetFilters = () => {
  filters.value = { keyword: '', categoryId: '' }
  dateRange.value = []
  fetchExpenses()
}

// 新增支出
const handleAdd = () => {
  dialogTitle.value = '新增支出'
  form.value = {
    id: null,
    category_id: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    payee: '',
    note: ''
  }
  dialogVisible.value = true
}

// 编辑支出
const handleEdit = (row) => {
  dialogTitle.value = '编辑支出'
  form.value = { ...row }
  dialogVisible.value = true
}

// 删除支出
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该支出记录吗？', '提示', {
      type: 'warning'
    })
    await expenseApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchExpenses()
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
      await expenseApi.update(form.value.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await expenseApi.create(form.value)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    fetchExpenses()
  } catch (error) {
    if (error !== false) {
      ElMessage.error('操作失败')
    }
  }
}

// 添加分类
const handleAddCategory = async () => {
  if (!categoryForm.value.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  try {
    await expenseApi.createCategory(categoryForm.value)
    ElMessage.success('添加成功')
    categoryForm.value.name = ''
    categoryDialogVisible.value = false
    fetchCategories()
  } catch (error) {
    ElMessage.error('添加失败')
  }
}

// 删除分类
const handleDeleteCategory = async (cat) => {
  try {
    await ElMessageBox.confirm('确定要删除该分类吗？', '提示', {
      type: 'warning'
    })
    await expenseApi.deleteCategory(cat.id)
    ElMessage.success('删除成功')
    fetchCategories()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 导出Excel
const handleExport = async () => {
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    if (filters.value.categoryId) {
      params.categoryId = filters.value.categoryId
    }
    const response = await expenseApi.exportExcel(params)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `支出记录_${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

const formatMoney = (value) => {
  return Number(value || 0).toFixed(5)
}

onMounted(() => {
  fetchExpenses()
  fetchCategories()
})
</script>

<template>
  <div class="expenses-page">
    <!-- 搜索筛选 -->
    <el-card shadow="never" class="filter-card">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="编号/收款方/备注"
            clearable
            @keyup.enter="fetchExpenses"
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.categoryId" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
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
          <el-button type="primary" @click="fetchExpenses">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
        <el-form-item style="float: right">
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon> 导出
          </el-button>
          <el-button @click="categoryDialogVisible = true">
            <el-icon><FolderAdd /></el-icon> 管理分类
          </el-button>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> 新增支出
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计信息 -->
    <el-card shadow="never" class="summary-card">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-statistic title="支出笔数" :value="expenses.length" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="支出总额" :value="totalAmount" prefix="¥" :precision="5" value-style="color: #f56c6c" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="平均金额" :value="expenses.length ? totalAmount / expenses.length : 0" prefix="¥" :precision="5" />
        </el-col>
      </el-row>
    </el-card>

    <!-- 支出列表 -->
    <el-card shadow="never">
      <el-table :data="expenses" v-loading="loading" style="width: 100%">
        <el-table-column prop="expense_no" label="支出编号" min-width="140" />
        <el-table-column prop="category_name" label="分类" min-width="100">
          <template #default="{ row }">
            <el-tag v-if="row.category_name" size="small">{{ row.category_name }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" min-width="100">
          <template #default="{ row }">
            <span class="amount negative">¥{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="expense_date" label="日期" min-width="100" />
        <el-table-column prop="payee" label="收款方" min-width="100">
          <template #default="{ row }">
            {{ row.payee || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="120" class-name="hide-on-mobile">
          <template #default="{ row }">
            {{ row.note || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="120" fixed="right">
          <template #default="{ row }">
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
        <el-form-item label="分类">
          <el-select v-model="form.category_id" placeholder="选择分类" clearable style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number v-model="form.amount" :min="0" :precision="5" style="width: 100%" />
        </el-form-item>
        <el-form-item label="日期" prop="expense_date">
          <el-date-picker
            v-model="form.expense_date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="收款方">
          <el-input v-model="form.payee" placeholder="收款方名称" />
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

    <!-- 分类管理弹窗 -->
    <el-dialog v-model="categoryDialogVisible" title="管理支出分类" width="400px">
      <div class="category-input">
        <el-input v-model="categoryForm.name" placeholder="输入新分类名称" @keyup.enter="handleAddCategory">
          <template #append>
            <el-button @click="handleAddCategory">添加</el-button>
          </template>
        </el-input>
      </div>
      <div class="category-list">
        <el-tag
          v-for="cat in categories"
          :key="cat.id"
          closable
          size="large"
          @close="handleDeleteCategory(cat)"
          style="margin: 4px"
        >
          {{ cat.name }}
        </el-tag>
      </div>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-card {
  margin-bottom: 20px;
}

.summary-card {
  margin-bottom: 20px;
}

.summary-card :deep(.el-statistic) {
  text-align: center;
}

.amount.negative {
  color: var(--el-color-danger);
  font-weight: 500;
}

.category-input {
  margin-bottom: 20px;
}

.category-list {
  min-height: 100px;
  padding: 10px;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
}

/* 移动端隐藏次要列 */
@media screen and (max-width: 768px) {
  .hide-on-mobile {
    display: none !important;
  }
}
</style>

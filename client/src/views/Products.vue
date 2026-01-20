<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { productApi } from '../api'

const loading = ref(false)
const products = ref([])
const categories = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增产品')
const detailVisible = ref(false)
const currentProduct = ref(null)
const productStats = ref(null)
const productOrders = ref([])

// 筛选条件
const filters = ref({
  keyword: '',
  category: ''
})

// 表单数据
const form = ref({
  id: null,
  name: '',
  category: '',
  spec: '',
  unit: '',
  unit_price: 0,
  description: '',
  photo: null
})

const formRef = ref()
const rules = {
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }]
}

// 图片预览
const imageUrl = ref('')
const fileList = ref([])

// 获取产品列表
const fetchProducts = async () => {
  try {
    loading.value = true
    const { data } = await productApi.getAll(filters.value)
    products.value = data || []
  } catch (error) {
    ElMessage.error('获取产品列表失败')
  } finally {
    loading.value = false
  }
}

// 获取分类列表
const fetchCategories = async () => {
  try {
    const { data } = await productApi.getCategories()
    categories.value = data || []
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

// 新增产品
const handleAdd = () => {
  dialogTitle.value = '新增产品'
  form.value = {
    id: null,
    name: '',
    category: '',
    spec: '',
    unit: '',
    unit_price: 0,
    description: '',
    photo: null
  }
  imageUrl.value = ''
  fileList.value = []
  dialogVisible.value = true
}

// 编辑产品
const handleEdit = (row) => {
  dialogTitle.value = '编辑产品'
  form.value = { ...row }
  imageUrl.value = row.photo || ''
  fileList.value = row.photo ? [{ url: row.photo }] : []
  dialogVisible.value = true
}

// 查看详情
const handleDetail = async (row) => {
  currentProduct.value = row
  detailVisible.value = true
  try {
    const [statsRes, ordersRes] = await Promise.all([
      productApi.getStats(row.id),
      productApi.getOrders(row.id)
    ])
    productStats.value = statsRes.data
    productOrders.value = ordersRes.data || []
  } catch (error) {
    ElMessage.error('获取产品详情失败')
  }
}

// 删除产品
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该产品吗？', '提示', {
      type: 'warning'
    })
    await productApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchProducts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 图片上传前检查
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

// 图片改变
const handleImageChange = (file) => {
  form.value.photo = file.raw
  imageUrl.value = URL.createObjectURL(file.raw)
}

// 移除图片
const handleImageRemove = () => {
  form.value.photo = null
  imageUrl.value = ''
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    if (form.value.id) {
      await productApi.update(form.value.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await productApi.create(form.value)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    fetchProducts()
    fetchCategories()
  } catch (error) {
    if (error !== false) {
      ElMessage.error('操作失败')
    }
  }
}

const formatMoney = (value) => {
  return Number(value || 0).toFixed(2)
}

onMounted(() => {
  fetchProducts()
  fetchCategories()
})
</script>

<template>
  <div class="products-page">
    <!-- 搜索筛选 -->
    <el-card shadow="never" class="filter-card">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="产品名称/规格"
            clearable
            @keyup.enter="fetchProducts"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.category" placeholder="全部" clearable>
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchProducts">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button @click="filters = { keyword: '', category: '' }; fetchProducts()">
            重置
          </el-button>
        </el-form-item>
        <el-form-item style="float: right">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> 新增产品
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 产品列表 -->
    <el-card shadow="never">
      <el-table :data="products" v-loading="loading" style="width: 100%">
        <el-table-column label="图片" width="80">
          <template #default="{ row }">
            <el-image
              v-if="row.photo"
              :src="row.photo"
              :preview-src-list="[row.photo]"
              class="product-photo"
              fit="cover"
            />
            <el-icon v-else class="no-photo"><Picture /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="产品名称" min-width="120" />
        <el-table-column prop="category" label="分类" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.category" size="small">{{ row.category }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="spec" label="规格" min-width="120">
          <template #default="{ row }">
            {{ row.spec || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80">
          <template #default="{ row }">
            {{ row.unit || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="unit_price" label="单价" width="100">
          <template #default="{ row }">
            ¥{{ formatMoney(row.unit_price) }}
          </template>
        </el-table-column>
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
        <el-form-item label="产品图片">
          <el-upload
            class="photo-uploader"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :on-change="handleImageChange"
            :auto-upload="false"
            accept="image/*"
          >
            <img v-if="imageUrl" :src="imageUrl" class="photo-preview" />
            <el-icon v-else class="photo-uploader-icon"><Plus /></el-icon>
          </el-upload>
          <el-button v-if="imageUrl" text type="danger" @click="handleImageRemove">
            移除图片
          </el-button>
        </el-form-item>
        <el-form-item label="产品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category" placeholder="选择或输入分类" filterable allow-create>
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="规格参数">
          <el-input v-model="form.spec" placeholder="如: 500ml/瓶" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="form.unit" placeholder="如: 个、件、箱" />
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="form.unit_price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="产品描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 产品详情弹窗 -->
    <el-drawer v-model="detailVisible" title="产品详情" size="50%">
      <template v-if="currentProduct">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="产品名称">{{ currentProduct.name }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ currentProduct.category || '-' }}</el-descriptions-item>
          <el-descriptions-item label="规格">{{ currentProduct.spec || '-' }}</el-descriptions-item>
          <el-descriptions-item label="单位">{{ currentProduct.unit || '-' }}</el-descriptions-item>
          <el-descriptions-item label="单价">¥{{ formatMoney(currentProduct.unit_price) }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ currentProduct.description || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>销售统计</el-divider>
        <el-row :gutter="20" v-if="productStats">
          <el-col :span="6">
            <el-statistic title="总销量" :value="productStats.total_quantity" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="订单数" :value="productStats.order_count" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="销售总额" :value="productStats.total_amount" prefix="¥" :precision="2" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="平均单价" :value="productStats.avg_price" prefix="¥" :precision="2" />
          </el-col>
        </el-row>

        <el-divider>订单历史</el-divider>
        <el-table :data="productOrders" max-height="300">
          <el-table-column prop="order_no" label="订单编号" width="160" />
          <el-table-column prop="customer_name" label="客户" width="100" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="subtotal" label="金额" width="100">
            <template #default="{ row }">
              ¥{{ formatMoney(row.subtotal) }}
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

.product-photo {
  width: 50px;
  height: 50px;
  border-radius: 4px;
}

.no-photo {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color);
  border-radius: 4px;
  font-size: 24px;
  color: var(--el-text-color-placeholder);
}

.photo-uploader {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-uploader:hover {
  border-color: var(--el-color-primary);
}

.photo-uploader-icon {
  font-size: 28px;
  color: var(--el-text-color-placeholder);
}

.photo-preview {
  width: 120px;
  height: 120px;
  object-fit: cover;
}
</style>

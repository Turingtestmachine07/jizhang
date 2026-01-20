<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { productApi } from '../api'
import QRCode from 'qrcode'
import axios from 'axios'

const loading = ref(false)
const products = ref([])
const categories = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增产品')
const detailVisible = ref(false)
const currentProduct = ref(null)
const productStats = ref(null)
const productOrders = ref([])
const selectedProducts = ref([]) // 批量选中的产品

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

// 将相对路径转换为完整URL（用于显示）
const getImageUrl = (photoPath) => {
  if (!photoPath) return ''
  if (photoPath.startsWith('http')) return photoPath
  if (photoPath.startsWith('/uploads/')) {
    // 开发环境下使用后端服务器地址
    const backendUrl = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin
    return `${backendUrl}${photoPath}`
  }
  return photoPath
}

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
  imageUrl.value = getImageUrl(row.photo)
  fileList.value = row.photo ? [{ url: getImageUrl(row.photo) }] : []
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

// 表格选择变化
const handleSelectionChange = (selection) => {
  selectedProducts.value = selection
}

// 批量删除
const handleBatchDelete = async () => {
  if (selectedProducts.value.length === 0) {
    ElMessage.warning('请先选择要删除的产品')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedProducts.value.length} 个产品吗？`,
      '批量删除',
      { type: 'warning' }
    )

    // 并发删除所有选中的产品
    await Promise.all(
      selectedProducts.value.map(product => productApi.delete(product.id))
    )

    ElMessage.success(`成功删除 ${selectedProducts.value.length} 个产品`)
    selectedProducts.value = []
    fetchProducts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

// 批量导出
const handleBatchExport = () => {
  if (selectedProducts.value.length === 0) {
    ElMessage.warning('请先选择要导出的产品')
    return
  }

  try {
    // 准备导出数据
    const exportData = selectedProducts.value.map(product => ({
      '产品名称': product.name,
      '分类': product.category || '-',
      '规格': product.spec || '-',
      '单位': product.unit || '-',
      '单价': product.unit_price,
      '描述': product.description || '-'
    }))

    // 转换为CSV格式
    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n')

    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `产品列表_${new Date().toLocaleDateString()}.csv`
    link.click()

    ElMessage.success(`成功导出 ${selectedProducts.value.length} 个产品`)
  } catch (error) {
    ElMessage.error('导出失败')
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

// 扫码上传相关
const qrDialogVisible = ref(false)
const qrCodeUrl = ref('')
const uploadSessionId = ref(null)
const pollingTimer = ref(null)

// 开始扫码上传
const startQRUpload = async () => {
  try {
    // 创建上传会话
    const { data } = await axios.post('/api/upload-session')
    uploadSessionId.value = data.sessionId

    // 获取外部访问地址配置
    const { data: configData } = await axios.get('/api/config/external-url')

    let baseUrl
    if (configData.externalUrl) {
      // 如果配置了完整的外部URL，直接使用
      baseUrl = configData.externalUrl
    } else if (configData.ip) {
      // 如果只返回了IP，使用当前访问的协议和端口
      const protocol = window.location.protocol
      const port = window.location.port
      baseUrl = `${protocol}//${configData.ip}${port ? ':' + port : ''}`
    } else {
      // 兜底：使用当前浏览器访问的完整地址
      baseUrl = `${window.location.protocol}//${window.location.host}`
    }

    const uploadUrl = `${baseUrl}/mobile-upload/${data.sessionId}`

    // 生成二维码
    qrCodeUrl.value = await QRCode.toDataURL(uploadUrl, {
      width: 300,
      margin: 2
    })

    qrDialogVisible.value = true

    // 开始轮询检查上传状态
    startPolling()
  } catch (error) {
    ElMessage.error('创建上传会话失败')
  }
}

// 开始轮询
const startPolling = () => {
  pollingTimer.value = setInterval(async () => {
    try {
      const { data } = await axios.get(`/api/upload-session/${uploadSessionId.value}`)

      if (data.hasUpload && data.uploadedFile) {
        // 停止轮询
        stopPolling()

        // 设置图片
        const uploadedUrl = data.uploadedFile.url
        imageUrl.value = getImageUrl(uploadedUrl)
        form.value.photo = uploadedUrl // 保存相对路径

        // 关闭对话框
        qrDialogVisible.value = false

        ElMessage.success('图片已接收')

        // 清理会话
        await axios.delete(`/api/upload-session/${uploadSessionId.value}`)
      }
    } catch (error) {
      console.error('轮询失败:', error)
    }
  }, 2000) // 每2秒检查一次
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

// 关闭二维码对话框
const closeQRDialog = () => {
  stopPolling()
  qrDialogVisible.value = false
  if (uploadSessionId.value) {
    axios.delete(`/api/upload-session/${uploadSessionId.value}`).catch(() => {})
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    console.log('提交的表单数据:', form.value)
    console.log('photo字段类型:', typeof form.value.photo)
    console.log('photo字段值:', form.value.photo)

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
          <el-select v-model="filters.category" placeholder="全部" clearable style="width: 150px">
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
          <el-button
            type="danger"
            :disabled="selectedProducts.length === 0"
            @click="handleBatchDelete"
          >
            <el-icon><Delete /></el-icon> 批量删除 ({{ selectedProducts.length }})
          </el-button>
          <el-button
            type="success"
            :disabled="selectedProducts.length === 0"
            @click="handleBatchExport"
          >
            <el-icon><Download /></el-icon> 批量导出 ({{ selectedProducts.length }})
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 产品列表 -->
    <el-card shadow="never">
      <el-table
        :data="products"
        v-loading="loading"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="图片" width="80">
          <template #default="{ row }">
            <el-image
              v-if="row.photo"
              :src="row.photo"
              :preview-src-list="[row.photo]"
              :z-index="9999"
              class="product-photo"
              fit="cover"
              preview-teleported
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
          <div class="upload-area">
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
            <div class="upload-buttons">
              <el-button v-if="imageUrl" text type="danger" @click="handleImageRemove">
                移除图片
              </el-button>
              <el-button type="primary" text @click="startQRUpload">
                <el-icon><QrCode /></el-icon> 扫码上传
              </el-button>
            </div>
          </div>
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

    <!-- 扫码上传对话框 -->
    <el-dialog
      v-model="qrDialogVisible"
      title="扫码上传图片"
      width="400px"
      @close="closeQRDialog"
    >
      <div class="qr-upload-dialog">
        <p class="qr-tip">请使用手机扫描二维码上传图片</p>
        <div class="qr-code-container">
          <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="二维码" class="qr-code" />
        </div>
        <p class="qr-hint">上传后图片将自动显示在表单中</p>
      </div>
    </el-dialog>
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
  cursor: pointer;
}

.product-photo:hover {
  opacity: 0.8;
  transform: scale(1.05);
  transition: all 0.3s;
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

.upload-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

.qr-upload-dialog {
  text-align: center;
  padding: 20px 0;
}

.qr-tip {
  font-size: 16px;
  color: var(--el-text-color-regular);
  margin-bottom: 20px;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.qr-code {
  width: 300px;
  height: 300px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.qr-hint {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-top: 20px;
}
</style>

<!-- 全局样式：确保图片预览在最顶层 -->
<style>
/* 图片预览遮罩层 */
.el-image-viewer__wrapper {
  z-index: 9999 !important;
}

/* 图片预览关闭按钮 */
.el-image-viewer__close {
  z-index: 10000 !important;
  color: #fff !important;
  background-color: rgba(0, 0, 0, 0.5) !important;
  border-radius: 50% !important;
  width: 40px !important;
  height: 40px !important;
}

/* 背景遮罩 - 使用适中的半透明灰色背景 */
.el-image-viewer__mask {
  z-index: 9998 !important;
  background-color: rgba(0, 0, 0, 0.15) !important; /* 15%透明度的黑色，非常明亮 */
}

/* 图片容器 */
.el-image-viewer__canvas {
  background-color: transparent !important;
}

/* 图片本身 */
.el-image-viewer__img {
  max-width: 90vw !important;
  max-height: 90vh !important;
  filter: brightness(1.1) contrast(1.05) !important; /* 提高10%亮度和5%对比度 */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
}

/* 工具栏按钮 */
.el-image-viewer__actions {
  background-color: rgba(0, 0, 0, 0.6) !important;
  padding: 8px 20px !important;
  border-radius: 20px !important;
}

.el-image-viewer__actions__inner {
  color: #fff !important;
}

.el-image-viewer__actions__inner .el-icon {
  color: #fff !important;
}
</style>

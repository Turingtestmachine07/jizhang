<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useThemeStore } from '../stores/theme'
import { backupApi, imageCleanerApi, productApi } from '../api'

const themeStore = useThemeStore()
const loading = ref(false)
const backups = ref([])
const backupConfig = ref({
  enabled: true,
  retentionDays: 14
})
const configLoading = ref(false)

// 图片清理相关
const imageStats = ref(null)
const cleaningImages = ref(false)

// 产品分类相关
const productCategories = ref([])
const categoryDialogVisible = ref(false)
const categoryForm = ref({ name: '' })
const categoryLoading = ref(false)

// 获取自动备份配置
const fetchBackupConfig = async () => {
  try {
    const { data } = await backupApi.getConfig()
    backupConfig.value = data
  } catch (error) {
    ElMessage.error('获取自动备份配置失败')
  }
}

// 保存自动备份配置
const saveBackupConfig = async () => {
  try {
    configLoading.value = true
    await backupApi.updateConfig(backupConfig.value)
    ElMessage.success('配置已保存')
  } catch (error) {
    ElMessage.error('保存配置失败')
  } finally {
    configLoading.value = false
  }
}

// 获取备份列表
const fetchBackups = async () => {
  try {
    loading.value = true
    const { data } = await backupApi.getAll()
    backups.value = data || []
  } catch (error) {
    ElMessage.error('获取备份列表失败')
  } finally {
    loading.value = false
  }
}

// 创建备份
const handleBackup = async () => {
  try {
    await backupApi.create()
    ElMessage.success('备份成功')
    fetchBackups()
  } catch (error) {
    ElMessage.error('备份失败')
  }
}

// 恢复备份
const handleRestore = async (filename) => {
  try {
    await ElMessageBox.confirm(
      '恢复备份将覆盖当前数据，确定要继续吗？系统会自动备份当前数据。',
      '警告',
      { type: 'warning' }
    )
    await backupApi.restore(filename)
    ElMessage.success('恢复成功，请刷新页面或重启服务以应用更改')
    fetchBackups()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('恢复失败')
    }
  }
}

// 删除备份
const handleDelete = async (filename) => {
  try {
    await ElMessageBox.confirm('确定要删除该备份吗？', '提示', {
      type: 'warning'
    })
    await backupApi.delete(filename)
    ElMessage.success('删除成功')
    fetchBackups()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 下载备份
const handleDownload = (filename) => {
  window.open(backupApi.download(filename), '_blank')
}

// 格式化文件大小
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// 格式化时间
const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

// 判断是否为自动备份
const isAutoBackup = (filename) => {
  return filename.startsWith('jizhang_auto_')
}

// 获取图片清理统计
const fetchImageStats = async () => {
  try {
    const { data } = await imageCleanerApi.getStats()
    imageStats.value = data
  } catch (error) {
    ElMessage.error('获取图片统计失败')
  }
}

// 清理未使用的图片
const handleCleanImages = async () => {
  try {
    await ElMessageBox.confirm(
      `将删除 ${imageStats.value?.unusedImages || 0} 个未使用的图片，释放约 ${imageStats.value?.unusedSizeMB || 0} MB 空间。此操作不可恢复，确定继续吗？`,
      '清理图片',
      { type: 'warning' }
    )

    cleaningImages.value = true
    const { data } = await imageCleanerApi.clean()

    ElMessage.success(`清理完成：删除 ${data.deletedCount} 个文件，释放 ${data.deletedSizeMB} MB 空间`)

    // 刷新统计
    await fetchImageStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清理失败')
    }
  } finally {
    cleaningImages.value = false
  }
}

// 获取产品分类列表
const fetchProductCategories = async () => {
  try {
    categoryLoading.value = true
    const { data } = await productApi.getCategories()
    productCategories.value = data || []
  } catch (error) {
    ElMessage.error('获取产品分类失败')
  } finally {
    categoryLoading.value = false
  }
}

// 打开添加分类对话框
const openCategoryDialog = () => {
  categoryForm.value = { name: '' }
  categoryDialogVisible.value = true
}

// 添加产品分类
const handleAddCategory = async () => {
  if (!categoryForm.value.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }

  try {
    await productApi.createCategory(categoryForm.value)
    ElMessage.success('添加成功')
    categoryDialogVisible.value = false
    fetchProductCategories()
  } catch (error) {
    ElMessage.error('添加失败')
  }
}

// 删除产品分类
const handleDeleteCategory = async (id, name) => {
  try {
    await ElMessageBox.confirm(`确定要删除分类"${name}"吗？`, '提示', {
      type: 'warning'
    })
    await productApi.deleteCategory(id)
    ElMessage.success('删除成功')
    fetchProductCategories()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  fetchBackups()
  fetchBackupConfig()
  fetchImageStats()
  fetchProductCategories()
})
</script>

<template>
  <div class="settings-page">
    <!-- 主题设置 -->
    <el-card shadow="never" class="setting-card">
      <template #header>
        <div class="card-header">
          <el-icon><Sunny /></el-icon>
          <span>主题设置</span>
        </div>
      </template>
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">深色模式</div>
          <div class="setting-desc">切换系统显示主题</div>
        </div>
        <el-switch
          :model-value="themeStore.isDark"
          @change="themeStore.toggleTheme"
          size="large"
        />
      </div>
    </el-card>

    <!-- 数据备份 -->
    <el-card shadow="never" class="setting-card">
      <template #header>
        <div class="card-header">
          <el-icon><FolderOpened /></el-icon>
          <span>数据备份</span>
        </div>
      </template>

      <!-- 自动备份配置 -->
      <div class="backup-config">
        <h4 class="config-title">自动备份设置</h4>
        <el-form label-width="120px" :model="backupConfig">
          <el-form-item label="启用自动备份">
            <el-switch v-model="backupConfig.enabled" />
            <span class="form-tip">每天首次启动时自动备份</span>
          </el-form-item>
          <el-form-item label="保留天数">
            <el-input-number
              v-model="backupConfig.retentionDays"
              :min="1"
              :max="365"
              :disabled="!backupConfig.enabled"
            />
            <span class="form-tip">自动备份超过此天数将被删除（默认14天）</span>
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              @click="saveBackupConfig"
              :loading="configLoading"
            >
              保存配置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-divider />

      <div class="backup-actions">
        <el-button type="primary" @click="handleBackup">
          <el-icon><Plus /></el-icon> 创建备份
        </el-button>
        <el-button @click="fetchBackups">
          <el-icon><Refresh /></el-icon> 刷新列表
        </el-button>
      </div>

      <el-table :data="backups" v-loading="loading" style="margin-top: 20px">
        <el-table-column prop="filename" label="文件名" min-width="280" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag v-if="isAutoBackup(row.filename)" type="info" size="small">自动</el-tag>
            <el-tag v-else type="success" size="small">手动</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="size" label="大小" width="100">
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="created" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleDownload(row.filename)">
              下载
            </el-button>
            <el-button text type="warning" size="small" @click="handleRestore(row.filename)">
              恢复
            </el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row.filename)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && backups.length === 0" description="暂无备份" />
    </el-card>

    <!-- 图片清理 -->
    <el-card shadow="never" class="setting-card">
      <template #header>
        <div class="card-header">
          <el-icon><Picture /></el-icon>
          <span>图片清理</span>
        </div>
      </template>

      <el-descriptions :column="2" border v-if="imageStats">
        <el-descriptions-item label="总图片数">{{ imageStats.totalImages }}</el-descriptions-item>
        <el-descriptions-item label="使用中">{{ imageStats.usedImages }}</el-descriptions-item>
        <el-descriptions-item label="未使用">
          <el-tag :type="imageStats.unusedImages > 0 ? 'warning' : 'success'">
            {{ imageStats.unusedImages }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="可释放空间">
          <el-tag :type="imageStats.unusedImages > 0 ? 'warning' : 'success'">
            {{ imageStats.unusedSizeMB }} MB
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <div style="margin-top: 20px">
        <el-button
          type="danger"
          :disabled="!imageStats || imageStats.unusedImages === 0"
          :loading="cleaningImages"
          @click="handleCleanImages"
        >
          <el-icon><Delete /></el-icon> 清理未使用图片
        </el-button>
        <el-button @click="fetchImageStats">
          <el-icon><Refresh /></el-icon> 刷新统计
        </el-button>
      </div>

      <el-alert
        v-if="imageStats && imageStats.unusedImages > 0"
        title="提示"
        type="warning"
        :closable="false"
        style="margin-top: 20px"
      >
        检测到 {{ imageStats.unusedImages }} 个未使用的图片文件，建议定期清理以释放存储空间
      </el-alert>
    </el-card>

    <!-- 产品分类管理 -->
    <el-card shadow="never" class="setting-card">
      <template #header>
        <div class="card-header">
          <el-icon><Collection /></el-icon>
          <span>产品分类管理</span>
        </div>
      </template>

      <div style="margin-bottom: 20px">
        <el-button type="primary" @click="openCategoryDialog">
          <el-icon><Plus /></el-icon> 添加分类
        </el-button>
        <el-button @click="fetchProductCategories">
          <el-icon><Refresh /></el-icon> 刷新列表
        </el-button>
      </div>

      <el-table :data="productCategories" v-loading="categoryLoading">
        <el-table-column prop="name" label="分类名称" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button text type="danger" size="small" @click="handleDeleteCategory(row.id, row.name)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!categoryLoading && productCategories.length === 0" description="暂无分类" />
    </el-card>

    <!-- 关于 -->
    <el-card shadow="never" class="setting-card">
      <template #header>
        <div class="card-header">
          <el-icon><InfoFilled /></el-icon>
          <span>关于系统</span>
        </div>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="系统名称">财务管理记账系统</el-descriptions-item>
        <el-descriptions-item label="版本">1.0.0</el-descriptions-item>
        <el-descriptions-item label="技术栈">Vue 3 + Element Plus + Node.js + SQLite</el-descriptions-item>
        <el-descriptions-item label="用途">个人家用财务记账管理</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 添加产品分类对话框 -->
    <el-dialog v-model="categoryDialogVisible" title="添加产品分类" width="400px">
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddCategory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.setting-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.setting-label {
  font-size: 15px;
  font-weight: 500;
}

.setting-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.backup-config {
  margin-bottom: 20px;
}

.config-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.backup-actions {
  display: flex;
  gap: 10px;
}
</style>

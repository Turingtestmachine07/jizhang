<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useThemeStore } from '../stores/theme'
import { backupApi } from '../api'

const themeStore = useThemeStore()
const loading = ref(false)
const backups = ref([])

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

onMounted(() => {
  fetchBackups()
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

.backup-actions {
  display: flex;
  gap: 10px;
}
</style>

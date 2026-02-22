<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Loading, CircleCheck } from '@element-plus/icons-vue'
import axios from 'axios'

const route = useRoute()
const sessionId = route.params.sessionId
const uploading = ref(false)
const uploaded = ref(false)
const imagePreview = ref(null)
const fileInput = ref(null)

// 检查会话是否有效
const checkSession = async () => {
  try {
    await axios.get(`/api/upload-session/${sessionId}`)
  } catch (error) {
    ElMessage.error('会话无效或已过期')
  }
}

// 选择文件
const selectFile = () => {
  fileInput.value.click()
}

// 处理文件选择
const handleFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件')
    return
  }

  // 验证文件大小（移动端允许更大的文件，因为手机照片通常较大）
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 20MB')
    return
  }

  // 预览图片
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)

  // 上传图片
  await uploadImage(file)
}

// 上传图片
const uploadImage = async (file) => {
  try {
    uploading.value = true

    const formData = new FormData()
    formData.append('photo', file)

    await axios.post(`/api/upload-session/${sessionId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    uploaded.value = true
    ElMessage.success('上传成功！电脑端将自动接收图片')
  } catch (error) {
    ElMessage.error('上传失败：' + (error.response?.data?.error || error.message))
    imagePreview.value = null
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  checkSession()
})
</script>

<template>
  <div class="mobile-upload-page">
    <div class="upload-container">
      <h1 class="title">📸 上传图片</h1>

      <div v-if="!uploaded" class="upload-area">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileChange"
          style="display: none"
        />

        <div v-if="!imagePreview" class="select-button" @click="selectFile">
          <el-icon :size="60"><Plus /></el-icon>
          <p>点击选择图片</p>
          <p class="tip">支持拍照或从相册选择</p>
        </div>

        <div v-else class="preview-area">
          <img :src="imagePreview" alt="预览" class="preview-image" />
          <el-button
            v-if="!uploading"
            type="primary"
            size="large"
            @click="selectFile"
            style="margin-top: 20px"
          >
            重新选择
          </el-button>
        </div>

        <div v-if="uploading" class="uploading">
          <el-icon class="is-loading" :size="40"><Loading /></el-icon>
          <p>上传中...</p>
        </div>
      </div>

      <div v-else class="success-area">
        <el-icon :size="80" color="#67c23a"><CircleCheck /></el-icon>
        <h2>上传成功！</h2>
        <p>图片已发送到电脑端</p>
        <p class="tip">您可以关闭此页面</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-upload-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.upload-container {
  background: white;
  border-radius: 20px;
  padding: 40px 30px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.title {
  text-align: center;
  font-size: 28px;
  margin: 0 0 30px 0;
  color: #333;
}

.upload-area {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.select-button {
  width: 100%;
  min-height: 300px;
  border: 3px dashed #ddd;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}

.select-button:active {
  background: #f0f0f0;
  transform: scale(0.98);
}

.select-button p {
  margin: 10px 0;
  font-size: 18px;
  color: #666;
}

.select-button .tip {
  font-size: 14px;
  color: #999;
}

.preview-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.uploading {
  text-align: center;
  margin-top: 20px;
}

.uploading p {
  margin-top: 10px;
  font-size: 16px;
  color: #666;
}

.success-area {
  text-align: center;
  padding: 40px 0;
}

.success-area h2 {
  margin: 20px 0 10px 0;
  color: #67c23a;
  font-size: 24px;
}

.success-area p {
  margin: 10px 0;
  font-size: 16px;
  color: #666;
}

.success-area .tip {
  font-size: 14px;
  color: #999;
  margin-top: 20px;
}
</style>
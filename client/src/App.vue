<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useThemeStore } from './stores/theme'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()

const isCollapse = ref(false)
const isMobile = ref(false)
const mobileMenuVisible = ref(false)
const activeMenu = computed(() => route.path)

// 检测是否为移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    isCollapse.value = true
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const menuItems = [
  { path: '/dashboard', icon: 'DataAnalysis', title: '仪表盘' },
  { path: '/orders', icon: 'List', title: '订单管理' },
  { path: '/expenses', icon: 'Wallet', title: '支出管理' },
  { path: '/financial-analysis', icon: 'PieChart', title: '财务分析' },
  { path: '/products', icon: 'Goods', title: '产品管理' },
  { path: '/customers', icon: 'User', title: '客户管理' },
  { path: '/reports', icon: 'TrendCharts', title: '统计报表' },
  { path: '/settings', icon: 'Setting', title: '系统设置' }
]

const handleMenuSelect = (path) => {
  router.push(path)
  if (isMobile.value) {
    mobileMenuVisible.value = false
  }
}
</script>

<template>
  <el-container class="layout-container">
    <!-- 移动端抽屉菜单 -->
    <el-drawer
      v-model="mobileMenuVisible"
      direction="ltr"
      size="200px"
      :show-close="false"
      class="mobile-drawer"
    >
      <div class="logo">
        <el-icon size="24"><Money /></el-icon>
        <span>财务记账</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="transparent"
        @select="handleMenuSelect"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>

    <!-- 侧边栏 (桌面端) -->
    <el-aside v-if="!isMobile" :width="isCollapse ? '64px' : '200px'" class="aside">
      <div class="logo">
        <el-icon size="24"><Money /></el-icon>
        <span v-show="!isCollapse">财务记账</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="transparent"
        @select="handleMenuSelect"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isMobile ? mobileMenuVisible = true : isCollapse = !isCollapse">
            <Menu v-if="isMobile" />
            <Fold v-else-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item>首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-switch
            :model-value="themeStore.isDark"
            :active-icon="Moon"
            :inactive-icon="Sunny"
            @change="themeStore.toggleTheme"
            inline-prompt
          />
        </div>
      </el-header>

      <!-- 主内容 -->
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import { Moon, Sunny } from '@element-plus/icons-vue'
export default {
  data() {
    return { Moon, Sunny }
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  transition: width 0.3s;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: var(--el-color-primary);
  border-bottom: 1px solid var(--el-border-color-light);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: var(--el-text-color-primary);
}

.collapse-btn:hover {
  color: var(--el-color-primary);
}

.main {
  background: var(--el-bg-color-page);
  padding: 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 移动端响应式样式 */
@media screen and (max-width: 768px) {
  .header {
    padding: 0 12px;
  }

  .breadcrumb {
    display: none;
  }

  .main {
    padding: 12px;
  }
}
</style>

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

/**
 * Vite 项目配置文件
 * @see https://vite.dev/config/
 */
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      // 设置 `@` 路径别名指向 src 目录，便于模块导入
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})

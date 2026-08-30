import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    // 逻辑测试保持 node 环境，组件测试（挂载 .vue）用 happy-dom
    environmentMatchGlobs: [['tests/components/**', 'happy-dom']]
  }
})

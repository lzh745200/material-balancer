import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['out/**', 'dist/**', 'release/**', 'node_modules/**', '**/*.tsbuildinfo'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  prettierConfig,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, sourceType: 'module' }
    }
  },
  {
    // 主进程 / preload / 测试：Node 全局
    files: [
      'src/main/**/*.ts',
      'src/preload/**/*.ts',
      'tests/*.spec.ts',
      'electron.vite.config.ts',
      'vitest.config.ts',
      'eslint.config.mjs',
      'scripts/**/*.mjs'
    ],
    languageOptions: { globals: { ...globals.node, ...globals.es2022 } }
  },
  {
    // 渲染进程：浏览器全局
    files: ['src/renderer/**/*.ts', 'src/renderer/**/*.vue', 'tests/components/**/*.spec.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.es2022 } }
  },
  {
    rules: {
      // 本代码库以「算法内部约定成立」的非空断言为主，类型收窄已在别处完成
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off'
    }
  },
  {
    // 构建脚本允许直接 console 输出进度
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' }
  }
)

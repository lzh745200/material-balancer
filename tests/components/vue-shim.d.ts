// 组件测试在 tsconfig.node（无 vue-tsc）下引用 .vue 文件，需要最小的模块声明
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

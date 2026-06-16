/// <reference types="vite/client" />

/**
 * 为 *.vue 文件提供类型声明，使其能在 TypeScript 中被正确导入。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

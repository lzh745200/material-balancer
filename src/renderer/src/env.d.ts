/// <reference types="vite/client" />

import type { Api } from '@shared/types'

declare global {
  interface Window {
    api: Api
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

export {}

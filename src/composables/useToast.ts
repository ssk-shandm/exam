import { ref } from 'vue'

export interface ToastItem {
  id: number
  message: string
  isConfirm: boolean
  resolve: ((value: boolean) => void) | null
}

let nextId = 1
const toasts = ref<ToastItem[]>([])

/** 显示一条消息（点击遮罩即可关闭）；同一内容的 toast 不会重复弹出 */
export function showToast(message: string): Promise<void> {
  // 避免快速连续按 Enter 导致弹出多个相同警告
  if (toasts.value.some(t => !t.isConfirm && t.message === message)) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const id = nextId++
    toasts.value.push({
      id,
      message,
      isConfirm: false,
      resolve: (() => { resolve() }) as any,
    })
  })
}

/** 显示确认对话框，返回用户选择（确定 true / 取消 false） */
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const id = nextId++
    toasts.value.push({
      id,
      message,
      isConfirm: true,
      resolve,
    })
  })
}

/** 关闭一个 toast */
export function dismissToast(id: number) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx >= 0) {
    const t = toasts.value[idx]
    toasts.value.splice(idx, 1)
    if (t.resolve) {
      t.resolve(false) // 点击遮罩 = 取消
    }
  }
}

/** 确认按钮 */
export function confirmToast(id: number) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx >= 0) {
    const t = toasts.value[idx]
    toasts.value.splice(idx, 1)
    if (t.resolve) {
      t.resolve(true)
    }
  }
}

/** 只读 toast 列表（供组件渲染） */
export function useToastList() {
  return toasts
}

import { ref } from 'vue'

export type RuntimeLogLevel = 'info' | 'warn' | 'error'

export interface RuntimeLogEntry {
  id: number
  level: RuntimeLogLevel
  message: string
  timestamp: string
}

const MAX_RUNTIME_LOGS = 300
const runtimeLogs = ref<RuntimeLogEntry[]>([])
let nextLogId = 1
let installed = false

const SENSITIVE_KEY_PATTERN = /(api[-_ ]?key|authorization|access[-_ ]?token|refresh[-_ ]?token|password|secret)/i

function redactText(value: string): string {
  return value
    .replace(/(bearer\s+)[^\s,;]+/gi, '$1[REDACTED]')
    .replace(/((?:api[-_ ]?key|authorization|access[-_ ]?token|refresh[-_ ]?token|password|secret)\s*[:=]\s*)([^\s,;}]+)/gi, '$1[REDACTED]')
}

function stringifyValue(value: unknown): string {
  if (value instanceof Error) return value.stack || value.message
  if (typeof value === 'string') return redactText(value)
  if (typeof value === 'undefined') return 'undefined'
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`

  try {
    const serialized = JSON.stringify(value, (key, nestedValue) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) return '[REDACTED]'
      return nestedValue
    })
    return redactText(serialized ?? String(value))
  } catch {
    return '[无法序列化的运行信息]'
  }
}

function formatArguments(values: unknown[]): string {
  return values.map(stringifyValue).join(' ')
}

export function addRuntimeLog(level: RuntimeLogLevel, ...values: unknown[]) {
  const message = formatArguments(values).trim()
  if (!message) return

  runtimeLogs.value.push({
    id: nextLogId++,
    level,
    message,
    timestamp: new Date().toLocaleTimeString([], { hour12: false }),
  })

  if (runtimeLogs.value.length > MAX_RUNTIME_LOGS) {
    runtimeLogs.value.splice(0, runtimeLogs.value.length - MAX_RUNTIME_LOGS)
  }
}

function installRuntimeConsole() {
  if (installed || typeof window === 'undefined') return
  installed = true

  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  }

  console.log = (...values) => {
    originalConsole.log(...values)
    addRuntimeLog('info', ...values)
  }
  console.info = (...values) => {
    originalConsole.info(...values)
    addRuntimeLog('info', ...values)
  }
  console.warn = (...values) => {
    originalConsole.warn(...values)
    addRuntimeLog('warn', ...values)
  }
  console.error = (...values) => {
    originalConsole.error(...values)
    addRuntimeLog('error', ...values)
  }

  window.addEventListener('error', (event) => {
    addRuntimeLog('error', '[未处理异常]', event.error || event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    addRuntimeLog('error', '[未处理 Promise 异常]', event.reason)
  })
}

installRuntimeConsole()

export function useRuntimeConsole() {
  return {
    runtimeLogs,
    addRuntimeLog,
    clearRuntimeLogs: () => { runtimeLogs.value = [] },
  }
}

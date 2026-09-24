export type LlmPromptMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type LlmPromptConfig = {
  id?: string
  name?: string
  version?: string
  messages: LlmPromptMessage[]
}

export type LlmPipelineStep = {
  id: string
  prompt: string
  required?: boolean
  when?: string
  maxAttempts?: number
}

export type LlmFrameworkConfig = {
  id?: string
  displayName?: string
  outputSchema?: string
  input?: {
    chunking?: {
      enabled: boolean
      maxCharacters: number
      overlapCharacters?: number
    }
  }
  pipeline?: LlmPipelineStep[]
}

export type LoadedLlmFramework = {
  framework: LlmFrameworkConfig
  prompt: LlmPromptConfig
  repairPrompt?: LlmPromptConfig
  outputSchema: Record<string, unknown>
}

let frameworkPromise: Promise<LoadedLlmFramework> | null = null

function publicAssetUrl(path: string) {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  return `${base}${path.replace(/^\//, '')}`
}

function normalizeConfigPath(path: string, baseDirectory: string) {
  const stack = baseDirectory.split('/').filter(Boolean)
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  return stack.join('/')
}

async function fetchJson<T>(path: string, label: string): Promise<T> {
  const response = await fetch(publicAssetUrl(path))
  if (!response.ok) throw new Error(`${label}读取失败（HTTP ${response.status}）`)
  return response.json() as Promise<T>
}

export function loadLlmFramework() {
  if (!frameworkPromise) frameworkPromise = fetchLlmFramework()
  return frameworkPromise
}

async function fetchLlmFramework(): Promise<LoadedLlmFramework> {
  const frameworkPath = 'config/llm/framework.json'
  const framework = await fetchJson<LlmFrameworkConfig>(frameworkPath, '框架配置')
  const convertStep = framework.pipeline?.find((step) => step.id === 'convert')
  if (!convertStep?.prompt) throw new Error('框架中缺少 convert Prompt')
  if (!framework.outputSchema) throw new Error('框架中缺少 outputSchema')

  const promptPath = normalizeConfigPath(convertStep.prompt, 'config/llm')
  const prompt = await fetchJson<LlmPromptConfig>(promptPath, '转换 Prompt')
  if (!Array.isArray(prompt.messages) || prompt.messages.length === 0) throw new Error('转换 Prompt 消息为空')

  const repairStep = framework.pipeline?.find((step) => step.id === 'repair')
  let repairPrompt: LlmPromptConfig | undefined
  if (repairStep?.prompt) {
    const repairPath = normalizeConfigPath(repairStep.prompt, 'config/llm')
    repairPrompt = await fetchJson<LlmPromptConfig>(repairPath, '修复 Prompt')
    if (!Array.isArray(repairPrompt.messages) || repairPrompt.messages.length === 0) throw new Error('修复 Prompt 消息为空')
  }

  const schemaPath = normalizeConfigPath(framework.outputSchema, 'config/llm')
  const outputSchema = await fetchJson<Record<string, unknown>>(schemaPath, '题库 Schema')
  return { framework, prompt, repairPrompt, outputSchema }
}
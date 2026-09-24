import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_LLM_FRAMEWORK_PATH = resolve(
  SCRIPT_DIR,
  '../../public/config/llm/framework.json',
)

export function readJsonFile(filePath) {
  const absolutePath = resolve(filePath)
  const source = readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '')
  try {
    return JSON.parse(source)
  } catch (error) {
    throw new Error(`JSON 解析失败: ${absolutePath}\n${error.message}`, { cause: error })
  }
}

export function resolveConfigReference(ownerFile, reference) {
  if (typeof reference !== 'string' || reference.trim() === '') {
    throw new Error(`配置引用不能为空: ${ownerFile}`)
  }
  return isAbsolute(reference) ? reference : resolve(dirname(ownerFile), reference)
}

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} 必须是对象`)
  }
}

export function loadPrompt(promptPath) {
  const absolutePath = resolve(promptPath)
  const prompt = readJsonFile(absolutePath)
  assertObject(prompt, `Prompt ${absolutePath}`)
  if (!prompt.id || !Array.isArray(prompt.messages) || prompt.messages.length === 0) {
    throw new Error(`Prompt 缺少 id 或 messages: ${absolutePath}`)
  }
  return { path: absolutePath, config: prompt }
}

export function loadLlmFramework(options = {}) {
  const frameworkPath = resolve(options.frameworkPath ?? DEFAULT_LLM_FRAMEWORK_PATH)
  const framework = readJsonFile(frameworkPath)
  assertObject(framework, 'LLM framework')
  if (!Array.isArray(framework.pipeline) || framework.pipeline.length === 0) {
    throw new Error(`LLM framework.pipeline 不能为空: ${frameworkPath}`)
  }

  const prompts = framework.pipeline.map((step) => {
    assertObject(step, 'LLM pipeline step')
    const promptPath = resolveConfigReference(frameworkPath, step.prompt)
    if (!existsSync(promptPath)) throw new Error(`Prompt 文件不存在: ${promptPath}`)
    return { step, ...loadPrompt(promptPath) }
  })

  const outputSchemaPath = resolveConfigReference(frameworkPath, framework.outputSchema)
  const userConfigSchemaPath = resolveConfigReference(frameworkPath, framework.userConfigSchema)
  for (const configPath of [outputSchemaPath, userConfigSchemaPath]) {
    if (!existsSync(configPath)) throw new Error(`Schema 文件不存在: ${configPath}`)
    readJsonFile(configPath)
  }

  let userConfig
  let userConfigPath
  if (options.userConfigPath) {
    userConfigPath = resolve(options.userConfigPath)
    userConfig = readJsonFile(userConfigPath)
    assertObject(userConfig, 'LLM user config')
  }

  return {
    frameworkPath,
    framework,
    prompts,
    outputSchemaPath,
    userConfigSchemaPath,
    userConfigPath,
    userConfig,
  }
}

function promptDefaults(prompt) {
  const optional = prompt.variables?.optional
  return optional && typeof optional === 'object' && !Array.isArray(optional) ? optional : {}
}

export function renderPrompt(prompt, variables = {}) {
  assertObject(prompt, 'Prompt')
  const values = { ...promptDefaults(prompt), ...variables }
  const required = Array.isArray(prompt.variables?.required) ? prompt.variables.required : []
  const missing = required.filter((name) => values[name] == null || values[name] === '')
  if (missing.length > 0) {
    throw new Error(`Prompt ${prompt.id ?? '(unknown)'} 缺少变量: ${missing.join(', ')}`)
  }

  const replaceVariables = (template) => String(template).replace(
    /{{\s*([A-Za-z0-9_.-]+)\s*}}/g,
    (_, name) => {
      if (!(name in values)) throw new Error(`Prompt ${prompt.id} 使用了未声明变量: ${name}`)
      const value = values[name]
      return typeof value === 'string' ? value : JSON.stringify(value)
    },
  )

  return prompt.messages.map((message) => ({
    role: message.role,
    content: replaceVariables(message.content),
  }))
}

export function resolveApiKey(userConfig, environment = process.env) {
  assertObject(userConfig, 'LLM user config')
  assertObject(userConfig.provider, 'LLM user config.provider')
  const environmentName = String(userConfig.provider.apiKeyEnv ?? '').trim()
  const environmentValue = environmentName ? String(environment[environmentName] ?? '').trim() : ''
  const fileValue = String(userConfig.provider.apiKey ?? '').trim()
  return environmentValue || fileValue
}

export function assertRemoteProcessingAllowed(userConfig) {
  if (userConfig?.privacy?.allowRemoteProcessing !== true) {
    throw new Error('用户尚未允许把题目发送到远程 LLM 服务')
  }
}
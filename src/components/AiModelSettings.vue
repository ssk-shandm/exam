<template>
  <section class='model-settings'>
    <div class='settings-card intro-card'>
      <div>
        <span class='section-label'>模型连接</span>
        <h3>AI 模型设置</h3>
        <p>连接参数保存在当前会话中，运行配置通过外部文本文件管理。</p>
      </div>
      <span class='framework-state' :class='frameworkStatus'>
        <span class='state-dot' aria-hidden='true'></span>
        {{ frameworkStatusText }}
      </span>
    </div>

    <div class='settings-card'>
      <div class='card-heading'>
        <div>
          <span class='section-label'>OpenAI 兼容</span>
          <h3>连接参数</h3>
          <p>支持 <code>/chat/completions</code> 接口的模型服务均可使用。</p>
        </div>
      </div>
      <div class='form-grid'>
        <label class='field wide-field'>
          <span>API 基础地址</span>
          <input v-model.trim='provider.baseUrl' type='url' placeholder='https://api.example.com/v1' />
          <small>接口地址：{{ endpointPreview }}</small>
        </label>
        <label class='field'>
          <span>模型</span>
          <input v-model.trim='provider.model' type='text' placeholder='your-model-name' />
        </label>
        <label class='field'>
          <span>API 密钥</span>
          <div class='secret-input'>
            <input v-model='provider.apiKey' :type='apiKeyInputType' placeholder='仅在当前会话中保存' autocomplete='off' />
            <button type='button' @click='showApiKey = !showApiKey'>{{ showApiKey ? '隐藏' : '显示' }}</button>
          </div>
          <small>密钥仅保存在当前会话中，不会写入配置文件。</small>
        </label>
      </div>
      <div class='actions'>
        <button class='primary-btn' type='button' :disabled='isSaving' @click='saveSettings'>{{ isSaving ? '保存中…' : '保存连接' }}</button>
        <button class='secondary-btn' type='button' :disabled='isTesting' @click='testConnection'>{{ isTesting ? '测试中…' : '测试连接' }}</button>
        <button v-if='provider.apiKey' class='text-btn danger' type='button' @click='removeApiKey'>清除密钥</button>
      </div>

      <div class='config-inline'>
        <div class='card-heading'>
          <div>
            <span class='section-label'>运行配置文件</span>
            <h3>外部配置</h3>
            <p>请使用桌面文本编辑器编辑指定文件，JSON 内容不会直接嵌入应用界面。</p>
          </div>
          <span class='backend-badge'>{{ backendLabel }}</span>
        </div>
        <div class='config-file-panel'>
          <div class='file-icon' aria-hidden='true'>TXT</div>
          <div class='file-details'>
            <strong>{{ configFileName }}</strong>
            <small>{{ configLocation }}</small>
            <span>{{ isDesktopConfig ? '桌面端配置目录' : '开发环境或浏览器配置位置' }}</span>
          </div>
        </div>
        <div class='actions config-actions'>
          <button v-if='isDesktopConfig' class='primary-btn' type='button' :disabled='isOpeningConfig' @click='openConfigFile'>{{ isOpeningConfig ? '打开中…' : '打开配置文件' }}</button>
          <button class='secondary-btn' type='button' :disabled='isConfigLoading' @click='reloadConfig'>{{ isConfigLoading ? '读取中…' : '重新读取配置' }}</button>
        </div>
      </div>
    </div>

    <p v-if='message' class='status' :class='messageType'>{{ message }}</p>

    <div class='settings-card prompt-card'>
      <div class='prompt-icon' aria-hidden='true'>{ }</div>
      <div>
        <strong>{{ promptName || '题库转换提示词' }}</strong>
        <p>提示词和题库 Schema 资源已随应用打包，并会在启动时加载。</p>
        <span v-if='promptVersion'>版本 {{ promptVersion }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang='ts'>
import { computed, onMounted, ref } from 'vue'
import { buildChatCompletionsEndpoint, useLlmSettings } from '../composables/useLlmSettings'
import { loadLlmFramework } from '../utils/llmFramework'

const {
  provider,
  configLocation,
  configBackend,
  isConfigLoading,
  loadLlmProviderSettings,
  saveLlmProviderSettings,
  openLlmConfigFile,
  clearLlmApiKey,
} = useLlmSettings()

const showApiKey = ref(false)
const isTesting = ref(false)
const isSaving = ref(false)
const isOpeningConfig = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const frameworkStatus = ref<'loading' | 'ready' | 'error'>('loading')
const frameworkError = ref('')
const promptName = ref('')
const promptVersion = ref('')

const apiKeyInputType = computed(() => showApiKey.value ? 'text' : 'password')
const endpointPreview = computed(() => provider.baseUrl.trim() ? buildChatCompletionsEndpoint(provider.baseUrl) : '请输入 API 基础地址')
const isDesktopConfig = computed(() => configBackend.value === 'tauri')
const configFileName = computed(() => isDesktopConfig.value ? 'llm-config.txt' : 'llm-config.json')
const backendLabel = computed(() => isDesktopConfig.value ? '桌面端系统配置' : configBackend.value === 'vite-dev' ? 'Vite 项目配置' : '浏览器存储')
const frameworkStatusText = computed(() => frameworkStatus.value === 'ready' ? '提示词与结构已就绪' : frameworkStatus.value === 'error' ? frameworkError.value || '框架加载失败' : '正在加载框架')

onMounted(async () => {
  try {
    await loadLlmProviderSettings()
  } catch (error) {
    showMessage(error instanceof Error ? error.message : '无法读取模型设置。', 'error')
  }
  try {
    const { prompt } = await loadLlmFramework()
    promptName.value = prompt.name || prompt.id || '题库转换提示词'
    promptVersion.value = prompt.version || ''
    frameworkStatus.value = 'ready'
  } catch (error) {
    frameworkStatus.value = 'error'
    frameworkError.value = error instanceof Error ? error.message : '无法加载框架'
  }
})

function validateConnection(requireKey = true) {
  if (!provider.baseUrl.trim()) return '请输入 API 基础地址。'
  try { new URL(provider.baseUrl) } catch { return 'API 基础地址无效。' }
  if (!provider.model.trim()) return '请输入模型名称。'
  if (requireKey && !provider.apiKey.trim()) return '请输入 API 密钥。'
  return ''
}

async function saveSettings() {
  const error = validateConnection(false)
  if (error) return showMessage(error, 'error')
  isSaving.value = true
  try {
    await saveLlmProviderSettings()
    showMessage('连接设置已保存。', 'success')
  } catch (error) {
    showMessage(error instanceof Error ? error.message : '保存失败。', 'error')
  } finally {
    isSaving.value = false
  }
}

async function reloadConfig() {
  try {
    await loadLlmProviderSettings(true)
    showMessage('已从配置文件位置重新读取配置。', 'success')
  } catch (error) {
    showMessage(error instanceof Error ? error.message : '重新读取配置失败。', 'error')
  }
}

async function openConfigFile() {
  isOpeningConfig.value = true
  try {
    const path = await openLlmConfigFile()
    showMessage('已打开 ' + path + '。请在外部编辑器中保存，然后重新读取配置。', 'success')
  } catch (error) {
    showMessage(error instanceof Error ? error.message : '无法打开桌面端配置文件。', 'error')
  } finally {
    isOpeningConfig.value = false
  }
}

function removeApiKey() {
  clearLlmApiKey()
  showApiKey.value = false
  showMessage('当前会话的 API 密钥已清除。', 'success')
}

async function testConnection() {
  const error = validateConnection(true)
  if (error) return showMessage(error, 'error')
  try {
    await saveLlmProviderSettings()
  } catch (saveError) {
    return showMessage(saveError instanceof Error ? saveError.message : '保存配置失败。', 'error')
  }
  isTesting.value = true
  message.value = ''
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), Math.min(provider.timeoutMs, 30000))
  try {
    const response = await fetch(buildChatCompletionsEndpoint(provider.baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + provider.apiKey },
      body: JSON.stringify({ model: provider.model, messages: [{ role: 'user', content: 'Reply with OK only.' }], temperature: 0, max_tokens: 8 }),
      signal: controller.signal,
    })
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    if (!response.ok) throw new Error(body?.error?.message || '连接失败（HTTP ' + response.status + '）。')
    showMessage('连接成功。', 'success')
  } catch (error) {
    showMessage(error instanceof DOMException && error.name === 'AbortError' ? '连接测试超时。' : error instanceof Error ? error.message : '连接失败。', 'error')
  } finally {
    window.clearTimeout(timeout)
    isTesting.value = false
  }
}

function showMessage(text: string, type: 'success' | 'error') {
  message.value = text
  messageType.value = type
}
</script>

<style scoped>
.model-settings { width: 100%; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.settings-card { width: 100%; box-sizing: border-box; padding: 24px; border: 1px solid var(--color-border-divider); border-radius: 12px; background: var(--color-bg-surface); }
.intro-card, .card-heading, .prompt-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.section-label { display: block; margin-bottom: 8px; color: var(--color-accent); font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
h3 { margin: 0; font-size: 1.15rem; }
.intro-card p, .card-heading p, .prompt-card p { margin: 7px 0 0; color: var(--color-text-muted); line-height: 1.65; }
code { font-family: Consolas, 'Courier New', monospace; font-size: .88em; }
.framework-state, .backend-badge { display: inline-flex; align-items: center; gap: 7px; flex: 0 0 auto; border: 1px solid var(--color-border-divider); border-radius: 999px; padding: 7px 10px; background: var(--color-bg-container); color: var(--color-text-muted); font-size: .75rem; }
.state-dot { width: 7px; height: 7px; border-radius: 50%; background: #d49a23; }
.framework-state.ready .state-dot { background: #27ae60; }
.framework-state.error .state-dot { background: #e74c3c; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; margin-top: 22px; }
.wide-field { grid-column: 1 / -1; }
.field { min-width: 0; display: flex; flex-direction: column; gap: 7px; font-size: .84rem; font-weight: 600; }
.field small, .file-details small { color: var(--color-text-muted); font-size: .73rem; font-weight: 400; overflow-wrap: anywhere; }
.field input { width: 100%; min-width: 0; box-sizing: border-box; border: 1px solid var(--color-border-input); border-radius: 8px; padding: 10px 11px; outline: none; background: var(--color-bg-input); color: var(--color-text-input); font: inherit; font-weight: 400; }
.field input:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(66, 133, 244, .14); }
.secret-input { display: flex; align-items: stretch; }
.secret-input input { border-radius: 8px 0 0 8px; }
.secret-input button { flex: 0 0 auto; border: 1px solid var(--color-border-input); border-left: 0; border-radius: 0 8px 8px 0; padding: 0 11px; background: var(--color-bg-btn-secondary); color: var(--color-text-muted); font: inherit; font-size: .76rem; cursor: pointer; }
.actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.config-inline { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--color-border-divider); }
.config-inline .config-file-panel { margin-top: 16px; }
.primary-btn, .secondary-btn, .text-btn { min-height: 38px; border-radius: 8px; padding: 9px 15px; font: inherit; font-size: .86rem; font-weight: 600; cursor: pointer; }
.primary-btn { border: 1px solid var(--color-bg-btn-primary); background: var(--color-bg-btn-primary); color: var(--color-text-btn-primary); }
.secondary-btn { border: 1px solid var(--color-border-btn-mode); background: var(--color-bg-btn-secondary); color: var(--color-text-btn-secondary); }
.primary-btn:disabled, .secondary-btn:disabled, .text-btn:disabled { opacity: .55; cursor: wait; }
.text-btn { border: 0; background: transparent; color: var(--color-text-muted); }
.text-btn.danger { color: #b53a2d; }
.config-file-panel { display: flex; align-items: center; gap: 14px; margin-top: 20px; padding: 16px; border: 1px solid var(--color-border-divider); border-radius: 10px; background: var(--color-bg-container); }
.file-icon { display: grid; place-items: center; width: 48px; height: 48px; flex: 0 0 auto; border-radius: 10px; background: var(--color-bg-surface-hover); color: var(--color-accent); font: 700 .72rem Consolas, monospace; }
.file-details { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
.file-details strong { overflow-wrap: anywhere; }
.file-details span { color: var(--color-text-muted); font-size: .74rem; }
.config-actions { margin-top: 14px; }
.status { margin: 0; padding: 10px 12px; border-radius: 7px; font-size: .85rem; }
.status.success { color: #1f7a48; background: rgba(39, 174, 96, .12); }
.status.error { color: #b53a2d; background: rgba(231, 76, 60, .12); }
.prompt-card { justify-content: flex-start; }
.prompt-icon { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 10px; background: var(--color-bg-surface-hover); color: var(--color-accent); font-family: Consolas, monospace; font-weight: 700; }
.prompt-card strong { display: block; }
.prompt-card span { color: var(--color-text-muted); font-size: .74rem; }
@media (max-width: 620px) {
  .settings-card { padding: 18px; }
  .intro-card, .card-heading, .actions { align-items: stretch; flex-direction: column; }
  .framework-state, .backend-badge { align-self: flex-start; }
  .form-grid { grid-template-columns: 1fr; }
  .wide-field { grid-column: auto; }
}
</style>

<template>
  <div class="start-screen">
    <h2>别卷</h2>

    <div class="bank-selector">
      <label for="bank-select">选择题库：</label>
      <select
        id="bank-select"
        :value="selectedBank"
        @change="onBankChange"
        class="bank-select-input"
      >
        <option v-for="bank in banks" :key="bank.file" :value="bank.file">
          {{ bank.name }}
        </option>
      </select>
    </div>

    <!-- 父组件传入的内容（导入按钮、错题本列表等） -->
    <slot />

    <p>请选择模式：</p>
    <div class="mode-buttons">
      <button @click="emit('start', 'exam')" class="mode-btn">考试模式</button>
      <button @click="emit('start', 'endorse')" class="mode-btn">背题模式</button>
      <button @click="emit('start', 'practice')" class="mode-btn">做题模式</button>
      <button @click="handleSpecialize" class="mode-btn">专项练习</button>
      <button @click="emit('start', 'wrong-manage')" class="mode-btn wrong-mode-btn">错题模式</button>

      <!-- 专项练习：题型筛选浮层（右侧浮动） -->
      <Transition name="slide-right">
        <div v-if="showSpecializePanel" class="specialize-panel">
          <p class="specialize-title">选择要练习的题型：</p>
          <label
            v-for="qt in availableQuestionTypes"
            :key="qt"
            class="specialize-option"
          >
            <input type="checkbox" :value="qt" v-model="selectedTypes" />
            {{ qt }}
          </label>
          <div class="specialize-actions">
            <button @click="confirmSpecialize" class="mode-btn" :disabled="selectedTypes.length === 0">
              开始练习
            </button>
            <button @click="showSpecializePanel = false" class="mode-btn cancel-btn">取消</button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 版本信息与更新 -->
    <div class="app-footer">
      <span class="version-text">v{{ version }}</span>

      <button class="update-btn import-btn" @click="onImportBank">
        + 导入题库
      </button>

      <button
        class="update-btn"
        :disabled="isUpdating"
        @click="handleCheckUpdate"
      >
        {{ isUpdating ? '检查中...' : '检查更新' }}
      </button>

      <!-- 更新提示弹窗 -->
      <Teleport to="body">
        <div v-if="updateInfo" class="update-overlay" @click.self="clearUpdate">
          <div class="update-dialog">
            <h3>发现新版本 v{{ updateInfo.version }}</h3>
            <p class="update-notes" v-if="updateInfo.releaseNotes">
              {{ updateInfo.releaseNotes }}
            </p>
            <div class="update-actions">
              <a
                :href="updateInfo.downloadUrl"
                target="_blank"
                class="mode-btn download-btn"
                @click="clearUpdate"
              >
                前往 GitHub 下载
              </a>
              <button @click="clearUpdate" class="mode-btn cancel-btn">稍后再说</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- 已是最新提示 -->
      <Teleport to="body">
        <div v-if="updateError === 'already-latest'" class="update-toast" @click="clearUpdate">
          已是最新版本
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { AppMode } from '../types'
import { useVersion } from '../composables/useVersion'

const { version, isUpdating, updateInfo, updateError, checkUpdate, clearUpdate } = useVersion()

const props = defineProps<{
  banks: { name: string; file: string }[]
  selectedBank: string
  /** 当前题库所有题型（由父组件扫描后传入） */
  questionTypes?: string[]
  /** 从文件导入题库的回调 */
  onImportBank?: () => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'start', mode: Exclude<AppMode, 'start' | 'review'>): void
  (e: 'start-specialize', types: string[]): void
  (e: 'changeBank', fileName: string): void
}>()

const showSpecializePanel = ref(false)
const selectedTypes = ref<string[]>([])

const availableQuestionTypes = ref<string[]>(props.questionTypes ?? [])

function onBankChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('changeBank', target.value)
}

function handleSpecialize() {
  // 如果当前还没有题型数据，直接作为普通模式发射（父组件会扫描）
  if (availableQuestionTypes.value.length === 0) {
    emit('start', 'specialize')
    return
  }
  selectedTypes.value = []
  showSpecializePanel.value = true
}

function confirmSpecialize() {
  if (selectedTypes.value.length === 0) return
  showSpecializePanel.value = false
  emit('start-specialize', [...selectedTypes.value])
}

function handleCheckUpdate() {
  if (updateError.value === 'already-latest') {
    // 点击已是最新提示跳转到下载页或关闭
    clearUpdate()
    return
  }
  // 有更新信息时点击"检查更新"按钮不做额外处理，让按钮显示状态
  checkUpdate()
}
</script>

<style scoped>
.start-screen {
  text-align: center;
  color: inherit;
}
.start-screen h2 {
  margin-bottom: 30px;
}
.bank-selector {
  margin-bottom: 20px;
}
.bank-select-input {
  padding: 6px 10px;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid var(--color-border-input);
  background-color: var(--color-bg-input);
  color: var(--color-text-input);
}
.mode-buttons {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
  width: 100%;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.mode-btn {
  padding: 14px;
  font-size: 1.1rem;
  border: 1px solid var(--color-border-btn-mode);
  border-radius: 8px;
  background-color: var(--color-bg-btn-mode);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  color: var(--color-text-btn-mode);
}
.mode-btn:hover {
  background-color: var(--color-bg-btn-mode-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.wrong-mode-btn {
  background-color: var(--color-bg-btn-wrong-mode);
  color: var(--color-text-btn-wrong-mode);
  border-color: var(--color-border-btn-wrong-mode);
}
.wrong-mode-btn:hover {
  background-color: var(--color-bg-btn-wrong-mode-hover);
}

/* ===== 专项练习浮层（右侧浮动） ===== */
.specialize-panel {
  position: absolute;
  left: calc(100% + 24px);
  top: 0;
  padding: 20px;
  border: 1px solid var(--color-border-container);
  border-radius: 10px;
  background-color: var(--color-bg-surface);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  text-align: left;
  width: 240px;
  z-index: 20;
}
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.25s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
@media (max-width: 768px) {
  .specialize-panel {
    left: 0;
    top: 100%;
    margin-top: 12px;
    width: 100%;
  }
}
.specialize-title {
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-text-primary);
}
.specialize-option {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.95rem;
  color: var(--color-text-primary);
  cursor: pointer;
}
.specialize-option input {
  accent-color: var(--color-accent);
}
.specialize-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.specialize-actions .mode-btn {
  padding: 10px 20px;
  font-size: 0.95rem;
  flex: 1;
}
.cancel-btn {
  background-color: var(--color-bg-btn-secondary) !important;
  color: var(--color-text-btn-secondary) !important;
}

/* ===== 版本信息与更新 ===== */
.app-footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-divider, #e0e0e0);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
.version-text {
  font-size: 0.82rem;
  color: var(--color-text-muted, #999);
}
.update-btn {
  font-size: 0.82rem;
  padding: 4px 12px;
  border: 1px solid var(--color-border-btn-mode, #ccc);
  border-radius: 5px;
  background: transparent;
  color: var(--color-text-primary, #333);
  cursor: pointer;
  transition: opacity 0.2s;
}
.update-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.update-btn:not(:disabled):hover {
  background-color: var(--color-bg-btn-mode-hover, #f0f0f0);
}
.import-btn {
  font-weight: 600;
  color: var(--color-accent, #4a90d9) !important;
  border-color: var(--color-accent, #4a90d9) !important;
}

/* 更新弹窗遮罩 */
.update-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.update-dialog {
  background: var(--color-bg-container, #fff);
  color: var(--color-text-primary, #333);
  border-radius: 12px;
  padding: 28px 32px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  text-align: center;
}
.update-dialog h3 {
  margin: 0 0 12px;
  font-size: 1.2rem;
}
.update-notes {
  font-size: 0.9rem;
  color: var(--color-text-muted, #666);
  margin-bottom: 20px;
  line-height: 1.5;
}
.update-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.update-actions .mode-btn {
  padding: 10px 20px;
  font-size: 0.95rem;
  flex: 1;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}
.download-btn {
  background-color: var(--color-accent, #4a90d9) !important;
  color: #fff !important;
  border-color: var(--color-accent, #4a90d9) !important;
}

/* 小提示（已是最新） */
.update-toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-bg-container, #333);
  color: var(--color-text-primary, #fff);
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  cursor: pointer;
  animation: fadeInUp 0.3s ease;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>

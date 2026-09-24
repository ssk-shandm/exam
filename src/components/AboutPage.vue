<template>
  <div class="about-page">
    <header class="about-header">
      <button class="back-btn" @click="emit('back')">← 返回设置</button>
      <div class="app-mark" aria-hidden="true">卷</div>
      <h2>{{ APP_NAME }}</h2>
      <p>简洁、离线友好的刷题与错题复习工具</p>
    </header>

    <dl class="about-list">
      <div>
        <dt>版本号</dt>
        <dd><button class="link-btn" @click="openLink(RELEASES_URL)">v{{ version }}</button></dd>
      </div>
      <div>
        <dt>版权</dt>
        <dd><button class="link-btn" @click="openLink(REPOSITORY_URL)">{{ COPYRIGHT_LINE }}</button></dd>
      </div>
      <div>
        <dt>许可证</dt>
        <dd><button class="link-btn" @click="openLink(LICENSE_URL)">{{ LICENSE_NAME }}</button></dd>
      </div>
      <div>
        <dt>项目仓库</dt>
        <dd><button class="link-btn repository-link" @click="openLink(REPOSITORY_URL)">{{ REPOSITORY_URL }}</button></dd>
      </div>
    </dl>

    <p v-if="openError" class="open-error">{{ openError }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useVersion } from '../composables/useVersion'
import {
  APP_NAME,
  COPYRIGHT_LINE,
  LICENSE_NAME,
  LICENSE_URL,
  RELEASES_URL,
  REPOSITORY_URL,
} from '../config/appInfo'
import { openExternalUrl } from '../utils/openExternal'

const emit = defineEmits<{ back: [] }>()
const { version } = useVersion()
const openError = ref('')

async function openLink(url: string) {
  openError.value = ''
  try {
    await openExternalUrl(url)
  } catch (error) {
    openError.value = error instanceof Error ? error.message : '无法打开链接'
  }
}
</script>

<style scoped>
.about-page {
  width: min(620px, 92vw);
  margin: 24px auto;
  padding: 30px;
  box-sizing: border-box;
  border: 1px solid var(--color-border-container);
  border-radius: 14px;
  background: var(--color-bg-container);
  box-shadow: var(--color-shadow-container);
  color: var(--color-text-primary);
}
.about-header { text-align: center; position: relative; padding-top: 8px; }
.about-header h2 { margin: 12px 0 6px; }
.about-header p { margin: 0; color: var(--color-text-muted); }
.back-btn { position: absolute; left: 0; top: 0; padding: 7px 11px; border: 1px solid var(--color-border-btn-mode); border-radius: 7px; background: var(--color-bg-btn-secondary); color: var(--color-text-btn-secondary); cursor: pointer; }
.app-mark { width: 68px; height: 68px; margin: 26px auto 0; display: grid; place-items: center; border-radius: 18px; color: #fff; font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #4a90d9, #7d5fff); box-shadow: 0 8px 20px rgba(74,144,217,.28); }
.about-list { margin: 28px 0 0; border-top: 1px solid var(--color-border-divider); }
.about-list > div { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 16px; padding: 16px 4px; border-bottom: 1px solid var(--color-border-divider); }
dt { color: var(--color-text-muted); }
dd { margin: 0; text-align: right; min-width: 0; }
.link-btn { padding: 0; border: 0; background: none; color: var(--color-accent); font: inherit; cursor: pointer; text-align: right; }
.link-btn:hover { text-decoration: underline; }
.repository-link { max-width: 100%; word-break: break-all; }
.open-error { margin: 18px 0 0; padding: 10px; border-radius: 7px; color: #b53a2d; background: rgba(231,76,60,.12); text-align: center; }
@media (max-width: 520px) { .about-page { padding: 22px; } .back-btn { position: static; display: block; } .app-mark { margin-top: 22px; } .about-list > div { grid-template-columns: 1fr; gap: 6px; } dd, .link-btn { text-align: left; } }
</style>
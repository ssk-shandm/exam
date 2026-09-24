import { ref } from 'vue'
import {
  APP_VERSION_FALLBACK,
  GITHUB_OWNER,
  GITHUB_REPO,
  RELEASES_URL,
} from '../config/appInfo'

const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

interface RemoteVersion {
  version: string
  downloadUrl: string
  releaseNotes: string
}

export function useVersion() {
  const version = ref(APP_VERSION_FALLBACK)
  const isUpdating = ref(false)
  const updateInfo = ref<RemoteVersion | null>(null)
  const updateError = ref('')
  let versionPromise: Promise<void> | null = null

  function resolveAppVersion() {
    if (versionPromise) return versionPromise
    versionPromise = (async () => {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
      if (!isTauri) return
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const desktopVersion = await invoke<string>('get_app_version')
        if (desktopVersion) version.value = desktopVersion
      } catch (error) {
        console.warn('读取桌面应用版本失败，使用内置版本号：', error)
      }
    })()
    return versionPromise
  }

  void resolveAppVersion()

  /** 通过 GitHub Releases API 获取最新版本。 */
  async function checkUpdate() {
    isUpdating.value = true
    updateInfo.value = null
    updateError.value = ''

    try {
      await resolveAppVersion()
      const res = await fetch(GITHUB_API_URL, {
        headers: { Accept: 'application/vnd.github+json' },
      })
      if (!res.ok) {
        if (res.status === 403) throw new Error('GitHub API 访问频率受限，请稍后再试')
        if (res.status === 404) throw new Error('仓库暂未发布 Release')
        throw new Error(`检查更新失败（HTTP ${res.status}）`)
      }

      const data = await res.json()
      const remoteVersion = String(data.tag_name ?? '').replace(/^v/i, '')
      if (!remoteVersion) throw new Error('最新 Release 缺少版本标签')

      if (compareVersions(remoteVersion, version.value) > 0) {
        updateInfo.value = {
          version: remoteVersion,
          downloadUrl: data.html_url ?? RELEASES_URL,
          releaseNotes: data.body ?? '',
        }
      } else {
        updateError.value = 'already-latest'
      }
    } catch (error) {
      updateError.value = error instanceof Error ? error.message : '网络错误'
    } finally {
      isUpdating.value = false
    }
  }

  function clearUpdate() {
    updateInfo.value = null
    updateError.value = ''
  }

  return {
    version,
    isUpdating,
    updateInfo,
    updateError,
    checkUpdate,
    clearUpdate,
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const pb = b.split('.').map((part) => Number.parseInt(part, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}
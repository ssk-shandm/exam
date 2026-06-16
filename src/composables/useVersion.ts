import { ref } from 'vue'

/** 当前应用版本 — 与 src-tauri/tauri.conf.json 中的 version 保持同步 */
const APP_VERSION = '0.1.0'

// ============================================================
//  👇 改成你自己的 GitHub 信息（仓库设为 public）
// ============================================================
const GITHUB_OWNER = 'ssk-shandm'
const GITHUB_REPO = 'exam'

/** GitHub API 最新 Release 地址（无需 token，公开仓库 60次/小时） */
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

interface RemoteVersion {
  version: string
  downloadUrl: string
  releaseNotes: string
}

export function useVersion() {
  const version = ref(APP_VERSION)
  const isUpdating = ref(false)
  const updateInfo = ref<RemoteVersion | null>(null)
  const updateError = ref('')

  /**
   * 检查更新：通过 GitHub Releases API 获取最新版本
   */
  async function checkUpdate() {
    isUpdating.value = true
    updateInfo.value = null
    updateError.value = ''

    try {
      const res = await fetch(GITHUB_API_URL)
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('GitHub API 频率限制，稍后再试')
        }
        if (res.status === 404) {
          throw new Error('未找到 Release，请先在 GitHub 上创建发布')
        }
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()

      // GitHub API 返回的 tag_name 通常是 "v0.2.0" 格式
      const remoteTag: string = data.tag_name ?? ''
      // 提取版本号（去掉开头的 v）
      const remoteVersion = remoteTag.replace(/^v/i, '')
      const current = version.value

      if (compareVersions(remoteVersion, current) > 0) {
        updateInfo.value = {
          version: remoteVersion,
          downloadUrl: data.html_url ?? `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
          releaseNotes: data.body ?? '',
        }
      } else {
        updateError.value = 'already-latest'
      }
    } catch (e) {
      updateError.value = e instanceof Error ? e.message : '网络错误'
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

/** 简单的 semver 比较 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}

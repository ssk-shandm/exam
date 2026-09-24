export type ContentLocation = 'subjects' | 'images'

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function getWebContentUrl(location: ContentLocation): string {
  // Web 版只访问当前部署中随应用发布的静态资源，不依赖外部网络。
  const relativePath = location === 'subjects' ? 'subjects/banks.json' : 'images/README.md'
  return new URL(relativePath, document.baseURI).toString()
}

/**
 * 打开题库相关资源的位置。
 *
 * - Tauri 开发版：打开项目源码的 public 目录。
 * - Tauri 安装版：打开安装资源目录中的 public 目录。
 * - Web：打开当前部署所携带的本地静态资源，不访问外部网站。
 */
export async function openContentLocation(location: ContentLocation): Promise<{
  platform: 'desktop' | 'web'
  target: string
}> {
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core')
    const target = await invoke<string>('open_content_location', { location })
    return { platform: 'desktop', target }
  }

  const target = getWebContentUrl(location)
  window.open(target, '_blank', 'noopener,noreferrer')
  return { platform: 'web', target }
}

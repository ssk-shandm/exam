/** 在浏览器和 Tauri 桌面版中打开外部链接。 */
export async function openExternalUrl(url: string): Promise<void> {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('只允许打开 HTTP(S) 链接')
  }

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(parsed.toString())
    return
  }

  window.open(parsed.toString(), '_blank', 'noopener,noreferrer')
}
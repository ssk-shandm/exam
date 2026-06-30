import { fileURLToPath, URL } from 'node:url'
import { writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { join, extname } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

/** Vite 插件：为每个错题本创建独立的 JSON 文件（像 public/subjects/ 一样） */
function wrongNotebooksApi() {
  const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url))
  const NOTEBOOKS_DIR = join(PUBLIC_DIR, 'wrong-notebooks')

  /** 将文件名安全化，移除非法字符 */
  function sanitizeFileName(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'untitled'
  }

  return {
    name: 'wrong-notebooks-api',
    configureServer(server: any) {
      // POST /api/wrong-notebooks/sync — 同步全部错题本为独立 JSON 文件
      server.middlewares.use('/api/wrong-notebooks/sync', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, message: 'Method not allowed' }))
          return
        }
        let body = ''
        req.on('data', (chunk: string) => { body += chunk })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            if (!data || !Array.isArray(data.notebooks) || !Array.isArray(data.wrongEntries)) {
              throw new Error('无效的数据格式')
            }

            // 确保目录存在
            if (!existsSync(NOTEBOOKS_DIR)) {
              mkdirSync(NOTEBOOKS_DIR, { recursive: true })
            }

            // 清除旧的 notebook 文件（保留 _index.json 和 _index.json 以外的非 notebook 文件）
            const existingFiles = readdirSync(NOTEBOOKS_DIR)
            const expectedFiles = new Set<string>()
            expectedFiles.add('_index.json')

            // 按 notebook 分组条目
            const entriesByNotebook = new Map<string, typeof data.wrongEntries>()
            for (const e of data.wrongEntries) {
              const nbId = e.notebookId || '_orphan'
              if (!entriesByNotebook.has(nbId)) entriesByNotebook.set(nbId, [])
              entriesByNotebook.get(nbId)!.push(e)
            }

            // 为每个笔记本写入独立 JSON 文件
            const notebookFiles: { id: string; name: string; file: string; bankFile: string; entryCount: number }[] = []
            for (const nb of data.notebooks) {
              const safeName = sanitizeFileName(nb.name)
              const fileName = `${safeName}_${nb.id}.json`
              expectedFiles.add(fileName)
              const entries = entriesByNotebook.get(nb.id) || []
              const nbData = {
                version: 1,
                notebook: nb,
                entries,
              }
              const nbPath = join(NOTEBOOKS_DIR, fileName)
              writeFileSync(nbPath, JSON.stringify(nbData, null, 2), 'utf-8')
              notebookFiles.push({
                id: nb.id,
                name: nb.name,
                file: `/wrong-notebooks/${fileName}`,
                bankFile: nb.bankFile,
                entryCount: entries.length,
              })
              console.log(`[wrong-notebooks-api] 已保存: ${fileName} (${entries.length} 条错题)`)
            }

            // 写入 _index.json（元数据）
            const indexData = {
              version: 1,
              savedAt: Date.now(),
              activeNotebookByBank: data.activeNotebookByBank || {},
              guessedRight: data.guessedRight || [],
              notebooks: notebookFiles,
            }
            writeFileSync(join(NOTEBOOKS_DIR, '_index.json'), JSON.stringify(indexData, null, 2), 'utf-8')

            // 删除不再属于任何笔记本的旧文件
            for (const f of existingFiles) {
              if (!expectedFiles.has(f) && extname(f) === '.json') {
                unlinkSync(join(NOTEBOOKS_DIR, f))
                console.log(`[wrong-notebooks-api] 已删除过期文件: ${f}`)
              }
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, files: notebookFiles.length }))
          } catch (e: any) {
            console.error('[wrong-notebooks-api] 同步失败:', e.message)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, message: e.message }))
          }
        })
      })
    },
  }
}

/**
 * Vite 项目配置文件
 * @see https://vite.dev/config/
 */
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    vueDevTools(),
    wrongNotebooksApi(),
  ],
  resolve: {
    alias: {
      // 设置 `@` 路径别名指向 src 目录，便于模块导入
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})

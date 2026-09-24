#!/usr/bin/env node
/**
 * 扫描 public/subjects/ 下所有 .json 题库文件，生成 banks.json 清单
 *
 * 用法:
 *   node scripts/generate-banks.mjs
 *
 * 输出:
 *   public/subjects/banks.json  — 题库清单，形如 [{ name, file }]
 *
 * 钩子注册 (package.json):
 *   "predev":   "node scripts/generate-banks.mjs"
 *   "prebuild": "node scripts/generate-banks.mjs"
 */

import { writeFileSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const subjectsDir = join(publicDir, 'subjects')

/** 确保 Web 版运行所需的 public 子目录存在 */
function ensurePublicDirectories() {
  for (const directory of ['subjects', 'images', 'config']) {
    mkdirSync(join(publicDir, directory), { recursive: true })
  }
}


function main() {
  ensurePublicDirectories()

  let files
  try {
    files = readdirSync(subjectsDir)
  } catch {
    console.error(`[generate-banks] 无法读取目录: ${subjectsDir}`)
    process.exit(1)
  }

  const banks = files
    .filter((f) => f.endsWith('.json') && f !== 'banks.json')
    .map((f) => ({
      name: f.replace(/\.json$/i, ''),
      file: `/subjects/${f}`,
    }))
    .sort((a, b) => {
      // 中文字符优先（按拼音/笔画），非中文按字母
      const aCn = /[\u4e00-\u9fff]/.test(a.name)
      const bCn = /[\u4e00-\u9fff]/.test(b.name)
      if (aCn && !bCn) return -1
      if (!aCn && bCn) return 1
      return a.name.localeCompare(b.name, 'zh-CN')
    })

  const outPath = join(subjectsDir, 'banks.json')
  writeFileSync(outPath, JSON.stringify(banks, null, 2), 'utf-8')
  console.log(`[generate-banks] ✅ 已生成 ${banks.length} 个题库清单 → public/subjects/banks.json`)
  for (const b of banks) {
    console.log(`   - ${b.name}  (${b.file})`)
  }
}

main()

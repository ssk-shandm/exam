import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Question, WrongQuestionEntry } from '../types'

const WRONG_ENTRIES_KEY = 'wrongEntriesDB'
const GUESSED_KEY = 'guessedRightDB'

// ── 从旧版 localStorage 迁移 ──
function migrateOldStorage() {
  // 清理旧版 wrong_session_* 数据（不再使用）
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('wrong_session_')) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))

  const oldWrongKey = 'wrongQuestionsDB'
  const oldData = localStorage.getItem(oldWrongKey)
  if (oldData) {
    try {
      const oldNumbers: number[] = JSON.parse(oldData)
      if (Array.isArray(oldNumbers) && oldNumbers.length > 0) {
        const entries: WrongQuestionEntry[] = oldNumbers.map((num, i) => ({
          id: Date.now() + i,
          questionNumber: num,
          bankFile: '',
          addedAt: Date.now() + i,
        }))
        // 合并到现有数据（如果有）
        const existing: WrongQuestionEntry[] = JSON.parse(localStorage.getItem(WRONG_ENTRIES_KEY) || '[]')
        localStorage.setItem(WRONG_ENTRIES_KEY, JSON.stringify([...existing, ...entries]))
      }
    } catch (_) { /* 忽略损坏数据 */ }
    localStorage.removeItem(oldWrongKey)
  }

  // 旧版 guessedRightDB 是 number[]，新版是 {questionNumber, bankFile}[]
  const oldGuessed = localStorage.getItem(GUESSED_KEY)
  if (oldGuessed) {
    try {
      const parsed = JSON.parse(oldGuessed)
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'number') {
        const migrated = parsed.map((num: number) => ({ questionNumber: num, bankFile: '' }))
        localStorage.setItem(GUESSED_KEY, JSON.stringify(migrated))
      }
    } catch (_) { /* 忽略 */ }
  }
}

try {
  migrateOldStorage()
} catch {
  console.warn('本地数据迁移失败，将使用默认设置')
  try { localStorage.removeItem(WRONG_ENTRIES_KEY) } catch {}
  try { localStorage.removeItem(GUESSED_KEY) } catch {}
  try { localStorage.removeItem('wrongQuestionsDB') } catch {}
}

let nextId = Date.now()

export const useQuizStore = defineStore('quiz', () => {
  // ── 错题条目（带题库、时间戳，允许重复） ──
  let initialEntries: WrongQuestionEntry[] = []
  try {
    initialEntries = JSON.parse(localStorage.getItem(WRONG_ENTRIES_KEY) || '[]')
    if (!Array.isArray(initialEntries)) initialEntries = []
  } catch {
    console.warn('wrongEntriesDB 读取失败，已重置')
    initialEntries = []
  }
  const wrongEntries = ref<WrongQuestionEntry[]>(initialEntries)

  watch(
    wrongEntries,
    (newEntries) => {
      localStorage.setItem(WRONG_ENTRIES_KEY, JSON.stringify(newEntries))
    },
    { deep: true },
  )

  /** 添加一条错题记录 */
  function addWrongEntry(questionNumber: number, bankFile: string) {
    wrongEntries.value.push({
      id: nextId++,
      questionNumber,
      bankFile,
      addedAt: Date.now(),
    })
  }

  /** 按 entry id 移除单条错题记录 */
  function removeWrongEntry(id: number) {
    wrongEntries.value = wrongEntries.value.filter((e) => e.id !== id)
  }

  /** 获取指定题库的所有错题条目（按添加时间正序，含旧数据迁移中 bankFile 为空的遗留条目） */
  function getWrongEntriesByBank(bankFile: string): WrongQuestionEntry[] {
    return wrongEntries.value
      .filter((e) => e.bankFile === bankFile || e.bankFile === '')
      .sort((a, b) => a.addedAt - b.addedAt)
  }

  /** 判断指定题库中是否有某题号的错题记录（含旧数据） */
  function containsWrongEntry(questionNumber: number, bankFile: string): boolean {
    return wrongEntries.value.some(
      (e) => e.questionNumber === questionNumber && (e.bankFile === bankFile || e.bankFile === ''),
    )
  }

  /** 清空指定题库的所有错题（含旧数据中 bankFile 为空的遗留条目） */
  function clearWrongEntriesByBank(bankFile: string) {
    wrongEntries.value = wrongEntries.value.filter((e) => e.bankFile !== bankFile && e.bankFile !== '')
  }

  /** 清空所有错题 */
  function clearAllWrongEntries() {
    wrongEntries.value = []
  }

  /** 获取指定题库的去重题号集合（含旧数据，用于导出等场景） */
  function getUniqueWrongNumbers(bankFile: string): number[] {
    return [...new Set(wrongEntries.value.filter((e) => e.bankFile === bankFile || e.bankFile === '').map((e) => e.questionNumber))]
  }

  // ── 蒙对标记（沿用旧逻辑，但清空时按题库） ──
  let initialGuessed: { questionNumber: number; bankFile: string }[] = []
  try {
    initialGuessed = JSON.parse(localStorage.getItem(GUESSED_KEY) || '[]')
    if (!Array.isArray(initialGuessed)) initialGuessed = []
  } catch {
    console.warn('guessedRightDB 读取失败，已重置')
    initialGuessed = []
  }
  const guessedRightBank = ref<{ questionNumber: number; bankFile: string }[]>(initialGuessed)

  watch(
    guessedRightBank,
    (newVal) => {
      localStorage.setItem(GUESSED_KEY, JSON.stringify(newVal))
    },
    { deep: true },
  )

  function addGuessedRight(questionNumber: number, bankFile: string) {
    if (!guessedRightBank.value.some((g) => g.questionNumber === questionNumber && (g.bankFile === bankFile || g.bankFile === ''))) {
      guessedRightBank.value.push({ questionNumber, bankFile })
    }
  }

  function removeGuessedRight(questionNumber: number, bankFile: string) {
    guessedRightBank.value = guessedRightBank.value.filter(
      (g) => !(g.questionNumber === questionNumber && (g.bankFile === bankFile || g.bankFile === '')),
    )
  }

  function isGuessedRight(questionNumber: number, bankFile: string): boolean {
    return guessedRightBank.value.some(
      (g) => g.questionNumber === questionNumber && (g.bankFile === bankFile || g.bankFile === ''),
    )
  }

  function clearGuessedRightByBank(bankFile: string) {
    guessedRightBank.value = guessedRightBank.value.filter((g) => g.bankFile !== bankFile && g.bankFile !== '')
  }

  /** 所有属于错题的题号（去重，不区分题库）—— 仅用于显示"有错题"提示 */
  function allWrongNumbers(): number[] {
    return [...new Set(wrongEntries.value.map((e) => e.questionNumber))]
  }

  function exportWrongQuestions(allQuestions: Question[], bankFile: string) {
    const nums = getUniqueWrongNumbers(bankFile)
    if (nums.length === 0) {
      alert('当前题库的错题本是空的！')
      return
    }

    const wrongQuestions = allQuestions.filter((q) => nums.includes(q.number))

    const dataStr = JSON.stringify(wrongQuestions, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'wrong_questions_backup.json'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()

    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 150)

    alert(`成功导出 ${wrongQuestions.length} 道错题！`)
  }

  function importWrongQuestions(file: File, bankFile: string) {
    if (!file || file.type !== 'application/json') {
      alert('请选择一个有效的 JSON 文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importedQuestions = JSON.parse(content) as Question[]

        if (
          !Array.isArray(importedQuestions) ||
          importedQuestions.some((q) => typeof q.number !== 'number')
        ) {
          throw new Error('JSON 格式无效')
        }

        let count = 0
        for (const q of importedQuestions) {
          addWrongEntry(q.number, bankFile)
          count++
        }
        alert(`成功导入 ${count} 道错题！(总条目数: ${wrongEntries.value.length})`)
      } catch (error) {
        console.error('导入失败:', error)
        alert('导入失败，文件格式可能不正确。')
      }
    }
    reader.readAsText(file)
  }

  return {
    wrongEntries,
    addWrongEntry,
    removeWrongEntry,
    getWrongEntriesByBank,
    containsWrongEntry,
    clearWrongEntriesByBank,
    clearAllWrongEntries,
    getUniqueWrongNumbers,
    allWrongNumbers,
    guessedRightBank,
    addGuessedRight,
    removeGuessedRight,
    isGuessedRight,
    clearGuessedRightByBank,
    exportWrongQuestions,
    importWrongQuestions,
  }
})

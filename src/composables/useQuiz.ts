import { ref, shallowRef, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { Question, UserAnswer, AppMode, SubAnswer, WrongQuestionEntry } from '../types'
import { stripMarkdown } from '../utils/markdown'
import { useQuizStore } from '../stores/quizStore'

export interface BankEntry {
  name: string
  file: string
  /** 是否为用户从外部导入的题库 */
  imported?: boolean
}

type AnswerSheetEntry = {
  userAnswer: UserAnswer
  isCorrect: boolean | null
  showResult?: boolean
  subAnswers?: Map<number, SubAnswer>
}

/** 所有题库 */
export const availableBanks = [
  { name: '数据结构与算法题库', file: '/sjjg.json' },
  { name: 'Java 基础题库', file: '/java.json' },
  { name: 'Java 重要题库', file: '/java-important.json' },
  { name: '数据库系统原理与应用', file: '/sjkxtylyyy.json' },
]

/** 题型别名映射 */
const TYPE_ALIASES: Record<string, string[]> = {
  '单选题': ['单选题', '单选'],
  '多选题': ['多选题', '多选'],
  '判断题': ['判断题', '判断'],
  '填空题': ['填空题', '填空'],
  '简答题': ['简答题', '简答'],
  '程序分析题': ['程序分析题', '程序分析'],
  '编程题': ['编程题', '编程', '代码题'],
  'SQL综合题': ['SQL综合题', '复合题'],
  '综合应用题': ['综合应用题'],
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j]!, array[i]!]
  }
  return array
}

function resolveQuestionTypes(selectedTypes: string[]): Set<string> {
  const matched = new Set<string>()
  for (const st of selectedTypes) {
    if (TYPE_ALIASES[st]) {
      TYPE_ALIASES[st].forEach((t) => matched.add(t))
    } else {
      matched.add(st)
    }
  }
  return matched
}

export function useQuiz() {
  const quizStore = useQuizStore()

  // ── 核心状态 ──
  const isLoading = ref(true)
  const questions = shallowRef<Question[]>([])
  const shuffledQuestions = shallowRef<Question[]>([])
  const currentQuestionIndex = ref(0)
  const score = ref(0)
  const appMode = ref<AppMode>('start')
  const answerSheet = ref(new Map<number, AnswerSheetEntry>())
  const renderError = ref('')

  const currentBankFile = ref(availableBanks[1]?.file ?? '')
  const availableQuestionTypes = ref<string[]>([])
  const specializeTypes = ref<string[]>([])
  const shuffleEnabled = ref(true)
  const wrongDisplayEntryIds = ref<number[]>([])

  // ── 导入的外部题库 ──
  const customBanks = ref<BankEntry[]>([])
  const allBanks = computed(() => [...availableBanks, ...customBanks.value])
  /** 缓存已导入的题库内容，以便切换题库时重新加载 */
  const importedCache = new Map<string, Question[]>()

  // ── 计算属性 ──
  const practiceStateKey = computed(() => `practice_session_${currentBankFile.value}`)
  const shufflePrefKey = computed(() => `practice_shuffle_pref_${currentBankFile.value}`)
  const totalQuestions = computed(() => shuffledQuestions.value.length)
  const wrongCount = computed(() => quizStore.wrongEntries.filter((e) => e.bankFile === currentBankFile.value || e.bankFile === '').length)

  // ── helpers ──
  function normalizeQuestions(raw: Question[]): Question[] {
    return raw.map((q) => {
      const nq = { ...q }
      if (nq.type === '判断题' || nq.type === '判断') {
        const ans = String(nq.answer).trim().toUpperCase()
        if (ans === 'T' || ans === 'TRUE' || ans === '正确' || ans === '对') nq.answer = 'A'
        else if (ans === 'F' || ans === 'FALSE' || ans === '错误' || ans === '错') nq.answer = 'B'
      }
      return nq
    })
  }

  function getQuestionsByTypes(types: string[], source: Question[]): Question[] {
    const matched = resolveQuestionTypes(types)
    return source.filter((q) => matched.has(q.type))
  }

  const QUIZ_MODES = ['practice', 'exam', 'endorse', 'wrong', 'specialize'] as const

  // ── 题库加载 ──
  async function loadQuestions(fileName: string = currentBankFile.value) {
    isLoading.value = true
    try {
      // 优先从已导入的缓存中加载
      const cached = importedCache.get(fileName)
      if (cached) {
        questions.value = normalizeQuestions(cached)
      } else {
        const resp = await fetch(`${fileName}?t=${Date.now()}`)
        if (!resp.ok) throw new Error('网络错误或文件不存在')
        const raw = (await resp.json()) as Question[]
        questions.value = normalizeQuestions(raw)
      }
      const types = new Set(questions.value.map((q) => q.type))
      availableQuestionTypes.value = [...types].sort()
      currentBankFile.value = fileName
    } catch (e) {
      console.error('加载题目失败:', e)
      alert(`加载题库失败 (${fileName})，请检查文件是否存在。`)
    } finally {
      isLoading.value = false
    }
  }

  // ── 模式切换 ──
  function handleBankChange(newFileName: string) {
    if (newFileName === currentBankFile.value) return
    answerSheet.value.clear()
    currentQuestionIndex.value = 0
    window.history.pushState({ mode: 'start', bank: newFileName }, '', '')
    loadQuestions(newFileName)
  }

  function handleBackToHome() {
    if (appMode.value !== 'start') appMode.value = 'start'
  }

  function handleStartSpecialize(types: string[]) {
    if (types.length === 0) return
    specializeTypes.value = types
    handleStartGame('specialize', true)
  }

  function handleStartGame(mode: AppMode, pushState = true) {
    renderError.value = ''
    if (mode === 'start' || !mode) { handleBackToHome(); return }

    // 防御：题库未加载时阻止进入
    if (questions.value.length === 0) {
      alert('题库尚未加载完成，请稍后再试。')
      return
    }

    if (pushState) {
      const st: Record<string, unknown> = { mode, bank: currentBankFile.value }
      if (mode === 'specialize') st.specializeTypes = [...specializeTypes.value]
      window.history.pushState(st, '', '')
    }

    score.value = 0
    let temp: Question[] = []

    // restore shuffle pref
    const savedShuffle = localStorage.getItem(shufflePrefKey.value)
    shuffleEnabled.value = savedShuffle !== null ? JSON.parse(savedShuffle) : true

    if (mode === 'practice') {
      temp = restoreOrBuild(practiceStateKey.value, () =>
        shuffleEnabled.value
          ? shuffleArray([...questions.value])
          : [...questions.value].sort((a, b) => a.number - b.number),
      )
    } else if (mode === 'wrong') {
      answerSheet.value.clear()
      currentQuestionIndex.value = 0
      const entries = quizStore.getWrongEntriesByBank(currentBankFile.value)
      if (entries.length > 0) {
        const qMap = new Map(questions.value.map((q) => [q.number, q]))
        const pairs = entries
          .map((e) => ({ q: qMap.get(e.questionNumber), id: e.id }))
          .filter((p): p is { q: Question; id: number } => p.q !== undefined)
        if (shuffleEnabled.value) {
          const shuf = shuffleArray([...pairs])
          temp = shuf.map((p) => p.q)
          wrongDisplayEntryIds.value = shuf.map((p) => p.id)
        } else {
          temp = pairs.map((p) => p.q)
          wrongDisplayEntryIds.value = pairs.map((p) => p.id)
        }
      } else {
        wrongDisplayEntryIds.value = []
      }
    } else if (mode === 'specialize') {
      if (specializeTypes.value.length === 0 && !pushState) {
        const saved = Object.keys(localStorage).filter((k) =>
          k.startsWith(`specialize_session_${currentBankFile.value}_`),
        )
        if (saved.length > 0) {
          specializeTypes.value = availableQuestionTypes.value.length > 0
            ? [...availableQuestionTypes.value]
            : [...Object.keys(TYPE_ALIASES)]
        }
      }
      const key = `specialize_session_${currentBankFile.value}_${[...specializeTypes.value].sort().join('_')}`
      temp = restoreOrBuild(key, () =>
        shuffleEnabled.value
          ? shuffleArray(getQuestionsByTypes(specializeTypes.value, questions.value))
          : getQuestionsByTypes(specializeTypes.value, [...questions.value]).sort((a, b) => a.number - b.number),
      )
    } else {
      // exam / endorse
      answerSheet.value.clear()
      currentQuestionIndex.value = 0
      temp = shuffleArray([...questions.value])
      if (mode === 'exam' && temp.length > 60) temp = temp.slice(0, 60)
    }

    if (temp.length === 0 && questions.value.length > 0) {
      console.warn('handleStartGame: 筛选后题目为空，回退到全部题目')
      temp = [...questions.value]
    }

    shuffledQuestions.value = temp
    appMode.value = mode
    nextTick(() => window.scrollTo(0, 0))
  }

  /** 尝试从 localStorage 恢复 session，失败则调用 buildFn 新建 */
  function restoreOrBuild(key: string, buildFn: () => Question[]): Question[] {
    const raw = localStorage.getItem(key)
    if (!raw) {
      answerSheet.value.clear()
      currentQuestionIndex.value = 0
      return buildFn()
    }
    try {
      const state = JSON.parse(raw)
      answerSheet.value = state.answers ? new Map(state.answers) : new Map()
      if (state.order && Array.isArray(state.order)) {
        const qMap = new Map(questions.value.map((q) => [q.number, q]))
        const qs = state.order
          .map((n: number) => qMap.get(n))
          .filter(Boolean) as Question[]
        if (qs.length > 0) {
          currentQuestionIndex.value = typeof state.currentIndex === 'number' ? state.currentIndex : 0
          return qs
        }
      }
      answerSheet.value.clear()
      currentQuestionIndex.value = 0
      return buildFn()
    } catch {
      localStorage.removeItem(key)
      answerSheet.value.clear()
      currentQuestionIndex.value = 0
      return buildFn()
    }
  }

  // ── session 持久化 ──
  watch(
    [() => answerSheet.value, () => currentQuestionIndex.value, () => appMode.value, () => shuffledQuestions.value],
    ([sheet, idx, mode]) => {
      const state = { answers: Array.from(sheet.entries()), currentIndex: idx, order: shuffledQuestions.value.map((q) => q.number) }
      if (mode === 'practice') localStorage.setItem(practiceStateKey.value, JSON.stringify(state))
      else if (mode === 'specialize') {
        const key = `specialize_session_${currentBankFile.value}_${[...specializeTypes.value].sort().join('_')}`
        localStorage.setItem(key, JSON.stringify(state))
      }
    },
    { deep: true },
  )

  // ── 错题条目监听（增量更新） ──
  watch(
    () => quizStore.wrongEntries,
    () => {
      if (appMode.value !== 'wrong') return
      const entries = quizStore.getWrongEntriesByBank(currentBankFile.value)
      if (entries.length === 0) {
        shuffledQuestions.value = []
        wrongDisplayEntryIds.value = []
        currentQuestionIndex.value = 0
        return
      }
      const qMap = new Map(questions.value.map((q) => [q.number, q]))
      const newPairs = entries
        .map((e) => ({ q: qMap.get(e.questionNumber), id: e.id }))
        .filter((p): p is { q: Question; id: number } => p.q !== undefined)
      const newIdSet = new Set(newPairs.map((p) => p.id))
      const newQMap = new Map(newPairs.map((p) => [p.id, p.q]))
      const oldIds = wrongDisplayEntryIds.value
      const keptIds = oldIds.filter((id) => newIdSet.has(id))

      if (shuffleEnabled.value) {
        const oldIdSet = new Set(oldIds)
        const freshIds = newPairs.map((p) => p.id).filter((id) => !oldIdSet.has(id))
        const allIds = [...keptIds, ...freshIds]
        shuffledQuestions.value = allIds.map((id) => newQMap.get(id)!).filter(Boolean)
        wrongDisplayEntryIds.value = allIds
      } else {
        shuffledQuestions.value = newPairs.map((p) => p.q)
        wrongDisplayEntryIds.value = newPairs.map((p) => p.id)
      }
      if (currentQuestionIndex.value >= shuffledQuestions.value.length) {
        currentQuestionIndex.value = Math.max(0, shuffledQuestions.value.length - 1)
      }
    },
    { deep: true },
  )

  // ── 答案判分 ──
  function checkAnswer(q: Question, ua: UserAnswer): boolean {
    if (!ua || (Array.isArray(ua) && ua.length === 0)) return false
    let correct = q.answer
    let user = Array.isArray(ua) ? (ua as string[]).join('') : String(ua)
    if (q.answerFormat === 'markdown') { correct = stripMarkdown(correct); user = stripMarkdown(user) }
    switch (q.type) {
      case '多选题': case '多选': return (ua as string[]).sort().join('') === q.answer.split('').sort().join('')
      case '填空题': case '填空': return user.trim().toLowerCase() === correct.trim().toLowerCase()
      case '程序分析题': case '程序分析': return user.trim() === correct.trim()
      default: return user.trim() === correct.trim()
    }
  }

  function handleAnswerUpdate(answer: UserAnswer, q: Question) {
    if (appMode.value === 'endorse') return
    const n = q.number
    const isAuto = ['practice', 'wrong', 'specialize'].includes(appMode.value) &&
      !['填空题', '填空', '程序分析题', '程序分析', '简答题', '简答', '编程题', '编程', '代码题'].includes(q.type)
    if (isAuto) {
      answerSheet.value.set(n, { userAnswer: answer, isCorrect: checkAnswer(q, answer), showResult: true })
    } else {
      const old = answerSheet.value.get(n)
      const shouldReset = old?.showResult === true
      answerSheet.value.set(n, { userAnswer: answer, isCorrect: shouldReset ? null : (old?.isCorrect ?? null), showResult: shouldReset ? false : (old?.showResult ?? false) })
    }
  }

  function handleSubmit(q: Question) {
    if (!q) return
    const ans = answerSheet.value.get(q.number)?.userAnswer
    if (!ans || (Array.isArray(ans) && ans.length === 0)) { alert('请先输入或选择一个答案！'); return }
    answerSheet.value.set(q.number, { userAnswer: ans, isCorrect: checkAnswer(q, ans), showResult: true })
  }

  function handleCompoundSubmit(q: Question, subs: Map<number, SubAnswer>) {
    const subQs = q.subQuestions || []
    let correctCount = 0
    for (const s of subQs) {
      const ua = subs.get(s.id)?.userAnswer || ''
      let c = s.answer, u = ua
      if ((s.answerFormat || q.answerFormat) === 'markdown') { c = stripMarkdown(c); u = stripMarkdown(u) }
      const ok = u.trim().toLowerCase() === c.trim().toLowerCase() && u.trim() !== ''
      subs.set(s.id, { userAnswer: ua, isCorrect: ok })
      if (ok) correctCount++
    }
    answerSheet.value.set(q.number, {
      userAnswer: `复合题: ${correctCount}/${subQs.length} 正确`,
      isCorrect: correctCount === subQs.length,
      showResult: true,
      subAnswers: subs,
    })
  }

  function handleSubSubmit(q: Question, subId: number, ua: string) {
    const subs = q.subQuestions || []
    const sub = subs.find((s) => s.id === subId)
    if (!sub) return
    let c = sub.answer, u = ua
    if ((sub.answerFormat || q.answerFormat) === 'markdown') { c = stripMarkdown(c); u = stripMarkdown(u) }
    const ok = u.trim().toLowerCase() === c.trim().toLowerCase() && u.trim() !== ''
    const old = answerSheet.value.get(q.number)
    const map = old?.subAnswers ? new Map(old.subAnswers) : new Map<number, SubAnswer>()
    map.set(subId, { userAnswer: ua, isCorrect: ok })
    let cc = 0
    for (const s of subs) { if (map.get(s.id)?.isCorrect === true) cc++ }
    answerSheet.value.set(q.number, {
      userAnswer: `复合题: ${cc}/${subs.length} 正确`,
      isCorrect: map.size === subs.length ? cc === subs.length : null,
      showResult: old?.showResult || false,
      subAnswers: map,
    })
  }

  function submitExam() {
    let final = 0
    for (const q of shuffledQuestions.value) {
      const entry = answerSheet.value.get(q.number)
      if (q.subQuestions?.length) {
        const sa = entry?.subAnswers
        let cc = 0
        if (sa) for (const s of q.subQuestions) { if (sa.get(s.id)?.isCorrect === true) cc++ }
        if (!sa || sa.size === 0) {
          const ok = checkAnswer(q, entry?.userAnswer ?? null)
          answerSheet.value.set(q.number, { userAnswer: entry?.userAnswer ?? null, isCorrect: ok, showResult: true })
          if (ok) final++
        } else {
          answerSheet.value.set(q.number, { userAnswer: entry?.userAnswer ?? `复合题: ${cc}/${q.subQuestions.length} 正确`, isCorrect: cc === q.subQuestions.length, showResult: true, subAnswers: sa })
          final += cc
        }
      } else {
        const ok = checkAnswer(q, entry?.userAnswer ?? null)
        answerSheet.value.set(q.number, { userAnswer: entry?.userAnswer ?? null, isCorrect: ok, showResult: true })
        if (ok) final++
      }
    }
    score.value = final
    appMode.value = 'review'
  }

  // ── 工具栏操作 ──
  function handleToggleShuffle() {
    if (shuffleEnabled.value) {
      if (appMode.value === 'wrong') {
        const entries = quizStore.getWrongEntriesByBank(currentBankFile.value)
        const qMap = new Map(questions.value.map((q) => [q.number, q]))
        const pairs = entries.map((e) => ({ q: qMap.get(e.questionNumber), id: e.id })).filter((p): p is { q: Question; id: number } => p.q !== undefined)
        shuffledQuestions.value = pairs.map((p) => p.q)
        wrongDisplayEntryIds.value = pairs.map((p) => p.id)
      } else {
        shuffledQuestions.value = [...shuffledQuestions.value].sort((a, b) => a.number - b.number)
      }
    } else {
      if (appMode.value === 'specialize' && specializeTypes.value.length > 0) {
        shuffledQuestions.value = shuffleArray(getQuestionsByTypes(specializeTypes.value, questions.value))
      } else if (appMode.value === 'wrong') {
        const cur = shuffledQuestions.value.map((q, i) => ({ q, id: wrongDisplayEntryIds.value[i] ?? 0 }))
        const shuf = shuffleArray([...cur])
        shuffledQuestions.value = shuf.map((p) => p.q)
        wrongDisplayEntryIds.value = shuf.map((p) => p.id)
      } else {
        shuffledQuestions.value = shuffleArray([...questions.value])
      }
    }
    shuffleEnabled.value = !shuffleEnabled.value
    currentQuestionIndex.value = 0
    localStorage.setItem(shufflePrefKey.value, JSON.stringify(shuffleEnabled.value))
    nextTick(() => window.scrollTo(0, 0))
  }

  function handleClearPractice() {
    if (!confirm('确定要重置当前做题进度吗？所有答题记录将被清空，题目顺序将重置。')) return
    localStorage.removeItem(practiceStateKey.value)
    if (appMode.value === 'specialize') {
      const key = `specialize_session_${currentBankFile.value}_${[...specializeTypes.value].sort().join('_')}`
      localStorage.removeItem(key)
    }
    answerSheet.value.clear()
    currentQuestionIndex.value = 0
    shuffleEnabled.value = true
    localStorage.setItem(shufflePrefKey.value, JSON.stringify(true))
    if (appMode.value === 'specialize' && specializeTypes.value.length > 0) {
      shuffledQuestions.value = shuffleArray(getQuestionsByTypes(specializeTypes.value, questions.value))
    } else {
      shuffledQuestions.value = shuffleArray([...questions.value])
    }
    score.value = 0
    window.scrollTo(0, 0)
  }

  function handleAddToWrongBook() {
    let count = 0
    for (const q of shuffledQuestions.value) {
      const entry = answerSheet.value.get(q.number)
      if (entry?.userAnswer !== null && entry?.userAnswer !== undefined) {
        if (entry.isCorrect === false) {
          quizStore.addWrongEntry(q.number, currentBankFile.value)
          count++
        } else if (quizStore.isGuessedRight(q.number, currentBankFile.value) && !quizStore.containsWrongEntry(q.number, currentBankFile.value)) {
          quizStore.addWrongEntry(q.number, currentBankFile.value)
          count++
        }
      }
    }
    alert(count > 0 ? `操作成功！已将 ${count} 道错题添加到错题本。` : '没有新的错题需要添加到错题本，或当前模式下没有作答记录。')
  }

  function handleClearWrong() {
    if (!confirm('确定要清空当前题库的所有错题吗？此操作不可恢复。')) return
    quizStore.clearWrongEntriesByBank(currentBankFile.value)
    quizStore.clearGuessedRightByBank(currentBankFile.value)
    answerSheet.value.clear()
    shuffledQuestions.value = []
    currentQuestionIndex.value = 0
  }

  function exportWrongQuestions() {
    quizStore.exportWrongQuestions(questions.value, currentBankFile.value)
  }

  // ── 导入错题 ──
  const fileInput = ref<HTMLInputElement | null>(null)
  function importWrongQuestions() { fileInput.value?.click() }
  function handleFileImport(event: Event) {
    const inp = event.target as HTMLInputElement
    if (inp.files?.[0]) { quizStore.importWrongQuestions(inp.files[0], currentBankFile.value); inp.value = '' }
  }

  // ── 从文件导入外部题库 ──
  async function importExternalBank(): Promise<void> {
    // 检查是否运行在 Tauri 桌面环境
    const isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    if (!isTauriEnv) {
      alert('导入题库功能仅在桌面版可用（浏览器开发模式下不可用）')
      return
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readTextFile } = await import('@tauri-apps/plugin-fs')

      const selected = await open({
        multiple: false,
        filters: [{ name: '题库 JSON', extensions: ['json'] }],
      })
      if (!selected) return // 用户取消了选择

      const content = await readTextFile(selected)
      const raw = JSON.parse(content) as Question[]
      const normalized = normalizeQuestions(raw)
      if (!Array.isArray(normalized) || normalized.length === 0) {
        throw new Error('文件中没有有效的题目数据')
      }

      // 从文件名中提取题库名称
      const fileName = selected.replace(/\\/g, '/').split('/').pop() ?? 'unknown.json'
      const bankName = fileName.replace(/\.json$/i, '')
      const filePath = `tauri-local:///${selected}` // 本地标识，用于加载时区分

      // 添加到自定义题库列表
      customBanks.value.push({ name: bankName, file: filePath, imported: true })

      // 缓存已解析的题目，以便后续切换回来时快速加载
      importedCache.set(filePath, normalized)

      // 直接加载这个题库
      questions.value = normalized
      const types = new Set(questions.value.map((q) => q.type))
      availableQuestionTypes.value = [...types].sort()
      currentBankFile.value = filePath
    } catch (e) {
      console.error('导入题库失败:', e)
      alert(`导入题库失败: ${e instanceof Error ? e.message : '未知错误'}`)
    }
  }

  // ── 跳转 & 滚动追踪 ──
  async function handleJumpTo(index: number, isDarkMode: boolean) {
    currentQuestionIndex.value = index
    const q = shuffledQuestions.value[index]
    if (!q) return
    await nextTick()
    const el = document.getElementById('q-' + q.number)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.style.transition = 'background-color 0.5s ease'
      el.style.backgroundColor = isDarkMode ? '#2a3a4a' : '#f8f9fa'
      setTimeout(() => { el.style.backgroundColor = '' }, 500)
    }
  }

  let intersectionObserver: IntersectionObserver | null = null
  function setupScrollTracking() {
    intersectionObserver?.disconnect()
    const visible = new Map<number, number>()
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const qNum = parseInt(e.target.id.replace('q-', ''))
          const idx = shuffledQuestions.value.findIndex((q) => q.number === qNum)
          if (idx < 0) continue
          if (e.isIntersecting) visible.set(idx, e.intersectionRatio)
          else visible.delete(idx)
        }
        let best = currentQuestionIndex.value, bestRatio = 0
        for (const [idx, ratio] of visible) { if (ratio > bestRatio) { bestRatio = ratio; best = idx } }
        if (bestRatio > 0.3) currentQuestionIndex.value = best
      },
      { threshold: [0.1, 0.3, 0.5, 0.7, 0.9] },
    )
    nextTick(() => document.querySelectorAll('.question-list-item').forEach((el) => intersectionObserver?.observe(el)))
  }

  watch([() => appMode.value, () => shuffledQuestions.value], ([mode]) => {
    if (QUIZ_MODES.includes(mode as typeof QUIZ_MODES[number])) nextTick(() => setupScrollTracking())
  })

  // ── 浏览器导航 ──
  function handlePopState(event: PopStateEvent) {
    if (!event.state?.mode) { appMode.value = 'start'; return }
    if (event.state.mode === 'start') { appMode.value = 'start'; return }
    if (QUIZ_MODES.includes(event.state.mode)) {
      if (event.state.mode === 'specialize' && event.state.specializeTypes) {
        specializeTypes.value = event.state.specializeTypes
      }
      if (event.state.bank && event.state.bank !== currentBankFile.value) {
        currentBankFile.value = event.state.bank
        loadQuestions(event.state.bank).then(() => handleStartGame(event.state.mode, false))
      } else {
        handleStartGame(event.state.mode, false)
      }
    } else { appMode.value = 'start' }
  }

  onMounted(() => {
    loadQuestions()
    window.addEventListener('popstate', handlePopState)
  })

  onUnmounted(() => {
    window.removeEventListener('popstate', handlePopState)
    intersectionObserver?.disconnect()
  })

  // ── 返回 ──
  return {
    // state
    isLoading, questions, shuffledQuestions, currentQuestionIndex, score, appMode, answerSheet,
    currentBankFile, availableQuestionTypes, specializeTypes,
    shuffleEnabled, shufflePrefKey, wrongDisplayEntryIds, renderError,
    // computed
    totalQuestions, wrongCount, allBanks,
    // actions
    loadQuestions, handleBankChange, handleBackToHome, handleStartGame, handleStartSpecialize,
    handleAnswerUpdate, handleSubmit, handleCompoundSubmit, handleSubSubmit, submitExam,
    handleToggleShuffle, handleClearPractice, handleAddToWrongBook, handleClearWrong,
    exportWrongQuestions, importWrongQuestions, handleFileImport, handleJumpTo,
    importExternalBank,
    fileInput,
  }
}

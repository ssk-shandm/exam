<template>
<Transition name="page-fade" mode="out-in">
  <div v-if="isLoading" key="loading" class="quiz-container-loading">
    <h2 class="loading-text">题库加载中...</h2>
  </div>

  <StartScreen
    v-else-if="appMode === 'start'"
    key="start"
    @start="handleStartGame"
    @start-specialize="handleStartSpecialize"
    :banks="allBanks"
    :selected-bank="currentBankFile"
    :question-types="availableQuestionTypes"
    @changeBank="handleBankChange"
    :on-import-bank="importExternalBank"
    class="quiz-container-start"
  />

  <!-- 错题本管理页面 -->
  <WrongNotebookManager
    v-else-if="appMode === 'wrong-manage'"
    key="wrong-manage"
    :notebooks="currentBankNotebooks"
    :active-id="activeNotebookForBank"
    :active-notebook="activeNotebookForBankObj"
    :bank-name="currentBankName"
    :total-entry-count="wrongCount"
    :entry-counts="notebookEntryCounts"
    @back="handleBackToHome"
    @import="importWrongQuestions"
    @export="exportWrongQuestions"
    @set-active="(id: string) => quizStore.setActiveNotebook(currentBankFile, id)"
    @start-practice="(id: string) => { quizStore.setActiveNotebook(currentBankFile, id); handleStartGame('wrong'); }"
    @delete="deleteNotebookById"
    @backup-all="handleBackupAll"
    @restore-all="handleRestoreAll"
  />
  <div v-else-if="['practice','exam','endorse','wrong','specialize'].includes(appMode)" key="quiz" class="quiz-layout">
    <div v-if="renderError" style="color:red;padding:40px;text-align:center;">
      <h2>渲染错误</h2>
      <pre>{{ renderError }}</pre>
      <button @click="renderError = ''; appMode = 'start'">返回首页</button>
    </div>
    <template v-else>
      <div class="quiz-sidebar">
        <AnswerCard
          :questions="shuffledQuestions"
          :answer-sheet="answerSheet"
          :current-index="currentQuestionIndex"
          :app-mode="appMode"
          :bank-file="currentBankFile"
          @jumpTo="(idx: number) => handleJumpTo(idx, isDarkMode)"
          @clearAllWrong="handleClearWrong"
        />
      </div>
      <div class="quiz-container quiz-main-area">
        <QuizToolbar
          :is-dark-mode="isDarkMode"
          :shuffle-enabled="shuffleEnabled"
          :mode="appMode"
          :wrong-count="wrongCount"
          :question-count="shuffledQuestions.length"
          :notebook-name="activeNotebookName"
          @backHome="handleBackToHome"
          @toggleDark="toggleDarkMode"
          @clearPractice="handleClearPractice"
          @toggleShuffle="handleToggleShuffle"
          @addToWrongBook="handleAddToWrongBook"
          @clearWrong="handleClearWrong"
          @exportWrong="exportWrongQuestions"
        />
        <div
          v-for="(question, index) in shuffledQuestions"
          :key="question.number + '-' + index"
          :id="'q-' + question.number"
          class="question-list-item"
        >
          <QuestionDisplay
            :question="question"
            :question-number="index + 1"
            :total-questions="totalQuestions"
            :model-value="answerSheet.get(question.number)?.userAnswer ?? null"
            @update:modelValue="handleAnswerUpdate($event, question)"
            @submit="handleSubmit(question)"
            @compound-submit="handleCompoundSubmit(question, $event)"
            @compound-submit-sub="(subId: number, ua: string) => handleSubSubmit(question, subId, ua)"
            :show-result="answerSheet.get(question.number)?.showResult || false"
            :disabled="appMode === 'endorse'"
            :is-correct="answerSheet.get(question.number)?.isCorrect ?? false"
            :sub-results="answerSheet.get(question.number)?.subAnswers"
            :app-mode="appMode"
            :bank-file="currentBankFile"
            :wrong-entry-id="wrongDisplayEntryIds[index] ?? 0"
          />
        </div>
        <div class="list-nav" v-if="appMode === 'exam'">
          <button @click="submitExam" class="submit-exam-btn">提交试卷</button>
        </div>
      </div>
    </template>
  </div>

  <ExamReview
    v-else-if="appMode === 'review'"
    key="review"
    :questions="shuffledQuestions"
    :answer-sheet="answerSheet"
    :score="score"
    @restart="handleBackToHome"
  />
</Transition>

<!-- 导入对话框（start 和 wrong-manage 模式共享） -->
<template v-if="appMode === 'start' || appMode === 'wrong-manage'">
    <input type="file" ref="fileInput" @change="handleFileImport" style="display:none" accept=".json" />
    <div v-if="showImportDialog" class="import-dialog-overlay" @click.self="doConfirmImport">
      <div class="import-dialog">
      <h3>导入错题</h3>
      <p>发现 {{ pendingImportQuestions?.length || 0 }} 道错题，请选择导入方式：</p>

      <div class="import-option">
        <label>
          <input type="radio" v-model="importDialogChoice" value="new" />
          新建错题本：
        </label>
        <input
          v-if="importDialogChoice === 'new'"
          v-model="importDialogNewNotebookName"
          type="text"
          class="import-nb-name"
          placeholder="请输入错题本名称"
        />
      </div>

      <div class="import-option">
        <label>
          <input type="radio" v-model="importDialogChoice" value="existing" />
          导入到已有错题本：
        </label>
        <select
          v-if="importDialogChoice === 'existing'"
          v-model="importDialogTargetNotebook"
          class="import-nb-select"
        >
          <option v-for="nb in currentBankNotebooks" :key="nb.id" :value="nb.id">
            {{ nb.name }} ({{ getNotebookEntryCount(nb.id) }} 题)
          </option>
        </select>
        <span v-if="importDialogChoice === 'existing' && currentBankNotebooks.length === 0" class="no-notebook-hint">
          当前题库还没有错题本，请先新建一个。
        </span>
      </div>

      <div class="import-dialog-actions">
        <button class="toolbar-btn cancel" @click="cancelImport">取消</button>
        <button class="toolbar-btn import" @click="doConfirmImport" :disabled="!canConfirmImport">
          确认导入
        </button>
      </div>
    </div>
  </div>
  </template>

  <!-- 全局提示组件 -->
  <ToastContainer />
</template>

<script setup lang="ts">
import { onErrorCaptured, ref, computed } from 'vue'
import StartScreen from './components/StartScreen.vue'
import WrongNotebookManager from './components/WrongNotebookManager.vue'
import AnswerCard from './components/AnswerCard.vue'
import QuestionDisplay from './components/QuestionDisplay.vue'
import ExamReview from './components/ExamReview.vue'
import QuizToolbar from './components/QuizToolbar.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useDarkMode } from './composables/useDarkMode'
import { useQuiz } from './composables/useQuiz'
import { showToast, showConfirm } from './composables/useToast'
import { useQuizStore } from './stores/quizStore'

const { isDarkMode, toggleDarkMode } = useDarkMode()
const q = useQuiz()
const quizStore = useQuizStore()

// destructure everything used in template
const {
  isLoading, appMode, currentBankFile, availableQuestionTypes, renderError,
  shuffledQuestions, answerSheet, currentQuestionIndex, totalQuestions, score,
  wrongCount, wrongDisplayEntryIds, fileInput, shuffleEnabled,
  handleStartGame, handleStartSpecialize, handleBankChange, handleBackToHome,
  handleAnswerUpdate, handleSubmit, handleCompoundSubmit, handleSubSubmit,
  handleToggleShuffle, handleClearPractice, handleAddToWrongBook, handleClearWrong,
  handleJumpTo, submitExam, exportWrongQuestions, importWrongQuestions, handleFileImport,
  allBanks, importExternalBank,
  showImportDialog, importDialogNewNotebookName, pendingImportQuestions,
  confirmImportToNew, confirmImportToExisting, cancelImport,
} = q

// ── 导入对话框 ──
const importDialogChoice = ref<'new' | 'existing'>('new')
const importDialogTargetNotebook = ref<string>('')

const currentBankNotebooks = computed(() => quizStore.getNotebooksByBank(currentBankFile.value))

function getNotebookEntryCount(notebookId: string) {
  return quizStore.getEntriesByNotebook(notebookId).length
}

const notebookEntryCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const nb of currentBankNotebooks.value) {
    counts[nb.id] = getNotebookEntryCount(nb.id)
  }
  return counts
})

const canConfirmImport = computed(() => {
  if (!pendingImportQuestions.value) return false
  if (importDialogChoice.value === 'new') {
    return importDialogNewNotebookName.value.trim().length > 0
  }
  return importDialogTargetNotebook.value.length > 0
})

function doConfirmImport() {
  if (!canConfirmImport.value) { cancelImport(); return }
  if (importDialogChoice.value === 'new') {
    confirmImportToNew()
  } else {
    confirmImportToExisting(importDialogTargetNotebook.value)
  }
  importDialogChoice.value = 'new'
  importDialogTargetNotebook.value = ''
}

/** 当前活跃错题本名称（用于 wrong 模式 Toolbar 显示） */
const activeNotebookName = computed(() => {
  const nb = quizStore.getActiveNotebook(currentBankFile.value)
  return nb?.name || null
})

/** 当前活跃错题本 id */
const activeNotebookForBank = computed(() => quizStore.getActiveNotebook(currentBankFile.value)?.id)

/** 当前活跃错题本对象 */
const activeNotebookForBankObj = computed(() => quizStore.getActiveNotebook(currentBankFile.value) ?? null)

/** 当前题库名称 */
const currentBankName = computed(() => {
  return allBanks.value.find(b => b.file === currentBankFile.value)?.name || currentBankFile.value
})

async function deleteNotebookById(notebookId: string) {
  const nb = quizStore.notebooks.find((n) => n.id === notebookId)
  if (!nb) return
  const count = quizStore.getEntriesByNotebook(notebookId).length
  const ok = await showConfirm(`确定要删除错题本「${nb.name}」吗？其中的 ${count} 道错题也将被删除。`)
  if (!ok) return
  quizStore.deleteNotebook(notebookId)
}

/** 备份全部错题本数据为 JSON 文件下载 */
function handleBackupAll() {
  const json = quizStore.exportAllDataAsJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const dateStr = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `错题本备份_${dateStr}.json`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 150)
}

/** 从备份 JSON 文件恢复全部错题本数据 */
async function handleRestoreAll(event: Event) {
  const inp = event.target as HTMLInputElement
  const file = inp.files?.[0]
  if (!file) { inp.value = ''; return }
  if (file.type !== 'application/json') {
    showToast('请选择一个有效的 JSON 文件')
    inp.value = ''
    return
  }
  const ok = await showConfirm('确定要用备份文件覆盖全部错题本数据吗？当前所有错题数据将被替换。')
  if (!ok) {
    inp.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const content = e.target?.result as string
      const result = quizStore.importAllDataFromJson(content)
      showToast(result.message)
    } catch (err) {
      showToast('恢复失败：文件格式不正确')
      console.error(err)
    }
  }
  reader.readAsText(file)
  inp.value = ''
}

onErrorCaptured((err) => { console.error(err); renderError.value = String(err); return false })
</script>

<style scoped>
.quiz-layout { display:flex; gap:24px; width:90%; max-width:1200px; margin:20px auto; align-items:start }
.quiz-sidebar { flex:0 0 auto; position:sticky; top:20px; max-height:calc(100vh - 40px); overflow-y:auto; border-radius:12px }
.quiz-main-area { flex:1; max-width:800px; margin:0 auto; background-color:var(--color-bg-container); border-radius:12px; box-shadow:var(--color-shadow-container); border:1px solid var(--color-border-container); box-sizing:border-box; color:var(--color-text-primary); padding:0 }
.quiz-container-loading { background-color:var(--color-bg-container); border-radius:12px; box-shadow:var(--color-shadow-container); border:1px solid var(--color-border-container); padding:40px 30px; box-sizing:border-box; width:90%; max-width:500px; margin:auto; color:var(--color-text-primary); display:flex; flex-direction:column; align-items:center; justify-content:center }
.quiz-container-start { background-color:var(--color-bg-container); border-radius:12px; box-shadow:var(--color-shadow-container); border:1px solid var(--color-border-container); padding:40px 30px; width:90%; max-width:500px; margin:auto }
.no-questions-text { text-align:center; color:var(--color-text-muted); padding:40px }
.list-nav { margin-top:30px; padding-top:20px; border-top:1px solid var(--color-border-divider) }
.submit-exam-btn { width:100%; padding:14px; font-size:1.1rem; font-weight:bold; color:var(--color-text-btn-success); background:var(--color-bg-btn-success); border:none; border-radius:8px; cursor:pointer }
.question-list-item { margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid var(--color-border-divider) }

/* 导入对话框 */
.import-dialog-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.import-dialog {
  background: var(--color-bg-container); border-radius: 12px; padding: 24px;
  max-width: 420px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  /* Ensure it's vertically centered */
  margin: auto;
}
.import-dialog h3 { margin: 0 0 12px; font-size: 1.1rem; }
.import-dialog p { margin: 0 0 16px; font-size: 0.9rem; color: var(--color-text-muted); }
.import-option { margin-bottom: 12px; }
.import-option label { font-size: 0.9rem; cursor: pointer; }
.import-nb-name, .import-nb-select { margin-top: 6px; width: 100%; padding: 8px; font-size: 0.9rem; border: 1px solid var(--color-border-input); border-radius: 6px; box-sizing: border-box; }
.import-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.toolbar-btn.cancel { background: var(--color-bg-input-disabled); color: var(--color-text-muted); padding: 6px 14px; font-size: 0.82rem; border: none; border-radius: 5px; cursor: pointer; }
.no-notebook-hint { font-size: 0.8rem; color: var(--color-text-muted); margin-top: 4px; display: block; }
.quiz-main-area > :not(.toolbar) { padding-left:30px; padding-right:30px }
.quiz-main-area > .toolbar + * { padding-top:30px }
:global(body) { background-color:var(--color-bg-page); color:var(--color-text-primary); margin:0; padding:0; font-family:'Helvetica Neue',Helvetica,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif; transition:background-color .3s,color .3s }
:global(#app) { min-height:100vh; display:flex; align-items:center; justify-content:center }
@media (max-width:768px) { .quiz-layout { grid-template-columns:1fr } .quiz-sidebar { position:static; max-height:none; margin-bottom:20px } }
</style>

<style>
/* 页面切换动画（需全局作用域） */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>

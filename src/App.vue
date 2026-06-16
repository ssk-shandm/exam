<template>
  <div v-if="isLoading" class="quiz-container-loading">
    <h2 class="loading-text">题库加载中...</h2>
  </div>

  <StartScreen
    v-else-if="appMode === 'start'"
    @start="handleStartGame"
    @start-specialize="handleStartSpecialize"
    :banks="allBanks"
    :selected-bank="currentBankFile"
    :question-types="availableQuestionTypes"
    @changeBank="handleBankChange"
    :on-import-bank="importExternalBank"
    class="quiz-container-start"
  >
    <div class="start-import-area">
      <button @click="importWrongQuestions" class="toolbar-btn import">导入错题 (JSON)</button>
      <button v-if="wrongCount > 0" @click="exportWrongQuestions" class="toolbar-btn export">导出错题</button>
    </div>
    <input type="file" ref="fileInput" @change="handleFileImport" style="display:none" accept=".json" />
  </StartScreen>

  <div v-else-if="['practice','exam','endorse','wrong','specialize'].includes(appMode)" class="quiz-layout">
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
    :questions="shuffledQuestions"
    :answer-sheet="answerSheet"
    :score="score"
    @restart="handleBackToHome"
  />
</template>

<script setup lang="ts">
import { onErrorCaptured } from 'vue'
import StartScreen from './components/StartScreen.vue'
import AnswerCard from './components/AnswerCard.vue'
import QuestionDisplay from './components/QuestionDisplay.vue'
import ExamReview from './components/ExamReview.vue'
import QuizToolbar from './components/QuizToolbar.vue'
import { useDarkMode } from './composables/useDarkMode'
import { useQuiz } from './composables/useQuiz'

const { isDarkMode, toggleDarkMode } = useDarkMode()
const q = useQuiz()

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
} = q

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
.toolbar-btn.import { background:var(--color-bg-btn-primary); color:var(--color-text-btn-primary); padding:6px 12px; font-size:0.82rem; font-weight:600; border:none; border-radius:5px; cursor:pointer }
.toolbar-btn.export { background:var(--color-bg-btn-info); color:var(--color-text-btn-info); padding:6px 12px; font-size:0.82rem; font-weight:600; border:none; border-radius:5px; cursor:pointer }
.start-import-area { margin-bottom:10px; display:flex; gap:8px; justify-content:center }
.quiz-main-area > :not(.toolbar) { padding-left:30px; padding-right:30px }
.quiz-main-area > .toolbar + * { padding-top:30px }
:global(body) { background-color:var(--color-bg-page); color:var(--color-text-primary); margin:0; padding:0; font-family:'Helvetica Neue',Helvetica,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif; transition:background-color .3s,color .3s }
:global(#app) { min-height:100vh; display:flex; align-items:center; justify-content:center }
@media (max-width:768px) { .quiz-layout { grid-template-columns:1fr } .quiz-sidebar { position:static; max-height:none; margin-bottom:20px } }
</style>

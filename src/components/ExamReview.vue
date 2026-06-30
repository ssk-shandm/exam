<template>
  <div class="quiz-layout">
    <div class="quiz-sidebar">
      <AnswerCard
        :questions="shuffledQuestions"
        :answer-sheet="answerSheet"
        :current-index="currentQuestionIndex"
        @jumpTo="handleJumpTo"
      />

      <div class="filter-container">
        <label>
          <input type="checkbox" v-model="showOnlyWrong" />
          只看错题
        </label>
      </div>

      <div id="final-score-container">
        <h3>考试结束！</h3>
        <p id="final-score-text">你答对了 {{ score }} / {{ totalQuestions }} 题。</p>
        <button id="restart-btn" @click="emit('restart', 'start')">返回首页</button>
      </div>
    </div>

    <div class="quiz-container quiz-main-area">
      <h2 v-if="filteredQuestions.length === 0" class="no-questions-text">
        {{ showOnlyWrong ? '你没有错题，太棒了！' : '没有题目。' }}
      </h2>

      <div
        v-for="question in filteredQuestions"
        :key="question.number"
        :id="'q-' + question.number"
        class="review-question-block"
      >
        <QuestionDisplay
          :question="question"
          :question-number="shuffledQuestions.indexOf(question) + 1"
          :total-questions="totalQuestions"
          :model-value="answerSheet.get(question.number)?.userAnswer ?? null"
          :show-result="false"
          :disabled="true"
          :app-mode="'review'"
          :sub-results="answerSheet.get(question.number)?.subAnswers"
        />
        <ResultDisplay
          v-if="!question.subQuestions?.length"
          :is-correct="answerSheet.get(question.number)?.isCorrect || false"
          :correct-answer="question.answer"
          :explanation="question.explanation"
          :user-answer="answerSheet.get(question.number)?.userAnswer ?? ''"
          :answer-format="question.answerFormat"
          :code-language="question.codeLanguage"
          :answer-detail="question.answerDetail"
        />
        <!-- 复合题：显示子题结果汇总 -->
        <div v-else class="compound-review-summary">
          <p class="compound-score-text">
            子题正确率：
            <strong>{{ getCompoundCorrectCount(question) }}/{{ question.subQuestions?.length }}</strong>
          </p>
          <div
            v-for="sub in question.subQuestions"
            :key="sub.id"
            class="review-sub-item"
            :class="getSubReviewClass(question.number, sub.id)"
          >
            <span class="review-sub-num">{{ question.number }}.{{ sub.id }}</span>
            <span class="review-sub-q">{{ sub.question }}</span>
            <span
              v-if="getSubReviewResult(question.number, sub.id) === true"
              class="review-sub-badge correct"
            >✓</span>
            <span
              v-else-if="getSubReviewResult(question.number, sub.id) === false"
              class="review-sub-badge incorrect"
            >✗</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Question, UserAnswer, SubAnswer } from '../types'
import AnswerCard from './AnswerCard.vue'
import QuestionDisplay from './QuestionDisplay.vue'
import ResultDisplay from './ResultDisplay.vue'

// 定义 props
const props = defineProps<{
  questions: Question[]
  answerSheet: Map<
    number,
    { userAnswer: UserAnswer; isCorrect: boolean | null; subAnswers?: Map<number, SubAnswer> }
  >
  score: number
}>()

// 定义 emits
const emit = defineEmits<{
  (e: 'restart', mode: 'start'): void
}>()

const showOnlyWrong = ref(false)
const currentQuestionIndex = ref(0) // 用于高亮答题卡
const shuffledQuestions = computed(() => props.questions)
const totalQuestions = computed(() => props.questions.length)

// 核心：筛选题目 (要求 4)
const filteredQuestions = computed(() => {
  if (!showOnlyWrong.value) {
    return props.questions
  }
  return props.questions.filter((q) => {
    const entry = props.answerSheet.get(q.number)
    return entry?.isCorrect === false
  })
})

function handleJumpTo(index: number) {
  currentQuestionIndex.value = index
  const questionNumber = props.questions[index]?.number
  if (!questionNumber) return

  const element = document.getElementById('q-' + questionNumber)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 复合题辅助函数
function getCompoundCorrectCount(question: Question): number {
  const entry = props.answerSheet.get(question.number)
  if (!entry?.subAnswers) return 0
  let count = 0
  for (const sub of question.subQuestions || []) {
    const sa = entry.subAnswers.get(sub.id)
    if (sa?.isCorrect === true) count++
  }
  return count
}

function getSubReviewResult(qNum: number, subId: number): boolean | null {
  return props.answerSheet.get(qNum)?.subAnswers?.get(subId)?.isCorrect ?? null
}

function getSubReviewClass(qNum: number, subId: number): string {
  const result = getSubReviewResult(qNum, subId)
  if (result === true) return 'sub-review-correct'
  if (result === false) return 'sub-review-incorrect'
  return ''
}
</script>

<style scoped>
.quiz-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  width: 90%;
  max-width: 1100px;
  margin: 20px auto;
}

.quiz-sidebar {
  position: sticky;
  top: 20px;
  align-self: start;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  color: var(--color-text-primary);
}

.quiz-main-area {
  background-color: var(--color-bg-container);
  border-radius: 12px;
  box-shadow: var(--color-shadow-container);
  border: 1px solid var(--color-border-container);
  padding: 24px;
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  margin: 0;
}
.no-questions-text {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 40px;
}
.filter-container {
  margin-top: 20px;
  padding: 15px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-surface);
  border-radius: 8px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.filter-container label {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.filter-container input {
  margin-right: 10px;
  width: 16px;
  height: 16px;
}
#final-score-container {
  text-align: center;
  margin-top: 20px;
  padding: 15px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-surface);
  border-radius: 8px;
  color: var(--color-text-primary);
}
#final-score-text {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 10px 0;
  color: var(--color-text-primary);
}
#restart-btn {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-btn-primary);
  background-color: var(--color-bg-btn-primary);
  border: 1px solid var(--color-border-btn-primary);
  border-radius: 8px;
  cursor: pointer;
  margin-top: 10px;
}
#restart-btn:hover {
  background-color: var(--color-bg-btn-primary-hover);
}
.review-question-block {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border-divider);
  scroll-margin-top: 20px;
}
.review-question-block:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .quiz-layout {
    grid-template-columns: 1fr;
  }
  .quiz-sidebar {
    position: static;
    top: auto;
    max-height: none;
    overflow-y: visible;
  }
}

.compound-review-summary {
  margin-top: 15px;
  padding: 12px;
  background-color: var(--color-bg-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border-surface);
}
.compound-score-text {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: var(--color-text-primary);
}
.review-sub-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  margin: 4px 0;
  border-radius: 4px;
  font-size: 0.9rem;
}
.review-sub-item.sub-review-correct {
  background-color: var(--color-bg-sub-correct);
}
.review-sub-item.sub-review-incorrect {
  background-color: var(--color-bg-sub-incorrect);
}
.review-sub-num {
  font-weight: 700;
  color: var(--color-text-sub-number);
  white-space: nowrap;
}
.review-sub-q {
  flex: 1;
  color: var(--color-text-secondary);
}
.review-sub-badge {
  font-weight: 700;
  font-size: 1rem;
}
.review-sub-badge.correct {
  color: var(--color-badge-correct);
}
.review-sub-badge.incorrect {
  color: var(--color-badge-incorrect);
}
</style>

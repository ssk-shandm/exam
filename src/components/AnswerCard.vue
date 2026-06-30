<template>
  <div class="answer-card-drawer" :class="{ 'is-collapsed': !isExpanded }">
    <div class="drawer-inner" @mouseleave="handleMouseLeave">
      <!-- 触发条 -->
      <div
        class="drawer-trigger"
        @mouseenter="handleMouseEnter"
        @click="toggleExpand"
      >
        <div class="trigger-bar">
          <span class="trigger-icon">☰</span>
          <span class="trigger-text">答题卡</span>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="drawer-content">
        <div class="drawer-header">
          <h3>答题卡</h3>
          <button
            class="pin-btn"
            @click.stop="togglePin"
            :title="isPinned ? '取消固定' : '固定展开'"
          >
            {{ isPinned ? '📌' : '📍' }}
          </button>
        </div>
        <div class="card-grid">
          <button
            v-for="(question, index) in questions"
            :key="appMode === 'wrong' && wrongEntryIds ? (wrongEntryIds[index] ?? index) : (question.number ?? index)"
            :class="getButtonClass(question, index)"
            @click="emit('jumpTo', index)"
          >
            {{ index + 1 }}
          </button>
        </div>
        <button
          v-if="appMode === 'wrong' && questions.length > 0"
          @click="emit('clearAllWrong')"
          class="clear-all-btn"
        >
          一键移除所有错题
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Question, UserAnswer, SubAnswer, AppMode } from '../types'
import { useQuizStore } from '../stores/quizStore'

const quizStore = useQuizStore()

const props = defineProps<{
  questions: Question[]
  answerSheet: Map<
    number,
    {
      userAnswer: UserAnswer
      isCorrect: boolean | null
      subAnswers?: Map<number, SubAnswer>
    }
  >
  currentIndex: number
  appMode?: AppMode
  bankFile?: string
  wrongEntryIds?: number[]
}>()

const emit = defineEmits<{
  (e: 'jumpTo', index: number): void
  (e: 'clearAllWrong'): void
}>()

// ---- 抽屉状态 ----
const isExpanded = ref(true)
const isPinned = ref(false)

function expand() {
  isExpanded.value = true
}

function collapse() {
  isExpanded.value = false
}

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function togglePin() {
  isPinned.value = !isPinned.value
  if (isPinned.value) {
    isExpanded.value = true
  }
}

function handleMouseEnter() {
  if (!isExpanded.value) {
    expand()
  }
}

function handleMouseLeave() {
  if (!isPinned.value) {
    collapse()
  }
}

// ---- 答题卡按钮样式 ----
function getButtonClass(question: Question, index: number) {
  const classes = ['card-button']
  if (index === props.currentIndex) {
    classes.push('current')
  }

  const entry = props.answerSheet.get(question.number)

  // 复合题：检查子题
  if (question.subQuestions && question.subQuestions.length > 0) {
    if (entry?.subAnswers && entry.subAnswers.size > 0) {
      classes.push('answered')
      let correctCount = 0
      let totalAnswered = 0
      for (const sub of question.subQuestions) {
        const sa = entry.subAnswers.get(sub.id)
        if (sa) {
          totalAnswered++
          if (sa.isCorrect === true) correctCount++
        }
      }
      if (totalAnswered > 0) {
        if (correctCount === totalAnswered) {
          const isGR = props.bankFile && quizStore.isGuessedRight(question.number, props.bankFile)
          classes.push(props.appMode === 'wrong' ? 'correct' : (
            isGR ? 'guessed-right' : 'correct'
          ))
        } else if (correctCount === 0) {
          classes.push('incorrect')
        } else {
          classes.push('partial')
        }
      }
    }
    return classes
  }

  if (entry?.userAnswer) {
    classes.push('answered')
  }

  if (entry?.isCorrect === true) {
    const isGR = props.bankFile && quizStore.isGuessedRight(question.number, props.bankFile)
    if (!isGR && props.bankFile) {
      console.log('[AnswerCard] not guessed-right for q', question.number, 'bankFile:', props.bankFile)
    }
    classes.push(props.appMode === 'wrong' ? 'correct' : (
      isGR ? 'guessed-right' : 'correct'
    ))
  } else if (entry?.isCorrect === false) {
    classes.push('incorrect')
  }

  return classes
}
</script>

<style scoped>
/* ---- 抽屉布局 ---- */
.answer-card-drawer {
  width: 280px;
  margin: 0 auto;
  overflow: hidden;
  transition: width 0.3s ease;
  border-radius: 8px;
  min-height: 200px;
  max-height: calc(100vh - 40px);
  display: flex;
}

.answer-card-drawer.is-collapsed {
  width: 36px;
}

.drawer-inner {
  display: flex;
  width: 280px;
  height: 100%;
}

.drawer-trigger {
  width: 36px;
  flex-shrink: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-surface-alt);
  border-right: 1px solid var(--color-border-divider);
  user-select: none;
  transition: background-color 0.2s;
}

.drawer-trigger:hover {
  background-color: var(--color-bg-surface-hover);
}

.trigger-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.trigger-icon {
  font-size: 1.1rem;
}

.trigger-text {
  writing-mode: vertical-rl;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 2px;
}

.drawer-content {
  flex: 1;
  padding: 15px;
  background-color: var(--color-bg-surface-alt);
  transition: background-color 0.3s, color 0.3s;
  overflow-y: auto;
  max-height: calc(100vh - 80px);
}

/* ---- 头部 ---- */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}

.drawer-header h3 {
  margin: 0;
  color: var(--color-text-heading);
}

.pin-btn {
  padding: 4px 8px;
  font-size: 0.85rem;
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  background-color: var(--color-bg-container);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color 0.2s;
}

.pin-btn:hover {
  background-color: var(--color-bg-surface-hover);
}

/* ---- 答题卡网格 ---- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.card-button {
  width: 35px;
  height: 35px;
  border: 1px solid var(--color-border-input);
  background-color: var(--color-bg-container);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
  transition: all 0.2s;
}

.card-button:hover {
  background-color: var(--color-bg-surface);
}

.card-button.current {
  border-color: var(--color-accent);
  background-color: var(--color-accent);
  color: #fff;
}

.card-button.answered {
  background-color: var(--color-bg-btn-secondary);
  color: var(--color-text-secondary);
}

.card-button.correct {
  background-color: var(--color-bg-correct);
  border-color: var(--color-border-correct);
  color: var(--color-text-correct);
}

.card-button.incorrect {
  background-color: var(--color-bg-incorrect);
  border-color: var(--color-border-incorrect);
  color: var(--color-text-incorrect);
}

.card-button.partial {
  background-color: var(--color-bg-warning);
  border-color: var(--color-border-warning);
  color: var(--color-text-warning);
}

.card-button.guessed-right {
  background-color: #fff3cd;
  border-color: #ff9800;
  color: #e65100;
}

.clear-all-btn {
  width: 100%;
  margin-top: 14px;
  padding: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-btn-danger);
  background-color: var(--color-bg-btn-danger);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-all-btn:hover {
  background-color: var(--color-bg-btn-danger-hover);
}
</style>

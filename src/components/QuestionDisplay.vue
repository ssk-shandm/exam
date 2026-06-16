<template>
  <div>
    <div id="quiz-header">
      <h2 id="question-text">{{ question.question }}</h2>
      <div id="question-meta">
        <span id="question-type">{{ question.type }}</span>
        <span id="question-number">
          第 {{ questionNumber }} / {{ totalQuestions }} 题 (原题号: {{ question.number }})
        </span>
      </div>
    </div>

    <div id="options-container" class="options-container">
      <!-- 复合题：场景 + 子题列表 -->
      <CompoundQuestion
        v-if="isCompound"
        :question="question"
        :question-number="questionNumber"
        :total-questions="totalQuestions"
        :disabled="!!disabled"
        :sub-results="subResults"
        :show-results="showResult"
        :app-mode="appMode"
        @submit="emit('compound-submit', $event)"
        @submit-sub="(subId: number, userAnswer: string) => emit('compound-submit-sub', subId, userAnswer)"
      />

      <div v-else-if="isRadio">
        <label
          v-for="(text, key) in options"
          :key="key"
          class="option-label"
          :class="getOptionClass(key)"
        >
          <input
            type="radio"
            :name="'q' + question.number"
            :value="key"
            :checked="modelValue === key"
            @change="emitAnswer(key)"
            :disabled="disabled"
          />
          {{ key }}: {{ text }}
        </label>
      </div>

      <div v-else-if="isCheckbox">
        <label
          v-for="(text, key) in question.options"
          :key="key"
          class="option-label"
          :class="getOptionClass(key)"
        >
          <input
            type="checkbox"
            :value="key"
            :checked="modelValue?.includes(key)"
            @change="updateCheckbox(key)"
            :disabled="disabled"
          />
          {{ key }}: {{ text }}
        </label>
      </div>

      <div v-else-if="isFillInBlank">
        <input
          type="text"
          id="fill-in-blank"
          :value="modelValue || ''"
          @input="emitAnswer(($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="handleMainSubmit"
          placeholder="请输入你的答案"
          :disabled="disabled"
        />
      </div>

      <div v-else-if="isProgramAnalysis">
        <textarea
          id="analysis-input"
          :value="modelValue || ''"
          @input="handleAnalysisInput(($event.target as HTMLTextAreaElement).value)"
          @keydown.enter.exact.prevent="handleMainSubmit"
          placeholder="请输入程序运行结果或分析内容（Enter 提交，Shift+Enter 换行）"
          :disabled="disabled"
          rows="6"
        ></textarea>

        <div v-if="(isInPracticeMode || isInWrongMode) && !showResult" class="extra-actions">
          <button @click="handleShowAnalysisAnswer" class="secondary-btn">直接查看答案</button>
        </div>
      </div>

      <div v-else-if="isCodeQuestion">
        <div class="code-question-placeholder">
          请在 IDE 中练习，完成后点击下方按钮查看参考答案。
        </div>
      </div>

      <div v-else-if="isShortAnswer">
        <textarea
          id="short-answer-input"
          :value="modelValue || ''"
          @input="emitAnswer(($event.target as HTMLTextAreaElement).value)"
          @keydown.enter.exact.prevent="handleMainSubmit"
          placeholder="请输入你的回答（Enter 提交，Shift+Enter 换行）"
          :disabled="disabled"
          rows="5"
        ></textarea>
      </div>
    </div>

    <button
      id="submit-btn"
      v-show="!showResult && !disabled && !isPracticeAutoSubmit && appMode !== 'exam'"
      @click="handleMainSubmit"
    >
      {{ isCodeQuestion ? '查看参考代码' : '提交答案' }}
    </button>

    <div v-if="isEndorseMode" class="endorse-answer-block">
      <p class="endorse-text"><strong>正确答案：</strong></p>
      <div v-if="isMarkdownAnswer" class="markdown-answer-block" v-html="renderedAnswer"></div>
      <p v-else class="endorse-text">{{ question.answer }}</p>

      <p class="endorse-text" v-if="question.explanation">
        <strong>解析：</strong>{{ question.explanation }}
      </p>
    </div>

    <ResultDisplay
      v-if="showResult"
      :is-correct="isCorrect"
      :correct-answer="question.answer"
      :explanation="question.explanation"
      :user-answer="modelValue"
      :answer-format="question.answerFormat"
      :code-language="question.codeLanguage"
    />

    <div class="wrong-question-controls" v-if="isInPracticeMode || isInWrongMode">
      <button v-if="isInPracticeMode && !isWrongQuestion && !isGuessedRight" @click="addToWrong" class="wrong-btn add">
        添加到错题
      </button>
      <button v-if="isInPracticeMode && isCorrect && !isGuessedRight" @click="addGuessed" class="wrong-btn guessed">
        蒙对的，加入错题
      </button>
      <span v-if="isInPracticeMode && isGuessedRight" class="wrong-label guessed-label">
        已标记为蒙对
        <button @click="cancelGuessed" class="wrong-btn cancel-guessed">取消</button>
      </span>
      <span v-else-if="isInPracticeMode && isWrongQuestion" class="wrong-label">已在错题本</span>

      <button v-if="isInWrongMode" @click="removeFromWrong" class="wrong-btn remove">
        移出错题（放弃）
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'
import type { Question, UserAnswer, AppMode, SubAnswer } from '../types'
import ResultDisplay from './ResultDisplay.vue'
import CompoundQuestion from './CompoundQuestion.vue'
import { useQuizStore } from '../stores/quizStore'

const quizStore = useQuizStore()

const props = withDefaults(
  defineProps<{
    question: Question
    questionNumber: number
    totalQuestions: number
    modelValue: UserAnswer
    showResult: boolean
    disabled?: boolean
    isCorrect?: boolean
    appMode: AppMode
    subResults?: Map<number, SubAnswer>
    bankFile?: string
    wrongEntryId?: number
  }>(),
  {
    isCorrect: false,
    bankFile: '',
    wrongEntryId: 0,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: UserAnswer): void
  (e: 'submit'): void
  (e: 'compound-submit', subAnswers: Map<number, SubAnswer>): void
  (e: 'compound-submit-sub', subId: number, userAnswer: string): void
}>()

const judgmentOptions = { A: '正确', B: '错误' }

// 题型判断
const isRadio = computed(() => ['单选题', '单选', '判断题', '判断'].includes(props.question.type))
const isCheckbox = computed(() => ['多选题', '多选'].includes(props.question.type))
const isFillInBlank = computed(() => ['填空题', '填空'].includes(props.question.type))
const isShortAnswer = computed(() => ['简答题', '简答'].includes(props.question.type))
const isProgramAnalysis = computed(() => ['程序分析题', '程序分析'].includes(props.question.type))
const isCodeQuestion = computed(() => ['编程题', '编程', '代码题'].includes(props.question.type))
const isCompound = computed(
  () =>
    ['SQL综合题', '综合题', '复合题'].includes(props.question.type) &&
    props.question.subQuestions &&
    props.question.subQuestions.length > 0,
)

const isEndorseMode = computed(() => props.disabled && !props.showResult)

// 代码/Markdown 渲染逻辑
const isMarkdownAnswer = computed(() => {
  return props.question.answerFormat === 'markdown'
})
const renderedAnswer = computed(() => {
  if (!isMarkdownAnswer.value || props.question.answer == null) return ''
  return renderMarkdown(props.question.answer)
})

const isPracticeAutoSubmit = computed(() => {
  return (
    !props.disabled &&
    !props.showResult &&
    !isFillInBlank.value &&
    !isShortAnswer.value &&
    !isProgramAnalysis.value &&
    !isCodeQuestion.value &&
    ['practice', 'wrong', 'specialize'].includes(props.appMode)
  )
})

const options = computed(() => {
  const type = props.question.type
  if (type === '判断题' || type === '判断') {
    return judgmentOptions
  }
  return props.question.options
})

const isInPracticeMode = computed(() => ['practice', 'specialize'].includes(props.appMode))
const isInWrongMode = computed(() => props.appMode === 'wrong')
const isInSpecializeMode = computed(() => props.appMode === 'specialize')

const isWrongQuestion = computed(() =>
  props.bankFile ? quizStore.containsWrongEntry(props.question.number, props.bankFile) : false,
)

const isGuessedRight = computed(() =>
  props.bankFile ? quizStore.isGuessedRight(props.question.number, props.bankFile) : false,
)

function addToWrong() {
  if (props.bankFile) {
    quizStore.addWrongEntry(props.question.number, props.bankFile)
  }
}

function addGuessed() {
  if (props.bankFile) {
    // 同时标记为蒙对 + 加入错题本（确保错题本里有记录）
    quizStore.addGuessedRight(props.question.number, props.bankFile)
    quizStore.addWrongEntry(props.question.number, props.bankFile)
  }
}

function cancelGuessed() {
  if (props.bankFile) {
    quizStore.removeGuessedRight(props.question.number, props.bankFile)
    // 按 entryId 精确移除；没有 entryId 则删除最新的
    if (props.wrongEntryId) {
      quizStore.removeWrongEntry(props.wrongEntryId)
    } else {
      const entries = quizStore.getWrongEntriesByBank(props.bankFile)
      const match = [...entries].reverse().find((e) => e.questionNumber === props.question.number)
      if (match) {
        quizStore.removeWrongEntry(match.id)
      }
    }
  }
}

function removeFromWrong() {
  if (props.bankFile) {
    // 按 entryId 精确删除；没有 entryId 则删除最新的匹配记录
    if (props.wrongEntryId) {
      quizStore.removeWrongEntry(props.wrongEntryId)
    } else {
      const entries = quizStore.getWrongEntriesByBank(props.bankFile)
      const match = [...entries].reverse().find((e) => e.questionNumber === props.question.number)
      if (match) {
        quizStore.removeWrongEntry(match.id)
      }
    }
    quizStore.removeGuessedRight(props.question.number, props.bankFile)
  }
}

function emitAnswer(value: string | null) {
  emit('update:modelValue', value)
}

// src/components/QuestionDisplay.vue

function handleAnalysisInput(value: string) {
  // 只负责向上传递数据，不要在这里操作 answerSheet（因为这里没有 answerSheet 变量）
  emit('update:modelValue', value)

  // 原来的错误代码块（涉及 answerSheet.value.set 的部分）已删除
  // 这样配合 App.vue 的修改，用户输入时“提交”按钮会重新出现，点击即可判分。
}

function updateCheckbox(key: string) {
  const currentAnswer = (Array.isArray(props.modelValue) ? props.modelValue : []) as string[]
  let newAnswer: string[]
  if (currentAnswer.includes(key)) {
    newAnswer = currentAnswer.filter((item) => item !== key)
  } else {
    newAnswer = [...currentAnswer, key]
  }
  emit('update:modelValue', newAnswer)
}

function handleMainSubmit() {
  if (isCodeQuestion.value) {
    emit('update:modelValue', props.question.answer)
  }

  emit('submit')
}

// 专门处理程序分析题的“直接查看答案”
function handleShowAnalysisAnswer() {
  if (!props.modelValue) {
    emit('update:modelValue', '已查看答案')
  }
  emit('submit')
}

function getOptionClass(key: string) {
  if (!isEndorseMode.value) return ''
  const correctAnswer = props.question.answer
  if (isCheckbox.value) {
    if (correctAnswer.includes(key)) return 'correct-answer'
  } else {
    if (correctAnswer === key) return 'correct-answer'
  }
  return ''
}
</script>

<style scoped>
#quiz-header {
  margin-bottom: 20px;
}
#question-text {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 10px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: var(--color-text-heading);
}
#question-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}
#question-type {
  font-weight: 500;
  background-color: var(--color-bg-tag);
  color: var(--color-text-tag);
  padding: 4px 8px;
  border-radius: 6px;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.option-label {
  display: block;
  background-color: var(--color-bg-option);
  border: 1px solid var(--color-border-option);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  color: var(--color-text-option);
}
.option-label:hover {
  background-color: var(--color-bg-surface-hover);
}
.option-label input {
  margin-right: 10px;
}
input:disabled {
  cursor: not-allowed;
}
.option-label:has(input:disabled) {
  background-color: var(--color-bg-option-disabled);
  opacity: 0.7;
  cursor: not-allowed;
}

#fill-in-blank,
#short-answer-input,
#analysis-input {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  border: 1px solid var(--color-border-input);
  border-radius: 8px;
  box-sizing: border-box;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  background-color: var(--color-bg-input);
  color: var(--color-text-input);
}
#fill-in-blank::placeholder,
#short-answer-input::placeholder,
#analysis-input::placeholder {
  color: var(--color-text-placeholder);
}
#fill-in-blank:disabled,
#short-answer-input:disabled,
#analysis-input:disabled {
  background-color: var(--color-bg-input-disabled);
  color: var(--color-text-input-disabled);
  opacity: 0.7;
  cursor: not-allowed;
}

#submit-btn,
.secondary-btn {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-btn-primary);
  background-color: var(--color-bg-btn-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 20px;
}
#submit-btn:hover,
.secondary-btn:hover {
  background-color: var(--color-bg-btn-primary-hover);
}

.secondary-btn {
  background-color: var(--color-bg-btn-secondary);
  color: var(--color-text-btn-secondary);
  margin-top: 10px;
}
.secondary-btn:hover {
  background-color: var(--color-bg-btn-secondary-hover);
}

.code-question-placeholder {
  padding: 20px;
  background-color: var(--color-bg-code-placeholder);
  border: 1px dashed var(--color-border-code-placeholder);
  border-radius: 8px;
  text-align: center;
  color: var(--color-text-secondary);
}

.option-label.correct-answer {
  background-color: var(--color-bg-correct);
  border-color: var(--color-border-correct);
  color: var(--color-text-correct);
  font-weight: 600;
  opacity: 1;
}
.option-label.correct-answer:has(input:disabled) {
  background-color: var(--color-bg-correct);
  opacity: 1;
}
.endorse-answer-block {
  margin-top: 20px;
  padding: 15px;
  background-color: var(--color-bg-explanation);
  border-left: 5px solid var(--color-border-explanation);
  border-radius: 4px;
}
.endorse-text {
  margin: 5px 0;
  color: var(--color-text-explanation);
  font-size: 1rem;
  white-space: pre-wrap;
}
.markdown-answer-block {
  margin: 8px 0;
  line-height: 1.6;
}
.markdown-answer-block :deep(pre) {
  margin: 10px 0;
  padding: 0;
  background: transparent;
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid var(--color-border-code-block);
}
.markdown-answer-block :deep(code.hljs) {
  display: block;
  padding: 12px 16px;
  font-family: 'Fira Code', Consolas, Monaco, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  border-radius: 6px;
}
.markdown-answer-block :deep(code:not(.hljs)) {
  background-color: var(--color-bg-code-inline);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', Consolas, Monaco, monospace;
  font-size: 0.9em;
}

.wrong-question-controls {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--color-border-divider);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.wrong-btn {
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.wrong-btn.add {
  background-color: var(--color-bg-btn-warning);
  color: var(--color-text-btn-warning);
}
.wrong-btn.add:hover {
  background-color: var(--color-bg-btn-warning-hover);
}
.wrong-btn.remove {
  background-color: var(--color-bg-btn-danger);
  color: var(--color-text-btn-danger);
}
.wrong-btn.remove:hover {
  background-color: var(--color-bg-btn-danger-hover);
}
.wrong-btn.guessed {
  background-color: #ff9800;
  color: #fff;
}
.wrong-btn.guessed:hover {
  background-color: #f57c00;
}
.wrong-btn.cancel-guessed {
  background-color: transparent;
  color: #ff9800;
  border: 1px solid #ff9800;
  padding: 2px 8px;
  font-size: 0.8rem;
  margin-left: 6px;
}
.wrong-btn.cancel-guessed:hover {
  background-color: #fff3e0;
}
.wrong-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  display: flex;
  align-items: center;
}
.wrong-label.guessed-label {
  color: #ff9800;
}

input[type="radio"],
input[type="checkbox"] {
  accent-color: var(--color-accent);
}</style>

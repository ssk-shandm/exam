<template>
  <div class="compound-question">
    <!-- 场景区域 -->
    <div v-if="question.scenario" class="scenario-block">
      <h4 class="scenario-title">📋 场景</h4>
      <div
        v-if="isScenarioMarkdown"
        class="scenario-content markdown-body"
        v-html="renderedScenario"
      ></div>
      <pre v-else class="scenario-text">{{ question.scenario }}</pre>
    </div>

    <!-- 子题列表 -->
    <div class="sub-questions-list">
      <div
        v-for="sub in question.subQuestions"
        :key="sub.id"
        class="sub-question-item"
        :class="getSubResultClass(sub.id)"
      >
        <div class="sub-question-header">
          <span class="sub-question-number">{{ questionNumber }}.{{ sub.id }}</span>
          <span class="sub-question-text">{{ sub.question }}</span>
          <span v-if="subResults?.get(sub.id)?.isCorrect === true" class="sub-badge correct">✓</span>
          <span v-else-if="subResults?.get(sub.id)?.isCorrect === false" class="sub-badge incorrect">✗</span>
        </div>

        <!-- 输入区 -->
        <div v-if="!disabled && !subResults?.get(sub.id)" class="sub-input-area">
          <textarea
            class="sub-textarea"
            :value="userAnswers.get(sub.id) || ''"
            @input="handleInput(sub.id, ($event.target as HTMLTextAreaElement).value)"
            :placeholder="'请输入 SQL 语句...'"
            rows="4"
          ></textarea>
          <button
            class="sub-submit-btn"
            @click="handleSubmitSub(sub.id)"
            :disabled="!(userAnswers.get(sub.id) || '').trim()"
          >
            提交本题
          </button>
        </div>

        <!-- 已提交：显示判定结果 -->
        <div v-if="subResults?.get(sub.id)" class="sub-result-area">
          <div
            v-if="isSubMarkdown(sub)"
            class="markdown-answer-block"
            v-html="getRenderedSubAnswer(sub)"
          ></div>
          <pre v-else class="sub-answer-text">{{ sub.answer }}</pre>
        </div>

        <!-- 背题模式（无结果时直接显示答案） -->
        <div v-if="disabled && !showResults" class="sub-result-area">
          <div
            v-if="isSubMarkdown(sub)"
            class="markdown-answer-block"
            v-html="getRenderedSubAnswer(sub)"
          ></div>
          <pre v-else class="sub-answer-text">{{ sub.answer }}</pre>
        </div>
      </div>
    </div>

    <!-- 子题列表结束 -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { renderMarkdown } from '../utils/markdown'
import type { Question, SubAnswer, AppMode } from '../types'

const props = withDefaults(
  defineProps<{
    question: Question
    questionNumber: number
    totalQuestions: number
    disabled: boolean
    subResults?: Map<number, SubAnswer>
    showResults: boolean
    appMode: AppMode
  }>(),
  {
    disabled: false,
    showResults: false,
  },
)

const emit = defineEmits<{
  (e: 'submit', subAnswers: Map<number, SubAnswer>): void
  (e: 'submit-sub', subId: number, userAnswer: string): void
}>()

// 子题用户输入（内部状态）
const userAnswers = ref(new Map<number, string>())

// 当 showResults 或 disabled 变化时重置
watch(
  () => props.showResults,
  (newVal) => {
    if (!newVal) {
      userAnswers.value = new Map()
    }
  },
)

const isScenarioMarkdown = computed(() => props.question.scenarioFormat === 'markdown')

const renderedScenario = computed(() => {
  if (!isScenarioMarkdown.value || !props.question.scenario) return ''
  return renderMarkdown(props.question.scenario)
})

function isSubMarkdown(sub: { answerFormat?: string }): boolean {
  return sub.answerFormat === 'markdown' || props.question.answerFormat === 'markdown'
}

function getRenderedSubAnswer(sub: { answer: string; answerFormat?: string }): string {
  if (!isSubMarkdown(sub)) return ''
  return renderMarkdown(sub.answer)
}

function getSubResultClass(subId: number): string {
  if (!props.subResults) return ''
  const result = props.subResults.get(subId)
  if (!result) return ''
  return result.isCorrect ? 'sub-correct' : 'sub-incorrect'
}

function handleInput(subId: number, value: string) {
  userAnswers.value.set(subId, value)
  // 触发响应式更新
  userAnswers.value = new Map(userAnswers.value)
}

function handleSubmitSub(subId: number) {
  const userAnswer = (userAnswers.value.get(subId) || '').trim()
  if (!userAnswer) return
  emit('submit-sub', subId, userAnswer)
}
</script>

<style scoped>
.compound-question {
  margin-top: 10px;
}

/* 场景区块 */
.scenario-block {
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--color-bg-scenario);
  border: 1px solid var(--color-border-scenario);
  border-radius: 8px;
}
.scenario-title {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: var(--color-text-scenario-title);
}
.scenario-text {
  margin: 0;
  font-family: 'Fira Code', Consolas, Monaco, monospace;
  font-size: 0.88rem;
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--color-text-scenario-body);
}
.scenario-content.markdown-body {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-text-scenario-body);
}

/* 子题列表 */
.sub-questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sub-question-item {
  padding: 14px;
  border: 1px solid var(--color-border-surface);
  border-radius: 8px;
  background-color: var(--color-bg-surface);
  transition: border-color 0.2s;
}
.sub-question-item.sub-correct {
  border-color: var(--color-border-correct);
  background-color: var(--color-bg-sub-correct);
}
.sub-question-item.sub-incorrect {
  border-color: var(--color-border-incorrect);
  background-color: var(--color-bg-sub-incorrect);
}

.sub-question-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}
.sub-question-number {
  font-weight: 700;
  color: var(--color-text-sub-number);
  white-space: nowrap;
  font-size: 0.95rem;
}
.sub-question-text {
  flex: 1;
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.5;
}
.sub-badge {
  font-weight: 700;
  font-size: 1rem;
  white-space: nowrap;
}
.sub-badge.correct {
  color: var(--color-badge-correct);
}
.sub-badge.incorrect {
  color: var(--color-badge-incorrect);
}

/* 输入区 */
.sub-textarea {
  width: 100%;
  padding: 10px 12px;
  font-family: 'Fira Code', Consolas, Monaco, monospace;
  font-size: 0.88rem;
  line-height: 1.5;
  border: 1px solid var(--color-border-input);
  border-radius: 6px;
  resize: vertical;
  box-sizing: border-box;
  background-color: var(--color-bg-input);
  color: var(--color-text-input);
}
.sub-textarea:focus {
  outline: none;
  border-color: var(--color-border-input-focus);
  box-shadow: 0 0 0 2px var(--color-shadow-input-focus);
}

/* 结果区 */
.sub-result-area {
  margin-top: 6px;
}
.sub-answer-text {
  margin: 0;
  padding: 10px 12px;
  background-color: var(--color-bg-sub-answer);
  border-radius: 6px;
  font-family: 'Fira Code', Consolas, Monaco, monospace;
  font-size: 0.88rem;
  line-height: 1.5;
  white-space: pre-wrap;
  color: var(--color-text-sub-answer);
  overflow-x: auto;
}

/* Markdown 答案块 */
.markdown-answer-block {
  margin: 6px 0;
  line-height: 1.6;
}
.markdown-answer-block :deep(pre) {
  margin: 8px 0;
  padding: 0;
  background: transparent;
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid var(--color-border-code-block);
}
.markdown-answer-block :deep(code.hljs) {
  display: block;
  padding: 10px 14px;
  font-family: 'Fira Code', Consolas, Monaco, monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  border-radius: 6px;
}
.markdown-answer-block :deep(code:not(.hljs)) {
  background-color: var(--color-bg-code-inline);
  padding: 2px 5px;
  border-radius: 3px;
  font-family: 'Fira Code', Consolas, Monaco, monospace;
  font-size: 0.9em;
}

/* 全局提交按钮 */
.compound-submit-btn {
  width: 100%;
  padding: 14px;
  margin-top: 20px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-btn-success);
  background-color: var(--color-bg-btn-success);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.compound-submit-btn:hover {
  background-color: var(--color-bg-btn-success-hover);
}
.compound-submit-btn:disabled {
  background-color: var(--color-bg-btn-success-disabled);
  cursor: not-allowed;
}

/* 逐题提交按钮 */
.sub-submit-btn {
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-btn-success);
  background-color: var(--color-bg-btn-success);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.sub-submit-btn:hover {
  background-color: var(--color-bg-btn-success-hover);
}
.sub-submit-btn:disabled {
  background-color: var(--color-bg-btn-success-disabled);
  cursor: not-allowed;
}
</style>
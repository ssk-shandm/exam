<template>
  <div id="result-container">
    <p id="result-text" :class="isCorrect ? 'correct' : 'incorrect'">
      {{ resultText }}
    </p>

    <div v-if="isMarkdownAnswer" class="markdown-answer-block">
      <p><strong>参考答案：</strong></p>
      <div v-html="renderedAnswer"></div>
    </div>

    <p id="explanation-text" v-if="explanation">
      {{ explanation }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'
import type { UserAnswer } from '../types'

const props = withDefaults(
  defineProps<{
    isCorrect: boolean
    correctAnswer: string
    explanation: string
    userAnswer: UserAnswer
    answerFormat?: 'text' | 'markdown'
    codeLanguage?: string
  }>(),
  {
    isCorrect: false,
    answerFormat: undefined,
    codeLanguage: undefined,
  },
)

const isMarkdownAnswer = computed(() => {
  return props.answerFormat === 'markdown'
})

const renderedAnswer = computed(() => {
  if (!isMarkdownAnswer.value) return ''
  return renderMarkdown(props.correctAnswer)
})

const resultText = computed(() => {
  if (props.isCorrect) {
    return '回答正确！'
  }
  const formattedUserAnswer = Array.isArray(props.userAnswer)
    ? props.userAnswer.join(', ')
    : props.userAnswer

  // Markdown 答案不在错误消息中显示原始文本
  if (isMarkdownAnswer.value) {
    return `回答错误。正确答案见下方代码块。你的答案: ${formattedUserAnswer}`
  }
  return `回答错误。正确答案: ${props.correctAnswer}。你的答案: ${formattedUserAnswer}`
})
</script>

<style scoped>
#result-container {
  margin-top: 20px;
}
#result-container p {
  margin: 10px 0;
  padding: 10px;
  border-radius: 8px;
}
#explanation-text {
  background-color: var(--color-bg-explanation);
  border-left: 4px solid var(--color-border-surface);
  color: var(--color-text-secondary);
}
.correct {
  background-color: var(--color-bg-sub-correct);
  border-left: 4px solid var(--color-border-correct-left);
  color: var(--color-text-correct);
}
.incorrect {
  background-color: var(--color-bg-sub-incorrect);
  border-left: 4px solid var(--color-border-incorrect-left);
  color: var(--color-text-incorrect);
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

#next-btn {
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
#next-btn:hover {
  background-color: var(--color-bg-btn-primary-hover);
}
</style>
<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div
        v-if="toasts.length > 0"
        ref="overlayRef"
        class="toast-overlay"
        tabindex="-1"
        @click.self="dismissTop"
        @keydown.enter.prevent="dismissTop"
      >
        <TransitionGroup name="toast-pop">
          <div
            v-for="t in toasts"
            :key="t.id"
            class="toast-box"
          >
            <p class="toast-msg">{{ t.message }}</p>
            <div class="toast-actions" v-if="t.isConfirm">
              <button class="toast-btn toast-cancel" @click.stop="dismiss(t.id)">取消</button>
              <button class="toast-btn toast-ok" @click.stop="confirm(t.id)">确定</button>
            </div>
            <button v-else class="toast-btn toast-ok toast-sole" @click.stop="dismiss(t.id)">确定</button>
          </div>
        </TransitionGroup>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToastList, dismissToast, confirmToast } from '../composables/useToast'

const toasts = useToastList()
const overlayRef = ref<HTMLElement | null>(null)

// 当 toast 出现时自动聚焦遮罩层，以便键盘事件（如 Enter 关闭）能生效
watch(() => toasts.value.length, (len) => {
  if (len > 0) {
    setTimeout(() => overlayRef.value?.focus(), 0)
  }
})

function dismiss(id: number) {
  dismissToast(id)
}

function confirm(id: number) {
  confirmToast(id)
}

function dismissTop() {
  if (toasts.value.length > 0) {
    dismissToast(toasts.value[toasts.value.length - 1].id)
  }
}
</script>

<style scoped>
.toast-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.toast-box {
  background: var(--color-bg-container, #fff);
  border-radius: 12px;
  padding: 28px 32px 20px;
  max-width: 420px;
  width: 85%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  text-align: center;
}

.toast-msg {
  margin: 0 0 20px;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-primary, #333);
  white-space: pre-wrap;
}

.toast-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.toast-btn {
  padding: 10px 32px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.toast-btn:hover {
  transform: translateY(-1px);
}

.toast-ok {
  background: var(--color-bg-btn-primary, #4a90d9);
  color: var(--color-text-btn-primary, #fff);
}

.toast-cancel {
  background: var(--color-bg-btn-secondary, #e0e0e0);
  color: var(--color-text-btn-secondary, #666);
}

.toast-sole {
  min-width: 120px;
}

/* 动画 */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}

.toast-pop-enter-active {
  transition: all 0.25s ease-out;
}
.toast-pop-leave-active {
  transition: all 0.15s ease-in;
}
.toast-pop-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}
.toast-pop-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

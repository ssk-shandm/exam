import { ref, watch } from 'vue'

export function useDarkMode() {
  const isDarkMode = ref(localStorage.getItem('darkMode') === 'true')

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
    localStorage.setItem('darkMode', String(isDarkMode.value))
  }

  watch(
    isDarkMode,
    (newVal) => {
      document.body.classList.toggle('dark-mode', newVal)
    },
    { immediate: true },
  )

  return { isDarkMode, toggleDarkMode }
}

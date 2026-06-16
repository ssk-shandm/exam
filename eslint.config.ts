import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

/**
 * ESLint 配置文件
 *
 * 如需在 `.vue` 文件中支持除 `ts` 外的其他语言（如 `tsx`），请取消下方注释：
 * ```ts
 * // import { configureVueProject } from '@vue/eslint-config-typescript'
 * // configureVueProject({ scriptLangs: ['ts', 'tsx'] })
 * ```
 * 更多信息请参阅：https://github.com/vuejs/eslint-config-typescript/#advanced-setup
 */

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/scripts/**']),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,
)

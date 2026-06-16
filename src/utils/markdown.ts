import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import sql from 'highlight.js/lib/languages/sql'

// --- 注册 highlight.js 语言（集中管理，全局一次） ---
hljs.registerLanguage('java', java)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('sql', sql)
// 可按需添加更多语言：
// import python from 'highlight.js/lib/languages/python'
// hljs.registerLanguage('python', python)

// --- 配置 marked 使用 highlight.js 进行代码块语法高亮 ---
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value
      }
      // 未指定语言时自动检测
      return hljs.highlightAuto(code).value
    },
  }),
)

/**
 * 将 Markdown 字符串渲染为 HTML，代码块自动语法高亮。
 * 用于显示 answerFormat 为 'markdown' 的答案和解析。
 */
export function renderMarkdown(content: string): string {
  if (content == null) return ''
  try {
    return marked.parse(content) as string
  } catch (e) {
    console.error('Markdown 渲染失败:', e)
    return escapeHtml(content)
  }
}

/**
 * 去除 Markdown 格式标记，用于答案比对。
 * 去除：代码围栏、行内代码、粗体/斜体、标题、HTML 标签。
 */
export function stripMarkdown(text: string): string {
  if (text == null) return ''
  let result = text
  // 去除围栏代码块 (``` ... ```)
  result = result.replace(/```[\s\S]*?```/g, '')
  // 去除行内代码反引号
  result = result.replace(/`([^`]+)`/g, '$1')
  // 去除粗体 (**text**) 和斜体 (*text*)
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1')
  result = result.replace(/\*([^*]+)\*/g, '$1')
  // 去除 ATX 标题 (#, ##, 等)
  result = result.replace(/^#{1,6}\s+/gm, '')
  // 去除 HTML 标签
  result = result.replace(/<[^>]+>/g, '')
  return result.trim()
}

/**
 * 简单的 HTML 转义，防止 XSS。
 */
function escapeHtml(text: string): string {
  if (text == null || text === '') return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
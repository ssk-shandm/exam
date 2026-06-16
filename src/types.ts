/** 子题定义，用于复合题型的子题 */
export interface SubQuestion {
  id: number
  question: string
  answer: string
  /** 子题答案渲染格式，默认继承父级 answerFormat */
  answerFormat?: 'text' | 'markdown'
  /** 子题代码语言，默认继承父级 codeLanguage */
  codeLanguage?: string
}

/** 复合题单道子题的作答记录 */
export interface SubAnswer {
  userAnswer: string
  isCorrect: boolean | null
}

export interface Question {
  number: number
  type: string
  question: string
  options: Record<string, string>
  answer: string
  explanation: string
  /** 控制答案的渲染方式。'text' 为纯文本（默认），'markdown' 为 Markdown 渲染（支持代码块语法高亮）。 */
  answerFormat?: 'text' | 'markdown'
  /** 代码块默认编程语言，未指定时自动检测。仅在 answerFormat 为 'markdown' 时生效。 */
  codeLanguage?: string
  /** 共享场景/上下文（如表结构），仅复合题型使用 */
  scenario?: string
  /** 场景的渲染格式，默认 'text' */
  scenarioFormat?: 'text' | 'markdown'
  /** 子题列表，有此字段即为复合题型 */
  subQuestions?: SubQuestion[]
}

export type UserAnswer = string | string[] | null

export type AppMode = 'start' | 'practice' | 'endorse' | 'exam' | 'review' | 'wrong' | 'specialize'

/** 错题本中的一条记录（允许重复，按添加时间排序） */
export interface WrongQuestionEntry {
  id: number
  questionNumber: number
  bankFile: string
  addedAt: number
}

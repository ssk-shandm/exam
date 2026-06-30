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
  /**
   * 填空题多答案配置（单空可接受多个不同答案）。
   * 有此字段时，checkAnswer 会逐个匹配 accepts 中的值，任一匹配即算正确。
   * 无此字段时保持原有精确匹配逻辑，向后兼容。
   */
  answerDetail?: {
    /** 所有可接受的正确答案列表（大小写不敏感、忽略首尾空格） */
    accepts: string[]
  }
  /** 与题目关联的图片路径（相对于 public/ 目录）。如 ["/images/image1.png"] */
  images?: string[]
}

export type UserAnswer = string | string[] | null

export type AppMode = 'start' | 'practice' | 'endorse' | 'exam' | 'review' | 'wrong' | 'wrong-manage' | 'specialize'

/** 错题本中的一条记录（允许重复，按添加时间排序） */
export interface WrongQuestionEntry {
  id: number
  questionNumber: number
  bankFile: string
  addedAt: number
  /** 所属错题本 id，用于多错题本管理 */
  notebookId?: string
}

/** 错题本（可创建多个） */
export interface WrongNotebook {
  id: string
  name: string
  bankFile: string
  createdAt: number
}

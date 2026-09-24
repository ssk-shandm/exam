/**
 * 解析 作业详情.txt → 马克思主义原理.json
 * 文本格式来自 EduQBank 导出工具
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const inputPath = join(__dirname, '..', 'public', 'subjects', '作业详情.txt')
const outputPath = join(__dirname, '..', 'public', 'subjects', '马克思主义原理.json')

const text = readFileSync(inputPath, 'utf-8')

// 按 === 第N题 [题型] === 分割
const questionBlocks = text.split(/(?==== 第\d+题 \[.*?\] ===)/g).filter(s => s.startsWith('=== '))

const questions = []

for (const block of questionBlocks) {
  // 提取题号
  const numMatch = block.match(/=== 第(\d+)题 \[(.+?)\] ===/)
  if (!numMatch) continue
  const number = parseInt(numMatch[1])
  const rawType = numMatch[2].trim()

  // 标准化题型
  let type = rawType
  if (rawType.includes('单选')) type = '单选题'
  else if (rawType.includes('多选')) type = '多选题'
  else if (rawType.includes('判断')) type = '判断题'

  // 提取题目
  const questionMatch = block.match(/题目:\s*(.+?)(?:\n|$)/)
  if (!questionMatch) continue
  let question = questionMatch[1].trim()

  // 提取选项 (如果有)
  const options = {}
  const optionsSection = block.match(/选项:\n([\s\S]+?)(?=\n正确答案:)/)
  if (optionsSection) {
    let optText = optionsSection[1]
    // 按行解析选项
    const optLines = optText.split('\n')
    for (const line of optLines) {
      const optMatch = line.match(/^\s*([A-D])\.\s*(.+)/)
      if (optMatch) {
        let optContent = optMatch[2].trim()
        // 清除可能泄漏的题型标签 (如 "判断题" "多选题" 被追加到选项末尾)
        optContent = optContent.replace(/(?:判断题|多选题|单选题)$/, '').trim()
        // 处理 Q10 的选项 D 合并问题: "原因与结果D. 共性和个性的关系"
        optContent = optContent.replace(/[A-D]\.\s*/, '')
        options[optMatch[1]] = optContent
      }
    }
  }

  // 提取正确答案
  const answerMatch = block.match(/正确答案:\s*(.+?)(?:\n|$)/)
  if (!answerMatch) continue
  let answer = answerMatch[1].trim()
  // 清除尾部泄漏的标签
  answer = answer.replace(/(?:判断题|多选题|单选题)$/, '').trim()

  // 提取解析 (如果有)
  let explanation = ''
  const explMatch = block.match(/解析:\s*(.+?)(?:\n|$)/)
  if (explMatch) {
    explanation = explMatch[1].trim()
    // 清除尾部泄漏
    explanation = explanation.replace(/(?:判断题|多选题|单选题)$/, '').trim()
  }

  const q = { number, type, question, options, answer }
  if (explanation) q.explanation = explanation
  questions.push(q)
}

// 写入 JSON
writeFileSync(outputPath, JSON.stringify(questions, null, 2), 'utf-8')
console.log(`✅ 成功解析 ${questions.length} 道题 → ${outputPath}`)

// 打印统计
const types = {}
for (const q of questions) {
  types[q.type] = (types[q.type] || 0) + 1
}
console.log('📊 题型分布:', JSON.stringify(types, null, 2))

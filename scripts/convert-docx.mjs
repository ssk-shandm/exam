#!/usr/bin/env node
/**
 * docx → 题库 JSON 转换脚本
 *
 * 用法:
 *   node scripts/convert-docx.mjs "C:\path\to\题目.docx"
 *   node scripts/convert-docx.mjs "C:\path\to\题目.docx" --name "自定义题库名"
 *   node scripts/convert-docx.mjs "C:\path\to\题目.docx" --dry-run
 *
 * 输出:
 *   public/<题库名>.json              — 题库 JSON
 *   public/images/<题库名>_imageN.png — 配图（如有）
 *
 * 依赖: 系统需有 unzip 命令（Git Bash / WSL / macOS / Linux 均自带）
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, rmSync } from 'fs';
import { basename, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const IMAGES = join(PUBLIC, 'images');

// ── 参数解析 ──
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
用法: node scripts/convert-docx.mjs <docx文件路径> [选项]

选项:
  --name <名称>   题库显示名称（默认从文件名提取）
  --dry-run       仅预览，不写入文件
  --help          显示此帮助

示例:
  node scripts/convert-docx.mjs "D:\\计算机组成原理-练习题.docx"
  node scripts/convert-docx.mjs "D:\\计组.docx" --name "计算机组成原理"
  node scripts/convert-docx.mjs "D:\\计组.docx" --dry-run
  `);
  process.exit(0);
}

const docxPath = args[0];
if (!existsSync(docxPath)) {
  console.error('错误: 文件不存在 —', docxPath);
  process.exit(1);
}

const nameIdx = args.indexOf('--name');
const bankName = nameIdx !== -1 ? args[nameIdx + 1] : basename(docxPath).replace(/\.docx$/i, '');
const dryRun = args.includes('--dry-run');
const outputFile = join(PUBLIC, bankName + '.json');

// ── 提取段落文本 ──
function extractParagraphs(path) {
  const stdout = execSync(`unzip -p "${path}" word/document.xml`, {
    encoding: 'utf8', maxBuffer: 50 * 1024 * 1024,
  });
  const parts = stdout.split(/<w:p[ >]/);
  const paragraphs = [];
  for (const part of parts) {
    const matches = part.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (matches) {
      let text = '';
      for (const m of matches) text += m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '');
      if (text.trim()) paragraphs.push(text.trim());
    }
  }
  return paragraphs;
}

// ── 提取图片 ──
function extractImages(path) {
  const list = execSync(`unzip -l "${path}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const imageFiles = [];
  for (const line of list.split('\n')) {
    const m = line.match(/word\/media\/(image\d+\.\w+)/i);
    if (m) imageFiles.push(m[1]);
  }
  if (imageFiles.length === 0) return [];

  mkdirSync(IMAGES, { recursive: true });
  const prefix = bankName.replace(/[\\/:*?"<>|]/g, '_') + '_';
  const imgPaths = [];

  for (const img of imageFiles) {
    const destName = prefix + img;
    execSync(`unzip -o "${path}" "word/media/${img}" -d "${IMAGES}"`, {
      encoding: 'utf8', stdio: 'pipe',
    });
    const src = join(IMAGES, 'word', 'media', img);
    const dest = join(IMAGES, destName);
    if (existsSync(src)) {
      renameSync(src, dest);
      imgPaths.push('/images/' + destName);
    }
  }
  // 清理 unzip 产生的目录结构
  const wordDir = join(IMAGES, 'word');
  if (existsSync(wordDir)) {
    rmSync(wordDir, { recursive: true, force: true });
  }
  return imgPaths;
}

// ── 常量 ──
const SECTION_RE = /^[一二三四五六七八九十]+、(.+)。$/;
const TYPE_MAP = {
  '单项选择题': '单选题',
  '填空题': '填空题',
  '判断题': '判断题',
  '简答题': '简答题',
  '综合应用题': '综合应用题',
};
const NEW_Q_START = /^(给出|已知|设|某|若|采用|补充|解释|假定|假设|请|试|求|计算|设计|画出|说明|简述|为下图|有一个)/;
const IMG_KEYWORDS = ['下图', '下表', '以下所写', '如下图所示', '补充以下'];

// ── 选项提取 ──
function extractOptions(text) {
  const firstOption = text.search(/[A-H][\.．、）)]/);
  if (firstOption === -1) return { stem: text.trim(), options: {} };
  const stem = text.substring(0, firstOption).trim().replace(/（\s*）$/, '（ ）');
  const optText = text.substring(firstOption);
  const optRe = /([A-H])[\.．、）)]\s*([\s\S]*?)(?=[A-H][\.．、）)]|$)/g;
  const opts = {};
  let m;
  while ((m = optRe.exec(optText)) !== null) {
    opts[m[1]] = m[2].trim();
  }
  return { stem, options: opts };
}

// ── 综合题分组 ──
function groupComprehensive(paras) {
  const groups = [];
  let buf = [];
  for (const p of paras) {
    if (buf.length > 0 && NEW_Q_START.test(p)) {
      groups.push(buf);
      buf = [];
    }
    buf.push(p);
  }
  if (buf.length) groups.push(buf);
  return groups;
}

// ── 判断是否需要配图 ──
function needsImage(text) {
  return IMG_KEYWORDS.some(kw => text.includes(kw));
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

console.log(`📄 读取: ${docxPath}`);
const paragraphs = extractParagraphs(docxPath);

// 按 section 分组
const sections = [];
let currentSection = null;
for (const p of paragraphs) {
  const m = p.match(SECTION_RE);
  if (m) {
    if (currentSection) sections.push(currentSection);
    currentSection = { title: m[1], paras: [] };
  } else if (currentSection) {
    currentSection.paras.push(p);
  }
}
if (currentSection) sections.push(currentSection);

// 生成题目
const output = [];
let num = 1;
const imgNeeded = []; // 需要配图的题目在 output 中的索引

for (const sec of sections) {
  const type = TYPE_MAP[sec.title] || sec.title;
  const groups = type === '综合应用题'
    ? groupComprehensive(sec.paras)
    : sec.paras.map(p => [p]);

  for (const g of groups) {
    const combined = g.join('\n');
    const q = { number: num++, type, question: '', answer: '' };

    if (type === '单选题') {
      const { stem, options } = extractOptions(combined);
      q.question = stem || combined;
      q.options = options;
    } else {
      q.question = combined;
    }

    if (needsImage(combined)) imgNeeded.push({ idx: output.length, text: combined });
    output.push(q);
  }
}

// 提取并关联图片
console.log('🖼️  提取图片...');
const imgPaths = extractImages(docxPath);

if (imgPaths.length > 0 && imgNeeded.length > 0) {
  console.log(`   共 ${imgPaths.length} 张图片，${imgNeeded.length} 道读图题`);
  for (let i = 0; i < Math.min(imgPaths.length, imgNeeded.length); i++) {
    const { idx, text } = imgNeeded[i];
    output[idx].images = [imgPaths[i]];
    console.log(`   #${output[idx].number} ← ${imgPaths[i]}  (${text.substring(0, 30)}…)`);
  }
  if (imgPaths.length < imgNeeded.length) {
    console.warn(`   ⚠️  图片数量(${imgPaths.length})少于读图题数量(${imgNeeded.length})，后几道题未关联图片`);
  }
} else if (imgPaths.length > 0) {
  console.log(`   ⚠️  有 ${imgPaths.length} 张图片但未检测到读图题，图片未关联`);
  imgPaths.forEach(p => console.log(`     ${p}`));
}

// 统计
const stats = {};
for (const q of output) stats[q.type] = (stats[q.type] || 0) + 1;

if (dryRun) {
  console.log('\n🔍 [DRY RUN] 将生成:');
  console.log(`   文件: ${outputFile}`);
  console.log(`   题目: ${output.length} 题`);
  for (const [t, c] of Object.entries(stats)) console.log(`     ${t}: ${c}`);
  console.log('');
  process.exit(0);
}

// 写入 JSON
mkdirSync(PUBLIC, { recursive: true });
writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');
console.log(`\n✅ 已生成: ${outputFile}`);
console.log(`   共 ${output.length} 题`);
for (const [t, c] of Object.entries(stats)) console.log(`     ${t}: ${c}`);

// 打印注册提示
console.log(`\n📋 在 src/composables/useQuiz.ts 的 availableBanks 中添加:`);
console.log(`  { name: '${bankName}', file: '/${bankName}.json' },`);
console.log(`\n🎉 完成！刷新页面即可看到新题库。\n`);

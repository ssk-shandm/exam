/**
 * 解析软工docx文档 → JSON（含图片）
 * 修复了选项解析和简答题编号问题
 */
import mammoth from "mammoth";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const DOCX_PATH = "E:/CODE/Vue/exam/public/subjects/软工题目与知识点汇总.(2).docx";
const OUTPUT_DIR = "E:/CODE/Vue/exam/public/subjects";
const IMAGES_DIR = "E:/CODE/Vue/exam/public/subjects/images/软工";

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
} else {
  // 清理旧图片，确保每次运行只保留最新生成的
  for (const f of fs.readdirSync(IMAGES_DIR)) {
    if (f !== ".gitkeep") fs.unlinkSync(path.join(IMAGES_DIR, f));
  }
}

// ── 步骤1: 提取 HTML + 图片 ──────────────────────────
console.log("📄 步骤1: 提取 docx 内容...");
const result = await mammoth.convertToHtml({
  path: DOCX_PATH,
}, {
  convertImage: mammoth.images.imgElement((image) => {
    return image.read("base64").then((imageBuffer) => {
      const ext = image.contentType.split("/")[1] || "png";
      const safeExt = ext === "x-emf" ? "emf" : ext;
      const imageName = `image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
      const imagePath = path.join(IMAGES_DIR, imageName);
      fs.writeFileSync(imagePath, Buffer.from(imageBuffer, "base64"));
      return { src: `/subjects/images/软工/${imageName}`, alt: imageName };
    });
  }),
});

const html = result.value;
fs.writeFileSync(path.join(OUTPUT_DIR, "软工_debug.html"), html);
console.log(`   HTML: ${html.length}B`);

// ── 步骤2: 遍历 body 子节点 ──────────────────────────
const $ = cheerio.load(html);
const children = $("body").children().toArray();

// ── 辅助 ──
const secTitleRe = /^[一二三四五]\.\s*(单选题|判断题|填空题|简答题|综合题)/;
const extractSec = (t) => { const m = t.match(secTitleRe); return m ? m[1] : null; };
const qStartRe = /^(\d+)[\.\、]/;
const extractNum = (t) => { const m = t.match(qStartRe); return m ? parseInt(m[1]) : 0; };

/** 从选项行原始HTML中解析选项: 先去掉HTML标签，再按\t分割，再匹配 A、xxx */
function parseOpts(rawHtml) {
  const opts = {};
  // 去掉HTML标签，保留文本和制表符
  const clean = rawHtml.replace(/<[^>]*>/g, "");
  // 按制表符分割
  const parts = clean.split(/\t+/).filter(p => p.trim());
  for (const p of parts) {
    const m = p.match(/^([A-D])[、．.]\s*(.*)/);
    if (m) opts[m[1]] = m[2].trim();
  }
  return opts;
}

// ── 步骤3: 主循环 ──────────────────────────────────
const questions = [];
let section = null;
let q = null;
let pendingImgs = [];
let inKnowledge = false;
const knowledge = [];
let fillAnswers = [];

function pushQ() {
  if (q) { questions.push(q); q = null; }
}

for (const el of children) {
  const tag = (el.tagName || "").toLowerCase();
  const $el = $(el);
  const text = $el.text().replace(/\s+/g, " ").trim();
  const inner = $.html(el) || "";
  const raw = $el.html() || "";

  // 块内图片
  const imgs = [];
  $el.find("img").each((_, img) => imgs.push($(img).attr("src") || ""));
  if (tag === "img") imgs.push($el.attr("src") || "");

  // ── 知识点边界 ──
  if (text.includes("软件工程知识点与内容")) {
    inKnowledge = true;
    pushQ();
    knowledge.push({ type: "title", text });
    continue;
  }
  if (inKnowledge) {
    let level = "other";
    if (/^项目/.test(text)) level = "project";
    else if (/^[（(][一二三四五六七八九十]+[)）]/.test(text)) level = "sub";
    else if (/^[（(]\d+[)）]/.test(text)) level = "item";
    else if (/总体要求/.test(text)) level = "overview";
    knowledge.push({ type: "knowledge", level, text });
    continue;
  }

  // ── 题型标题 ──
  const secM = text.match(secTitleRe);
  if (secM) {
    pushQ();
    section = secM[1];
    fillAnswers = [];
    continue;
  }

  // ── 填空题答案 <ol> ──
  if (tag === "ol" && section === "填空题") {
    pushQ(); // 确保所有填空题都已入队
    $(inner).find("li").each((_, li) => fillAnswers.push($(li).text().trim()));
    const fqs = questions.filter(x => x.type === "填空题");
    for (let j = 0; j < fillAnswers.length && j < fqs.length; j++) {
      if (!fqs[j].answer) fqs[j].answer = fillAnswers[j];
    }
    continue;
  }

  // ── 简答题的 <ol><li>（先push当前q） ──
  if (tag === "ol" && section === "简答题") {
    pushQ();
    $(inner).find("li").each((_, li) => {
      const t = $(li).text().trim();
      if (!t) return;
      const cnt = questions.filter(x => x.type === "简答题").length;
      questions.push({ number: cnt + 1, type: "简答题", question: t, images: [] });
    });
    continue;
  }

  // ── 综合题的表格也保留为文本 ──
  if (tag === "table" && section === "综合题") {
    if (q) {
      const tableText = $(el).text().replace(/\s+/g, " ").trim();
      q.question += "\n[表格] " + tableText;
    }
    continue;
  }

  // ── 图片 ──
  if (imgs.length) {
    if (q) {
      (q.images ??= []).push(...imgs);
    } else {
      pendingImgs.push(...imgs);
    }
    continue;
  }

  if (!text) continue;

  // ── 题目行 ──
  if (qStartRe.test(text) && !/^[A-D][、．.]/.test(text)) {
    pushQ();
    const num = extractNum(text);
    const body = text.replace(/^\d+[\.\、]\s*/, "").trim();
    q = {
      number: num,
      type: section || "未知",
      question: body,
      images: [...pendingImgs],
    };
    pendingImgs = [];
    continue;
  }

  // ── 选项行（单选 / 判断） ──
  if (/^[A-D][、．.]/.test(text) && q && (section === "单选题" || section === "判断题")) {
    (q.options ??= {});
    Object.assign(q.options, parseOpts(raw));
    continue;
  }

  // ── 综合题 / 简答题 续行 ──
  if (section === "综合题" || section === "简答题") {
    if (q) {
      q.question += "\n" + text;
    }
    continue;
  }

  // ── 其它续行 ──
  if (q) q.question += " " + text;
}

pushQ();

// ── 补充分配填空题答案 ──
// 按题号顺序分配
const fqs = questions.filter(x => x.type === "填空题").sort((a, b) => a.number - b.number);
for (let j = 0; j < fillAnswers.length && j < fqs.length; j++) {
  if (!fqs[j].answer) fqs[j].answer = fillAnswers[j];
}

// ── 知识点整理 ──
const projects = [];
let proj = null;
for (const item of knowledge) {
  if (item.level === "project") {
    if (proj) projects.push(proj);
    proj = { title: item.text, items: [] };
  } else if (item.level === "overview") {
    if (proj) proj.overview = item.text;
  } else if (proj) {
    proj.items.push(item.text);
  }
}
if (proj) projects.push(proj);

// 清理 question
for (const qq of questions) {
  qq.question = qq.question.replace(/^[\s\n]+/, "").replace(/[\s\n]+$/, "");
}

// ── 图片清单 ──
const imageFiles = fs.readdirSync(IMAGES_DIR)
  .filter(f => f !== ".gitkeep")
  .map(f => ({
    name: f,
    path: `/subjects/images/软工/${f}`,
    size: fs.statSync(path.join(IMAGES_DIR, f)).size,
  }));

// ── 输出 ──
const output = {
  title: "软工题库",
  questions,
  knowledge: projects,
  images: imageFiles,
  meta: {
    totalQuestions: questions.length,
    totalImages: imageFiles.length,
    generatedAt: new Date().toISOString(),
    source: path.basename(DOCX_PATH),
  },
};

const jsonPath = path.join(OUTPUT_DIR, "软工.json");
fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), "utf-8");
console.log(`\n✅ JSON: ${jsonPath}`);
console.log(`   题目: ${questions.length}, 图片: ${imageFiles.length}`);

const stats = {};
for (const qq of questions) stats[qq.type] = (stats[qq.type] || 0) + 1;
console.log("   分布:", JSON.stringify(stats));

for (const qq of questions) {
  const imgs = qq.images?.length ? ` 🖼${qq.images.length}` : "";
  const opts = qq.options ? ` [${Object.keys(qq.options).length}项]` : "";
  const ans = qq.answer ? ` → ${String(qq.answer).slice(0, 25)}` : "";
  console.log(`  ${qq.type} #${qq.number}: ${qq.question.slice(0, 45)}...${opts}${imgs}${ans}`);
}

console.log("\n✨ 完成!");

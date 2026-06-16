const fs = require('fs');

// Read the cleaned markdown file
const content = fs.readFileSync('database_clean.txt', 'utf-8');
const lines = content.split('\n');

// Find section boundaries
const sections = {};
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().replace(/\\-/g, '-');
    if (line.includes('一、选择题题库')) sections.choice_start = i;
    if (line.includes('二、填空题')) sections.fill_start = i;
    if (line.includes('三、判断题')) sections.tf_start = i;
    if (line.includes('四、ER图设计题')) sections.er_start = i;
    if (line.includes('五、SQL综合题')) sections.sql_start = i;
    if (line.includes('选择题参考答案')) sections.choice_ans_start = i;
    if (line.includes('判断题参考答案')) sections.tf_ans_start = i;
}

console.log('Sections:', JSON.stringify(sections));

// Helper: clean markdown bold markers
function clean(text) {
    return text.replace(/__/g, '').replace(/\\_/g, '_').replace(/\\\./g, '.').replace(/\\\*/g, '*').replace(/\\-/g, '-').trim();
}

// ============================================================
// PARSE CHOICE ANSWERS (选择题答案)
// ============================================================
const choiceAnswers = {};
const choiceAnsLines = lines.slice(sections.choice_ans_start, sections.tf_ans_start);

let currentOffset = 0;
for (let i = 0; i < choiceAnsLines.length; i++) {
    let line = choiceAnsLines[i].trim();
    // Normalize escaped hyphens
    const normalized = line.replace(/\\-/g, '-');

    // Check for group headers
    if (normalized.includes('1-20 题')) currentOffset = 0;
    else if (normalized.includes('21-40 题')) currentOffset = 20;
    else if (normalized.includes('41-60 题')) currentOffset = 40;
    else if (normalized.includes('61-80 题')) currentOffset = 60;

    // Match answer lines like "1. __答案：D 解析：..." or "14. __答案：B 解析：..."
    const ansMatch = line.match(/^(\d+)\.\s*__答案：([A-D])/);
    if (ansMatch) {
        const num = parseInt(ansMatch[1]) + currentOffset;
        choiceAnswers[num] = ansMatch[2];
    }
}

console.log('Parsed choice answers:', Object.keys(choiceAnswers).length);

// ============================================================
// PARSE TRUE/FALSE ANSWERS (判断题答案)
// ============================================================
const tfAnswers = {};

// Find the end of TF answers (before ER图设计题参考答案)
let tfAnsEnd = lines.length;
for (let i = sections.tf_ans_start + 1; i < lines.length; i++) {
    if (lines[i].trim().includes('ER图设计题参考答案')) {
        tfAnsEnd = i;
        break;
    }
}

// Join all TF answer lines
const tfAnsLines = lines.slice(sections.tf_ans_start, tfAnsEnd);
const tfAnsText = tfAnsLines.join(' ');

// The text has format: __1\.√  2\.×（...） 3\.√  ...__
// Match: digit + backslash + dot + √ or ×
const tfPattern = /(\d+)\\.([√×])/g;
let tfMatch;
while ((tfMatch = tfPattern.exec(tfAnsText)) !== null) {
    const num = parseInt(tfMatch[1]);
    const val = tfMatch[2] === '√' ? '对' : '错';
    tfAnswers[num] = val;
}

console.log('Parsed TF answers:', Object.keys(tfAnswers).length);

// ============================================================
// PARSE FILL-IN-THE-BLANK ANSWERS (填空题答案)
// ============================================================
const fillAnswers = {};

// Find the fill answer section start
let fillAnsStart = -1;
for (let i = sections.choice_ans_start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^\d+\.\s*__填空题__$/)) {
        fillAnsStart = i;
        break;
    }
}

if (fillAnsStart >= 0) {
    for (let i = fillAnsStart; i < Math.min(fillAnsStart + 70, lines.length); i++) {
        const line = lines[i].trim();
        const ansMatch = line.match(/^(\d+)\.\s*__答案：(.+?)__/);
        if (ansMatch) {
            const ansNum = parseInt(ansMatch[1]);
            const qNum = ansNum - 21; // answer 22 -> question 1
            if (qNum >= 1 && qNum <= 60) {
                fillAnswers[qNum] = clean(ansMatch[2]).replace(/（[^）]*）$/, '').trim();
            }
        }
    }
}

console.log('Parsed fill answers:', Object.keys(fillAnswers).length);

// ============================================================
// PARSE CHOICE QUESTIONS (选择题)
// ============================================================
const choiceQuestions = [];
const choiceLines = lines.slice(sections.choice_start + 1, sections.fill_start);

let questionNum = 0;
let i = 0;

function extractInlineOpts(text) {
    // Extract inline options like "A.xxx  B.xxx  C.xxx  D.xxx"
    const opts = {};
    // Match A.xxx, B.xxx, C.xxx, D.xxx patterns (with escaped dots)
    const pattern = /([A-D])\\\.\s*([^A-D]+?)(?=\s*[A-D]\\\.|$)/g;
    let m;
    while ((m = pattern.exec(text)) !== null) {
        opts[m[1]] = clean(m[2]);
    }
    return opts;
}

function isInlineOptsLine(text) {
    // Check if a line is purely inline options (starts with letter option)
    // e.g., "A.xxx  B.xxx  C.xxx  D.xxx" or "__A.xxx  B.xxx..."
    const t = text.replace(/__/g, '');
    return /^[A-D]\\\./.test(t);
}

while (i < choiceLines.length) {
    let line = choiceLines[i].trim();
    if (!line) { i++; continue; }

    // Skip section headers like "数据库基础概念（1～10题）"
    if (line.includes('～') && line.includes('题')) { i++; continue; }

    // Check if it's a question line (starts with a number followed by . or 、)
    const qMatch = line.match(/^(\d+)[\.\、]\s*(.+)/);
    if (!qMatch) { i++; continue; }

    const lineText = qMatch[2];

    // Look ahead to collect potential option lines
    let lookAhead = i + 1;
    let followingLines = [];
    while (lookAhead < choiceLines.length) {
        const nl = choiceLines[lookAhead].trim();
        if (!nl) { lookAhead++; continue; }
        if (/^\d+[\.\、]/.test(nl)) {
            followingLines.push(nl);
            if (followingLines.length >= 4) break;
        } else {
            break;
        }
        lookAhead++;
    }

    // Check if following lines are sequential numbered options (1., 2., 3., 4.)
    let hasNumberedOpts = false;
    if (followingLines.length >= 4) {
        const nums = followingLines.map(l => {
            const m = l.match(/^(\d+)[\.\、]/);
            return m ? parseInt(m[1]) : -1;
        });
        if (nums[0] === 1 && nums[1] === 2 && nums[2] === 3 && nums[3] === 4) {
            hasNumberedOpts = true;
        }
    }

    if (hasNumberedOpts) {
        // This is a question with separate numbered option lines
        questionNum++;
        let questionText = clean(lineText);
        let options = {};
        const labels = ['A', 'B', 'C', 'D'];

        for (let j = 0; j < 4; j++) {
            const optMatch = followingLines[j].match(/^\d+\.\s*__(.*?)__\s*$/);
            if (optMatch) {
                options[labels[j]] = clean(optMatch[1]);
            }
        }

        const answer = choiceAnswers[questionNum] || '';
        choiceQuestions.push({
            number: questionNum,
            type: '单选题',
            question: questionText,
            options: options,
            answer: answer
        });
        i = lookAhead + 1;
        continue;
    }

    // Check if the current line is actually an inline options line (A.xxx B.xxx C.xxx D.xxx)
    // If so, this belongs to the previous question - skip it
    if (isInlineOptsLine(line)) {
        i++;
        continue;
    }

    // Check if the first following line is an inline options line
    let hasInlineOpts = false;
    let inlineOpts = {};
    if (followingLines.length > 0 && isInlineOptsLine(followingLines[0])) {
        inlineOpts = extractInlineOpts(followingLines[0]);
        hasInlineOpts = Object.keys(inlineOpts).length > 0;
        if (hasInlineOpts) {
            i++; // skip the inline options line
        }
    }

    // Also check for inline options in the question text itself
    if (!hasInlineOpts) {
        inlineOpts = extractInlineOpts(lineText);
        if (Object.keys(inlineOpts).length > 0) {
            hasInlineOpts = true;
        }
    }

    // This is a question (possibly with inline options)
    questionNum++;
    let questionText = clean(lineText);
    let options = inlineOpts;

    // If we have inline options in the question text, remove them from the question
    if (Object.keys(options).length > 0 && extractInlineOpts(lineText).length > 0) {
        // Remove trailing inline options
        questionText = questionText.replace(/\s*[A-D]\\\.\s*[^A-D]+$/, '').trim();
    }

    const answer = choiceAnswers[questionNum] || '';
    choiceQuestions.push({
        number: questionNum,
        type: '单选题',
        question: questionText,
        options: options,
        answer: answer
    });
    i++;
}

console.log('Parsed choice questions:', choiceQuestions.length);

// ============================================================
// PARSE TRUE/FALSE QUESTIONS (判断题)
// ============================================================
const tfQuestions = [];
const tfLines = lines.slice(sections.tf_start + 1, sections.er_start);

let tfNum = 0;
for (let i = 0; i < tfLines.length; i++) {
    let line = tfLines[i].trim();
    if (!line) continue;

    // Skip section headers like "数据库基础概念（1～10题）"
    if (line.includes('～') && line.includes('题')) continue;

    // Match question lines
    // Format: "__1. 数据库DB..." or "1. 数据库DB..."
    let qMatch = line.match(/^__(\d+)\\\.\s*(.+)__$/);
    if (!qMatch) {
        qMatch = line.match(/^(\d+)\\\.\s*(.+)$/);
    }
    if (!qMatch) continue;

    tfNum++;
    const questionText = clean(qMatch[2].replace(/__/g, ''));
    const answer = tfAnswers[tfNum] || '';
    tfQuestions.push({
        number: tfNum,
        type: '判断题',
        question: questionText,
        options: {},
        answer: answer
    });
}

console.log('Parsed TF questions:', tfQuestions.length);

// ============================================================
// PARSE FILL-IN-THE-BLANK QUESTIONS (填空题)
// ============================================================
const fillQuestions = [];
const fillLines = lines.slice(sections.fill_start + 1, sections.tf_start);

let fillNum = 0;
for (let i = 0; i < fillLines.length; i++) {
    let line = fillLines[i].trim();
    if (!line) continue;

    const qMatch = line.match(/^(\d+)[\.\、]\s*(.+)/);
    if (!qMatch) continue;

    fillNum++;
    const questionText = clean(qMatch[2]);
    const answer = fillAnswers[fillNum] || '';
    fillQuestions.push({
        number: fillNum,
        type: '填空题',
        question: questionText,
        options: {},
        answer: answer
    });
}

console.log('Parsed fill questions:', fillQuestions.length);

// ============================================================
// COMBINE ALL QUESTIONS
// ============================================================
const allQuestions = [...choiceQuestions, ...fillQuestions, ...tfQuestions];

// Re-number sequentially
allQuestions.forEach((q, idx) => {
    q.number = idx + 1;
});

console.log('Total questions:', allQuestions.length);

// Write output
fs.writeFileSync('public/数据库系统原理与应用.json', JSON.stringify(allQuestions, null, 2), 'utf-8');
console.log('Written to public/数据库系统原理与应用.json');

// Print samples
const cq = allQuestions.find(q => q.type === '单选题');
if (cq) console.log('\n--- Sample choice question ---\n' + JSON.stringify(cq, null, 2));
const fq = allQuestions.find(q => q.type === '填空题');
if (fq) console.log('\n--- Sample fill question ---\n' + JSON.stringify(fq, null, 2));
const tq = allQuestions.find(q => q.type === '判断题');
if (tq) console.log('\n--- Sample TF question ---\n' + JSON.stringify(tq, null, 2));

// Print stats
const types = {};
allQuestions.forEach(q => { types[q.type] = (types[q.type] || 0) + 1; });
console.log('\n=== Question type distribution ===');
console.log(types);
console.log('Questions with answers:', allQuestions.filter(q => q.answer).length);
console.log('Questions without answers:', allQuestions.filter(q => !q.answer).length);
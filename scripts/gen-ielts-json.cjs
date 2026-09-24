// 生成 剑桥雅思13-听力.json 的脚本 — 综合题版本（一个 Section 一个综合题）
const fs = require('fs')

const questions = []
let num = 0

function add(q) {
  num++
  questions.push({ number: num, ...q })
}

let subIdCounter = 0
function nextSubId() { return ++subIdCounter }

// ════════════════════════════════════════════════
// Section 1 · Cookery Classes (填空题 10空)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(),
    type: '填空题',
    question: `Cookery Classes 烹饪课程表格填空：

| Cookery Class | Focus | Other Information |
|---|---|---|
| The Food Studio | how to ______ and cook with seasonal products | small classes / also offers ______ classes / clients who return get a ______ discount |
| Bond's Cookery School | food that is ______ | includes recipes to strengthen your ______ / they have a free ______ every Thursday |
| The ______ Centre | mainly ______ food | located near the ______ / a special course in skills with a ______ is sometimes available |

（按顺序填入 10 个空，用中文分号 ；分隔）`,
    answer: 'choose；private；20%；healthy；bones；lecture；Arretsa；vegetarian；market；knife',
  })
  add({
    type: '综合题',
    question: 'Section 1 · Cookery Classes',
    scenario: '听录音，完成下面的烹饪课程信息表格填空。',
    answer: '',
    options: {},
    subQuestions: subs,
  })
}

// ════════════════════════════════════════════════
// Section 2 · Traffic Changes in Granford (单选题 11-13)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '单选题',
    question: 'Why are changes needed to traffic systems in Granford?',
    options: { A: 'The number of traffic accidents has risen.', B: 'The amount of traffic on the roads has increased.', C: 'The types of vehicles on the roads have changed.' },
    answer: 'B',
  })
  subs.push({
    id: nextSubId(), type: '单选题',
    question: 'In a survey, local residents particularly complained about',
    options: { A: 'dangerous driving by parents.', B: 'pollution from trucks and lorries.', C: 'inconvenience from parked cars.' },
    answer: 'C',
  })
  subs.push({
    id: nextSubId(), type: '单选题',
    question: 'According to the speaker, one problem with the new regulations will be',
    options: { A: 'raising money to pay for them.', B: 'finding a way to make people follow them.', C: 'getting the support of the police.' },
    answer: 'B',
  })
  add({
    type: '综合题',
    question: 'Section 2 · Traffic Changes in Granford',
    scenario: '听关于 Granford 交通变化的录音，回答以下单选题。',
    answer: '', options: {}, subQuestions: subs,
  })
}

// ════════════════════════════════════════════════
// Section 3 · Volunteering (单选 11-16, 多选 17-20)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({ id: nextSubId(), type: '单选题', question: 'How much time for volunteering does the company allow per employee?', options: { A: 'two hours per week', B: 'one day per month', C: '8 hours per year' }, answer: 'C' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'In feedback almost all employees said that volunteering improved their', options: { A: 'chances of promotion.', B: 'job satisfaction.', C: 'relationships with colleagues.' }, answer: 'B' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'Last year some staff helped unemployed people with their', options: { A: 'literacy skills.', B: 'job applications.', C: 'communication skills.' }, answer: 'C' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'This year the company will start a new volunteering project with a local', options: { A: 'school.', B: 'park.', C: 'charity.' }, answer: 'B' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'Where will the Digital Inclusion Day be held?', options: { A: "at the company's training facility", B: 'at a college', C: 'in a community centre' }, answer: 'B' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'What should staff do if they want to take part in the Digital Inclusion Day?', options: { A: 'fill in a form', B: 'attend a training workshop', C: 'get permission from their manager' }, answer: 'A' })
  subs.push({
    id: nextSubId(), type: '多选题',
    question: 'What TWO things are mentioned about the participants on the last Digital Inclusion Day?',
    options: { A: 'They were all over 70.', B: 'They never used their computer.', C: 'Their phones were mostly old-fashioned.', D: 'They only used their phones for making calls.', E: 'They initially showed little interest.' },
    answer: 'CE',
  })
  subs.push({
    id: nextSubId(), type: '多选题',
    question: 'What TWO activities on the last Digital Inclusion Day did participants describe as useful?',
    options: { A: 'learning to use tablets', B: 'communicating with family', C: 'shopping online', D: 'playing online games', E: 'sending emails' },
    answer: 'BD',
  })
  add({
    type: '综合题',
    question: 'Section 3 · Volunteering',
    scenario: '听关于公司志愿服务项目的录音，回答以下选择题。',
    answer: '', options: {}, subQuestions: subs,
  })
}

// ════════════════════════════════════════════════
// Section 4 · South City Cycling Club (填空题 10空)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `South City Cycling Club — 笔记填空（按顺序填入 10 个空，用中文分号 ；分隔）

Membership: Full membership costs $260; covers cycling and ______ all over Australia. Recreational membership costs $108. Cost includes club fee and ______. Club kit made by ______.

Training rides: Level B speed about ______ kph. Tuesdays 5:30 am meet at the ______; Thursdays 5:30 am meet at entrance to the ______.

Further info: Rides about 1.5 hours. Members often have ______ together. Not always ______ with the group. Check and print the ______ on website. Bikes must have ______.`,
    answer: 'races；insurance；Jerriz；25；stadium；park；coffee；leader；route；lights',
  })
  add({ type: '综合题', question: 'Section 4 · South City Cycling Club', scenario: '听关于南城自行车俱乐部的录音，完成笔记填空。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 5 · Moving to Banford City (填空题 10空)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `Moving to Banford City — 笔记填空（按顺序填入 10 个空，用中文分号 ；分隔）

Accommodation: Average rent £ ______ a month.
Transport: Linda travels to work by ______. Limited ______ in city centre. Trains to London every ______ minutes. Poor train service at ______.
Advantages: New ______ opened recently. ______ has excellent reputation. Good ______ on Bridge Street.
Meet Linda: On ______ after 5:30 pm. In the ______ opposite the station.`,
    answer: '850；bike；parking；30；weekend；cinema；Hospital；dentist；Thursday；cafe',
  })
  add({ type: '综合题', question: 'Section 5 · Moving to Banford City', scenario: '听关于搬到 Banford 城市的录音，完成笔记填空。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 6 · Physical Activities (匹配 11-16, 多选 17-20)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `匹配题 — Physical Activities：将运动与优势匹配（按 11-16 顺序填入字母，用中文分号 ；分隔）

11. using a gym — ?
12. running — ?
13. swimming — ?
14. cycling — ?
15. doing yoga — ?
16. training with a personal trainer — ?

优势选项：A. not dependent on season  B. enjoyable  C. low risk of injury  D. fitness level unimportant  F. fast result  G. motivating`,
    answer: 'F；D；A；B；C；G',
  })
  subs.push({
    id: nextSubId(), type: '多选题',
    question: 'For which TWO reasons does the speaker say people give up going to the gym?',
    options: { A: 'lack of time', B: 'loss of confidence', C: 'too much effort required', D: 'high costs', E: 'feeling less successful than others' },
    answer: 'BC',
  })
  subs.push({
    id: nextSubId(), type: '多选题',
    question: 'Which TWO pieces of advice does the speaker give for setting goals?',
    options: { A: 'write goals down', B: 'have achievable aims', C: 'set a time limit', D: 'give yourself rewards', E: 'challenge yourself' },
    answer: 'BD',
  })
  add({ type: '综合题', question: 'Section 6 · Physical Activities', scenario: '听关于体育运动的录音，完成匹配题和多选题。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 7 · Alex's Training (填空题 10空)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `Alex's Training — 笔记填空（按顺序填入 10 个空，用中文分号 ；分隔）

About the applicant: Alex did training in the ______ department. Didn't have a qualification from school in ______. Should have done the diploma in ______ skills. Youngest trainee was ______.

Benefits at JPNW: Trainees receive same amount of ______ as permanent staff. Go to ______ one day per month. Company is in a convenient ______.

Advice for interview: Don't wear ______. Don't be ______. Make sure you ______.`,
    answer: 'Finance；Maths；business；17；holiday；college；location；jeans；late；smile',
  })
  add({ type: '综合题', question: "Section 7 · Alex's Training", scenario: '听关于 Alex 培训经历的录音，完成笔记填空。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 8 · Cross-country Skiing (单选 11-16, 匹配 17-20)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({ id: nextSubId(), type: '单选题', question: 'Annie recommends that when cross-country skiing, the visitors should', options: { A: 'get away from the regular trails.', B: 'stop to enjoy views of the scenery.', C: 'go at a slow speed at the beginning.' }, answer: 'A' })
  subs.push({ id: nextSubId(), type: '单选题', question: "What does Annie tell the group about this afternoon's dog-sled trip?", options: { A: 'Those who want to can take part in a race.', B: 'Anyone has the chance to drive a team of dogs.', C: 'One group member will be chosen to lead the trail.' }, answer: 'B' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'What does Annie say about the team relay event?', options: { A: 'All participants receive a medal.', B: 'The course is 4 km long.', C: 'Each team is led by a teacher.' }, answer: 'A' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'On the snow-shoe trip, the visitors will', options: { A: 'visit an old gold mine.', B: 'learn about unusual flowers.', C: 'climb to the top of a mountain.' }, answer: 'C' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'The cost of accommodation in the mountain hut includes', options: { A: 'a supply of drinking water.', B: "transport of visitors' luggage.", C: 'cooked meals.' }, answer: 'A' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'If there is a storm while the visitors are in the hut, they should', options: { A: 'contact the bus driver.', B: 'wait until the weather improves.', C: 'use the emergency locator beacon.' }, answer: 'B' })
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `匹配题 — Mountain Trail：将步道与信息匹配（按 17-20 顺序填入字母，用中文分号 ；分隔）

17. Highland Trail — ?
18. Pine Trail — ?
19. Stony Trail — ?
20. Loser's Trail — ?

信息选项：A. good place to stop and rest  B. suitable for all abilities  C. involves crossing a river  D. demands a lot of skill  E. may be closed in bad weather  F. some very narrow section`,
    answer: 'B；D；A；E',
  })
  add({ type: '综合题', question: 'Section 8 · Cross-country Skiing', scenario: '听关于越野滑雪的录音，回答单选题和匹配题。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 9 · Crime Report Form (填空题 10空)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `Crime Report Form — 笔记填空（按顺序填入 10 个空，用中文分号 ；分隔）

Personal info: Nationality: ______. Reason for visit: business (to buy antique ______). Current address: ______ Apartments (No 15).

Details of theft: Items stolen — wallet with £______, and a ______. Date of theft: ______.

Time and place: Outside the ______ at about 4 pm. Suspects asked for the ______ then ran off. One had ______ hair.

Crime reference number: ______`,
    answer: 'Canadian；furniture；Park；250；phone；September 10；museum；time；blond；87954 82361',
  })
  add({ type: '综合题', question: 'Section 9 · Crime Report Form', scenario: '听犯罪报告表录音，完成笔记填空。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 10 · Apprenticeship (多选 11-14, 匹配 15-20)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '多选题',
    question: 'Which TWO pieces of advice for the first week of an apprenticeship does the manager give?',
    options: { A: 'get to know colleagues', B: 'learn from any mistakes', C: 'ask lots of questions', D: 'react positively to feedback', E: 'enjoy new challenges' },
    answer: 'AC',
  })
  subs.push({
    id: nextSubId(), type: '多选题',
    question: 'Which TWO things does the manager say mentors can help with?',
    options: { A: 'confidence-building', B: 'making career plans', C: 'completing difficult tasks', D: 'making a weekly timetable', E: 'reviewing progress' },
    answer: 'BE',
  })
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `匹配题 — Company Policy for Apprentices（按 15-20 顺序填入字母，用中文分号 ；分隔）

15. Using the internet — ?
16. Flexible working — ?
17. Booking holidays — ?
18. Working overtime — ?
19. Wearing trainers — ?
20. Bringing food to work — ?

选项：A. It is encouraged.  B. There are some restrictions.  C. It is against the rules.`,
    answer: 'B；B；C；A；A；C',
  })
  add({ type: '综合题', question: 'Section 10 · Apprenticeship', scenario: '听关于学徒制的录音，完成多选题和匹配题。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 11 · Total Health Clinic (填空题 10空)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `Total Health Clinic — 笔记填空（每空 ONE WORD AND/OR A NUMBER，按顺序填入 10 个空，用中文分号 ；分隔）

Personal info: Contact phone: ______. Date of birth: ______, 1992. Occupation: ______. Insurance: ______ Life Insurance.

Problem: Pain in left ______. Began ______ ago. Has taken painkillers and applied ice.

Sports: Belongs to a ______ club. Goes ______ regularly.

Medical history: Injured ______ last year. No allergies. No regular medication apart from ______.`,
    answer: '219 442 9785；October 10；manager；Cawley；knee；3 weeks；tennis；running；shoulder；vitamins',
  })
  add({ type: '综合题', question: 'Section 11 · Total Health Clinic', scenario: '听诊所病历录音，完成笔记填空。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 12 · Visit to Branley Castle (单选题 11-15)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({ id: nextSubId(), type: '单选题', question: 'Before Queen Elizabeth I visited the castle in 1576,', options: { A: 'repairs were carried out to the guest rooms.', B: 'a new building was constructed for her.', C: 'a fire damaged part of the main hall.' }, answer: 'B' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'In 1982, the castle was sold to', options: { A: 'the government.', B: 'the Fenys family.', C: 'an entertainment company.' }, answer: 'C' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'In some of the rooms, visitors can', options: { A: 'speak to experts on the history of the castle.', B: 'interact with actors dressed as famous characters.', C: 'see models of historical figures moving and talking.' }, answer: 'C' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'In the castle park, visitors can', options: { A: 'see an 800-year-old tree.', B: 'go to an art exhibition.', C: 'visit a small zoo.' }, answer: 'B' })
  subs.push({ id: nextSubId(), type: '单选题', question: 'At the end of the visit, the group will have', options: { A: 'afternoon tea in the conservatory.', B: "the chance to meet the castle's owners.", C: 'a photograph together on the Great Staircase.' }, answer: 'A' })
  add({ type: '综合题', question: 'Section 12 · Visit to Branley Castle', scenario: '听关于 Branley 城堡参观的录音，回答单选题。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 13 · Flanders Conference Hotel (填空题 10空)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `Flanders Conference Hotel — 笔记填空（按顺序填入 10 个空，用中文分号 ；分隔）

Conference: The ______ room for talks (projector and ______ available). Area for coffee and an ______. Free ______ throughout. Buffet lunch costs $______ per head.

Accommodation: Rooms cost $______ including breakfast.

Other: Spa and rooftop ______. Free shuttle to the ______.

Location: Wilby Street (near the ______). Near restaurants and many ______.`,
    answer: 'Tesla；microphone；exhibition；wifi；45；135；pool；airport；sea；clubs',
  })
  add({ type: '综合题', question: 'Section 13 · Flanders Conference Hotel', scenario: '听关于 Flanders 会议酒店的录音，完成笔记填空。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 14 · Volunteering (多选 11-14, 匹配 15-20)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '多选题',
    question: 'Which TWO activities that volunteers do are mentioned?',
    options: { A: 'decorating', B: 'cleaning', C: 'delivering meals', D: 'shopping', E: 'childcare' },
    answer: 'AE',
  })
  subs.push({
    id: nextSubId(), type: '多选题',
    question: 'Which TWO ways that volunteers can benefit from volunteering are mentioned?',
    options: { A: 'learning how to be a part of a team', B: 'having a sense of purpose', C: 'realizing how lucky they are', D: 'improved ability at time management', E: 'boosting their employment prospects' },
    answer: 'BE',
  })
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `匹配题 — Volunteers（按 15-20 顺序填入字母，用中文分号 ；分隔）

15. Habib — ?
16. Consuela — ?
17. Minh — ?
18. Tanya — ?
19. Alexei — ?
20. Juba — ?

选项：A. overcome physical difficulties  B. rediscover skills not used for a long time  C. improve communication skills  D. solve problems independently  E. escape isolation  F. remember past times  G. start a new hobby`,
    answer: 'F；A；E；G；D；C',
  })
  add({ type: '综合题', question: 'Section 14 · Volunteering', scenario: '听关于志愿服务的录音，完成多选题和匹配题。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 15 · Enquiry about Booking Hotel Room (填空 1-7, 匹配 8-10)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `Enquiry about Booking Hotel Room — 笔记填空（按 1-7 顺序填入 7 个空，用中文分号 ；分隔）

Adelphi Room: seats ______ for dining. See the ______ in pots on terrace. View of a group of ______.
Carlton Room: Has a ______. View of the lake.

Master of Ceremonies: Can give a ______ while people eat. Will provide ______ if problems.

Accommodation: In hotel rooms or ______.`,
    answer: '85；roses；trees；stage；speech；support；cabins',
  })
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `匹配题 — Hotel Facilities（按 8-10 顺序填入字母，用中文分号 ；分隔）

8. outdoor swimming pool — ?
9. gym — ?
10. tennis courts — ?

选项：A. included in cost of hiring room  B. available at extra charge  C. not available`,
    answer: 'C；A；B',
  })
  add({ type: '综合题', question: 'Section 15 · Enquiry about Booking Hotel Room', scenario: '听关于预订酒店场地的录音，完成填空和匹配题。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// Section 16 · Excursions (匹配 11-16, 多选 17-20)
// ════════════════════════════════════════════════
{
  const subs = []
  subs.push({
    id: nextSubId(), type: '填空题',
    question: `匹配题 — Excursions（按 11-16 顺序填入字母，用中文分号 ；分隔）

11. dolphin watching — ?
12. forest walk — ?
13. cycle trip — ?
14. local craft tour — ?
15. observatory trip — ?
16. horse riding — ?

选项：A. all downhill  B. suitable for beginners  C. only in good weather  D. food included  E. no charge  F. swimming possible  G. fully booked today`,
    answer: 'G；D；A；E；F；B',
  })
  subs.push({
    id: nextSubId(), type: '多选题',
    question: 'Which TWO things does the speaker say about the attraction called Musical Favourites?',
    options: { A: 'You pay extra for drinks.', B: 'You must book it in advance.', C: 'You get a reduction if you buy two tickets.', D: 'You can meet the performers.', E: 'You can take part in the show.' },
    answer: 'BD',
  })
  subs.push({
    id: nextSubId(), type: '多选题',
    question: 'Which TWO things does the speaker say about the Castle Feast?',
    options: { A: 'Visitors can dance after the meal.', B: 'There is a choice of food.', C: 'Visitors wear historical costume.', D: 'Knives and forks are not used.', E: 'The entertainment includes horse races.' },
    answer: 'AD',
  })
  add({ type: '综合题', question: 'Section 16 · Excursions', scenario: '听关于游览活动的录音，完成匹配题和多选题。', answer: '', options: {}, subQuestions: subs })
}

// ════════════════════════════════════════════════
// 输出
// ════════════════════════════════════════════════
const json = JSON.stringify(questions, null, 2)
fs.writeFileSync('public/subjects/剑桥雅思13-听力.json', json, 'utf-8')
console.log(`✅ 生成完成，共 ${questions.length} 个综合题`)

// 统计
let totalSubs = 0
const subTypes = {}
questions.forEach(q => {
  (q.subQuestions || []).forEach(s => {
    totalSubs++
    subTypes[s.type || '文本题'] = (subTypes[s.type || '文本题'] || 0) + 1
  })
})
console.log(`子题总数: ${totalSubs}`)
console.log('子题题型分布:', subTypes)

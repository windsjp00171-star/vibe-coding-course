/*
 * build_talk.js — 產生「AI 資安意識」講座用簡報（跟課程簡報不同：這是一場講座，不是一個單元）。
 * 執行：cd scripts && node build_talk.js
 * 輸出：teacher/talks/church-90.pptx（講師私人資料夾）
 *
 * 為什麼不共用 build_slides.js：那支是「把單元網頁轉成簡報」，版型跟著網頁段落走；
 * 講座的節奏是自己排的（含時間表與講者話術），兩者放在一起反而綁手綁腳。
 */
const path = require('path');
const PptxGenJS = require('pptxgenjs');
const QRCode = require('qrcode');

const OUT = path.join(__dirname, '..', 'teacher', 'talks', 'church-90.pptx');
const C = {
  night: '1E1B4B', brand: '4F46E5', brandSoft: 'EEF0FE', ink: '1C1B29', muted: '5D5B6E',
  paper: 'FFFFFF', panel: 'F6F5FB', amber: 'F59E0B', amberSoft: 'FEF3C7', danger: 'CC3B35',
  dangerSoft: 'FBE7E5', ok: '17835A', okSoft: 'E3F4EC', ice: 'C7D2FE', line: 'E4DFD5',
};
const FONT = 'Microsoft JhengHei';
const W = 13.333; const H = 7.5; const M = 0.7;

function fit(text, boxW, boxH, max, min = 12) {
  for (let size = max; size > min; size -= 1) {
    const perLine = Math.max(1, Math.floor((boxW * 72) / (size * 1.12)));
    const lines = String(text || '').split('\n').reduce((n, ln) => n + Math.max(1, Math.ceil([...ln].length / perLine)), 0);
    if (lines * size * 1.45 <= boxH * 72) return size;
  }
  return min;
}

const DEMO_URL = 'https://windsjp00171-star.github.io/vibe-coding-course/security.html';
const SITE_URL = 'https://windsjp00171-star.github.io/vibe-coding-course/';

// 投影幕上的網址現場打不動，旁邊放 QR code 讓大家用手機掃
const QR = {};
function addQR(slide, url, x, y, size, caption) {
  slide.addShape('roundRect', { x: x - 0.12, y: y - 0.12, w: size + 0.24, h: size + 0.62, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { type: 'none' } });
  slide.addImage({ data: QR[url], x, y, w: size, h: size });
  slide.addText(caption, { x: x - 0.12, y: y + size + 0.02, w: size + 0.24, h: 0.34, fontFace: FONT, fontSize: 10, bold: true, color: C.muted, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
}

async function main() {
const pres = new PptxGenJS();
pres.layout = 'LAYOUT_WIDE';
for (const url of [DEMO_URL, SITE_URL]) QR[url] = await QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: 'M' });

function head(s, kicker, title) {
  s.addText(kicker, { x: M, y: 0.45, w: 10, h: 0.3, fontFace: FONT, fontSize: 13, bold: true, color: C.brand, margin: 0, isTextBox: true });
  s.addText(title, { x: M, y: 0.8, w: W - M * 2, h: 0.9, fontFace: FONT, fontSize: fit(title, W - M * 2, 0.9, 34, 22), bold: true, color: C.ink, margin: 0, isTextBox: true });
}
function foot(s, label) {
  s.addText(`AI 資安意識．90 分鐘　｜　${label}`, { x: M, y: H - 0.5, w: 9, h: 0.3, fontFace: FONT, fontSize: 10, color: C.muted, margin: 0, isTextBox: true });
}

// ---------- 封面 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.night };
  s.addShape(pres.shapes.OVAL, { x: W - 4.5, y: -1.8, w: 6.4, h: 6.4, fill: { color: C.brand, transparency: 68 }, line: { type: 'none' } });
  s.addText('AI 資安意識．90 分鐘', { x: M, y: 1.2, w: 9, h: 0.5, fontFace: FONT, fontSize: 18, bold: true, color: C.amber, margin: 0, isTextBox: true });
  s.addText('那通電話裡的人，\n可能不是本人', { x: M, y: 1.9, w: 9.5, h: 2.6, fontFace: FONT, fontSize: 46, bold: true, color: 'FFFFFF', margin: 0, valign: 'top', isTextBox: true });
  s.addText('AI 讓變臉、變聲、偽造文件變得又便宜又像真的。\n今天不談技術，只談：遇到的時候，我們怎麼辦。',
    { x: M, y: 4.8, w: 9, h: 1.2, fontFace: FONT, fontSize: 17, color: C.ice, margin: 0, valign: 'top', isTextBox: true });
  s.addNotes('開場白：\n「今天不是要嚇大家，是要給大家一個簡單的習慣，遇到就不會慌。」\n先問：在座有沒有接過假冒親友的電話或訊息？舉手。（暖場，也讓大家知道這件事離自己很近）');
}

// ---------- 今天的流程 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.paper };
  head(s, '今天怎麼進行', '90 分鐘，三個段落');
  const rows = [
    ['0:00–0:05', '開場：為什麼今年不一樣'],
    ['0:05–0:25', '一起玩一次：視訊裡的指令（全場一起決定）'],
    ['0:25–0:40', '三種手法與五個警訊'],
    ['0:40–0:55', '兩道防線：回撥驗證、約定暗號'],
    ['0:55–1:05', '教會裡最常遇到的四種情況'],
    ['1:05–1:15', '萬一已經匯出去了，先做這四件事'],
    ['1:15–1:30', '同工留下：訂出我們的查核規則'],
  ];
  rows.forEach(([time, what], i) => {
    const y = 1.95 + i * 0.62;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y, w: 2.2, h: 0.5, rectRadius: 0.12, fill: { color: i === 6 ? C.amberSoft : C.brandSoft }, line: { type: 'none' } });
    s.addText(time, { x: M, y, w: 2.2, h: 0.5, fontFace: FONT, fontSize: 13, bold: true, color: i === 6 ? 'B45309' : C.brand, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(what, { x: M + 2.45, y, w: W - M * 2 - 2.45, h: 0.5, fontFace: FONT, fontSize: 16, color: C.ink, valign: 'middle', margin: 0, isTextBox: true });
  });
  foot(s, '流程');
  s.addNotes('說明：前 65 分鐘大家一起聽；最後 15 分鐘請同工留下來，把規則寫出來。\n會友可以先離開，但鼓勵留下來聽（因為家裡也用得到）。');
}

// ---------- 為什麼今年不一樣 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.paper };
  head(s, '為什麼今年不一樣', '以前靠「聽起來像本人」，現在不行了');
  const cards = [
    ['🎭 換臉視訊', '用公開的照片和影片，就能在通話中換成另一個人的臉。畫面小、網路卡的時候特別難分辨。'],
    ['🎙️ 複製聲音', '一段講話的錄音就夠。來源可能是語音訊息、直播、教會的影片。'],
    ['🪪 偽造文件', '假公文、假收據、跟官網幾乎一樣的假網頁，幾分鐘就做得出來，錯字不再是破綻。'],
  ];
  const cw = (W - M * 2 - 0.6) / 3;
  cards.forEach(([title, body], i) => {
    const x = M + i * (cw + 0.3);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.1, w: cw, h: 2.9, rectRadius: 0.18, fill: { color: C.panel }, line: { color: C.line, width: 0.75 } });
    s.addText(title, { x: x + 0.3, y: 2.4, w: cw - 0.6, h: 0.5, fontFace: FONT, fontSize: 21, bold: true, color: C.ink, margin: 0, isTextBox: true });
    s.addText(body, { x: x + 0.3, y: 3.0, w: cw - 0.6, h: 1.8, fontFace: FONT, fontSize: fit(body, cw - 0.6, 1.8, 16, 12), color: C.muted, margin: 0, valign: 'top', isTextBox: true });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 5.3, w: W - M * 2, h: 1.1, rectRadius: 0.15, fill: { color: C.dangerSoft }, line: { type: 'none' } });
  s.addText('共同點：這些手法不是攻擊系統，是攻擊「人會相信眼睛和耳朵」這件事。\n所以防線不在電腦，在每一個會經手金錢與名單的人身上。',
    { x: M + 0.35, y: 5.45, w: W - M * 2 - 0.7, h: 0.85, fontFace: FONT, fontSize: 15, bold: true, color: '8C2F26', margin: 0, valign: 'middle', isTextBox: true });
  foot(s, '手法');
  s.addNotes('不要花太多時間在技術細節。重點只有一句：像不像已經不是證據。\n可以補一句：「連我們自己的聲音，只要在群組傳過語音，就夠了。」');
}

// ---------- 模擬演練 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.paper };
  head(s, '一起玩一次', '週五下午，主管在視訊裡叫你匯款');
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 2.0, w: W - M * 2, h: 3.5, rectRadius: 0.25, fill: { color: C.amberSoft }, line: { type: 'none' } });
  s.addShape(pres.shapes.OVAL, { x: M + 0.7, y: 2.9, w: 1.7, h: 1.7, fill: { color: C.amber }, line: { type: 'none' } });
  s.addText('▶', { x: M + 0.7, y: 2.9, w: 1.7, h: 1.7, fontFace: 'Arial', fontSize: 44, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  s.addText('全場一起決定每一步', { x: M + 2.9, y: 2.7, w: 8.5, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: C.ink, margin: 0, isTextBox: true });
  s.addText('接到視訊 → 收到「先別跟別人講」的訊息 → 要不要匯？\n選錯了，畫面會告訴我們錢是怎麼出去的。',
    { x: M + 2.9, y: 3.4, w: 8.5, h: 1.2, fontFace: FONT, fontSize: 17, color: C.muted, margin: 0, valign: 'top', isTextBox: true });
  s.addText('windsjp00171-star.github.io/vibe-coding-course/security.html', { x: M + 2.9, y: 4.6, w: 6.6, h: 0.5, fontFace: 'Consolas', fontSize: 14, color: '3730A3', margin: 0, isTextBox: true });
  addQR(s, DEMO_URL, W - M - 2.1, 2.7, 1.9, '自己想玩一次就掃這裡');
  foot(s, '模擬演練');
  s.addNotes('操作：打開上面的網址，投影出來，全場舉手表決每一個選項再點。\n每個決策點停下來問：「如果這是我們教會，你會怎麼做？」\n重點台詞：第一關選「先不承諾」就對了——不用當場拆穿對方，只要不當場答應。');
}

// ---------- 五個警訊 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.paper };
  head(s, '怎麼判斷', '五個警訊，出現越多越可疑');
  const signals = [
    ['非常急，現在就要', '真正的急事，不怕你花三分鐘確認'],
    ['叫你先不要跟別人講', '最強的紅旗。正當的事不怕被知道'],
    ['不方便講電話，只能用訊息', '因為聲音或畫面經不起你主動打過去'],
    ['要匯款、改帳號、給驗證碼', '這四件事永遠要換管道確認'],
    ['搬出職位或身分壓你', '「我是誰誰誰」不是證據'],
  ];
  signals.forEach(([what, why], i) => {
    const y = 2.0 + i * 0.85;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y, w: W - M * 2, h: 0.72, rectRadius: 0.14, fill: { color: i === 1 ? C.dangerSoft : C.panel }, line: { type: 'none' } });
    s.addText(`${i + 1}`, { x: M + 0.25, y, w: 0.6, h: 0.72, fontFace: 'Arial', fontSize: 20, bold: true, color: i === 1 ? C.danger : C.brand, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(what, { x: M + 0.95, y, w: 5.2, h: 0.72, fontFace: FONT, fontSize: 18, bold: true, color: C.ink, valign: 'middle', margin: 0, isTextBox: true });
    s.addText(why, { x: M + 6.3, y, w: W - M * 2 - 6.5, h: 0.72, fontFace: FONT, fontSize: 14, color: C.muted, valign: 'middle', margin: 0, isTextBox: true });
  });
  foot(s, '警訊');
  s.addNotes('請大家回想自己接過的可疑電話，對照這五項。\n第 2 項（先別跟別人講）要特別強調，這是最可靠的判斷點。');
}

// ---------- 兩道防線 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.paper };
  head(s, '兩道防線', '不用會分辨假影片，也擋得住');
  const cards = [
    ['☎️ 第一道：回撥驗證', '用自己手機裡原本的號碼打回去確認。\n不要用對方給的號碼，也不要在原本那個視窗回覆。\n\n對方能偽造畫面和聲音，但偽造不了你通訊錄裡那個舊號碼的另一端。', C.brandSoft, C.brand],
    ['🔑 第二道：約定暗號', '事先和家人、和同工約一個只有彼此知道的問題。\n例如：「我們上次一起吃的那家店叫什麼？」\n\nAI 複製得了聲音和長相，複製不了共同的記憶。暗號不要放到網路上。', C.okSoft, C.ok],
  ];
  const cw = (W - M * 2 - 0.5) / 2;
  cards.forEach(([title, body, bg, accent], i) => {
    const x = M + i * (cw + 0.5);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.1, w: cw, h: 3.6, rectRadius: 0.2, fill: { color: bg }, line: { type: 'none' } });
    s.addText(title, { x: x + 0.4, y: 2.45, w: cw - 0.8, h: 0.6, fontFace: FONT, fontSize: 23, bold: true, color: accent, margin: 0, isTextBox: true });
    s.addText(body, { x: x + 0.4, y: 3.15, w: cw - 0.8, h: 2.3, fontFace: FONT, fontSize: fit(body, cw - 0.8, 2.3, 17, 12), color: C.ink, margin: 0, valign: 'top', isTextBox: true });
  });
  s.addText('今天回家就可以做的一件事：跟家人約一個暗號。', { x: M, y: 6.0, w: W - M * 2, h: 0.5, fontFace: FONT, fontSize: 18, bold: true, color: C.brand, align: 'center', margin: 0, isTextBox: true });
  foot(s, '防線');
  s.addNotes('這一頁是全場最重要的內容。講慢一點。\n可以現場請兩三位分享：你會跟誰約暗號？約什麼樣的問題比較好？（提示：要對方答得出來、但網路上查不到）');
}

// ---------- 教會常見情況 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.paper };
  head(s, '我們身邊', '教會裡最常遇到的四種情況');
  const cases = [
    ['冒充牧者或同工借錢', '「方便先幫我代墊嗎？我等等匯給你」——常見於 LINE 私訊，頭貼和名字都一樣。'],
    ['要求更改奉獻帳號', '假冒財務同工或廠商，通知「帳號換了」。金額通常不大，才不容易被懷疑。'],
    ['會友名冊、電話外流', '名冊一旦外流，詐騙會用「我是教會的○○」逐一打給長輩。'],
    ['假的奉獻連結或活動報名', '網頁做得跟真的一樣，只有網址不同。'],
  ];
  const cw = (W - M * 2 - 0.4) / 2;
  cases.forEach(([title, body], i) => {
    const x = M + (i % 2) * (cw + 0.4);
    const y = 2.1 + Math.floor(i / 2) * 2.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: 1.85, rectRadius: 0.16, fill: { color: C.panel }, line: { color: C.line, width: 0.75 } });
    s.addText(title, { x: x + 0.3, y: y + 0.2, w: cw - 0.6, h: 0.5, fontFace: FONT, fontSize: 19, bold: true, color: C.ink, margin: 0, isTextBox: true });
    s.addText(body, { x: x + 0.3, y: y + 0.75, w: cw - 0.6, h: 0.95, fontFace: FONT, fontSize: fit(body, cw - 0.6, 0.95, 15, 11), color: C.muted, margin: 0, valign: 'top', isTextBox: true });
  });
  s.addText('四種情況的處理方式都一樣：換一個管道確認，再決定。', { x: M, y: 6.3, w: W - M * 2, h: 0.5, fontFace: FONT, fontSize: 17, bold: true, color: C.brand, align: 'center', margin: 0, isTextBox: true });
  foot(s, '教會情境');
  s.addNotes('這一頁最容易引起共鳴，留點時間讓大家講自己遇過的。\n提醒：不要點名或影射特定會友的經驗。');
}

// ---------- 萬一中了 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.paper };
  head(s, '萬一已經匯出去了', '先止血，其他之後再說');
  const steps = [
    ['1', '打銀行客服辦圈存止付', '越快越有機會攔下來，先打再說'],
    ['2', '撥 165 反詐騙專線', '報案並取得受理紀錄'],
    ['3', '留下所有證據', '對話紀錄、通話時間、匯款單、對方帳號，不要刪'],
    ['4', '告訴身邊的人', '同一批人常會用同樣手法再打給你認識的人'],
  ];
  steps.forEach(([n, what, why], i) => {
    const y = 2.1 + i * 1.0;
    s.addShape(pres.shapes.OVAL, { x: M, y: y + 0.05, w: 0.8, h: 0.8, fill: { color: C.danger }, line: { type: 'none' } });
    s.addText(n, { x: M, y: y + 0.05, w: 0.8, h: 0.8, fontFace: 'Arial', fontSize: 22, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(what, { x: M + 1.1, y, w: 5.6, h: 0.5, fontFace: FONT, fontSize: 21, bold: true, color: C.ink, margin: 0, isTextBox: true });
    s.addText(why, { x: M + 1.1, y: y + 0.48, w: W - M * 2 - 1.1, h: 0.45, fontFace: FONT, fontSize: 14, color: C.muted, margin: 0, isTextBox: true });
  });
  s.addText('被騙不是笨。這類詐騙專挑配合度高、做事積極的人下手。越早說出來，越有機會追回來。',
    { x: M, y: 6.15, w: W - M * 2, h: 0.6, fontFace: FONT, fontSize: 16, bold: true, color: C.ok, align: 'center', margin: 0, isTextBox: true });
  foot(s, '事後處理');
  s.addNotes('語氣要溫和。教會場合尤其重要：讓中招的人敢說出來，比防範還重要。\n可以說：「如果今天有人心裡想到自己好像遇過，散會後來找我，我們一起處理。」');
}

// ---------- 同工工作坊 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.paper };
  head(s, '同工請留下（15 分鐘）', '訂出我們自己的查核規則');
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 2.0, w: W - M * 2, h: 3.9, rectRadius: 0.2, fill: { color: C.amberSoft }, line: { type: 'none' } });
  const items = [
    '哪些事情一定要雙重確認？（建議：奉獻帳號變更、代墊款、給密碼或驗證碼）',
    '超過多少金額要第二個人核可？由誰核可？',
    '收到「很急、先別說」的訊息時，統一怎麼回應？',
    '誰負責保管會友名冊？可以給誰？',
    '寫好之後貼在哪裡，新同工怎麼知道？',
  ];
  items.forEach((t, i) => {
    s.addText(`${i + 1}.　${t}`, { x: M + 0.5, y: 2.4 + i * 0.68, w: W - M * 2 - 1.0, h: 0.6, fontFace: FONT, fontSize: 17, color: '7A5510', margin: 0, valign: 'middle', isTextBox: true });
  });
  s.addText('產出：一張大家都同意、可以公告的查核規則。', { x: M, y: 6.2, w: W - M * 2, h: 0.5, fontFace: FONT, fontSize: 17, bold: true, color: C.brand, align: 'center', margin: 0, isTextBox: true });
  foot(s, '同工工作坊');
  s.addNotes('分兩三組討論 8 分鐘，各組念出來，其他人挑漏洞 5 分鐘，最後彙整。\n網站上有規則產生器可以直接產生文字：security.html 的同一套工具在課程單元 19。\n重點：規則要寫「延遲造成的損失由規則承擔，不追究承辦人」，同工才敢拒絕。');
}

// ---------- 結尾 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.night };
  s.addText('今天帶走三件事', { x: M, y: 1.3, w: 10, h: 0.8, fontFace: FONT, fontSize: 34, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true });
  const takeaways = [
    '像不像本人，已經不是證據',
    '會阻止你確認的，就是詐騙',
    '今天回家，跟家人約一個暗號',
  ];
  takeaways.forEach((t, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 2.5 + i * 1.1, w: W - M * 2, h: 0.85, rectRadius: 0.16, fill: { color: 'FFFFFF', transparency: 88 }, line: { type: 'none' } });
    s.addText(`${i + 1}　${t}`, { x: M + 0.5, y: 2.5 + i * 1.1, w: W - M * 2 - 1, h: 0.85, fontFace: FONT, fontSize: 22, bold: true, color: 'FFFFFF', valign: 'middle', margin: 0, isTextBox: true });
  });
  s.addText('反詐騙專線 165　｜　想更進一步：windsjp00171-star.github.io/vibe-coding-course/',
    { x: M, y: 6.2, w: 8.6, h: 0.5, fontFace: FONT, fontSize: 14, color: C.ice, margin: 0, isTextBox: true });
  addQR(s, SITE_URL, W - M - 2.1, 2.6, 1.9, '課程網站');
  s.addNotes('收尾：請大家現在就拿出手機，傳訊息給家人約暗號——當場做完，回家才不會忘。\n如果有同工想把這套帶回自己的機構，網站上有完整教材。');
}

await pres.writeFile({ fileName: OUT });
console.log('已產生', OUT);
}

main();

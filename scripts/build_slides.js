/*
 * build_slides.js — 從 teacher/slides/content.json 產生每個單元一份 .pptx。
 * 先跑 python scripts/extract_slides.py，再跑 node scripts/build_slides.js。
 * 講者備忘稿含講師提示與測驗答案，所以輸出在私人的 teacher/slides/ 資料夾。
 */
const fs = require('fs');
const path = require('path');
const PptxGenJS = require('./node_modules/pptxgenjs');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'teacher', 'slides');
const SITE = 'https://windsjp00171-star.github.io/vibe-coding-course';
const CONTENT = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'content.json'), 'utf8'));
// 課程地圖上的正式單元名稱：直接讀 core.js 的 MODULES，避免兩處名稱不一致
const CORE = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'core.js'), 'utf8');
const TITLES = Object.fromEntries([...CORE.matchAll(/id: '(m\d+)'[^}]*?title: '([^']+)'/g)].map((m) => [m[1], m[2]]));
const courseTitle = (id) => TITLES[id] || id;

// ---------- 設計 token（與網站一致：靛藍主色、深色封面、白色內容頁） ----------
const C = {
  night: '1E1B4B', brand: '4F46E5', brandSoft: 'EEF0FE', brandInk: '3730A3',
  ink: '1C1B29', muted: '5D5B6E', line: 'E4DFD5', paper: 'FFFFFF', panel: 'F6F5FB',
  amber: 'F59E0B', amberSoft: 'FEF3C7', purple: '7C3AED', purpleSoft: 'F3ECFF',
  ok: '17835A', okSoft: 'E3F4EC', danger: 'CC3B35', ice: 'C7D2FE',
};
const FONT = 'Microsoft JhengHei';
const MONO = 'Consolas';
const W = 13.333; const H = 7.5; const M = 0.6;
const QUIZ_ON_SLIDES = 3; // 課堂提問放前 3 題，完整測驗在網站與 Kahoot

// ---------- 小工具 ----------
const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || '');
// 內容一律不截斷：放不下就分頁
const chunk = (list, size) => (list.length ? Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size)) : [[]]);
// 表格：用最長的一格反推塞得下的字級
function fitCell(chars, cellW, cellH, max, min = 9) {
  for (let size = max; size > min; size -= 1) {
    const perLine = Math.max(1, Math.floor((cellW * 72) / (size * 1.12)));
    if (Math.ceil(chars / perLine) * size * 1.45 <= cellH * 72) return size;
  }
  return min;
}
// 中文字寬約等於字級，用字數估算字級，避免文字超出框
function fitSize(textValue, boxW, boxH, max, min = 11) {
  for (let size = max; size > min; size -= 1) {
    const perLine = Math.max(1, Math.floor((boxW * 72) / (size * 1.12))); // 全形標點比一般字寬，估寬一點
    const lines = (textValue || '').split('\n').reduce((n, ln) => n + Math.max(1, Math.ceil([...ln].length / perLine)), 0);
    if (lines * size * 1.45 <= boxH * 72) return size;
  }
  return min;
}
function notesFor(mod, slots) {
  return slots.map((s) => mod.notes[s]).filter(Boolean).join('\n\n');
}
function sectionUrl(mod, sec) { return `${SITE}/${mod.file}${sec && sec.id ? `#${sec.id}` : ''}`; }

function header(slide, sec, color = C.brand) {
  slide.addText(sec.num || '', { x: M, y: 0.35, w: 1.4, h: 0.9, fontFace: 'Arial', fontSize: 44, bold: true, color: 'A5B4FC', margin: 0, isTextBox: true });
  slide.addText(sec.kicker || '', { x: M + 1.3, y: 0.42, w: 8, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color, margin: 0, isTextBox: true });
  slide.addText(sec.title, { x: M + 1.3, y: 0.7, w: W - M * 2 - 1.3, h: 0.7, fontFace: FONT, fontSize: fitSize(sec.title, W - M * 2 - 1.3, 0.7, 30, 20), bold: true, color: C.ink, margin: 0, isTextBox: true });
}

function footer(slide, mod, page) {
  slide.addText(`${clip(mod.eyebrow, 30)}　｜　${page}`, { x: M, y: H - 0.45, w: 8, h: 0.3, fontFace: FONT, fontSize: 9, color: C.muted, margin: 0, isTextBox: true });
}

// ---------- 版型 ----------
function coverSlide(pres, mod) {
  const s = pres.addSlide();
  s.background = { color: C.night };
  s.addShape(pres.shapes.OVAL, { x: W - 4.2, y: -1.6, w: 6, h: 6, fill: { color: C.brand, transparency: 70 }, line: { type: 'none' } });
  s.addText(mod.eyebrow, { x: M, y: 0.9, w: 9, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: C.amber, margin: 0, isTextBox: true });
  s.addText(mod.title, { x: M, y: 1.5, w: 9.5, h: 2.4, fontFace: FONT, fontSize: fitSize(mod.title, 9.5, 2.4, 48, 30), bold: true, color: 'FFFFFF', margin: 0, valign: 'top', isTextBox: true });
  s.addText(mod.lead, { x: M, y: 4.1, w: 9, h: 1.7, fontFace: FONT, fontSize: fitSize(mod.lead, 9, 1.7, 17, 12), color: C.ice, margin: 0, valign: 'top', isTextBox: true });
  mod.phases.forEach((p, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M + i * 2.75, y: 6.2, w: 2.55, h: 0.5, rectRadius: 0.25, fill: { color: 'FFFFFF', transparency: 88 }, line: { color: C.ice, width: 0.75 } });
    s.addText(p, { x: M + i * 2.75, y: 6.2, w: 2.55, h: 0.5, fontFace: FONT, fontSize: 11, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  });
  s.addText('Vibe Coding 實戰課', { x: W - 3.6, y: H - 0.6, w: 3.1, h: 0.3, fontFace: FONT, fontSize: 10, color: C.ice, align: 'right', margin: 0, isTextBox: true });
  s.addNotes(notesFor(mod, mod.heroSlots) || '開場：先請學員分享課前自學的心得或卡住的地方。');
}

function goalsSlide(pres, mod) {
  if (!mod.goals.length) return;
  const s = pres.addSlide();
  s.background = { color: C.paper };
  s.addText('這個單元結束後，你會…', { x: M, y: 0.55, w: W - M * 2, h: 0.8, fontFace: FONT, fontSize: 32, bold: true, color: C.ink, margin: 0, isTextBox: true });
  const n = mod.goals.length; const gap = 0.35; const cw = (W - M * 2 - gap * (n - 1)) / n;
  mod.goals.forEach((g, i) => {
    const x = M + i * (cw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.0, w: cw, h: 3.6, rectRadius: 0.2, fill: { color: C.brandSoft }, line: { type: 'none' } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.4, y: 2.4, w: 0.8, h: 0.8, fill: { color: C.brand }, line: { type: 'none' } });
    s.addText(String(i + 1), { x: x + 0.4, y: 2.4, w: 0.8, h: 0.8, fontFace: 'Arial', fontSize: 26, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(g, { x: x + 0.4, y: 3.5, w: cw - 0.8, h: 1.8, fontFace: FONT, fontSize: fitSize(g, cw - 0.8, 1.8, 22, 14), bold: true, color: C.ink, margin: 0, valign: 'top', isTextBox: true });
  });
  footer(s, mod, '學習目標');
}

const TABLE_ROWS_PER_SLIDE = 8;

// 表格：內容完整呈現。字級依最長的一格自動縮小；列數太多就換頁，表頭重複。
function tableSlide(pres, mod, sec) {
  const t = sec.table; const cols = Math.max(t.head.length, ...t.rows.map((r) => r.length));
  const head = (t.head.length ? t.head : Array(cols).fill('')).map((h, i) => ({ text: h, options: { bold: true, color: i === 0 ? C.muted : 'FFFFFF', fill: { color: i === 0 ? C.panel : C.brand } } }));
  chunk(t.rows, TABLE_ROWS_PER_SLIDE).forEach((pageRows, page) => {
    const s = pres.addSlide(); s.background = { color: C.paper };
    header(s, page ? { ...sec, title: `${sec.title}（續）` } : sec);
    const body = pageRows.map((r) => r.map((c, i) => ({ text: c, options: { bold: i === 0, color: C.ink, fill: { color: i === 0 ? C.panel : 'FFFFFF' } } })));
    const rows = [head, ...body];
    const colW = (W - M * 2) / cols;
    const longest = Math.max(...pageRows.flat().map((c) => [...String(c)].length), 1);
    const rowH = 4.9 / rows.length;
    const fontSize = fitCell(longest, colW - 0.16, rowH - 0.1, cols > 4 ? 14 : 16);
    s.addTable(rows, { x: M, y: 1.65, w: W - M * 2, rowH, fontFace: FONT, fontSize, border: { type: 'solid', color: C.line, pt: 0.75 }, valign: 'middle', margin: 0.08, autoPage: false });
    footer(s, mod, sec.title);
    s.addNotes(notesFor(mod, sec.slots) || sec.analogy || '');
  });
}

const CARDS_PER_SLIDE = 3;

// 卡片：一頁最多 3 張並排，內文完整保留，字級自動縮到塞得下
function cardsSlide(pres, mod, sec) {
  chunk(sec.cards, CARDS_PER_SLIDE).forEach((group, page) => {
    cardsPage(pres, mod, page ? { ...sec, title: `${sec.title}（續）` } : sec, group, page === 0);
  });
}

function cardsPage(pres, mod, sec, cards, first) {
  const s = pres.addSlide(); s.background = { color: C.paper }; header(s, sec);
  const cols = cards.length;
  const gap = 0.3; const top = sec.analogy && first ? 1.65 : 1.8;
  const areaH = (sec.analogy && first ? 4.3 : 5.0); const cw = (W - M * 2 - gap * (cols - 1)) / cols;
  const BODY_PT = 17;
  const perLine = Math.floor(((cw - 0.6) * 72) / (BODY_PT * 1.05));
  const need = Math.max(...cards.map((c) => 0.25 + (c.tag ? 0.35 : 0) + 0.6 + Math.ceil([...(c.text || '')].length / perLine) * BODY_PT * 1.45 / 72 + 0.35));
  const ch = Math.min(areaH, Math.max(1.6, need));
  cards.forEach((c, i) => {
    const x = M + i * (cw + gap); const y = top;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, rectRadius: 0.15, fill: { color: C.panel }, line: { color: C.line, width: 0.75 } });
    let ty = y + 0.25;
    if (c.tag) {
      s.addText(c.tag, { x: x + 0.3, y: ty, w: cw - 0.6, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: C.brand, margin: 0, isTextBox: true });
      ty += 0.35;
    }
    s.addText(c.title, { x: x + 0.3, y: ty, w: cw - 0.6, h: 0.5, fontFace: FONT, fontSize: fitSize(c.title, cw - 0.6, 0.5, 22, 14), bold: true, color: C.ink, margin: 0, isTextBox: true });
    const bodyH = y + ch - (ty + 0.6) - 0.2;
    if (c.text && bodyH > 0.3) {
      s.addText(c.text, { x: x + 0.3, y: ty + 0.6, w: cw - 0.6, h: bodyH, fontFace: FONT, fontSize: fitSize(c.text, cw - 0.6, bodyH, 17, 9), color: C.muted, margin: 0, valign: 'top', isTextBox: true });
    }
  });
  if (sec.analogy && first) {
    s.addText(sec.analogy, { x: M, y: 6.15, w: W - M * 2, h: 0.75, fontFace: FONT, fontSize: fitSize(sec.analogy, W - M * 2, 0.75, 13, 9), italic: true, color: C.brandInk, margin: 0, valign: 'top', isTextBox: true });
  }
  if (sec.interactive) siteHint(s, mod, sec);
  footer(s, mod, sec.title);
  s.addNotes(notesFor(mod, sec.slots));
}

function quoteSlide(pres, mod, sec) {
  const s = pres.addSlide(); s.background = { color: C.paper }; header(s, sec);
  const main = sec.analogy || sec.callout || sec.intro;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.9, w: W - M * 2, h: 3.7, rectRadius: 0.2, fill: { color: C.brandSoft }, line: { type: 'none' } });
  s.addText('“', { x: M + 0.3, y: 1.7, w: 1, h: 1.5, fontFace: 'Arial', fontSize: 80, bold: true, color: C.brand, margin: 0, isTextBox: true });
  s.addText(main, { x: M + 1.2, y: 2.2, w: W - M * 2 - 1.8, h: 3.1, fontFace: FONT, fontSize: fitSize(main, W - M * 2 - 1.8, 3.1, 26, 14), bold: true, color: C.ink, valign: 'middle', margin: 0, isTextBox: true });
  const extra = sec.analogy && sec.callout ? sec.callout : '';
  if (extra) s.addText(extra, { x: M, y: 5.75, w: W - M * 2, h: 1.0, fontFace: FONT, fontSize: fitSize(extra, W - M * 2, 1.0, 13, 9), color: C.muted, margin: 0, valign: 'top', isTextBox: true });
  if (sec.interactive) siteHint(s, mod, sec);
  footer(s, mod, sec.title);
  s.addNotes(notesFor(mod, sec.slots));
}

function siteHint(s, mod, sec) {
  s.addText(`🖥️ 互動練習：${sectionUrl(mod, sec)}`, { x: M, y: H - 0.85, w: W - M * 2, h: 0.3, fontFace: FONT, fontSize: 10, color: C.amber, bold: true, margin: 0, isTextBox: true });
}

function interactiveSlide(pres, mod, sec) {
  const s = pres.addSlide(); s.background = { color: C.paper }; header(s, sec, C.amber);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.9, w: W - M * 2, h: 4.2, rectRadius: 0.25, fill: { color: C.amberSoft }, line: { type: 'none' } });
  s.addShape(pres.shapes.OVAL, { x: M + 0.6, y: 2.5, w: 1.6, h: 1.6, fill: { color: C.amber }, line: { type: 'none' } });
  s.addText('▶', { x: M + 0.6, y: 2.5, w: 1.6, h: 1.6, fontFace: 'Arial', fontSize: 40, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  s.addText('打開網站，一起動手玩', { x: M + 2.6, y: 2.45, w: 8.5, h: 0.7, fontFace: FONT, fontSize: 26, bold: true, color: C.ink, margin: 0, isTextBox: true });
  s.addText(sec.intro || sec.analogy || '', { x: M + 2.6, y: 3.2, w: 8.5, h: 1.5, fontFace: FONT, fontSize: fitSize(sec.intro || sec.analogy, 8.5, 1.5, 17, 12), color: C.muted, margin: 0, valign: 'top', isTextBox: true });
  s.addText(sectionUrl(mod, sec), { x: M + 2.6, y: 4.9, w: 9, h: 0.5, fontFace: MONO, fontSize: 13, color: C.brandInk, margin: 0, isTextBox: true, hyperlink: { url: sectionUrl(mod, sec) } });
  footer(s, mod, sec.title);
  s.addNotes(notesFor(mod, sec.slots) || '按投影模式（快捷鍵 P）直接在網站上帶學員操作。');
}

const STEPS_PER_SLIDE = 6;

function stepsSlide(pres, mod, sec) {
  chunk(sec.steps, STEPS_PER_SLIDE).forEach((group, page) => {
    stepsPage(pres, mod, page ? { ...sec, title: `${sec.title}（續）` } : sec, group);
  });
}

function stepsPage(pres, mod, sec, list) {
  const s = pres.addSlide(); s.background = { color: C.paper };
  const accent = sec.workshop ? C.purple : C.brand;
  header(s, sec, accent);
  const rowH = Math.min(0.85, 4.9 / list.length);
  list.forEach((st, i) => {
    const y = 1.75 + i * (rowH + 0.08);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y, w: 1.9, h: rowH - 0.1, rectRadius: 0.12, fill: { color: sec.workshop ? C.purpleSoft : C.brandSoft }, line: { type: 'none' } });
    s.addText(st.time || `步驟 ${i + 1}`, { x: M, y, w: 1.9, h: rowH - 0.1, fontFace: FONT, fontSize: 13, bold: true, color: accent, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    const body = [st.title, st.text].filter(Boolean).join('　');
    s.addText(body, { x: M + 2.15, y, w: W - M * 2 - 2.15, h: rowH - 0.1, fontFace: FONT, fontSize: fitSize(body, W - M * 2 - 2.15, rowH - 0.1, 16, 9), color: C.ink, valign: 'middle', margin: 0, isTextBox: true });
  });
  footer(s, mod, sec.title);
  s.addNotes(notesFor(mod, sec.slots));
}

function promptSlide(pres, mod, sec) {
  const s = pres.addSlide(); s.background = { color: C.paper };
  header(s, { ...sec, kicker: '直接複製給 Claude Code', title: sec.title }, C.brand);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.75, w: W - M * 2, h: 4.8, rectRadius: 0.15, fill: { color: '1B1A26' }, line: { type: 'none' } });
  s.addText(sec.prompt, { x: M + 0.4, y: 1.95, w: W - M * 2 - 0.8, h: 4.4, fontFace: FONT, fontSize: fitSize(sec.prompt, W - M * 2 - 0.8, 4.4, 17, 11), color: 'E9E7F5', margin: 0, valign: 'top', isTextBox: true });
  footer(s, mod, sec.title);
}

function quizSlide(pres, mod, q, i) {
  const s = pres.addSlide(); s.background = { color: C.paper };
  s.addText(`課堂提問 ${i + 1}`, { x: M, y: 0.5, w: 4, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.brand, margin: 0, isTextBox: true });
  s.addText(q.q, { x: M, y: 1.0, w: W - M * 2 - 0.4, h: 1.4, fontFace: FONT, fontSize: fitSize(q.q, W - M * 2 - 0.4, 1.4, 30, 18), bold: true, color: C.ink, margin: 0, valign: 'top', isTextBox: true });
  q.options.forEach((o, k) => {
    const y = 2.7 + k * 1.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y, w: W - M * 2, h: 0.9, rectRadius: 0.15, fill: { color: C.panel }, line: { color: C.line, width: 0.75 } });
    s.addShape(pres.shapes.OVAL, { x: M + 0.25, y: y + 0.17, w: 0.56, h: 0.56, fill: { color: C.brand }, line: { type: 'none' } });
    s.addText('ABCD'[k], { x: M + 0.25, y: y + 0.17, w: 0.56, h: 0.56, fontFace: 'Arial', fontSize: 16, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(o, { x: M + 1.1, y, w: W - M * 2 - 1.4, h: 0.9, fontFace: FONT, fontSize: fitSize(o, W - M * 2 - 1.4, 0.9, 18, 12), color: C.ink, valign: 'middle', margin: 0, isTextBox: true });
  });
  footer(s, mod, '課堂提問');
  s.addNotes(`答案：${'ABCD'[q.answer]}．${q.options[q.answer]}\n解說：${q.why}`);
}

function homeworkSlide(pres, mod) {
  if (!mod.homework.length) return;
  const s = pres.addSlide(); s.background = { color: C.okSoft };
  s.addText('回家做這幾件事', { x: M, y: 0.6, w: W - M * 2, h: 0.8, fontFace: FONT, fontSize: 32, bold: true, color: C.ink, margin: 0, isTextBox: true });
  mod.homework.forEach((h, i) => {
    const y = 1.8 + i * 1.35;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y, w: W - M * 2, h: 1.1, rectRadius: 0.15, fill: { color: 'FFFFFF' }, line: { type: 'none' } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M + 0.3, y: y + 0.3, w: 0.5, h: 0.5, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: C.ok, width: 2 } });
    s.addText(h, { x: M + 1.1, y, w: W - M * 2 - 1.4, h: 1.1, fontFace: FONT, fontSize: fitSize(h, W - M * 2 - 1.4, 1.1, 18, 12), color: C.ink, valign: 'middle', margin: 0, isTextBox: true });
  });
  footer(s, mod, '課後任務');
}

function closingSlide(pres, mod, next) {
  const s = pres.addSlide(); s.background = { color: C.night };
  s.addText('下次見！', { x: M, y: 1.6, w: 9, h: 1.2, fontFace: FONT, fontSize: 54, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true });
  s.addText(next ? `下一單元：${courseTitle(next.id)}` : '恭喜完成課程', { x: M, y: 3.0, w: 11, h: 0.7, fontFace: FONT, fontSize: 22, color: C.ice, margin: 0, isTextBox: true });
  s.addText('課前自學網站', { x: M, y: 4.2, w: 11, h: 0.45, fontFace: FONT, fontSize: 16, bold: true, color: C.ice, margin: 0, isTextBox: true });
  s.addText(`${SITE}/`, { x: M, y: 4.7, w: 11, h: 0.5, fontFace: MONO, fontSize: 16, color: C.amber, margin: 0, isTextBox: true, hyperlink: { url: `${SITE}/` } });
}

// ---------- 依內容選版型 ----------
function sectionSlides(pres, mod, sec) {
  if (sec.table) tableSlide(pres, mod, sec);
  else if (sec.steps.length) stepsSlide(pres, mod, sec);
  else if (sec.cards.length >= 2) cardsSlide(pres, mod, sec);
  else if (sec.interactive) interactiveSlide(pres, mod, sec);
  else if (sec.analogy || sec.callout || sec.intro) quoteSlide(pres, mod, sec);
  if (sec.prompt) promptSlide(pres, mod, sec);
}

function buildDeck(mod, next) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = `${mod.eyebrow}｜Vibe Coding 實戰課`;
  pres.author = 'Vibe Coding 實戰課';
  coverSlide(pres, mod);
  goalsSlide(pres, mod);
  mod.sections.forEach((sec) => sectionSlides(pres, mod, sec));
  mod.quiz.slice(0, QUIZ_ON_SLIDES).forEach((q, i) => quizSlide(pres, mod, q, i));
  homeworkSlide(pres, mod);
  closingSlide(pres, mod, next);
  const file = path.join(OUT_DIR, `${mod.file.replace('modules/', '').replace('.html', '')}.pptx`);
  return pres.writeFile({ fileName: file }).then(() => file);
}

(async () => {
  const only = process.argv[2];
  const list = CONTENT.filter((m) => !only || m.id === only);
  for (const mod of list) {
    const idx = CONTENT.indexOf(mod);
    const file = await buildDeck(mod, CONTENT[idx + 1]);
    console.log('已產生', path.relative(ROOT, file));
  }
})();

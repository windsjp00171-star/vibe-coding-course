/* m6.js — 單元 06：鑰匙與機密 */
(function () {
  'use strict';
  const { $, $$, esc, mountQuiz, renderPrintQuiz, mountClassify, mountOrder } = window.Course;
  const { scanCode, maskPII } = window.CourseLib;

  // ---------- 打包行李：哪些檔案可以上傳 ----------
  mountClassify($('[data-classify-pack]'), [
    { text: 'index.html（網站首頁）', answer: 'up', why: '網站本體，當然要上傳。' },
    { text: '.env（放了 AI 金鑰和資料庫密碼）', answer: 'no', why: '鑰匙盒絕對不上傳，一定要放進 .gitignore。' },
    { text: '.env.example（只有名稱，沒有真正的值）', answer: 'up', why: '這是範本，告訴別人需要哪些鑰匙，沒有真正的值，可以上傳。' },
    { text: 'node_modules/（安裝套件時自動產生、好幾萬個檔案的資料夾）', answer: 'no', why: '可以隨時重新安裝產生，上傳只會讓專案又大又慢。' },
    { text: 'README.md（專案說明）', answer: 'up', why: '說明文件要上傳，讓別人（和未來的你）看得懂。' },
    { text: '會員名單.xlsx（真實會員的電話和地址）', answer: 'no', why: '真實個資不能放進程式專案。需要測試資料就請 AI 做「假資料」。' },
  ], [{ key: 'up', label: '⬆️ 可以上傳' }, { key: 'no', label: '🙈 放進禁帶清單' }], { title: '打包行李' });

  // ---------- 找鑰匙：答案由 scanCode 判斷，和單元 8 的體檢器同一套規則 ----------
  const SPOTS = [
    { name: '聊天機器人', code: [
      "import OpenAI from 'openai';",
      '',
      'const client = new OpenAI({',
      '  apiKey: "sk-proj-7890abcdef1234567890",',
      '});',
      '',
      'export async function ask(question) {',
      '  return client.chat.completions.create({ messages: [question] });',
      '}',
    ] },
    { name: '資料庫連線', code: [
      "const { Pool } = require('pg');",
      '',
      'const pool = new Pool({',
      "  host: 'db.example.com',",
      "  user: 'admin',",
      "  password: 'MyCompany2026!',",
      '});',
      '',
      'module.exports = pool;',
    ] },
    { name: '修好的版本', code: [
      "require('dotenv').config();",
      "const OpenAI = require('openai');",
      '',
      'const client = new OpenAI({',
      '  apiKey: process.env.OPENAI_API_KEY,',
      '});',
    ] },
  ];
  let spotIndex = 0;

  function renderSpot() {
    const spot = SPOTS[spotIndex];
    const bad = new Set(scanCode(spot.code.join('\n')).filter((f) => f.rule === 'secret').map((f) => f.line));
    $('[data-spot-tabs]').innerHTML = SPOTS.map((s, i) =>
      `<button type="button" class="chip" aria-pressed="${i === spotIndex}" data-spot="${i}">${esc(s.name)}</button>`).join('');
    $('[data-spot-code]').innerHTML = spot.code.map((line, i) =>
      `<button type="button" class="code-line" role="listitem" data-line="${i + 1}"><span class="ln">${i + 1}</span><span>${esc(line) || ' '}</span></button>`).join('');
    $('[data-spot-feedback]').innerHTML = bad.size
      ? '<p class="muted">點你覺得有問題的那一行。</p>'
      : '<p class="muted">這一段看起來怎麼樣？點點看，或按下面的按鈕。</p><button type="button" class="btn btn-ok" data-spot-clean>我覺得這段沒問題</button>';
    $('[data-spot-code]').dataset.bad = [...bad].join(',');
  }

  $('[data-spot-tabs]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-spot]');
    if (b) { spotIndex = Number(b.dataset.spot); renderSpot(); }
  });
  $('[data-spot-code]').addEventListener('click', (e) => {
    const line = e.target.closest('[data-line]');
    if (!line) return;
    const bad = $('[data-spot-code]').dataset.bad.split(',').filter(Boolean).map(Number);
    const n = Number(line.dataset.line);
    if (bad.includes(n)) {
      line.classList.add('hit');
      $('[data-spot-feedback]').innerHTML = `<div class="feedback ok"><b>✅ 抓到了！第 ${n} 行把密碼直接寫在程式裡。</b>
        應該改成從鑰匙盒拿：<code>process.env.某某密碼</code>，真正的值放在 .env。看看「修好的版本」長什麼樣子。</div>`;
    } else {
      line.classList.remove('miss'); void line.offsetWidth; line.classList.add('miss');
      $('[data-spot-feedback]').innerHTML = bad.length
        ? '<div class="feedback bad">這行沒問題，再找找看。提示：找長得像密碼的字串。</div>'
        : '<div class="feedback ok">這段已經修好了，鑰匙都放在 .env 裡，程式只寫 <code>process.env</code>。</div>';
    }
  });
  $('[data-spot-feedback]').addEventListener('click', (e) => {
    if (!e.target.closest('[data-spot-clean]')) return;
    $('[data-spot-feedback]').innerHTML = '<div class="feedback ok"><b>✅ 答對了！</b>這段用 <code>process.env.OPENAI_API_KEY</code> 從鑰匙盒拿金鑰，程式裡沒有真正的值，可以安心上傳。</div>';
  });
  renderSpot();

  // ---------- 外流後的處理順序 ----------
  mountOrder($('[data-order]'), [
    '立刻到服務商後台，把外流的那把金鑰作廢',
    '產生一把新的金鑰，只放進 .env',
    '確認 .gitignore 裡有 .env',
    '請 Claude Code 把程式裡寫死的金鑰改成讀 .env',
    '檢查服務商的使用紀錄和帳單，有沒有被盜用',
  ], { title: '金鑰外流了！處理順序是？', explain: '第一步永遠是「換鎖」。其他步驟做得再好，舊鑰匙沒作廢都沒用。' });

  // ---------- 能不能貼給 AI ----------
  mountClassify($('[data-classify-paste]'), [
    { text: '一段公開的網頁文案，請 AI 幫忙改得更口語。', answer: 'ok', why: '公開資訊，沒問題。' },
    { text: '整份客戶名單（姓名、電話、地址），請 AI 幫忙分類。', answer: 'no', why: '真實個資不該貼。可以先戴口罩（第 06 段），或請 AI 寫一個分類程式，讓程式在你電腦上處理。' },
    { text: '程式出錯的錯誤訊息，請 AI 解釋。', answer: 'check', why: '通常沒問題，但先看一眼：錯誤訊息裡有時會包含資料庫網址或密碼。' },
    { text: '公司還沒公開的新產品企劃書全文。', answer: 'no', why: '商業機密。除非公司核准使用、有簽資料保護協議的企業版 AI，否則不要貼。' },
    { text: '你寫的 .env 檔內容，請 AI 幫你檢查格式。', answer: 'no', why: '這就是鑰匙本身！請 AI 檢查時，把值換成 xxx 再貼。' },
    { text: '自己專案的程式碼（沒有密碼），請 Claude Code 幫忙修改。', answer: 'ok', why: '這就是 Claude Code 的日常工作。前提是程式碼裡沒有寫死的密碼。' },
  ], [{ key: 'ok', label: '🟢 可以貼' }, { key: 'check', label: '🟡 先檢查再貼' }, { key: 'no', label: '🔴 不要貼' }], { title: '能不能貼給 AI？' });

  // ---------- 個資戴口罩 ----------
  const maskInput = $('[data-mask-input]');
  function renderMask() {
    const { masked, found } = maskPII(maskInput.value);
    $('[data-mask-output]').textContent = masked;
    $('[data-mask-found]').textContent = found.length
      ? `遮住了 ${found.length} 個：${found.map((f) => f.type).join('、')}`
      : '沒有偵測到常見格式的個資。';
  }
  maskInput.addEventListener('input', renderMask);
  renderMask();

  // ---------- 測驗 ----------
  const QUIZ = [
    { q: 'API 金鑰最像下面哪一個？', options: ['公司的地址', '一張不用密碼就能刷的信用卡', '網站的名字'], answer: 1, why: '誰拿到誰就能用你的名義花錢、讀資料。' },
    { q: '密碼應該放在哪裡？', options: ['直接寫在程式碼裡', '.env 檔，並且把 .env 放進 .gitignore', 'README.md'], answer: 1, why: '.env 是鑰匙盒，.gitignore 確保它不會被上傳。' },
    { q: '不小心把金鑰 push 到 GitHub 了，最重要的第一步是？', options: ['刪掉檔案再 push 一次', '到服務商後台把那把金鑰作廢、換新的', '把 repo 改成 Private 就好'], answer: 1, why: 'Git 的歷史紀錄還留著舊金鑰，改成 Private 前也可能已經被抓走。只有作廢才安全。' },
    { q: '想請 AI 整理一份含有客戶電話的名單，比較好的做法是？', options: ['直接整份貼上', '先把個資遮起來，或請 AI 寫程式在自己電腦上處理', '改用另一家 AI 就沒關係'], answer: 1, why: '先遮再送，或讓資料留在自己電腦上。換一家 AI 並不會比較安全。' },
    { q: '.env.example 是做什麼用的？', options: ['放真正的密碼', '列出需要哪些鑰匙的名稱，但不放值，可以安全上傳', '備份用的 .env'], answer: 1, why: '讓下一個人知道要準備哪些鑰匙，卻不會洩漏任何密碼。' },
  ];
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm6' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'pack', title: '打包行李', text: '判斷哪些檔案可以上傳到 GitHub、哪些要放進禁帶清單。' },
    { tour: 'spot', title: '找出鑰匙', text: '點出程式碼裡把密碼寫死的那一行。上方可以切換三段程式。' },
    { tour: 'leaked', title: '萬一外流', text: '把處理步驟排出正確順序，記住最重要的第一步。' },
    { tour: 'shadow', title: '能不能貼給 AI', text: '不只程式碼，貼給 AI 的每句話都要想一下。' },
    { tour: 'mask', title: '個資戴口罩', text: '修改左邊的文字，右邊會即時把個資遮起來。' },
  ]);
})();

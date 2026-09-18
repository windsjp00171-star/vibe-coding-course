/* m8.js — 單元 08：上線前的 Vibe Check */
(function () {
  'use strict';
  const { $, $$, esc, mountQuiz, renderPrintQuiz, initFlips, toast } = window.Course;
  const { scanCode, shuffle } = window.CourseLib;

  // ---------- 五個坑 ----------
  const TRAPS = [
    { icon: '📦', t: '幻覺套件', front: 'AI 推薦了一個聽起來很合理、但其實不存在的套件名稱。', back: '壞人會觀察 AI 常編出哪些名字，搶先註冊成有毒的套件。你一安裝就中毒。', fix: '新套件先查官方網站；請 Claude Code 說明套件用途、下載量。' },
    { icon: '🔑', t: '密碼裸奔', front: '為了「先跑起來」，AI 把金鑰直接寫在程式裡。', back: '一上傳到 GitHub，幾分鐘內就可能被掃描程式撿走。', fix: '單元 6：.env 加 .gitignore，外流就作廢換新。' },
    { icon: '🧱', t: '看起來能跑的漏洞', front: 'AI 寫的程式功能正常，但沒檢查使用者輸入的內容。', back: '壞人在輸入框打特殊文字，就能把資料庫翻出來（SQL 注入）或在網頁上插入惡意程式。', fix: '稽核指令第 3 點；請 AI 用「參數化查詢」。' },
    { icon: '🚪', t: '門沒鎖', front: '頁面做好了，卻忘了檢查「這個人有沒有權限看」。', back: '只要知道網址，任何人都看得到後台或別人的資料。講師的系統就在稽核時抓到過。', fix: '稽核指令第 2 點；每個頁面都問「誰可以看？」' },
    { icon: '💣', t: '自動執行危險指令', front: '為了省事，讓 AI 不經同意就自動執行所有指令。', back: 'AI 誤判或被騙時，可能直接刪檔、下載惡意程式。', fix: '單元 7：不要關掉門神，危險動作一定要真人同意。' },
  ];
  $('[data-traps]').innerHTML = TRAPS.map((x) => `
    <div class="flip" style="min-height:250px"><div class="flip-inner">
      <div class="flip-face flip-front"><div class="emoji">${x.icon}</div><h3>${esc(x.t)}</h3><p>${esc(x.front)}</p><span class="flip-hint">會怎樣？點我 ↻</span></div>
      <div class="flip-face flip-back"><span class="pill pill-danger">後果</span><p>${esc(x.back)}</p><span class="pill pill-ok">解法</span><p>${esc(x.fix)}</p></div>
    </div></div>`).join('');
  initFlips($('[data-traps]'));

  // ---------- 體檢器 ----------
  const PRESETS = [
    { name: '🚨 A 金鑰寫死', code: "import OpenAI from 'openai';\n\nconst openai = new OpenAI({\n  apiKey: \"sk-proj-7890abcdef1234567890\",\n});" },
    { name: '🚨 B 拼接查詢', code: "app.get('/user', (req, res) => {\n  const id = req.query.id;\n  const sql = \"SELECT * FROM users WHERE id = '\" + id + \"'\";\n  db.query(sql, (err, rows) => res.json(rows));\n});" },
    { name: '🚨 C 幻覺套件', code: "const express = require('express');\nconst auth = require('express-auth-ultra-secure');\n\nconst app = express();\napp.use(auth());" },
    { name: '🚨 D 執行指令', code: "import os\n\ndef ping(host):\n    os.system(\"ping -c 1 \" + host)" },
    { name: '✅ E 修好的版本', code: "require('dotenv').config();\nconst OpenAI = require('openai');\n\nconst openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });\ndb.query('SELECT * FROM users WHERE id = ?', [id]);" },
  ];
  const input = $('[data-scan-input]');
  $('[data-presets]').innerHTML = PRESETS.map((p, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-preset="${i}">${esc(p.name)}</button>`).join('');
  input.value = PRESETS[0].code;
  $('[data-presets]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    $$('[data-preset]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    input.value = PRESETS[Number(b.dataset.preset)].code;
    $('[data-scan-result]').innerHTML = '<p class="muted">按「開始體檢」。</p>';
  });
  $('[data-scan]').addEventListener('click', () => {
    const findings = scanCode(input.value);
    const host = $('[data-scan-result]');
    if (!findings.length) {
      host.innerHTML = '<div class="feedback ok reveal"><b>✅ 沒有發現常見問題</b><br>這個體檢器只查得到幾種問題，上線前還是要走完整的檢查表。</div>';
      return;
    }
    host.innerHTML = `<p class="kicker">體檢報告：發現 ${findings.length} 個問題</p>${findings.map((f) => `
      <div class="feedback ${f.level === 'danger' ? 'bad' : ''} reveal" style="${f.level === 'warn' ? 'background:var(--warn-soft)' : ''};margin-bottom:8px">
        <b>第 ${f.line} 行．${esc(f.title)}</b><br>${esc(f.plain)}</div>`).join('')}
      <p class="muted">試著改改看左邊的程式碼，再體檢一次。卡住的話，看看「E 修好的版本」。</p>`;
  });

  // ---------- OWASP LLM Top 10（2025）白話版 ----------
  const OWASP = [
    { id: 'LLM01', name: '提示詞注入', plain: '在文件或對話裡藏指令，讓 AI 被帶偏。', like: '實習生照著信裡的陌生人指示做事。', unit: '單元 7' },
    { id: 'LLM02', name: '敏感資訊外洩', plain: 'AI 把不該說的個資、機密說了出來。', like: '櫃台人員把別的客人的資料念給你聽。', unit: '單元 6' },
    { id: 'LLM03', name: '供應鏈風險', plain: '用到的套件、模型或工具本身有問題。', like: '餐廳進的食材在源頭就被下毒。', unit: '本單元：幻覺套件' },
    { id: 'LLM04', name: '資料與模型被下毒', plain: '壞人在 AI 學習或查詢的資料裡混入錯誤內容。', like: '有人偷偷改了員工訓練手冊。', unit: '' },
    { id: 'LLM05', name: '沒檢查就用 AI 的輸出', plain: '把 AI 產生的內容直接拿去執行或顯示，沒有把關。', like: '秘書寫的公文，主管沒看就蓋章發出去。', unit: '本單元：看起來能跑的漏洞' },
    { id: 'LLM06', name: '權限給太大', plain: 'AI 代理人能做的事太多，被騙時損失就大。', like: '把公司大小章和保險箱密碼都交給實習生。', unit: '單元 7' },
    { id: 'LLM07', name: '系統提示詞外洩', plain: '寫給 AI 的內部指示被使用者套出來。', like: '客人問一問，店員就把內部作業手冊拿給他看。', unit: '' },
    { id: 'LLM08', name: '向量資料庫的弱點', plain: 'AI 的「知識庫」沒分好權限，A 客戶查到 B 客戶的文件。', like: '共用檔案櫃沒上鎖，誰都能翻別人的抽屜。', unit: '' },
    { id: 'LLM09', name: '錯誤資訊（幻覺）', plain: 'AI 一本正經地說出錯的內容，大家卻信了。', like: '很有自信但搞錯事實的同事。', unit: '' },
    { id: 'LLM10', name: '資源無限消耗', plain: '有人讓 AI 一直跑，帳單或主機被拖垮。', like: '有人一直叫外送到你家，全部記在你帳上。', unit: '單元 6：金鑰外流' },
  ];
  $('[data-owasp]').innerHTML = OWASP.map((o) => `
    <div class="card" style="padding:16px 18px"><span class="pill pill-brand">${o.id}</span> <b>${esc(o.name)}</b>
      <p style="margin:8px 0 4px">${esc(o.plain)}</p><p class="muted" style="margin:0;font-size:.9rem">比喻：${esc(o.like)}${o.unit ? `．對應 ${esc(o.unit)}` : ''}</p></div>`).join('');

  // 配對遊戲：每回合抽 5 組，先點風險、再點比喻
  let round = [];
  let picked = null;
  let matched = new Set();
  function newRound() {
    round = shuffle(OWASP).slice(0, 5);
    picked = null; matched = new Set();
    renderMatch();
  }
  function renderMatch() {
    const likes = shuffle(round.map((o) => o.id), seeded(round.map((o) => o.id).join()));
    $('[data-match]').innerHTML = `
      <div class="quiz-head"><span class="kicker">配對遊戲：先點左邊的風險，再點右邊對應的比喻</span><span class="pill pill-ok">${matched.size}／${round.length}</span></div>
      <div class="grid grid-2">
        <div class="options">${round.map((o) => `<button type="button" class="option ${matched.has(o.id) ? 'is-right' : ''}" data-m-risk="${o.id}" ${matched.has(o.id) ? 'disabled' : ''} ${picked === o.id ? 'style="border-color:var(--brand);background:var(--brand-soft)"' : ''}><span class="key">${o.id.slice(3)}</span><span>${esc(o.name)}</span></button>`).join('')}</div>
        <div class="options">${likes.map((id) => { const o = OWASP.find((x) => x.id === id); return `<button type="button" class="option ${matched.has(id) ? 'is-right' : ''}" data-m-like="${id}" ${matched.has(id) ? 'disabled' : ''}><span>${esc(o.like)}</span></button>`; }).join('')}</div>
      </div>
      ${matched.size === round.length ? '<div class="feedback ok" style="margin-top:12px"><b>🎉 全部配對成功！</b> <button type="button" class="btn btn-sm" data-m-again>換一組再玩</button></div>' : ''}`;
  }
  // 固定這一回合比喻的排列，避免每次點擊後順序亂跳
  function seeded(key) {
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 2 ** 32; };
  }
  $('[data-match]').addEventListener('click', (e) => {
    if (e.target.closest('[data-m-again]')) { newRound(); return; }
    const risk = e.target.closest('[data-m-risk]')?.dataset.mRisk;
    const like = e.target.closest('[data-m-like]')?.dataset.mLike;
    if (risk) { picked = risk; renderMatch(); return; }
    if (!like) return;
    if (!picked) { toast('先點左邊的風險，再點比喻'); return; }
    if (like === picked) { matched = new Set([...matched, like]); picked = null; renderMatch(); }
    else { toast('不太對，再想想看'); }
  });
  newRound();

  // ---------- 上線前檢查表 ----------
  const LAUNCH = [
    ['使用者', 'use-phone', '用手機從頭到尾操作過一次'],
    ['使用者', 'use-wrong', '故意亂填、留空、按兩次，網站不會壞'],
    ['使用者', 'use-friend', '請一位沒參與的人試用，他不用問你就會用'],
    ['資安', 'sec-secret', '程式裡沒有寫死的密碼，.env 在 .gitignore 裡'],
    ['資安', 'sec-auth', '每個頁面都確認過「誰可以看」'],
    ['資安', 'sec-audit', '跑過一次全域稽核，嚴重問題都修好了'],
    ['資安', 'sec-pkg', '用到的套件都查證過、版本鎖住'],
    ['維運', 'ops-backup', '知道資料存在哪裡，也有備份'],
    ['維運', 'ops-log', '出錯時知道去哪裡看錯誤紀錄'],
    ['維運', 'ops-contact', '使用者遇到問題時，知道要找誰'],
  ];
  $('[data-launch]').innerHTML = LAUNCH.map(([group, value, text]) =>
    `<li><label><input type="checkbox" value="${value}"><span><span class="pill ${group === '資安' ? 'pill-danger' : group === '使用者' ? 'pill-brand' : 'pill-ok'}">${group}</span> ${esc(text)}</span></label></li>`).join('');
  // 勾選記憶由 core 啟動時的 initChecklists 接上（單元程式先於 core 啟動執行）

  // ---------- 測驗 ----------
  const QUIZ = window.QuizBank.m8;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm8' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'traps', title: '五個坑', text: 'Vibe Coding 最常掉進去的五個坑，點卡片看後果和解法。' },
    { tour: 'scanner', title: '體檢器', text: '選一段程式或自己修改，按「開始體檢」看找到哪些問題。' },
    { tour: 'owasp', title: 'AI 十大風險', text: '國際資安組織整理的清單，先玩配對遊戲，下面有完整白話說明。' },
    { tour: 'checklist', title: '上線前檢查表', text: '每個專案上線前勾一遍，旁邊有現成的全域稽核指令可以複製。' },
    { tour: 'workshop', title: '交換 Vibe Check', text: '課堂上互相當稽核員，找對方專案的問題。' },
  ]);
})();

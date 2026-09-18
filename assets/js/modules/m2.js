/* m2.js — 單元 02：安裝 Claude Code */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz, mountClassify, initFlips } = window.Course;

  // ---------- 允許嗎？分類 ----------
  mountClassify($('[data-classify-permission]'), [
    { text: 'Claude Code 想「建立 index.html」（在你的專案資料夾裡）。', answer: 'allow', why: '這就是你請它做的事，放心允許。' },
    { text: 'Claude Code 想執行：npm install express', answer: 'ask', why: '這是在「安裝套件」。通常沒問題，但可以先問它「這是什麼套件？為什麼需要？」，養成查證的習慣。' },
    { text: 'Claude Code 想執行：rm -rf ~', answer: 'deny', why: '這行的意思是「刪除你整個使用者資料夾」。任何看到 rm -rf 的都要非常小心，這種一定拒絕。' },
    { text: 'Claude Code 想讀取專案裡的 README.md，了解這個專案在做什麼。', answer: 'allow', why: '讀取專案裡的說明文件很正常，這是它在做功課。' },
    { text: 'Claude Code 想執行：git push --force', answer: 'deny', why: '「強制上傳」會蓋掉 GitHub 上別人的修改。除非你非常清楚原因，否則先拒絕，問它有沒有其他做法。' },
    { text: 'Claude Code 想修改「桌面」上一個跟這個專案無關的檔案。', answer: 'ask', why: '超出專案資料夾範圍了。問它為什麼要動那個檔案。' },
    { text: 'Claude Code 想執行：git commit -m "新增聯絡表單"', answer: 'allow', why: '這是在存檔，而且說明寫得很清楚。單元 4 會教你這是什麼。' },
    { text: '一段很長、看起來像亂碼的指令，裡面有 curl 還有一串網址。', answer: 'deny', why: '「從網路下載東西直接執行」如果來源不明很危險。看不懂就拒絕，請它用白話解釋每一段。' },
  ], [
    { key: 'allow', label: '🟢 放心允許' },
    { key: 'ask', label: '🟡 先問清楚' },
    { key: 'deny', label: '🔴 直接拒絕' },
  ], { title: '允許嗎？' });

  // ---------- 終端機指令卡 ----------
  const TERMS = [
    { cmd: 'cd 資料夾名', icon: '🚪', plain: '走進某個資料夾（change directory）。', like: '在檔案總管裡雙擊打開一個資料夾。' },
    { cmd: 'ls（Windows：dir）', icon: '👀', plain: '列出這個資料夾裡有哪些檔案。', like: '看一眼抽屜裡有什麼。' },
    { cmd: 'pwd', icon: '📍', plain: '顯示你現在在哪個資料夾。', like: 'Google 地圖上的「我的位置」。' },
    { cmd: 'mkdir 名稱', icon: '📂', plain: '建立一個新資料夾（make directory）。', like: '右鍵 → 新增資料夾。' },
    { cmd: 'claude', icon: '🤖', plain: '在目前的資料夾叫出 Claude Code（終端機版）。', like: '把包工頭叫進這個工地。' },
    { cmd: 'Ctrl + C', icon: '✋', plain: '中斷正在執行的東西。', like: '緊急停止按鈕。' },
  ];
  $('[data-terms]').innerHTML = TERMS.map((t) => `
    <div class="flip" style="min-height:180px"><div class="flip-inner">
      <div class="flip-face flip-front"><div class="emoji">${t.icon}</div><h3><code>${esc(t.cmd)}</code></h3><span class="flip-hint">點我翻面 ↻</span></div>
      <div class="flip-face flip-back"><p><b>白話：</b>${esc(t.plain)}</p><p><b>就像：</b>${esc(t.like)}</p></div>
    </div></div>`).join('');
  initFlips($('[data-terms]'));

  // ---------- 測驗 ----------
  const QUIZ = [
    { q: 'Claude Code 跟 claude.ai 聊天視窗最大的差別是？', options: ['Claude Code 比較會聊天', 'Claude Code 可以直接在你的電腦上建檔案、執行、存檔', '聊天視窗要付費，Claude Code 免費'], answer: 1, why: '聊天視窗只能給建議，Claude Code 會實際動手做。' },
    { q: '在 Claude Code 的「Code」分頁選資料夾時，應該選哪一個？', options: ['整個 C 槽', '桌面', '專門為這個專案建立的資料夾'], answer: 2, why: '一個專案一個資料夾。選整個磁碟等於讓它能碰到你所有的檔案。' },
    { q: 'Claude Code 問你能不能執行 rm -rf 開頭的指令，你看不懂，該怎麼辦？', options: ['按允許，它應該知道自己在做什麼', '拒絕，請它用白話解釋要做什麼', '重新安裝 Claude Code'], answer: 1, why: 'rm -rf 是刪除指令。看不懂就拒絕並請它解釋，這是最重要的安全習慣。' },
    { q: 'Windows 電腦在使用 Claude Code 前，建議先安裝什麼？', options: ['Git for Windows', 'Microsoft Office', '防毒軟體'], answer: 0, why: 'Windows 上的 Claude Code 需要 Git 來執行指令和管理存檔。' },
    { q: '網路上有教學說「貼上這行指令就能安裝」，最安全的做法是？', options: ['照貼，網路上的應該都沒問題', '只貼官方網站上的指令', '請朋友幫忙貼'], answer: 1, why: '從網路下載並執行程式的指令威力很大，只信任官方來源。' },
  ];
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm2' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'tools', title: '三種 AI 工具', text: '先搞懂聊天型、編輯器型、代理型的差別，以及 Claude Code 和 Cursor 怎麼選。' },
    { tour: 'install', title: '安裝步驟', text: '上方選 Windows 或 Mac，每完成一步就打勾。卡住了點「卡住了？」看解法。' },
    { tour: 'permission', title: '允許嗎？', text: 'Claude Code 會先問你才動手。這裡練習判斷什麼可以允許、什麼要拒絕。' },
    { tour: 'workshop', title: '安裝派對', text: '課堂上兩人一組互相幫忙完成安裝。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關。' },
  ]);
})();

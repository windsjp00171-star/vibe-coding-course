/*
 * checkup.js — 「團隊程式健檢＋工作坊」介紹頁。
 * 先不報價：放上來是為了看有沒有單位來問（變現的第一個驗證）。洽詢走聯絡表單的「企業內訓」主題。
 * 洽詢資訊集中在 INFO，定價後改這裡就好。
 */
(function () {
  'use strict';
  const { esc, $ } = window.Course;

  // ▼▼▼ 洽詢資訊：改這裡就好 ▼▼▼
  const INFO = {
    scope: '事前健檢＋半日工作坊＋一個月後複檢',
    price: '依專案數與參加人數報價，請用下方的聯絡表單洽詢',
    travel: '工作坊可以到你們的單位，也可以線上進行',
    tryFirst: 'RepoDoctor 的規則掃描免費，可以先自己健檢一次再決定',
  };
  // ▲▲▲ 洽詢資訊 ▲▲▲

  $('[data-ck-book]').innerHTML = `
    <dl class="en-info">
      <div><dt>內容</dt><dd>${esc(INFO.scope)}</dd></div>
      <div><dt>費用</dt><dd>${esc(INFO.price)}</dd></div>
      <div><dt>地點</dt><dd>${esc(INFO.travel)}</dd></div>
      <div><dt>先試試</dt><dd>${esc(INFO.tryFirst)}（<a href="https://repodoctor-psi.vercel.app/" target="_blank" rel="noopener">RepoDoctor ↗</a>）</dd></div>
      <div><dt>洽詢</dt><dd><a href="#contact">用聯絡表單洽詢 ↓</a></dd></div>
    </dl>
    <p class="muted">留言時告訴我：單位名稱、大概有幾個專案、是同仁自己做的還是外包、預計參加人數，我會回覆可行的安排與報價。</p>`;

  window.Tour.register([
    { tour: 'ck-demo', title: '先看範例報告', text: '不用登入，就能看到健檢報告長什麼樣子：每個問題的白話說明和修復指令。' },
    { tour: 'ck-flow', title: '三個步驟', text: '先健檢、再用你們自己的報告上工作坊、一個月後複檢，最後交一份改善前後的對照。' },
    { tour: 'contact', title: '聯絡講師', text: '想安排的話在這裡留言。寫上單位、專案數量和人數，講師會用你留的聯絡方式回覆。' },
  ]);
})();

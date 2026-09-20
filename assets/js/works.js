/*
 * works.js — 學員作品牆。
 * 第一屆還沒開課，所以現在是「講師示範作品 ＋ 保留席次」。
 * 開課後把學員作品加進 STUDENT_WORKS 就會自動排進去，保留席次會自動變少。
 */
(function () {
  'use strict';
  const { $, esc } = window.Course;

  // 收作品的方式。還沒決定就留 null，畫面會顯示「待填」而不是假連結。
  const SUBMIT = {
    formUrl: null,       // 例如 Google 表單網址
    email: null,         // 或收件信箱
  };

  const SEATS = 6; // 第一屆保留席次

  // 學員作品。name 一律用學員自己同意公開的稱呼（暱稱或姓＋單名），不放全名與聯絡方式。
  // 欄位：{ glyph, who, cohort, name, text, made, demo, code }
  const STUDENT_WORKS = [];

  // 講師示範：證明「這門課的範圍內」做得出什麼，規模刻意跟學員作品相當
  const DEMOS = [
    { glyph: '🍱', who: '講師示範', cohort: '單元 2～5 的範圍', name: '部門聚餐報名頁',
      text: '一頁式報名表，能選葷素、有截止日期，手機也不跑版。課堂上的沉浸式模擬做的就是它。',
      made: '大約 40 分鐘，不含想清楚要什麼的時間' },
    { glyph: '📋', who: '講師示範', cohort: '單元 3 的範圍', name: '會議逐字稿整理器',
      text: '貼上逐字稿，整理成重點與待辦，一鍵複製。單一檔案，不用資料庫。',
      made: '一個晚上，改了七次提示詞' },
    { glyph: '🗂️', who: '講師示範', cohort: '單元 17 的範圍', name: '報名名單清理小工具',
      text: '把全形數字、多餘空白、重複報名整理乾淨，並把身分證字號遮起來再交出去。',
      made: '半小時，重點是先講清楚「哪些資料不能外流」' },
  ];

  function card(w, kind) {
    return `<article class="wk-card wk-card--${kind}">
      <div class="wk-top"><span class="wk-glyph" aria-hidden="true">${w.glyph}</span>
        <div><span class="wk-who">${esc(w.who)}．${esc(w.cohort)}</span><h3>${esc(w.name)}</h3></div></div>
      <p>${esc(w.text)}</p>
      ${w.made ? `<p class="wk-made">⏱ ${esc(w.made)}</p>` : ''}
      <div class="wk-links">
        ${w.demo ? `<a href="${esc(w.demo)}" target="_blank" rel="noopener">▶ 打開來看 ↗</a>` : ''}
        ${w.code ? `<a href="${esc(w.code)}" target="_blank" rel="noopener">看原始碼 ↗</a>` : ''}
      </div>
    </article>`;
  }

  function seat(i) {
    return `<article class="wk-card wk-seat">
      <span class="wk-seat-num" aria-hidden="true">${i + 1}</span>
      <h3>這個位子留給你</h3>
      <p>第一屆結業作品會放在這裡：作品名稱、你想給誰用、做了多久，以及可以點開來看的連結。</p>
    </article>`;
  }

  function renderSubmit() {
    const host = $('[data-wk-submit]');
    const how = SUBMIT.formUrl
      ? `<a class="btn btn-primary" href="${esc(SUBMIT.formUrl)}" target="_blank" rel="noopener">填表單投稿 →</a>`
      : SUBMIT.email
        ? `<a class="btn btn-primary" href="mailto:${esc(SUBMIT.email)}">寄信投稿 →</a>`
        : '<span class="wk-todo">投稿方式待填（在 assets/js/works.js 的 SUBMIT 設定）</span>';
    host.innerHTML = `
      <h3>想把作品放上來？</h3>
      <ul>
        <li>作品要是<b>你自己在課程期間做的</b>，用 AI 協作沒問題，重點是你說得出每一段在做什麼。</li>
        <li>請先確認<b>沒有真實個資</b>：名單、電話、金鑰、公司內部資料都要換成假的再公開。</li>
        <li>可以只放截圖與說明，不一定要公開原始碼。</li>
        <li>署名用你同意公開的稱呼就好，不會放全名或聯絡方式。</li>
      </ul>
      <p>${how}</p>`;
  }

  function render() {
    const seats = Math.max(0, SEATS - STUDENT_WORKS.length);
    $('[data-wk-students]').innerHTML =
      STUDENT_WORKS.map((w) => card(w, 'student')).join('') +
      Array.from({ length: seats }, (_, i) => seat(STUDENT_WORKS.length + i)).join('');
    $('[data-wk-demos]').innerHTML = DEMOS.map((w) => card(w, 'demo')).join('');
    $('[data-wk-count]').textContent = STUDENT_WORKS.length
      ? `目前 ${STUDENT_WORKS.length} 件學員作品，還有 ${seats} 個位子`
      : '第一屆還沒開課，位子都留著';
    renderSubmit();
  }

  render();
  window.Tour.register([
    { tour: 'wall', title: '作品牆', text: '這裡會放學員結業時做出來的東西。第一屆還沒開課，所以先放講師的示範作品，位子留著。' },
  ]);
})();

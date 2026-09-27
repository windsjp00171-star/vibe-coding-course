/*
 * security.js — 半日「AI 資安意識」課的介紹頁。
 * 這一頁的模擬演練是公開的（招生用），跟單元 19 用同一份劇本。
 * 洽詢資訊集中在 INFO，還沒決定的留 null，頁面會顯示明顯的待填標記。
 */
(function () {
  'use strict';
  const { esc, $ } = window.Course;

  // ▼▼▼ 洽詢資訊：改這裡就好 ▼▼▼
  const INFO = {
    length: '3 小時（可調整為 2 或 4 小時）',
    price: '依人數、場地與講義需求報價，請用下方的聯絡表單洽詢',  // 定價後可改成例如：'NT$ 18,000／場（含講義，交通另計）'
    travel: '可以到你們的單位上課；地點與交通費請一併洽詢',
    lead: '請提早洽詢，方便安排時段',
    formUrl: null,    // 例如：Google 表單或洽詢表單網址
  };
  // ▲▲▲ 洽詢資訊 ▲▲▲

  const TODO = (what) => `<span class="en-todo">（待填：${esc(what)}）</span>`;

  $('[data-sec-book]').innerHTML = `
    <dl class="en-info">
      <div><dt>時間長度</dt><dd>${esc(INFO.length)}</dd></div>
      <div><dt>費用</dt><dd>${INFO.price ? esc(INFO.price) : TODO('每場費用、是否含講義')}</dd></div>
      <div><dt>交通</dt><dd>${INFO.travel ? esc(INFO.travel) : TODO('可服務地區與交通費')}</dd></div>
      <div><dt>預約</dt><dd>${INFO.lead ? esc(INFO.lead) : TODO('需要提前多久預約')}</dd></div>
      <div><dt>洽詢</dt><dd>
        ${INFO.formUrl ? `<a class="btn btn-primary btn-sm" href="${esc(INFO.formUrl)}" target="_blank" rel="noopener">填寫洽詢表單 →</a>　` : ''}
        <a href="#contact">用聯絡表單洽詢 ↓</a></dd></div>
    </dl>
    <p class="muted">留言時告訴我：單位名稱、預計人數、希望的日期、場地有沒有投影設備，我會回覆可行的時段與報價。</p>`;

  // 招生用的公開試玩：和單元 19 同一份劇本
  window.Workbench.mount($('[data-workbench]'), {
    id: 'sec-demo',
    missions: ['接到視訊', '看出套路', '換管道確認', '頂住施壓'],
    after: '這只是課程的第一段。實際課堂上，每個決策點都會停下來討論「你的部門會怎麼做」。',
    run: window.SimM19.run,
  });

  $('[data-en-print]').addEventListener('click', () => window.print());

  window.Tour.register([
    { tour: 'contact', title: '聯絡講師', text: '想安排講座，在這裡留言就好，不用寄信。寫上單位、人數和希望的日期，講師會用你留的聯絡方式回覆。' },
  ]);
})();

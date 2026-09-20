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
    price: null,      // 例如：'NT$ 18,000／場（含講義，交通另計）'
    travel: null,     // 例如：'台南、高雄免收交通費；其他縣市另計'
    lead: null,       // 例如：'建議提前 3 週預約'
    contact: 'emmark19890901@gmail.com',
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
        來信：<a href="mailto:${esc(INFO.contact)}">${esc(INFO.contact)}</a></dd></div>
    </dl>
    <p class="muted">來信時告訴我：單位名稱、預計人數、希望的日期、場地有沒有投影設備，我會回覆可行的時段與報價。</p>`;

  // 招生用的公開試玩：和單元 19 同一份劇本
  window.Workbench.mount($('[data-workbench]'), {
    id: 'sec-demo',
    missions: ['接到視訊', '看出套路', '換管道確認', '頂住施壓'],
    after: '這只是課程的第一段。實際課堂上，每個決策點都會停下來討論「你的部門會怎麼做」。',
    run: window.SimM19.run,
  });

  $('[data-en-print]').addEventListener('click', () => window.print());

  window.Tour.register([]);
})();

/*
 * enroll.js — 招生用的課程介紹頁。
 * 費用、梯次、地點這些只有講師知道的資訊，集中放在下面的 INFO；還沒決定的先留 null，
 * 頁面會顯示明顯的「待填」提醒，避免不小心印出錯的數字。
 */
(function () {
  'use strict';
  const { MODULES, esc, $ } = window.Course;

  // ▼▼▼ 開課資訊：改這裡就好 ▼▼▼
  const INFO = {
    format: '實體課程或線上同步皆可（地點與平台於開班前通知）',
    schedule: null,      // 例如：'2026/11/8（六）、11/15（六）　09:30–17:00'
    seats: null,         // 例如：'限 12 人，額滿為止'
    price: null,         // 例如：'NT$ 6,800（早鳥 NT$ 5,800，10/15 前報名）'
    corporate: null,     // 例如：'企業內訓另行報價，歡迎來信洽詢'
    contact: 'emmark19890901@gmail.com',
    formUrl: null,       // 例如：Google 表單網址
  };
  // ▲▲▲ 開課資訊 ▲▲▲

  const TODO = (what) => `<span class="en-todo">（待填：${esc(what)}）</span>`;

  // 時數直接從課程資料算，不用手動維護。分開呈現：課中實作（實體上課時數）與課前自學
  const hours = (list, key) => Math.round(list.reduce((n, m) => n + (m[key] || 0), 0) / 6) / 10;
  const core = MODULES.filter((m) => m.ready && !/^D/.test(m.part));
  const elective = MODULES.filter((m) => m.ready && /^D/.test(m.part));
  // 同一個數字可能在頁面出現多次（例如課中時數），全部都要填
  const fact = (key, value) => document.querySelectorAll(`[data-fact="${key}"]`).forEach((el) => { el.textContent = value; });
  fact('inclass', hours(core, 'inClass'));
  fact('pre', hours(core, 'minutes'));
  fact('total', hours(core, 'minutes') + hours(core, 'inClass') + hours(core, 'post'));
  fact('elective', hours(elective, 'minutes') + hours(elective, 'inClass') + hours(elective, 'post'));

  // 課程大綱
  const parts = [...new Set(MODULES.filter((m) => m.ready).map((m) => m.part))];
  $('[data-en-map]').innerHTML = parts.map((part) => `
    <div class="en-part">
      <h3>${esc(part)}</h3>
      <ol>${MODULES.filter((m) => m.ready && m.part === part).map((m) => `
        <li><b>${m.id.slice(1)}</b> ${esc(m.title)}<span>課前 ${m.minutes}′／課中 ${m.inClass}′</span></li>`).join('')}</ol>
    </div>`).join('');

  // 費用與報名
  $('[data-en-signup]').innerHTML = `
    <dl class="en-info">
      <div><dt>上課方式</dt><dd>${INFO.format ? esc(INFO.format) : TODO('實體或線上、地點')}</dd></div>
      <div><dt>梯次時間</dt><dd>${INFO.schedule ? esc(INFO.schedule) : TODO('上課日期與時間')}</dd></div>
      <div><dt>名額</dt><dd>${INFO.seats ? esc(INFO.seats) : TODO('人數上限')}</dd></div>
      <div><dt>費用</dt><dd>${INFO.price ? esc(INFO.price) : TODO('學費、早鳥優惠')}</dd></div>
      <div><dt>企業內訓</dt><dd>${INFO.corporate ? esc(INFO.corporate) : TODO('內訓報價方式')}</dd></div>
      <div><dt>報名與洽詢</dt><dd>
        ${INFO.formUrl ? `<a class="btn btn-primary btn-sm" href="${esc(INFO.formUrl)}" target="_blank" rel="noopener">填寫報名表 →</a>　` : TODO('報名表網址')}
        來信：<a href="mailto:${esc(INFO.contact)}">${esc(INFO.contact)}</a></dd></div>
    </dl>
    <p class="muted">報名前可以先到<a href="learn.html">課程網站</a>免費試看單元 0、1、4、7、19，確認上課方式適合你再決定。</p>`;

  // 主題式套裝：同一批單元，換不同的組合賣給不同的人。
  // 時數由單元的課中時間自動加總，改單元就會跟著變，不用手動維護。
  const PACKS = [
    { id: 'security', icon: '🛡️', name: 'AI 資安意識包', who: '全體同仁．不用電腦',
      units: ['m0', 'm7', 'm19', 'm6'],
      value: '結訓帶走一條可以公告的匯款查核規則',
      note: '最親民的入門場，半天就能跑完。' },
    { id: 'build', icon: '🚀', name: '做出第一個工具包', who: '想自己動手做東西的人',
      units: ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm8', 'm9'],
      value: '每個人結業時有一個真的在線上的作品',
      note: '這就是必修主線，建議排三個半天。' },
    { id: 'ops', icon: '🗄️', name: '維運與治理包', who: '已經有人在用 AI 做東西的單位',
      units: ['m20', 'm21', 'm22'],
      value: '一份交接包、一頁 AI 使用守則、一張成本與退場評估',
      note: '解決「做出來之後沒人維護、沒人負責」的問題。' },
    { id: 'daily', icon: '📊', name: '日常效率包', who: '不寫程式也天天用 AI 的人',
      units: ['m18', 'm17', 'm16'],
      value: '一套自己的提示詞範本與資料整理流程',
      note: '不碰程式碼，適合行政、企劃、業務。' },
  ];

  function renderPacks() {
    const host = $('[data-en-packs]');
    if (!host) return;
    host.innerHTML = PACKS.map((pack) => {
      const list = pack.units.map((id) => MODULES.find((m) => m.id === id)).filter((m) => m && m.ready);
      const h = hours(list, 'inClass');
      const half = Math.max(1, Math.ceil(h / 3.5));
      return `<article class="en-pack">
        <div class="en-pack-top"><span class="en-pack-icon" aria-hidden="true">${pack.icon}</span>
          <div><span class="en-pack-who">${esc(pack.who)}</span><h3>${esc(pack.name)}</h3></div></div>
        <p class="en-pack-time"><b>課中約 ${h} 小時</b>（約 ${half} 個半天）．${list.length} 個單元</p>
        <ul class="en-pack-units">${list.map((m) => `<li>${m.emoji} ${esc(m.title)}</li>`).join('')}</ul>
        <p class="en-pack-value">🎁 ${esc(pack.value)}</p>
        <p class="muted">${esc(pack.note)}</p>
      </article>`;
    }).join('');
  }

  renderPacks();

  $('[data-en-print]').addEventListener('click', () => window.print());

  window.Tour.register([]);
})();

/*
 * enroll.js — 招生用的課程介紹頁。
 * 梯次時間、名額、費用：自動讀講師後台「📝 報名管理」裡開放報名的梯次，講師在後台改，這裡就跟著變。
 * 其他固定的說明文字放在下面的 INFO。
 */
(function () {
  'use strict';
  const { MODULES, esc, $ } = window.Course;

  // ▼▼▼ 開課資訊：改這裡就好 ▼▼▼
  const INFO = {
    format: '實體課程或線上同步皆可（地點與平台於開班前通知）',
    corporate: '依人數、時數與地點另行報價，請用下方的聯絡表單洽詢',
    formUrl: null,       // 選填：改用外部報名表（例如 Google 表單）才需要填；留 null 就用網站本身的報名表
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
      <div><dt>梯次時間</dt><dd data-en-cohort="schedule">讀取中…</dd></div>
      <div><dt>名額</dt><dd data-en-cohort="seats">讀取中…</dd></div>
      <div><dt>費用</dt><dd data-en-cohort="price">讀取中…</dd></div>
      <div><dt>企業內訓</dt><dd>${INFO.corporate ? esc(INFO.corporate) : TODO('內訓報價方式')}</dd></div>
      <div><dt>報名與洽詢</dt><dd>
        ${INFO.formUrl ? `<a class="btn btn-primary btn-sm" href="${esc(INFO.formUrl)}" target="_blank" rel="noopener">填寫報名表 →</a>　` : ''}
        報名表就在下方；有問題可以<a href="#contact">用聯絡表單洽詢 ↓</a></dd></div>
    </dl>
    <p class="muted">報名前可以先到<a href="learn.html">課程網站</a>免費試看單元 0、1、4、7、19，確認上課方式適合你再決定。</p>`;

  // 梯次時間、名額、費用：讀講師在後台開放報名的實戰課梯次（訪客讀得到「已開放」的梯次，不用登入）
  (async () => {
    const fill = (key, html) => { const el = $(`[data-en-cohort="${key}"]`); if (el) el.innerHTML = html; };
    const none = () => {
      fill('schedule', '下一梯次確定後會公布在這裡。想先收到通知，可以用<a href="#contact">下方的聯絡表單</a>留言。');
      fill('seats', '依梯次公布');
      fill('price', '依梯次公布');
    };
    if (!window.Members?.enabled) { none(); return; }
    await window.Members.ready;
    const client = window.Members.client;
    if (!client) { none(); return; }
    const { data } = await client.from('cohorts').select('name, kind, schedule_text, place, price, capacity, waitlist_enabled, note')
      .eq('is_open', true).eq('kind', 'core').order('sort_order');
    const list = data || [];
    if (!list.length) { none(); return; }
    const many = list.length > 1;
    const each = (fn) => list.map((c) => `<div>${many ? `<b>${esc(c.name)}</b>：` : ''}${fn(c)}</div>`).join('');
    fill('schedule', each((c) => `${esc(c.schedule_text || '時間另行公布')}${c.place ? `．${esc(c.place)}` : ''}${c.note ? `<br><small class="muted">${esc(c.note)}</small>` : ''}`));
    fill('seats', each((c) => (c.capacity ? `限 ${c.capacity} 人${c.waitlist_enabled ? '，額滿可排候補' : '，額滿為止'}` : '不限人數')));
    fill('price', each((c) => window.CourseLib.priceText(c.price)));
  })();

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

  window.Tour.register([
    { tour: 'contact', title: '聯絡講師', text: '想問開班時間或企業內訓，在這裡留言就好，不用寄信。留言只有講師看得到，講師會用你留的聯絡方式回覆。' },
  ]);
})();

/*
 * signup.js — 課程報名表（招生頁）。
 *
 * 規則移植自教會活動報名系統最重要的一課：
 * 「還報得進去嗎」只有一份判斷（CourseLib.seatVerdict），
 * 表單長什麼樣、按下送出擋不擋，都問同一個函式——
 * 不然會出現「頁面說可以報，填完才說額滿」。
 *
 * 個資：這張表會收到姓名、Email、電話，前台只寫不讀（RLS 擋著），
 * 名單只有講師在後台看得到。
 */
(function () {
  'use strict';
  const { $, esc } = window.Course;
  const { seatVerdict, seatsLeft, SEAT, SEAT_MESSAGE } = window.CourseLib;

  const host = $('[data-signup]');
  if (!host) return;

  const KIND = { core: '實戰課', security: '半日資安課', custom: '客製場次' };
  let cohorts = [];
  let counts = {};

  const money = (n) => (n === null || n === undefined ? '費用另行公布' : `NT$ ${Number(n).toLocaleString('zh-TW')}`);

  function notReady(msg) {
    host.innerHTML = `<div class="su-empty">
      <b>目前沒有開放報名的梯次</b>
      <p>${esc(msg)}想先收到開班通知，或談企業內訓場次，歡迎直接與講師聯絡。</p>
    </div>`;
  }

  async function load() {
    if (!window.Members?.enabled) { notReady('（報名系統尚未啟用）'); return; }
    await window.Members.ready; // client 是在這之後才建立的
    const client = window.Members.client;
    if (!client) { notReady('（報名系統尚未啟用）'); return; }
    const { data, error } = await client.from('cohorts').select('*').eq('is_open', true).order('sort_order');
    if (error) {
      const needSql = /relation|does not exist|schema cache/i.test(error.message);
      notReady(needSql ? '（報名資料表尚未建立）' : '');
      return;
    }
    cohorts = data || [];
    const { data: taken } = await client.rpc('cohort_taken');
    counts = Object.fromEntries((taken || []).map((r) => [r.cohort_id, r]));
    if (!cohorts.length) { notReady(''); return; }
    render();
  }

  function seatLine(cohort) {
    const taken = counts[cohort.id]?.taken || 0;
    const waiting = counts[cohort.id]?.waiting || 0;
    const verdict = seatVerdict(cohort, taken);
    const left = seatsLeft(cohort, taken);
    const tone = verdict === SEAT.OK ? 'ok' : verdict === SEAT.WAITLIST ? 'warn' : 'bad';
    const detail = verdict === SEAT.OK && left !== null ? `　（還有 ${left} 位）`
      : verdict === SEAT.WAITLIST ? `　（候補中 ${waiting} 人）` : '';
    return { verdict, html: `<span class="su-seat su-seat-${tone}">${esc(SEAT_MESSAGE[verdict])}${detail}</span>` };
  }

  function render() {
    host.innerHTML = `
      <div class="su-cohorts">${cohorts.map((c) => {
        const { verdict, html } = seatLine(c);
        const open = verdict === SEAT.OK || verdict === SEAT.WAITLIST;
        return `<label class="su-cohort ${open ? '' : 'is-closed'}">
          <input type="radio" name="cohort" value="${esc(c.id)}" ${open ? '' : 'disabled'}>
          <span>
            <b>${esc(c.name)}</b>
            <small>${esc(KIND[c.kind] || '')}${c.schedule_text ? `．${esc(c.schedule_text)}` : ''}${c.place ? `．${esc(c.place)}` : ''}</small>
            <small>${esc(money(c.price))}</small>
            ${html}
            ${c.note ? `<small>${esc(c.note)}</small>` : ''}
          </span>
        </label>`;
      }).join('')}</div>

      <form class="su-form" data-su-form hidden>
        <div class="form-grid">
          <label>姓名 <span class="su-req">必填</span><input type="text" name="name" maxlength="40" required autocomplete="name"></label>
          <label>Email <span class="su-req">必填</span><input type="email" name="email" maxlength="120" required autocomplete="email"></label>
          <label>手機（方便臨時通知）<input type="tel" name="phone" maxlength="20" autocomplete="tel"></label>
          <label>單位／公司（選填）<input type="text" name="org" maxlength="60"></label>
          <label>你的工作內容（選填）<input type="text" name="role" maxlength="60" placeholder="例如：行政、業務、老師"></label>
          <label>從哪裡知道這門課（選填）<input type="text" name="source" maxlength="60"></label>
        </div>
        <label class="su-goal">最想解決的一個問題（選填，但填了對你最有幫助）
          <textarea name="goal" rows="3" maxlength="300" placeholder="例如：每個月手動整理一份 200 筆的報名表，想自動化"></textarea>
          <small>講師會用這些回答準備上課的案例。</small>
        </label>
        <p class="su-privacy">送出即表示同意講師為了辦理本課程與你聯絡而保存上述資料。資料只有講師看得到，不會提供給第三方；要查詢或刪除，來信告知即可。</p>
        <p><button type="submit" class="btn btn-primary" data-su-send>送出報名</button> <span data-su-msg aria-live="polite"></span></p>
      </form>`;

    host.querySelectorAll('[name="cohort"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const form = $('[data-su-form]');
        form.hidden = false;
        const cohort = cohorts.find((c) => c.id === radio.value);
        const { verdict } = seatLine(cohort);
        $('[data-su-send]').textContent = verdict === SEAT.WAITLIST ? '排候補' : '送出報名';
        $('[data-su-msg]').textContent = '';
      });
    });

    $('[data-su-form]').addEventListener('submit', submit);
  }

  async function submit(e) {
    e.preventDefault();
    const btn = $('[data-su-send]');
    const msg = $('[data-su-msg]');
    const picked = host.querySelector('[name="cohort"]:checked');
    const cohort = cohorts.find((c) => c.id === picked?.value);
    if (!cohort) { msg.textContent = '請先選一個梯次。'; return; }

    // 按下送出的瞬間再判斷一次：剛剛看頁面到現在，可能已經被別人報滿了
    const { data: fresh } = await window.Members.client.rpc('cohort_taken');
    counts = Object.fromEntries((fresh || []).map((r) => [r.cohort_id, r]));
    const verdict = seatVerdict(cohort, counts[cohort.id]?.taken || 0);
    if (verdict !== SEAT.OK && verdict !== SEAT.WAITLIST) {
      msg.textContent = `${SEAT_MESSAGE[verdict]}。`;
      render();
      return;
    }

    const form = new FormData(e.target);
    const row = {
      cohort_id: cohort.id,
      status: verdict === SEAT.WAITLIST ? 'waitlisted' : 'registered',
    };
    ['name', 'email', 'phone', 'org', 'role', 'source', 'goal'].forEach((k) => {
      const v = (form.get(k) || '').toString().trim();
      if (v) row[k] = v;
    });

    btn.disabled = true;
    msg.textContent = '送出中…';
    const { error } = await window.Members.client.from('signups').insert(row);
    btn.disabled = false;
    if (error) {
      msg.textContent = `送出失敗：${error.message}`;
      return;
    }
    host.innerHTML = `<div class="su-done">
      <b>✅ ${row.status === 'waitlisted' ? '已幫你排進候補' : '報名成功'}</b>
      <p>${row.status === 'waitlisted'
        ? '有人取消時會依報名順序遞補，遞補到會用 Email 通知你。'
        : '講師會用 Email 與你確認上課細節。沒收到的話，記得看一下垃圾信匣。'}</p>
      <p class="muted">梯次：${esc(cohort.name)}${cohort.schedule_text ? `．${esc(cohort.schedule_text)}` : ''}</p>
      <p><a class="btn" href="learn.html">先去看課前自學教材 →</a></p>
    </div>`;
  }

  load();
})();

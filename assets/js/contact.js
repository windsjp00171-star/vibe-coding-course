/*
 * contact.js — 聯絡表單。取代網頁上直接公開的講師 Email（會被爬蟲收去寄垃圾信）。
 * 用法：<div data-contact data-contact-page="enroll" data-contact-topic="course"></div>
 *   加上 data-contact-lock：主題固定，不讓人改（例如作品牆的「作品投稿」）
 * 意見回饋表：<div data-feedback></div>（單元、推薦指數、卡住的地方、建議，存成主題「課程意見回饋」）
 * 留言寫進 Supabase 的 contact_messages（supabase/add-contact.sql、add-community.sql），前台只寫不讀，只有講師在後台看得到。
 */
(function () {
  'use strict';
  const { $, esc } = window.Course;
  const { CONTACT_TOPICS, checkContact } = window.CourseLib;
  // 主題固定時的標題、說明、提示文字
  const COPY = {
    works: { title: '📮 投稿作品', intro: '寫下作品名稱、給誰用、做了多久，再附上可以點開來看的網址或截圖連結。講師看過後會用你留的聯絡方式跟你確認要公開的稱呼。',
      placeholder: '例如：社區共餐報名表，給社區志工用，做了兩個晚上。網址：https://…', send: '送出投稿' },
  };

  // 送出（聯絡表單和意見回饋共用）：機器人陷阱、寫入、錯誤訊息
  async function send(row, { trap, btn, msg, onDone }) {
    if (trap) { onDone(); return; } // 機器人填了陷阱欄位：假裝成功，不寫進資料庫
    if (!window.Members?.enabled) { msg.textContent = '表單尚未啟用，請稍後再試。'; return; }
    btn.disabled = true;
    msg.textContent = '送出中…';
    await window.Members.ready;
    const client = window.Members.client;
    const { error } = client ? await client.from('contact_messages').insert(row) : { error: { message: 'no client' } };
    btn.disabled = false;
    if (error) {
      msg.textContent = /relation|does not exist|schema cache|check constraint/i.test(error.message)
        ? '表單尚未啟用，請稍後再試。'
        : '送出失敗，可能是網路不穩，請稍後再試一次。';
      return;
    }
    onDone();
  }

  document.querySelectorAll('[data-contact]').forEach((host) => {
    const page = host.dataset.contactPage || '';
    const preset = host.dataset.contactTopic || 'other';
    const lock = 'contactLock' in host.dataset;
    const copy = (lock && COPY[preset]) || {};

    host.innerHTML = `
      <h3>${esc(copy.title || '✉️ 聯絡講師')}</h3>
      <p class="muted">${esc(copy.intro || '想問開班時間、企業內訓、到單位講座，都可以從這裡留言。講師會用你留的聯絡方式回覆。')}</p>
      <form class="form-grid ct-form" data-ct-form novalidate>
        <label>怎麼稱呼你<input type="text" name="name" maxlength="40" autocomplete="name" required placeholder="例如：王小姐"></label>
        <label>怎麼聯絡你<input type="text" name="contact" maxlength="120" autocomplete="email" required placeholder="Email、電話或 LINE ID 擇一"></label>
        ${lock ? `<input type="hidden" name="topic" value="${esc(preset)}">` : `<label>想問什麼<select name="topic">${Object.entries(CONTACT_TOPICS).map(([k, v]) =>
          `<option value="${k}" ${k === preset ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`}
        <label>內容<textarea name="message" rows="4" maxlength="2000" required placeholder="${esc(copy.placeholder || '例如：我們公司約 20 人，想安排半天的 AI 資安講座，11 月有空檔嗎？')}"></textarea></label>
        <!-- 給機器人看的欄位：真人看不到也不會填，填了就是機器人 -->
        <label class="ct-trap" aria-hidden="true">網站<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
        <p class="ct-row"><button type="submit" class="btn btn-primary" data-ct-send>${esc(copy.send || '送出留言')}</button><span class="muted" data-ct-msg aria-live="polite"></span></p>
        <p class="muted ct-note">留言只有講師看得到，不會公開，也不會拿去做別的用途（<a href="privacy.html">隱私權政策</a>）。</p>
      </form>`;

    const form = $('[data-ct-form]', host);
    const msg = $('[data-ct-msg]', host);
    const btn = $('[data-ct-send]', host);
    form.addEventListener('input', () => { if (!btn.disabled) msg.textContent = ''; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const row = {
        name: (f.get('name') || '').toString().trim(),
        contact: (f.get('contact') || '').toString().trim(),
        topic: (f.get('topic') || '').toString(),
        message: (f.get('message') || '').toString().trim(),
      };
      const problem = checkContact(row);
      if (problem) { msg.textContent = problem; return; }
      send({ ...row, page }, { trap: (f.get('website') || '').toString(), btn, msg, onDone: done });
    });

    function done() {
      host.innerHTML = `<div class="su-done"><b>✅ 已收到你的留言</b>
        <p>講師會用你留的聯絡方式回覆。如果是 Email，記得也看一下垃圾信匣。</p></div>`;
    }
  });

  // ---------- 試上意見回饋表 ----------
  document.querySelectorAll('[data-feedback]').forEach((host) => {
    const units = (window.Course?.MODULES || []).map((m) => `<option value="單元 ${m.id.slice(1)} ${esc(m.title)}">單元 ${m.id.slice(1)}　${esc(m.title)}</option>`).join('');
    host.innerHTML = `
      <h3>💬 給講師的意見回饋</h3>
      <p class="muted">試上的感想、卡住的地方、看不懂的段落都很有用。只有講師看得到，不會公開。</p>
      <form class="form-grid ct-form" data-fb-form novalidate>
        <label>上到哪個單元<select name="unit"><option value="">（還沒開始／不確定）</option>${units}</select></label>
        <fieldset class="fb-stars"><legend>會推薦給不會寫程式的朋友嗎？</legend>
          ${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="score" value="${n}"> ${n}</label>`).join('')}
          <span class="muted">1＝不會　5＝一定會</span></fieldset>
        <label>哪裡卡住、哪裡看不懂？<textarea name="stuck" rows="3" maxlength="900" placeholder="例如：單元 02 安裝到一半，終端機出現紅字就不知道怎麼辦"></textarea></label>
        <label>其他想說的<textarea name="more" rows="3" maxlength="900" placeholder="最喜歡哪一段、希望多教什麼……"></textarea></label>
        <label>怎麼稱呼你（選填）<input type="text" name="name" maxlength="40" placeholder="不填就是「試上學員」"></label>
        <label>想要講師回覆的話，留個聯絡方式（選填）<input type="text" name="contact" maxlength="120" placeholder="Email、電話或 LINE ID"></label>
        <label class="ct-trap" aria-hidden="true">網站<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
        <p class="ct-row"><button type="submit" class="btn btn-primary" data-fb-send>送出回饋</button><span class="muted" data-fb-msg aria-live="polite"></span></p>
      </form>`;
    const form = $('[data-fb-form]', host);
    const msg = $('[data-fb-msg]', host);
    const btn = $('[data-fb-send]', host);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const get = (k) => (f.get(k) || '').toString().trim();
      if (!get('stuck') && !get('more') && !get('score')) { msg.textContent = '至少選一個推薦指數，或寫一句話。'; return; }
      const message = [
        `【試上回饋】${get('unit') || '（沒選單元）'}`,
        get('score') ? `推薦指數：${get('score')} / 5` : '',
        get('stuck') ? `卡住的地方：${get('stuck')}` : '',
        get('more') ? `其他：${get('more')}` : '',
      ].filter(Boolean).join('\n');
      // 稱呼、聯絡方式都是選填：沒填就不帶登入的名字和 Email，照畫面上說的寫「試上學員」「不用回覆」
      send({
        name: get('name') || '試上學員',
        contact: get('contact') || '不用回覆',
        topic: 'feedback', message, page: location.pathname.split('/').pop() || 'learn',
      }, {
        trap: get('website'), btn, msg,
        onDone: () => { host.innerHTML = '<div class="su-done"><b>✅ 謝謝你的回饋！</b><p>講師會一則一則看，拿來改課程。</p></div>'; },
      });
    });
  });
})();

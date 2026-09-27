/*
 * contact.js — 聯絡表單。取代網頁上直接公開的講師 Email（會被爬蟲收去寄垃圾信）。
 * 用法：<div data-contact data-contact-page="enroll" data-contact-topic="course"></div>
 * 留言寫進 Supabase 的 contact_messages（supabase/add-contact.sql），前台只寫不讀，只有講師在後台看得到。
 */
(function () {
  'use strict';
  const { $, esc } = window.Course;
  const { CONTACT_TOPICS, checkContact } = window.CourseLib;

  document.querySelectorAll('[data-contact]').forEach((host) => {
    const page = host.dataset.contactPage || '';
    const preset = host.dataset.contactTopic || 'other';

    host.innerHTML = `
      <h3>✉️ 聯絡講師</h3>
      <p class="muted">想問開班時間、企業內訓、到單位講座，都可以從這裡留言。講師會用你留的聯絡方式回覆。</p>
      <form class="form-grid ct-form" data-ct-form novalidate>
        <label>怎麼稱呼你<input type="text" name="name" maxlength="40" autocomplete="name" required placeholder="例如：王小姐"></label>
        <label>怎麼聯絡你<input type="text" name="contact" maxlength="120" autocomplete="email" required placeholder="Email、電話或 LINE ID 擇一"></label>
        <label>想問什麼<select name="topic">${Object.entries(CONTACT_TOPICS).map(([k, v]) =>
          `<option value="${k}" ${k === preset ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label>內容<textarea name="message" rows="4" maxlength="2000" required placeholder="例如：我們公司約 20 人，想安排半天的 AI 資安講座，11 月有空檔嗎？"></textarea></label>
        <!-- 給機器人看的欄位：真人看不到也不會填，填了就是機器人 -->
        <label class="ct-trap" aria-hidden="true">網站<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
        <p class="ct-row"><button type="submit" class="btn btn-primary" data-ct-send>送出留言</button><span class="muted" data-ct-msg aria-live="polite"></span></p>
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
      // 機器人填了陷阱欄位：假裝成功，不寫進資料庫
      if ((f.get('website') || '').toString()) { done(); return; }

      if (!window.Members?.enabled) { msg.textContent = '聯絡表單尚未啟用，請稍後再試。'; return; }
      btn.disabled = true;
      msg.textContent = '送出中…';
      await window.Members.ready;
      const client = window.Members.client;
      const { error } = client
        ? await client.from('contact_messages').insert({ ...row, page })
        : { error: { message: 'no client' } };
      btn.disabled = false;
      if (error) {
        msg.textContent = /relation|does not exist|schema cache/i.test(error.message)
          ? '聯絡表單尚未啟用，請稍後再試。'
          : '送出失敗，可能是網路不穩，請稍後再試一次。';
        return;
      }
      done();
    });

    function done() {
      host.innerHTML = `<div class="su-done"><b>✅ 已收到你的留言</b>
        <p>講師會用你留的聯絡方式回覆。如果是 Email，記得也看一下垃圾信匣。</p></div>`;
    }
  });
})();

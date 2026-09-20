/*
 * verify.js — 公開的證書查證頁。
 * 只能用完整編號查，而且只回傳姓名、分數、結業日期；查不到就說查不到，不多給線索。
 */
(function () {
  'use strict';
  const { $, esc } = window.Course;
  const { normalizeCertCode, formatCertCode, isCertCode } = window.CourseLib;

  const out = $('[data-vf-out]');
  const input = $('[data-vf-input]');

  const box = (kind, html) => { out.innerHTML = `<div class="vf-result vf-${kind}">${html}</div>`; };

  async function lookup(raw) {
    const code = normalizeCertCode(raw);
    if (!code) { out.innerHTML = ''; return; }
    if (!isCertCode(code)) {
      box('bad', '<b>編號格式不對</b><p>證書編號是 VC 開頭、共 12 碼，例如 VCH7-K2M9-QX4T。請對照紙本重新輸入。</p>');
      return;
    }
    if (!window.Members?.enabled) {
      box('warn', '<b>目前無法查證</b><p>這個網站還沒設定查證服務，請直接聯絡課程講師確認。</p>');
      return;
    }
    box('wait', '查詢中…');
    try {
      const cert = await window.Members.verifyCertificate(code);
      if (!cert) {
        box('bad', `<b>查無此證書</b><p>編號 ${esc(formatCertCode(code))} 沒有對應的結業紀錄。可能是抄錯了一個字，或這張證書不是由本課程核發。</p>`);
        return;
      }
      const date = new Date(cert.issued_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
      box('ok', `<b>✅ 這是一張有效的結業證書</b>
        <dl class="vf-fields">
          <dt>姓名</dt><dd>${esc(cert.display_name)}</dd>
          <dt>課程</dt><dd>Vibe Coding 實戰課（必修）</dd>
          <dt>總測驗</dt><dd>${esc(String(cert.score))} 分（80 分以上為通過）</dd>
          <dt>結業日期</dt><dd>${esc(date)}</dd>
          <dt>證書編號</dt><dd>${esc(formatCertCode(code))}</dd>
        </dl>
        <p class="muted">本頁只顯示上述欄位，不會提供學員的聯絡方式或其他資料。</p>`);
    } catch (err) {
      // 資料表還沒建立時不要把資料庫訊息丟給訪客看，那不是他能處理的事
      const notReady = /schema cache|function|relation|does not exist/i.test(err.message);
      box('warn', notReady
        ? '<b>查證服務尚未啟用</b><p>這個網站還沒開啟線上查證，請直接聯絡課程講師確認證書。</p>'
        : `<b>查詢失敗</b><p>${esc(err.message)}</p>`);
    }
  }

  $('[data-vf-form]').addEventListener('submit', (e) => { e.preventDefault(); lookup(input.value); });

  const fromUrl = new URLSearchParams(location.search).get('c');
  if (fromUrl) { input.value = formatCertCode(fromUrl); lookup(fromUrl); }

  window.Tour.register([]);
})();

/*
 * app.js — 登記系統的程式。一般不用改：表單欄位在 config.js，權限在 setup.sql。
 * 誰能看到什麼由資料庫（RLS）決定，這支程式公開也沒關係。
 */
(function () {
  'use strict';
  const APP = window.APP || {};
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STATUS = { 待處理: '', 已確認: 'is-ok', 已取消: 'is-off' };

  document.title = APP.title || '登記系統';
  $('[data-title]').textContent = APP.title || '登記系統';
  $('[data-intro]').textContent = APP.intro || '';

  function notice(text, tone = 'ok') {
    $('[data-notice]').innerHTML = text ? `<div class="notice notice-${tone}">${text}</div>` : '';
  }

  if (!APP.supabaseUrl || !APP.supabaseKey) {
    notice('還沒設定資料庫：請打開 <b>config.js</b>，填上 supabaseUrl 和 supabaseKey（步驟在 README.md）。', 'warn');
    return;
  }
  const db = window.supabase.createClient(APP.supabaseUrl, APP.supabaseKey);
  const useLine = APP.login === 'line';
  let user = null;
  $('[data-login-email]').hidden = useLine;
  $('[data-login-line]').hidden = !useLine;

  // ---------- LINE 登入：去 LINE 同意 → 帶著一次性代碼回來 → 交給後端換成登入狀態 ----------
  const here = location.origin + location.pathname;
  $('[data-line-login]').addEventListener('click', () => {
    if (!APP.lineChannelId) { notice('還沒設定 LINE：請在 config.js 填上 lineChannelId（步驟在 LINE.md）。', 'warn'); return; }
    // state 是防偽造的暗號：回來時對不上就不處理（單元 13）
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('line_state', state);
    location.href = 'https://access.line.me/oauth2/v2.1/authorize?' + new URLSearchParams({
      response_type: 'code', client_id: APP.lineChannelId, redirect_uri: here, state, scope: 'profile openid', bot_prompt: 'aggressive',
    });
  });
  async function finishLineLogin() {
    const params = new URLSearchParams(location.search);
    if (!params.has('code') && !params.has('error')) return;
    history.replaceState(null, '', here); // 網址列不留代碼
    const expected = sessionStorage.getItem('line_state');
    sessionStorage.removeItem('line_state');
    if (params.has('error')) { notice('LINE 登入取消了，可以再按一次「用 LINE 登入」。', 'warn'); return; }
    if (!expected || params.get('state') !== expected) { notice('登入連結對不上，為了安全沒有登入。請重新按一次「用 LINE 登入」。', 'bad'); return; }
    notice('登入中…', 'warn');
    try {
      const res = await fetch(`${APP.supabaseUrl}/functions/v1/line-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: APP.supabaseKey, Authorization: `Bearer ${APP.supabaseKey}` },
        body: JSON.stringify({ code: params.get('code'), redirectUri: here }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `登入失敗（${res.status}）`);
      const { error } = await db.auth.verifyOtp({ token_hash: body.token_hash, type: 'magiclink' });
      if (error) throw error;
    } catch (err) {
      notice(`LINE 登入失敗：${esc(err.message)}`, 'bad');
    }
  }
  if (useLine) finishLineLogin();

  // ---------- 登入：寄一封有登入連結的信 ----------
  $('[data-login-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    const email = new FormData(e.target).get('email').toString().trim();
    const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    btn.disabled = false;
    if (error) {
      const tooMany = /rate|limit|seconds/i.test(error.message);
      notice(tooMany ? '寄信太頻繁了，請等幾分鐘再試（免費方案每小時能寄的信有限）。' : `寄信失敗：${esc(error.message)}`, 'bad');
      return;
    }
    notice(`登入連結已寄到 <b>${esc(email)}</b>，請到信箱點連結（沒收到的話看一下垃圾郵件）。`);
  });
  $('[data-logout]').addEventListener('click', () => db.auth.signOut());

  // ---------- 表單：照 config.js 的 fields 產生 ----------
  function fieldHtml(f) {
    const req = f.required ? 'required' : '';
    const max = f.max ? `maxlength="${Number(f.max)}"` : '';
    const name = `name="${esc(f.key)}"`;
    const input = f.type === 'textarea' ? `<textarea ${name} ${req} ${max}></textarea>`
      : f.type === 'select' ? `<select ${name} ${req}><option value="">請選擇</option>${(f.options || []).map((o) => `<option>${esc(o)}</option>`).join('')}</select>`
        : `<input type="${['date', 'number', 'tel'].includes(f.type) ? f.type : 'text'}" ${name} ${req} ${max}>`;
    return `<label>${esc(f.label)}${f.required ? '（必填）' : ''}${input}</label>`;
  }
  const form = $('[data-entry-form]');
  form.innerHTML = (APP.fields || []).map(fieldHtml).join('') + '<button type="submit" class="btn">送出</button>';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, v.toString().trim()]));
    const btn = form.querySelector('button');
    btn.disabled = true;
    const { error } = await db.from('entries').insert({ data });
    btn.disabled = false;
    if (error) { notice(`送出失敗：${esc(error.message)}`, 'bad'); return; }
    notice('✅ 送出了！');
    form.reset();
    refresh();
  });

  // ---------- 顯示資料 ----------
  const label = (key) => (APP.fields || []).find((f) => f.key === key)?.label || key;
  const when = (iso) => new Date(iso).toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' });
  const pill = (s) => `<span class="pill ${STATUS[s] ?? ''}">${esc(s)}</span>`;

  function renderMine(rows) {
    $('[data-mine-list]').innerHTML = rows.length ? rows.map((r) => `
      <div class="item">
        <dl>${Object.entries(r.data).map(([k, v]) => `<dt>${esc(label(k))}</dt><dd>${esc(v) || '—'}</dd>`).join('')}
          <dt>狀態</dt><dd>${pill(r.status)}</dd><dt>時間</dt><dd>${esc(when(r.created_at))}</dd></dl>
        <button type="button" class="btn btn-ghost btn-sm" data-del="${esc(r.id)}">刪除</button>
      </div>`).join('') : '<p class="muted">還沒有登記。</p>';
  }

  let allRows = [];
  function renderAdmin(rows) {
    allRows = rows;
    const keys = (APP.fields || []).map((f) => f.key);
    $('[data-admin-list]').innerHTML = rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>時間</th>${keys.map((k) => `<th>${esc(label(k))}</th>`).join('')}<th>狀態</th><th></th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${esc(when(r.created_at))}</td>${keys.map((k) => `<td>${esc(r.data[k]) || '—'}</td>`).join('')}
        <td><select data-status="${esc(r.id)}" aria-label="狀態">${Object.keys(STATUS).map((s) => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
        <td><button type="button" class="btn btn-ghost btn-sm" data-del="${esc(r.id)}">刪除</button></td></tr>`).join('')}</tbody></table></div>`
      : '<p class="muted">還沒有人登記。</p>';
  }

  async function refresh() {
    if (!user) return;
    const { data: rows, error } = await db.from('entries').select('*').order('created_at', { ascending: false });
    if (error) {
      notice(/relation|does not exist|schema cache/i.test(error.message)
        ? '資料庫還沒建好：請到 Supabase → SQL Editor 執行 <b>setup.sql</b>（步驟在 README.md）。'
        : `讀取失敗：${esc(error.message)}`, 'bad');
      return;
    }
    renderMine(rows.filter((r) => r.user_id === user.id));
    const { data: admin } = await db.rpc('is_admin');
    $('[data-admin]').hidden = !admin;
    if (admin) renderAdmin(rows);
  }

  document.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      if (!window.confirm('確定要刪除這筆登記嗎？刪除後無法復原。')) return;
      const { error } = await db.from('entries').delete().eq('id', del.dataset.del);
      notice(error ? `刪除失敗：${esc(error.message)}` : '已刪除', error ? 'bad' : 'ok');
      refresh();
      return;
    }
    const exp = e.target.closest('[data-export]');
    if (exp) download(exp.dataset.export);
  });
  document.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-status]');
    if (!sel) return;
    const { error } = await db.from('entries').update({ status: sel.value }).eq('id', sel.dataset.status);
    notice(error ? `更新失敗：${esc(error.message)}` : '狀態已更新', error ? 'bad' : 'ok');
  });

  // ---------- 匯出：CSV 給 Excel，JSON 當備份（reader.html 可以離線打開） ----------
  function download(kind) {
    const keys = (APP.fields || []).map((f) => f.key);
    const stamp = new Date().toISOString().slice(0, 10);
    let text;
    if (kind === 'csv') {
      const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const head = ['時間', ...keys.map(label), '狀態'];
      const body = allRows.map((r) => [when(r.created_at), ...keys.map((k) => r.data[k]), r.status]);
      text = '﻿' + [head, ...body].map((row) => row.map(cell).join(',')).join('\r\n'); // ﻿ 讓 Excel 認得中文
    } else {
      text = JSON.stringify({ title: APP.title, exported_at: new Date().toISOString(), fields: APP.fields, rows: allRows }, null, 2);
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: kind === 'csv' ? 'text/csv' : 'application/json' }));
    a.download = `backup-${stamp}.${kind}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---------- 登入狀態 ----------
  db.auth.onAuthStateChange((_event, session) => {
    user = session?.user || null;
    $('[data-login]').hidden = Boolean(user);
    ['[data-app]', '[data-mine]', '[data-who]'].forEach((s) => { $(s).hidden = !user; });
    if (!user) $('[data-admin]').hidden = true;
    $('[data-email]').textContent = user?.user_metadata?.name || user?.email || '';
    // LINE 帳號沒有 Email，管理者名單要填這個設定碼（README 的「設定管理者」）
    $('[data-admin-code]').hidden = !(user && useLine);
    $('[data-admin-code]').textContent = user && useLine ? `管理者設定碼：${user.email}（要把這個帳號設成管理者時，把這串填進 setup.sql 最後一行）` : '';
    // 在這個回呼裡直接呼叫資料庫可能會卡住（supabase-js 的已知限制），所以晚一拍再讀
    if (user) { notice(''); setTimeout(refresh, 0); }
  });
})();

/* teacher-dashboard.js — 講師後台：開班級、看全班進度（資料權限由 Supabase RLS 把關） */
(function () {
  'use strict';
  const { $, esc, MODULES, toast } = window.Course;
  const host = $('[data-dashboard]');
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉 0/O、1/I 這些容易看錯的字
  const CODE_LENGTH = 6;

  function show(html) { host.innerHTML = `<div class="card">${html}</div>`; }

  function newCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
    return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
  }

  async function render() {
    const M = window.Members;
    if (!M.enabled) {
      show('<h3>會員功能還沒啟用</h3><p>請照 <code>docs/SETUP-MEMBERS.md</code> 設定 Supabase 和 Google 登入，並把網址和 Publishable key 填進 <code>assets/js/config.js</code>。</p>');
      return;
    }
    await M.ready;
    if (!M.user) {
      show('<h3>請先登入</h3><p>用你被設定為講師的 Google 帳號登入。</p><button type="button" class="btn btn-primary" data-auth="in">用 Google 登入</button>');
      return;
    }
    if (M.profile?.role !== 'teacher') {
      show(`<h3>這個帳號不是講師</h3><p>目前登入：${esc(M.user.email)}。如果這是你的講師帳號，請到 Supabase 的 SQL Editor 執行 <code>schema.sql</code> 最下方那行「設定講師」。</p>`);
      return;
    }
    await renderClasses();
  }

  async function renderClasses() {
    const db = window.Members.client;
    const { data: classes, error } = await db.from('classes').select('id, name, join_code, created_at').eq('teacher_id', window.Members.user.id).order('created_at', { ascending: false });
    if (error) { show(`<p>讀取班級失敗：${esc(error.message)}</p>`); return; }
    const blocks = await Promise.all((classes || []).map(renderClass));
    host.innerHTML = `
      <div class="card" style="margin-bottom:18px">
        <h3>開一個新班級</h3>
        <form class="split" data-new-class style="align-items:end">
          <label class="form-grid">班級名稱<input type="text" name="name" maxlength="60" required placeholder="例如：2026 秋季週六班"></label>
          <div><button type="submit" class="btn btn-primary">建立並產生加入碼</button></div>
        </form>
      </div>
      ${blocks.join('') || '<div class="card"><p class="muted">還沒有班級。建立一個，把加入碼給學員。</p></div>'}`;
  }

  async function renderClass(c) {
    const db = window.Members.client;
    const { data: members } = await db.from('class_members').select('user_id').eq('class_id', c.id);
    const ids = (members || []).map((m) => m.user_id);
    const [{ data: people }, { data: rows }] = ids.length
      ? await Promise.all([
        db.from('profiles').select('id, display_name').in('id', ids),
        db.from('progress').select('user_id, module_id, best, done').in('user_id', ids),
      ])
      : [{ data: [] }, { data: [] }];
    const mods = MODULES.filter((m) => m.ready);
    const cell = (uid, mid) => {
      const p = (rows || []).find((r) => r.user_id === uid && r.module_id === mid);
      if (!p) return '<td>—</td>';
      return `<td class="${p.done ? 'cell-done' : 'cell-try'}">${p.done ? '✓' : ''}${p.best}</td>`;
    };
    const body = (people || []).map((u) => `<tr><td>${esc(u.display_name || '（未命名）')}</td>${mods.map((m) => cell(u.id, m.id)).join('')}</tr>`).join('');
    return `<div class="card" style="margin-bottom:18px">
      <div class="quiz-head"><h3 style="margin:0">${esc(c.name)}</h3><span>加入碼 <span class="code-badge">${esc(c.join_code)}</span></span></div>
      <p class="muted">${ids.length} 位學員．綠色是已過關（數字是最佳分數），黃色是作答過但還沒過關。</p>
      <div class="table-wrap"><table class="roster"><thead><tr><th>學員</th>${mods.map((m) => `<th title="${esc(m.title)}">${m.emoji} ${m.id.slice(1)}</th>`).join('')}</tr></thead>
      <tbody>${body || `<tr><td colspan="${mods.length + 1}" class="muted">還沒有學員加入。請學員到課程首頁輸入加入碼。</td></tr>`}</tbody></table></div></div>`;
  }

  host.addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-new-class]')) return;
    e.preventDefault();
    const name = new FormData(e.target).get('name').toString().trim();
    if (!name) return;
    const { error } = await window.Members.client.from('classes').insert({ name, join_code: newCode(), teacher_id: window.Members.user.id });
    if (error) { toast(`建立失敗：${error.message}`); return; }
    toast('班級建立好了，把加入碼給學員吧');
    renderClasses();
  });

  document.addEventListener('course:auth', render);
  render();

  window.Tour.register([
    { tour: 'dash', title: '講師後台', text: '先用講師的 Google 帳號登入。開好班級後，把 6 碼加入碼給學員，這裡就會出現全班的進度表。' },
  ]);
})();

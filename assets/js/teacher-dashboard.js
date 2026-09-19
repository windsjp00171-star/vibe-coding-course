/* teacher-dashboard.js — 管理後台：會員開通與身分、開班級、看全班進度（資料權限由 Supabase RLS 把關） */
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
    host.innerHTML = `<div class="tab-row" data-admin-tabs>
        <button type="button" data-admin-tab="members" aria-pressed="${tab === 'members'}">👥 會員管理</button>
        <button type="button" data-admin-tab="classes" aria-pressed="${tab === 'classes'}">🏫 班級</button>
      </div><div data-admin-body></div>`;
    if (tab === 'members') await renderMembers(); else await renderClasses();
  }

  let tab = 'members';
  let memberFilter = 'pending';

  // ---------- 會員管理 ----------
  async function renderMembers() {
    const db = window.Members.client;
    const [{ data: people, error }, { data: rows }, { data: invites, error: inviteErr }] = await Promise.all([
      db.from('profiles').select('id, display_name, email, role, enrolled, created_at').order('created_at', { ascending: false }),
      db.from('progress').select('user_id, done'),
      db.from('teacher_invites').select('email, created_at').order('created_at', { ascending: false }),
    ]);
    const body = $('[data-admin-body]');
    if (error) { body.innerHTML = `<div class="card"><p>讀取會員失敗：${esc(error.message)}</p></div>`; return; }
    const doneCount = (uid) => (rows || []).filter((r) => r.user_id === uid && r.done).length;
    const filters = {
      pending: (u) => !u.enrolled && u.role !== 'teacher',
      enrolled: (u) => u.enrolled && u.role !== 'teacher',
      teacher: (u) => u.role === 'teacher',
      all: () => true,
    };
    const counts = Object.fromEntries(Object.entries(filters).map(([k, f]) => [k, people.filter(f).length]));
    const list = people.filter(filters[memberFilter]);
    const label = { pending: '待開通', enrolled: '已開通', teacher: '講師', all: '全部' };
    // 邀請講師：資料庫還沒加上邀請功能時（inviteErr），提示要執行 add-teacher-invites.sql
    const inviteBlock = inviteErr
      ? '<div class="card" style="margin-bottom:18px"><h3>✉️ 邀請講師</h3><p class="muted">要啟用這個功能，請到 Supabase SQL Editor 執行一次 <code>supabase/add-teacher-invites.sql</code>。</p></div>'
      : `<div class="card" style="margin-bottom:18px"><h3>✉️ 邀請講師</h3>
        <form class="split" data-invite style="align-items:end">
          <label class="form-grid">對方的 Google Email<input type="email" name="email" required placeholder="例如：helper@gmail.com"></label>
          <div><button type="submit" class="btn btn-primary">設為講師</button></div>
        </form>
        <p class="muted" style="margin:8px 0 0">已經登入過的人會立刻變成講師；還沒登入過的人，第一次用 Google 登入時會自動變成講師。</p>
        ${(invites || []).length ? `<p style="margin:12px 0 4px"><b>等待對方第一次登入：</b></p><ul class="checklist">${invites.map((i) => `
          <li><span>${esc(i.email)} <button type="button" class="btn btn-sm btn-ghost" data-uninvite="${esc(i.email)}">取消邀請</button></span></li>`).join('')}</ul>` : ''}</div>`;
    body.innerHTML = `${inviteBlock}<div class="card">
      <div class="chip-row" style="margin-bottom:12px">${Object.keys(filters).map((k) =>
        `<button type="button" class="chip" aria-pressed="${k === memberFilter}" data-member-filter="${k}">${label[k]} ${counts[k]}</button>`).join('')}</div>
      <div class="table-wrap"><table class="roster"><thead><tr><th>會員</th><th>Email</th><th>加入日期</th><th>完成單元</th><th>狀態</th><th>操作</th></tr></thead>
      <tbody>${list.map((u) => `<tr>
        <td>${esc(u.display_name || '（未命名）')}</td><td>${esc(u.email)}</td>
        <td>${new Date(u.created_at).toLocaleDateString('zh-TW')}</td><td>${doneCount(u.id)}</td>
        <td>${u.role === 'teacher' ? '<span class="pill pill-brand">講師</span>' : u.enrolled ? '<span class="pill pill-ok">已開通</span>' : '<span class="pill pill-warn">待開通</span>'}</td>
        <td>${u.id === window.Members.user.id ? '<span class="muted">（你自己）</span>' : `
          <button type="button" class="btn btn-sm" data-set="${u.id}" data-enrolled="${!u.enrolled}" data-role="${u.role}">${u.enrolled ? '取消開通' : '開通'}</button>
          <button type="button" class="btn btn-sm btn-ghost" data-set="${u.id}" data-enrolled="true" data-role="${u.role === 'teacher' ? 'student' : 'teacher'}">${u.role === 'teacher' ? '改回學員' : '設為講師'}</button>`}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="muted">這個分類目前沒有會員。</td></tr>'}</tbody></table></div>
      <p class="muted" style="margin:10px 0 0">學員用 Google 登入後會出現在「待開通」。用加入碼加入班級的學員會自動開通。</p></div>`;
  }

  async function setMember(btn) {
    const role = btn.dataset.role;
    if (role === 'teacher' && !window.confirm('講師看得到所有會員的資料和進度，確定要設為講師嗎？')) return;
    const { error } = await window.Members.client.rpc('admin_set_member', {
      target: btn.dataset.set, new_enrolled: btn.dataset.enrolled === 'true', new_role: role,
    });
    if (error) { toast(`設定失敗：${error.message}`); return; }
    toast('已更新');
    renderMembers();
  }

  async function renderClasses() {
    const db = window.Members.client;
    const { data: classes, error } = await db.from('classes').select('id, name, join_code, created_at').eq('teacher_id', window.Members.user.id).order('created_at', { ascending: false });
    if (error) { $('[data-admin-body]').innerHTML = `<div class="card"><p>讀取班級失敗：${esc(error.message)}</p></div>`; return; }
    const blocks = await Promise.all((classes || []).map(renderClass));
    $('[data-admin-body]').innerHTML = `
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
    if (e.target.matches('[data-invite]')) {
      e.preventDefault();
      const email = new FormData(e.target).get('email').toString().trim();
      const { data, error } = await window.Members.client.rpc('admin_invite_teacher', { invite_email: email });
      if (error) { toast(`設定失敗：${error.message}`); return; }
      toast(data === 'promoted' ? `${email} 已經是講師了` : `已邀請 ${email}，對方第一次登入就會成為講師`);
      renderMembers();
      return;
    }
    if (!e.target.matches('[data-new-class]')) return;
    e.preventDefault();
    const name = new FormData(e.target).get('name').toString().trim();
    if (!name) return;
    const { error } = await window.Members.client.from('classes').insert({ name, join_code: newCode(), teacher_id: window.Members.user.id });
    if (error) { toast(`建立失敗：${error.message}`); return; }
    toast('班級建立好了，把加入碼給學員吧');
    renderClasses();
  });

  host.addEventListener('click', (e) => {
    const t = e.target.closest('[data-admin-tab]');
    if (t) { tab = t.dataset.adminTab; render(); return; }
    const f = e.target.closest('[data-member-filter]');
    if (f) { memberFilter = f.dataset.memberFilter; renderMembers(); return; }
    const setBtn = e.target.closest('[data-set]');
    if (setBtn) setMember(setBtn);
    const un = e.target.closest('[data-uninvite]');
    if (un) {
      window.Members.client.from('teacher_invites').delete().eq('email', un.dataset.uninvite)
        .then(({ error }) => { toast(error ? `取消失敗：${error.message}` : '已取消邀請'); renderMembers(); });
    }
  });

  document.addEventListener('course:auth', render);
  render();

  window.Tour.register([
    { tour: 'dash', title: '管理後台', text: '「會員管理」可以開通學員、設定講師；「班級」可以開班、把 6 碼加入碼給學員，看全班進度。' },
  ]);
})();

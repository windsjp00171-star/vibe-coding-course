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
        <button type="button" data-admin-tab="overview" aria-pressed="${tab === 'overview'}">📊 總覽</button>
        <button type="button" data-admin-tab="members" aria-pressed="${tab === 'members'}">👥 會員管理</button>
        <button type="button" data-admin-tab="classes" aria-pressed="${tab === 'classes'}">🏫 班級</button>
        <button type="button" data-admin-tab="stuck" aria-pressed="${tab === 'stuck'}">🧭 卡關分析</button>
        <button type="button" data-admin-tab="files" aria-pressed="${tab === 'files'}">📁 教材下載</button>
      </div><div data-admin-body></div>`;
    const render = { overview: renderOverview, members: renderMembers, classes: renderClasses, stuck: renderStuck, files: renderFiles }[tab];
    await render();
  }

  let tab = 'overview';
  let memberFilter = 'pending';
  let memberSearch = '';

  const download = (name, text) => {
    const url = URL.createObjectURL(new Blob([`\ufeff${text}`], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- 總覽 ----------
  async function renderOverview() {
    const db = window.Members.client;
    const [{ data: people }, { data: rows }, { data: classes }] = await Promise.all([
      db.from('profiles').select('id, role, enrolled'),
      db.from('progress').select('user_id, module_id, done'),
      db.from('classes').select('id, name, open_until').eq('teacher_id', window.Members.user.id),
    ]);
    const students = (people || []).filter((u) => u.role !== 'teacher');
    const enrolled = students.filter((u) => u.enrolled);
    const ready = MODULES.filter((m) => m.ready).length;
    const doneByUser = {};
    (rows || []).forEach((r) => { if (r.done) doneByUser[r.user_id] = (doneByUser[r.user_id] || 0) + 1; });
    const active = Object.keys(doneByUser).length;
    const avg = enrolled.length ? (enrolled.reduce((n, u) => n + (doneByUser[u.id] || 0), 0) / enrolled.length) : 0;
    const finished = enrolled.filter((u) => (doneByUser[u.id] || 0) >= ready).length;
    const stat = (num, label, hint) => `<div class="card" style="text-align:center">
      <b style="display:block;font-family:Inter,sans-serif;font-size:2.4rem;font-weight:900;color:var(--brand);line-height:1.1">${num}</b>
      <span style="font-weight:800">${label}</span>${hint ? `<p class="muted" style="margin:.3em 0 0;font-size:.82rem">${hint}</p>` : ''}</div>`;
    $('[data-admin-body]').innerHTML = `
      <div class="grid grid-4" style="margin-bottom:18px">
        ${stat(students.length, '註冊學員', `其中 ${enrolled.length} 位已開通`)}
        ${stat(active, '開始上課', '至少過關一個單元')}
        ${stat(avg.toFixed(1), '平均完成單元', `全部共 ${ready} 個`)}
        ${stat(finished, '完成全部單元', '可以發證書了')}
      </div>
      <div class="card" style="margin-bottom:18px">
        <h3>🧰 講師工具</h3>
        <p><a class="btn btn-sm" href="quote.html">🧾 內訓報價單</a>
          <a class="btn btn-sm btn-ghost" href="enroll.html">📄 課程介紹頁</a>
          <a class="btn btn-sm btn-ghost" href="security.html">🛡️ 半日資安課介紹</a>
          <a class="btn btn-sm btn-ghost" href="quizshow.html">🎯 課堂搶答</a></p>
        <p class="muted">報價單填的內容只存在你這台電腦，不會上傳。</p>
      </div>
      <div class="card">
        <h3>🏫 我的班級</h3>
        ${(classes || []).length ? `<ul class="checklist">${classes.map((c) => `<li><span>${esc(c.name)}　<span class="muted">${c.open_until ? `開放到單元 ${c.open_until}` : '全部開放'}</span></span></li>`).join('')}</ul>`
        : '<p class="muted">還沒有班級。到「🏫 班級」分頁建立一個。</p>'}
        <p class="muted" style="margin:12px 0 0">數字每次進入這一頁重新計算。學員的進度要登入後才會同步上來。</p>
      </div>`;
  }

  // ---------- 教材下載（Supabase 私人儲存空間；公開網站與 GitHub 都沒有這些檔案）----------
  const BUCKET = 'teacher-files';
  const FOLDERS = [
    { id: 'slides', label: '📊 課程簡報', hint: '每單元一份 .pptx，講者備忘稿含教學提示與測驗答案' },
    { id: 'kahoot', label: '🎯 Kahoot 題庫', hint: '每單元一份 .xlsx，含答案。想用線上版 Kahoot 才需要；站內的「🎯 課堂搶答」不用匯入。',
      steps: `<details class="files-steps"><summary><b>怎麼用？（5 步驟）</b></summary>
        <ol>
          <li>在下面按「⬇️ 下載」，取得那一單元的 <code>.xlsx</code>（例如 <code>kahoot-m4.xlsx</code>）。</li>
          <li>到 <a href="https://kahoot.com" target="_blank" rel="noopener">kahoot.com</a> 登入 → 按 <b>Create</b> → 選 <b>Kahoot</b>。</li>
          <li>在編輯畫面找 <b>Import spreadsheet</b>（新增題目的選單裡，或右下角）→ 上傳剛剛那個檔案 → 確認題目 → 儲存。</li>
          <li>上課時按 <b>Start</b> → 選 <b>Live（Classic）</b>，投影幕會出現一組 PIN 碼。</li>
          <li>學員用手機打開 <b>kahoot.it</b>，輸入 PIN 和暱稱就能搶答。</li>
        </ol>
        <p class="muted">匯入失敗的話：在同一個視窗點 <b>Download template</b> 下載官方範本，打開我們的檔案選取 B9 到最後一題，複製貼到範本的第一題位置，再匯入一次。<br>
        另外，部分 Kahoot 方案不提供「匯入試算表」。你的帳號如果沒有這個選項，直接用站內的「🎯 課堂搶答」就好，不用匯入、不用 PIN 碼。</p></details>` },
    { id: 'handbook', label: '📘 學習手冊', hint: '必修版與完整版 PDF，各有學員版與講師版' },
  ];
  const sizeText = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

  async function renderFiles() {
    const body = $('[data-admin-body]');
    const store = window.Members.client.storage.from(BUCKET);
    const lists = await Promise.all(FOLDERS.map((f) => store.list(f.id, { limit: 100, sortBy: { column: 'name', order: 'asc' } })));
    // 注意：bucket 不存在時 Supabase 會回「空清單」而不是錯誤，所以用「全空」當作還沒設定的提示
    const empty = lists.every((r) => !(r.data || []).length);
    const setupCard = `<div class="card" data-files-setup style="margin-bottom:18px;border:2px solid var(--warn)">
      <h3>⚠️ 第一次使用要先做兩件事</h3>
      <ol>
        <li>到 Supabase → SQL Editor 執行一次 <code>supabase/add-teacher-files.sql</code>（開一個只有講師看得到的私人空間）</li>
        <li>回到這一頁，用各區塊右上角的「⬆️ 上傳／更新」把電腦上 <code>course/teacher/</code> 裡的 slides、kahoot、handbook 傳上來</li>
      </ol>
      <p class="muted">上傳後這張提醒就會消失。檔案不會出現在公開網站或 GitHub 上。</p></div>`;
    const blocks = FOLDERS.map((f, i) => {
      const files = (lists[i].data || []).filter((x) => x.name && !x.name.startsWith('.'));
      const rows = files.map((x) => `<tr>
        <td>${esc(window.CourseLib.storageLabel(x.name))}</td>
        <td>${sizeText(x.metadata?.size || 0)}</td>
        <td>${x.updated_at ? new Date(x.updated_at).toLocaleDateString('zh-TW') : ''}</td>
        <td><button type="button" class="btn btn-sm" data-dl="${esc(f.id)}/${esc(x.name)}">⬇️ 下載</button>
          <button type="button" class="btn btn-sm btn-ghost" data-rm="${esc(f.id)}/${esc(x.name)}">刪除</button></td></tr>`).join('');
      return `<div class="card" style="margin-bottom:18px">
        <div class="quiz-head"><h3 style="margin:0">${f.label}</h3>
          <label class="btn btn-sm btn-ghost" style="cursor:pointer">⬆️ 上傳／更新
            <input type="file" multiple hidden data-up="${f.id}"></label></div>
        <p class="muted">${f.hint}</p>${f.steps || ''}
        ${files.length ? `<div class="table-wrap"><table class="roster"><thead><tr><th>檔名</th><th>大小</th><th>更新日期</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : '<p class="muted">這個資料夾還沒有檔案。按右上角「上傳／更新」把電腦上的 teacher 資料夾內容傳上來。</p>'}
      </div>`;
    }).join('');
    body.innerHTML = `${empty ? setupCard : ''}<div class="card" style="margin-bottom:18px">
        <h3>📁 教材下載</h3>
        <p>這些檔案存在只有講師看得到的私人空間，<b>公開網站和 GitHub 上都沒有</b>。下載連結每次產生、5 分鐘後失效，不要轉貼給學員。</p>
        <p class="muted">第一次使用請先上傳：電腦上的 <code>course/teacher/</code> 裡有 slides、kahoot、handbook 三個資料夾。</p>
      </div>${blocks}`;
  }

  async function downloadFile(path) {
    const { data, error } = await window.Members.client.storage.from(BUCKET).createSignedUrl(path, 300, { download: true });
    if (error) { toast(`取得下載連結失敗：${error.message}`); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function uploadFiles(folder, fileList) {
    const store = window.Members.client.storage.from(BUCKET);
    let ok = 0;
    for (const file of fileList) {
      const { error } = await store.upload(`${folder}/${window.CourseLib.storageKey(file.name)}`, file, { upsert: true });
      if (error) {
        const needSql = /bucket|not found|policy|security|denied|permission/i.test(error.message);
        toast(needSql ? '上傳失敗：請先到 Supabase 執行 supabase/add-teacher-files.sql' : `${file.name} 上傳失敗：${error.message}`);
        if (needSql) return;
        continue;
      }
      ok += 1;
      toast(`已上傳 ${ok}／${fileList.length}：${file.name}`);
    }
    renderFiles();
  }

  // ---------- 卡關分析 ----------
  async function renderStuck() {
    const db = window.Members.client;
    const { data: rows, error } = await db.from('progress').select('module_id, best, done');
    const body = $('[data-admin-body]');
    if (error) { body.innerHTML = `<div class="card"><p>讀取進度失敗：${esc(error.message)}</p></div>`; return; }
    const mods = MODULES.filter((m) => m.ready);
    const stats = mods.map((m) => {
      const mine = (rows || []).filter((r) => r.module_id === m.id);
      const done = mine.filter((r) => r.done).length;
      const avg = mine.length ? Math.round(mine.reduce((n, r) => n + (r.best || 0), 0) / mine.length) : 0;
      const rate = mine.length ? Math.round((done / mine.length) * 100) : null;
      return { m, tried: mine.length, done, avg, rate };
    });
    const hard = stats.filter((s) => s.tried >= 3 && s.rate !== null).sort((a, b) => a.rate - b.rate).slice(0, 3);
    body.innerHTML = `
      ${hard.length ? `<div class="card" style="margin-bottom:18px;border:2px solid var(--warn)">
        <h3>⚠️ 最多人卡住的單元</h3>
        <ul class="checklist">${hard.map((s) => `<li><span><b>單元 ${s.m.id.slice(1)} ${esc(s.m.title)}</b>：${s.tried} 人作答，只有 ${s.rate}% 過關（平均 ${s.avg} 分）</span></li>`).join('')}</ul>
        <p class="muted" style="margin:10px 0 0">上課時可以多花時間在這幾個單元，或回頭看看題目是不是出得不清楚。</p></div>` : ''}
      <div class="card">
        <div class="quiz-head"><h3 style="margin:0">各單元作答狀況</h3>
          <button type="button" class="btn btn-sm btn-ghost" data-export="stuck">⬇️ 匯出 CSV</button></div>
        <div class="table-wrap"><table class="roster"><thead><tr><th>單元</th><th>作答人數</th><th>過關人數</th><th>過關率</th><th>平均分</th></tr></thead>
        <tbody>${stats.map((s) => `<tr><td>${s.m.emoji} ${s.m.id.slice(1)} ${esc(s.m.title)}</td><td>${s.tried}</td><td>${s.done}</td>
          <td>${s.rate === null ? '—' : `${s.rate}%`}</td><td>${s.tried ? s.avg : '—'}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted" style="margin:10px 0 0">只統計已登入學員同步上來的成績。</p>
      </div>`;
    body.dataset.stuckCsv = window.CourseLib.toCSV([
      ['單元', '作答人數', '過關人數', '過關率(%)', '平均分'],
      ...stats.map((s) => [`${s.m.id.slice(1)} ${s.m.title}`, s.tried, s.done, s.rate === null ? '' : s.rate, s.tried ? s.avg : '']),
    ]);
  }

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
    const q = memberSearch.trim().toLowerCase();
    const list = people.filter(filters[memberFilter])
      .filter((u) => !q || `${u.display_name || ''} ${u.email || ''}`.toLowerCase().includes(q));
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
      <div class="admin-tools">
        <div class="chip-row">${Object.keys(filters).map((k) =>
        `<button type="button" class="chip" aria-pressed="${k === memberFilter}" data-member-filter="${k}">${label[k]} ${counts[k]}</button>`).join('')}</div>
        <input type="search" class="admin-search" data-member-search value="${esc(memberSearch)}" placeholder="搜尋姓名或 Email">
        <button type="button" class="btn btn-sm btn-ghost" data-export="members">⬇️ 匯出 CSV</button>
      </div>
      <div class="table-wrap"><table class="roster"><thead><tr><th>會員</th><th>Email</th><th>加入日期</th><th>完成單元</th><th>狀態</th><th>操作</th></tr></thead>
      <tbody>${list.map((u) => `<tr>
        <td>${esc(u.display_name || '（未命名）')}</td><td>${esc(u.email)}</td>
        <td>${new Date(u.created_at).toLocaleDateString('zh-TW')}</td><td>${doneCount(u.id)}</td>
        <td>${u.role === 'teacher' ? '<span class="pill pill-brand">講師</span>' : u.enrolled ? '<span class="pill pill-ok">已開通</span>' : '<span class="pill pill-warn">待開通</span>'}</td>
        <td>${u.id === window.Members.user.id ? '<span class="muted">（你自己）</span>' : `
          <button type="button" class="btn btn-sm" data-set="${u.id}" data-enrolled="${!u.enrolled}" data-role="${u.role}">${u.enrolled ? '取消開通' : '開通'}</button>
          <button type="button" class="btn btn-sm btn-ghost" data-set="${u.id}" data-enrolled="true" data-role="${u.role === 'teacher' ? 'student' : 'teacher'}">${u.role === 'teacher' ? '改回學員' : '設為講師'}</button>`}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="muted">這個分類目前沒有會員。</td></tr>'}</tbody></table></div>
      <p class="muted" style="margin:10px 0 0">學員用 Google 登入後會出現在「待開通」。用加入碼加入班級的學員會自動開通。${q ? `　目前搜尋：「${esc(memberSearch)}」，共 ${list.length} 筆。` : ''}</p></div>`;
    body.dataset.membersCsv = window.CourseLib.toCSV([
      ['顯示名稱', 'Email', '加入日期', '完成單元數', '狀態'],
      ...list.map((u) => [u.display_name || '', u.email || '', new Date(u.created_at).toLocaleDateString('zh-TW'), doneCount(u.id),
        u.role === 'teacher' ? '講師' : u.enrolled ? '已開通' : '待開通']),
    ]);
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
    const query = (cols) => db.from('classes').select(cols).eq('teacher_id', window.Members.user.id).order('created_at', { ascending: false });
    let { data: classes, error } = await query('id, name, join_code, created_at, open_until');
    // 還沒執行 supabase/add-class-open-until.sql 時，資料庫沒有 open_until 欄位：先照舊顯示，並提醒要補
    const needsMigration = Boolean(error && /open_until/.test(error.message));
    if (needsMigration) ({ data: classes, error } = await query('id, name, join_code, created_at'));
    if (error) { $('[data-admin-body]').innerHTML = `<div class="card"><p>讀取班級失敗：${esc(error.message)}</p></div>`; return; }
    const blocks = await Promise.all((classes || []).map((c) => renderClass(c, needsMigration)));
    $('[data-admin-body]').innerHTML = `
      <div class="card" style="margin-bottom:18px">
        <h3>開一個新班級</h3>
        <form class="split" data-new-class style="align-items:end">
          <label class="form-grid">班級名稱<input type="text" name="name" maxlength="60" required placeholder="例如：2026 秋季週六班"></label>
          <div><button type="submit" class="btn btn-primary">建立並產生加入碼</button></div>
        </form>
      </div>
      ${needsMigration ? '<div class="card" style="margin-bottom:18px;border:2px solid var(--warn)"><p><b>⚠️ 開放進度功能還沒啟用</b>：請到 Supabase → SQL Editor 執行 <code>supabase/add-class-open-until.sql</code>，執行後重新整理這一頁。在那之前，所有班級都是全部開放。</p></div>' : ''}
      ${blocks.join('') || '<div class="card"><p class="muted">還沒有班級。建立一個，把加入碼給學員。</p></div>'}`;
  }

  async function renderClass(c, needsMigration) {
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
    const body = (people || []).map((u) => `<tr><td>${esc(u.display_name || '（未命名）')}
      <button type="button" class="btn btn-sm btn-ghost" data-drop="${u.id}" data-class="${c.id}" data-name="${esc(u.display_name || '這位學員')}" title="把這位學員移出班級">移出</button></td>${mods.map((m) => cell(u.id, m.id)).join('')}</tr>`).join('');
    const csv = window.CourseLib.toCSV([
      ['學員', ...mods.map((m) => `${m.id.slice(1)} ${m.title}`)],
      ...(people || []).map((u) => [u.display_name || '（未命名）', ...mods.map((m) => {
        const pr = (rows || []).find((r) => r.user_id === u.id && r.module_id === m.id);
        return pr ? `${pr.done ? '過關 ' : ''}${pr.best}` : '';
      })]),
    ]);
    const limit = c.open_until ?? null;
    const closedCol = (m) => (limit !== null && Number(m.id.slice(1)) > limit ? ' class="col-closed"' : '');
    const picker = `<label class="open-until">🔓 學員可以看到
      <select data-open-until="${c.id}" ${needsMigration ? 'disabled' : ''}>
        <option value="">全部單元</option>
        ${mods.map((m) => `<option value="${m.id.slice(1)}" ${limit === Number(m.id.slice(1)) ? 'selected' : ''}>到單元 ${m.id.slice(1)}：${esc(m.title)}</option>`).join('')}
      </select></label>`;
    return `<div class="card" style="margin-bottom:18px">
      <div class="quiz-head"><h3 style="margin:0">${esc(c.name)}</h3>
        <span>加入碼 <span class="code-badge">${esc(c.join_code)}</span>
          <button type="button" class="btn btn-sm btn-ghost" data-copy-code="${esc(c.join_code)}">複製</button>
          <button type="button" class="btn btn-sm btn-ghost" data-class-csv="${c.id}">⬇️ CSV</button></span></div>
      ${picker}
      <p class="muted">${ids.length} 位學員．綠色是已過關（數字是最佳分數），黃色是作答過但還沒過關。${limit !== null ? '灰色欄位是這班還沒開放的單元（試用單元對這班也一樣不開放）。' : ''}</p>
      <div class="table-wrap"><table class="roster"><thead><tr><th>學員</th>${mods.map((m) => `<th title="${esc(m.title)}"${closedCol(m)}>${m.emoji} ${m.id.slice(1)}</th>`).join('')}</tr></thead>
      <tbody>${body || `<tr><td colspan="${mods.length + 1}" class="muted">還沒有學員加入。請學員到課程首頁輸入加入碼。</td></tr>`}</tbody></table></div>
      <textarea hidden data-csv-for="${c.id}">${esc(csv)}</textarea></div>`;
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

  // 班級開放進度：選了就存，學員重新整理頁面就生效
  host.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-open-until]');
    if (!sel) return;
    const value = sel.value ? Number(sel.value) : null;
    sel.disabled = true;
    const { error } = await window.Members.client.from('classes').update({ open_until: value }).eq('id', sel.dataset.openUntil);
    sel.disabled = false;
    if (error) { toast(`設定失敗：${error.message}`); return; }
    toast(value ? `已開放到單元 ${value}，學員重新整理頁面就會看到` : '已開放全部單元');
    renderClasses();
  });

  host.addEventListener('change', (e) => {
    const up = e.target.closest('[data-up]');
    if (!up || !up.files?.length) return;
    toast(`開始上傳 ${up.files.length} 個檔案……`);
    uploadFiles(up.dataset.up, [...up.files]);
  });

  host.addEventListener('input', (e) => {
    const box = e.target.closest('[data-member-search]');
    if (!box) return;
    memberSearch = box.value;
    const at = box.selectionStart;
    renderMembers().then(() => {
      const next = $('[data-member-search]');
      if (next) { next.focus(); next.setSelectionRange(at, at); }
    });
  });

  host.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-admin-tab]');
    if (t) { tab = t.dataset.adminTab; render(); return; }
    const exp = e.target.closest('[data-export]');
    if (exp) {
      const body = $('[data-admin-body]');
      const kind = exp.dataset.export;
      const text = kind === 'members' ? body.dataset.membersCsv : body.dataset.stuckCsv;
      download(kind === 'members' ? '會員名單.csv' : '各單元作答狀況.csv', text || '');
      return;
    }
    const classCsv = e.target.closest('[data-class-csv]');
    if (classCsv) {
      const box = host.querySelector(`[data-csv-for="${classCsv.dataset.classCsv}"]`);
      download('班級進度.csv', box ? box.value : '');
      return;
    }
    const copyCode = e.target.closest('[data-copy-code]');
    if (copyCode) {
      navigator.clipboard.writeText(copyCode.dataset.copyCode).then(() => toast('加入碼已複製'), () => toast('複製失敗，請手動選取'));
      return;
    }
    const dl = e.target.closest('[data-dl]');
    if (dl) { downloadFile(dl.dataset.dl); return; }
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      if (!window.confirm(`確定刪除「${rm.dataset.rm}」嗎？之後可以再上傳一次。`)) return;
      const { error } = await window.Members.client.storage.from(BUCKET).remove([rm.dataset.rm]);
      if (error) { toast(`刪除失敗：${error.message}`); return; }
      toast('已刪除');
      renderFiles();
      return;
    }
    const drop = e.target.closest('[data-drop]');
    if (drop) {
      if (!window.confirm(`把「${drop.dataset.name}」移出這個班級嗎？（學員的進度和開通狀態不會變）`)) return;
      const { error } = await window.Members.client.from('class_members').delete()
        .eq('class_id', drop.dataset.class).eq('user_id', drop.dataset.drop);
      if (error) {
        toast(/policy|permission|denied/i.test(error.message)
          ? '資料庫還沒開放移除權限：請執行 supabase/add-class-admin.sql'
          : `移出失敗：${error.message}`);
        return;
      }
      toast('已移出班級');
      renderClasses();
      return;
    }
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

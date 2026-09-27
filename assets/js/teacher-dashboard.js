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
        <button type="button" data-admin-tab="signups" aria-pressed="${tab === 'signups'}">📝 報名管理</button>
        <button type="button" data-admin-tab="messages" aria-pressed="${tab === 'messages'}">✉️ 聯絡留言<span class="unread-dot" data-unread ${window.Members.unread ? '' : 'hidden'}>${window.Members.unread || ''}</span></button>
        <button type="button" data-admin-tab="stuck" aria-pressed="${tab === 'stuck'}">🧭 卡關分析</button>
        <button type="button" data-admin-tab="files" aria-pressed="${tab === 'files'}">📁 教材下載</button>
      </div><div data-admin-body></div>`;
    const render = { overview: renderOverview, members: renderMembers, classes: renderClasses, signups: renderSignups, messages: renderMessages, stuck: renderStuck, files: renderFiles }[tab];
    await render();
  }

  let tab = 'overview';
  let memberFilter = 'pending';
  let memberSearch = '';

  // 連結要真的放進頁面、網址晚一點才收回，不然瀏覽器會忽略檔名，存成「download」
  const download = (name, text, type = 'text/csv;charset=utf-8') => {
    const body = type.startsWith('text/csv') ? `\ufeff${text}` : text; // CSV 加 BOM，Excel 打開中文才不會亂碼
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      <div class="card" style="margin-bottom:18px">
        <h3>📦 資料備份</h3>
        <p>把所有會員、班級、進度、報名、留言一次存成一個檔案。建議<b>每個月、每次開班前後</b>各存一份，放在你的雲端硬碟。</p>
        <p><button type="button" class="btn btn-primary btn-sm" data-backup-all>📦 一鍵匯出全部資料</button>
          <a class="btn btn-sm btn-ghost" href="backup-reader.html" download>📖 下載離線閱讀器</a></p>
        <p class="muted">離線閱讀器是一個網頁檔，不用網路、不用登入，雙擊打開、選匯出的檔案就能看資料。交接給別人時，連同 <code>docs/HANDOVER.md</code> 一起給。</p>
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
    { id: 'talks', label: '🎤 講座', hint: '單場講座用的教材，例如教會場「AI 資安意識 90 分鐘」：簡報（含講者備忘）、逐段流程表、給會友帶回家的 A4 自保卡。電腦上的位置是 course/teacher/talks/' },
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
        <li>回到這一頁，用各區塊右上角的「⬆️ 上傳／更新」把電腦上 <code>course/teacher/</code> 裡的 slides、kahoot、handbook、talks 傳上來</li>
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
        <p class="muted">第一次使用請先上傳：電腦上的 <code>course/teacher/</code> 裡有 slides、kahoot、handbook、talks 四個資料夾。</p>
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

  // ---------- 報名管理 ----------
  // 名單含姓名、Email、電話，RLS 只讓講師讀得到；這一頁不做刪除，
  // 誤刪一筆報名，對方不會知道自己報名不見了——改狀態比較安全。
  const SIGNUP_STATUS = {
    registered: { label: '已報名', tone: 'ok' },
    confirmed: { label: '已確認', tone: 'ok' },
    waitlisted: { label: '候補中', tone: 'warn' },
    cancelled: { label: '已取消', tone: 'muted' },
  };

  async function renderSignups() {
    const body = $('[data-admin-body]');
    const client = window.Members.client;
    const [{ data: cohorts, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
      client.from('cohorts').select('*').order('sort_order'),
      client.from('signups').select('*').order('created_at', { ascending: false }),
    ]);
    if (e1 || e2) {
      const msg = (e1 || e2).message;
      body.innerHTML = /relation|does not exist|schema cache/i.test(msg)
        ? `<div class="card"><h3>⚠️ 還沒建立報名資料表</h3>
            <p>到 Supabase → SQL Editor 執行一次 <code>supabase/add-signups.sql</code>，這一頁就會出現梯次與報名名單。</p></div>`
        : `<div class="card"><h3>讀取失敗</h3><p>${esc(msg)}</p></div>`;
      return;
    }

    const list = cohorts || [];
    const signups = rows || [];
    body.dataset.signupsCsv = window.CourseLib.toCSV([
      ['梯次', '姓名', 'Email', '電話', '單位', '身分', '想解決的問題', '從哪知道', '狀態', '報名時間'],
      ...signups.map((r) => [
        (list.find((c) => c.id === r.cohort_id) || {}).name || '',
        r.name, r.email, r.phone || '', r.org || '', r.role || '', r.goal || '', r.source || '',
        (SIGNUP_STATUS[r.status] || {}).label || r.status,
        new Date(r.created_at).toLocaleString('zh-TW'),
      ]),
    ]);

    const cohortCards = list.length ? list.map((c) => {
      const mine = signups.filter((r) => r.cohort_id === c.id);
      const taken = mine.filter((r) => r.status === 'registered' || r.status === 'confirmed').length;
      const waiting = mine.filter((r) => r.status === 'waitlisted').length;
      const left = window.CourseLib.seatsLeft(c, taken);
      return `<div class="card" style="margin-bottom:14px">
        <div class="quiz-head">
          <h3 style="margin:0">${esc(c.name)}　${c.is_open ? '<span class="pill pill-ok">開放中</span>' : '<span class="pill">未開放</span>'}</h3>
          <span><button type="button" class="btn btn-sm" data-cohort-toggle="${esc(c.id)}" data-open="${c.is_open ? '1' : '0'}">${c.is_open ? '關閉報名' : '開放報名'}</button>
            <button type="button" class="btn btn-sm btn-ghost" data-cohort-edit="${esc(c.id)}">✏️ 編輯</button>
            <button type="button" class="btn btn-sm btn-ghost" data-cohort-del="${esc(c.id)}" data-name="${esc(c.name)}" data-count="${mine.length}">🗑️ 刪除</button></span>
        </div>
        <p class="muted">${esc(c.schedule_text || '（時間待填）')}．${esc(c.place || '（地點待填）')}．${c.price === null || c.price === undefined ? '（費用待填）' : `NT$ ${Number(c.price).toLocaleString('zh-TW')}`}</p>
        <p><b>已報名 ${taken}</b>${c.capacity ? `／${c.capacity} 位（還有 ${left} 位）` : '（不限人數）'}${waiting ? `．候補 ${waiting} 人` : ''}</p>
      </div>`;
    }).join('') : `<div class="card" style="margin-bottom:14px"><h3>還沒有梯次</h3>
        <p>按上面的「➕ 新增梯次」填好時間、地點、費用、名額，存檔後再按「開放報名」，招生頁就會出現這個梯次。</p></div>`;
    cohortList = list;

    const rowsHtml = signups.map((r) => {
      const st = SIGNUP_STATUS[r.status] || { label: r.status, tone: '' };
      const cohort = list.find((c) => c.id === r.cohort_id);
      return `<tr>
        <td>${esc(r.name)}<br><small class="muted">${esc(r.email)}${r.phone ? `<br>${esc(r.phone)}` : ''}</small></td>
        <td>${esc(cohort ? cohort.name : '—')}</td>
        <td>${esc(r.org || '—')}${r.role ? `<br><small class="muted">${esc(r.role)}</small>` : ''}</td>
        <td>${r.goal ? esc(r.goal) : '<span class="muted">—</span>'}</td>
        <td><span class="pill pill-${st.tone}">${esc(st.label)}</span></td>
        <td><small class="muted">${new Date(r.created_at).toLocaleDateString('zh-TW')}</small></td>
        <td>
          <select data-signup-status="${esc(r.id)}">
            ${Object.entries(SIGNUP_STATUS).map(([k, v]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-sm btn-ghost" data-copy-mail="${esc(r.email)}">📋 Email</button>
        </td>
      </tr>`;
    }).join('');

    body.innerHTML = `<div class="card" style="margin-bottom:18px">
        <h3>📝 報名管理</h3>
        <p>招生頁的報名會進到這裡。名單含姓名、Email、電話，<b>只有講師讀得到</b>（前台只能寫入）。</p>
        <p class="muted">額滿時系統會自動把人排成候補；有人取消後，把候補的人改成「已報名」即可遞補，記得寄信通知他。</p>
        <p style="margin:0"><button type="button" class="btn btn-primary btn-sm" data-cohort-new>➕ 新增梯次</button></p>
      </div>
      <div data-cohort-form-slot></div>
      ${cohortCards}
      <div class="card">
        <div class="quiz-head"><h3 style="margin:0">報名名單（${signups.length}）</h3>
          <button type="button" class="btn btn-sm" data-export="signups">⬇️ 匯出 CSV</button></div>
        ${signups.length ? `<div class="table-wrap"><table class="roster">
          <thead><tr><th>報名者</th><th>梯次</th><th>單位</th><th>想解決的問題</th><th>狀態</th><th>報名日</th><th>操作</th></tr></thead>
          <tbody>${rowsHtml}</tbody></table></div>`
        : '<p class="muted">還沒有人報名。梯次開放後，招生頁就會出現報名表。</p>'}
      </div>`;
  }

  // ---------- 新增／編輯梯次（報名頁上的梯次時間、名額、費用都讀這裡） ----------
  let cohortList = [];
  // 資料庫存的是國際時間；表單的日期欄位要顯示台灣（這台電腦）的時間
  const localInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  function showCohortForm(c = null) {
    const slot = $('[data-cohort-form-slot]');
    if (!slot) return;
    const v = (k) => esc(c?.[k] ?? '');
    const { COHORT_KINDS } = window.CourseLib;
    slot.innerHTML = `<form class="card" data-cohort-form data-id="${c ? esc(c.id) : ''}" style="margin-bottom:18px;border:2px solid var(--brand)">
      <h3>${c ? '✏️ 編輯梯次' : '➕ 新增梯次'}</h3>
      <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))">
        <label>梯次名稱（招生頁會顯示）<input type="text" name="name" maxlength="60" required value="${v('name')}" placeholder="例如：2026 秋季班（週六）"></label>
        <label>課程類型<select name="kind">${Object.entries(COHORT_KINDS).map(([k, label]) => `<option value="${k}" ${(c?.kind || 'core') === k ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
        <label>上課時間<input type="text" name="schedule_text" maxlength="120" value="${v('schedule_text')}" placeholder="例如：11/14、11/21、11/28 每週六 13:30–17:00"></label>
        <label>地點<input type="text" name="place" maxlength="80" value="${v('place')}" placeholder="例如：台南（地點開課前通知）"></label>
        <label>費用（新台幣，不填＝另行公布）<input type="text" name="price" inputmode="numeric" value="${v('price')}" placeholder="例如：6800"></label>
        <label>名額（不填＝不限人數）<input type="text" name="capacity" inputmode="numeric" value="${v('capacity')}" placeholder="例如：12"></label>
        <label>報名開始（不填＝開放後馬上可以報）<input type="datetime-local" name="reg_start" value="${localInput(c?.reg_start)}"></label>
        <label>報名截止（不填＝不會自動截止）<input type="datetime-local" name="reg_end" value="${localInput(c?.reg_end)}"></label>
        <label>候補截止（不填＝一直可以排候補）<input type="datetime-local" name="waitlist_deadline" value="${localInput(c?.waitlist_deadline)}"></label>
      </div>
      <label style="display:flex;gap:10px;align-items:center;margin:14px 0"><input type="checkbox" name="waitlist_enabled" ${c ? (c.waitlist_enabled ? 'checked' : '') : 'checked'} style="width:22px;height:22px"> 額滿後可以排候補</label>
      <label class="form-grid">補充說明（選填，招生頁會顯示在上課時間下面，例如早鳥優惠）<input type="text" name="note" maxlength="120" value="${v('note')}" placeholder="例如：10/15 前報名早鳥價 NT$ 5,800"></label>
      <p style="margin:14px 0 0"><button type="submit" class="btn btn-primary">${c ? '儲存修改' : '建立梯次'}</button>
        <button type="button" class="btn btn-ghost" data-cohort-cancel>取消</button>
        <span class="muted" data-cohort-msg aria-live="polite"></span></p>
      ${c ? '' : '<p class="muted" style="margin:8px 0 0">建立後先是「未開放」，確認內容沒問題再按「開放報名」。</p>'}
    </form>`;
    slot.querySelector('input[name="name"]').focus();
    slot.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // ---------- 聯絡留言：招生頁、資安課頁的聯絡表單（supabase/add-contact.sql） ----------
  async function renderMessages() {
    const body = $('[data-admin-body]');
    const { data, error } = await window.Members.client.from('contact_messages').select('*').order('created_at', { ascending: false });
    if (error) {
      body.innerHTML = /relation|does not exist|schema cache/i.test(error.message)
        ? `<div class="card"><h3>⚠️ 還沒建立聯絡留言資料表</h3>
            <p>到 Supabase（選課程專案，不要選到教會的專案）→ SQL Editor 執行一次 <code>supabase/add-contact.sql</code>，招生頁的聯絡表單就能用，留言會出現在這裡。</p></div>`
        : `<div class="card"><h3>讀取失敗</h3><p>${esc(error.message)}</p></div>`;
      return;
    }
    const rows = data || [];
    const { CONTACT_TOPICS } = window.CourseLib;
    const PAGE = { enroll: '招生頁', security: '資安課頁' };
    body.dataset.messagesCsv = window.CourseLib.toCSV([
      ['稱呼', '聯絡方式', '主題', '內容', '來自', '已回覆', '留言時間'],
      ...rows.map((r) => [r.name, r.contact, CONTACT_TOPICS[r.topic] || r.topic, r.message, PAGE[r.page] || r.page || '',
        r.handled ? '是' : '否', new Date(r.created_at).toLocaleString('zh-TW')]),
    ]);
    const waiting = rows.filter((r) => !r.handled).length;
    body.innerHTML = `<div class="card" style="margin-bottom:18px">
        <h3>✉️ 聯絡留言</h3>
        <p>招生頁、資安課頁的聯絡表單會進到這裡，<b>只有講師讀得到</b>。回覆完按「標記已回覆」，下次一眼就知道還有哪些沒處理。</p>
      </div>
      <div class="card">
        <div class="quiz-head"><h3 style="margin:0">留言（${rows.length}，未回覆 ${waiting}）</h3>
          <button type="button" class="btn btn-sm" data-export="messages">⬇️ 匯出 CSV</button></div>
        ${rows.length ? rows.map((r) => `<div class="card" style="margin-top:12px;${r.handled ? 'opacity:.6' : 'border-color:var(--brand)'}">
            <div class="quiz-head"><b>${esc(r.name)}　<span class="pill pill-brand">${esc(CONTACT_TOPICS[r.topic] || r.topic)}</span></b>
              <small class="muted">${esc(PAGE[r.page] || r.page || '')}．${new Date(r.created_at).toLocaleString('zh-TW')}</small></div>
            <p style="white-space:pre-wrap;margin:8px 0">${esc(r.message)}</p>
            <p class="muted" style="margin:0 0 10px">聯絡方式：${esc(r.contact)}</p>
            <button type="button" class="btn btn-sm" data-msg-handled="${esc(r.id)}" data-now="${r.handled ? '1' : '0'}">${r.handled ? '↩️ 改回未回覆' : '✅ 標記已回覆'}</button>
            <button type="button" class="btn btn-sm btn-ghost" data-copy-mail="${esc(r.contact)}">📋 複製聯絡方式</button>
            <button type="button" class="btn btn-sm btn-ghost" data-msg-del="${esc(r.id)}">🗑️ 刪除</button>
          </div>`).join('')
        : '<p class="muted">還沒有人留言。</p>'}
      </div>`;
  }

  // ---------- 一鍵匯出全部資料（Rule 14：不能只有一個人拿得到資料） ----------
  // 格式：{ format, exported_at, tables: { 資料表: { label, rows, error? } }, files }，離線閱讀器 backup-reader.html 讀得懂
  const BACKUP_TABLES = [
    ['profiles', '會員'], ['classes', '班級'], ['class_members', '班級成員'], ['progress', '學習進度'],
    ['cohorts', '報名梯次'], ['signups', '報名名單'], ['contact_messages', '聯絡留言'],
    ['certificates', '結業證書'], ['teacher_invites', '講師邀請'], ['teacher_notes', '講師筆記'],
  ];
  async function exportAll(btn) {
    const db = window.Members.client;
    btn.disabled = true;
    btn.textContent = '匯出中…';
    const tables = {};
    for (const [name, label] of BACKUP_TABLES) {
      const { data, error } = await db.from(name).select('*');
      tables[name] = error ? { label, rows: [], error: error.message } : { label, rows: data || [] };
    }
    // 教材檔案本身太大不放進來，只記下有哪些檔案（檔案要另外從「教材下載」分頁下載）
    const files = {};
    for (const f of FOLDERS) {
      const { data } = await db.storage.from(BUCKET).list(f.id, { limit: 100 });
      files[f.id] = (data || []).filter((x) => x.name && !x.name.startsWith('.')).map((x) => x.name);
    }
    const backup = {
      format: 'vibe-course-backup', version: 1, exported_at: new Date().toISOString(),
      note: '講師後台匯出。完整的資料庫備份（含登入帳號）請另外用 Supabase 的 Database → Backups。',
      tables, files,
    };
    const day = new Date().toLocaleDateString('sv-SE'); // 2026-09-27
    download(`vibe-course-backup-${day}.json`, JSON.stringify(backup, null, 1), 'application/json');
    const failed = Object.values(tables).filter((t) => t.error).map((t) => t.label);
    const total = Object.values(tables).reduce((n, t) => n + t.rows.length, 0);
    toast(failed.length ? `已匯出 ${total} 筆；讀不到：${failed.join('、')}（可能還沒執行對應的 SQL）` : `已匯出 ${total} 筆資料`);
    btn.disabled = false;
    btn.textContent = '📦 一鍵匯出全部資料';
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
    // 和學員那邊同一條規則：依課程順序，不依單元編號（19、20 排在 9 前面）
    const closedCol = (m) => (limit !== null
      && window.CourseLib.unitAccess(m, { role: 'student', enrolled: true, limits: [limit] }, MODULES.map((x) => x.id)) === 'class'
      ? ' class="col-closed"' : '');
    const picker = `<label class="open-until">🔓 學員可以看到
      <select data-open-until="${c.id}" ${needsMigration ? 'disabled' : ''}>
        <option value="">全部單元</option>
        ${mods.map((m) => `<option value="${m.id.slice(1)}" ${limit === Number(m.id.slice(1)) ? 'selected' : ''}>到單元 ${m.id.slice(1)}：${esc(m.title)}</option>`).join('')}
      </select></label>`;
    return `<div class="card" style="margin-bottom:18px">
      <div class="quiz-head"><h3 style="margin:0">${esc(c.name)}</h3>
        <span>加入碼 <span class="code-badge">${esc(c.join_code)}</span>
          <button type="button" class="btn btn-sm btn-ghost" data-copy-code="${esc(c.join_code)}">複製</button>
          <button type="button" class="btn btn-sm btn-ghost" data-class-csv="${c.id}">⬇️ CSV</button>
          <button type="button" class="btn btn-sm btn-ghost" data-class-del="${c.id}" data-name="${esc(c.name)}" data-count="${ids.length}">🗑️ 刪除班級</button></span></div>
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
    if (e.target.matches('[data-cohort-form]')) {
      e.preventDefault();
      const form = e.target;
      const f = Object.fromEntries(new FormData(form));
      f.waitlist_enabled = form.waitlist_enabled.checked;
      const { row, error: problem } = window.CourseLib.cohortFromForm(f);
      const msg = form.querySelector('[data-cohort-msg]');
      if (problem) { msg.textContent = problem; return; }
      const db = window.Members.client.from('cohorts');
      const { error } = form.dataset.id ? await db.update(row).eq('id', form.dataset.id) : await db.insert({ ...row, is_open: false });
      if (error) { msg.textContent = `存檔失敗：${error.message}`; return; }
      toast(form.dataset.id ? '梯次已更新' : '梯次建立好了，確認沒問題再按「開放報名」');
      renderSignups();
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

  host.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-signup-status]');
    if (!sel) return;
    const { error } = await window.Members.client.from('signups')
      .update({ status: sel.value, updated_at: new Date().toISOString() }).eq('id', sel.dataset.signupStatus);
    toast(error ? `更新失敗：${error.message}` : '已更新報名狀態');
    if (!error) renderSignups();
  });

  host.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-admin-tab]');
    if (t) { tab = t.dataset.adminTab; render(); return; }
    if (e.target.closest('[data-cohort-new]')) { showCohortForm(); return; }
    const cohortEdit = e.target.closest('[data-cohort-edit]');
    if (cohortEdit) { showCohortForm(cohortList.find((c) => c.id === cohortEdit.dataset.cohortEdit)); return; }
    if (e.target.closest('[data-cohort-cancel]')) { $('[data-cohort-form-slot]').innerHTML = ''; return; }
    const cohortDel = e.target.closest('[data-cohort-del]');
    if (cohortDel) {
      const n = Number(cohortDel.dataset.count);
      const warn = n ? `\n\n⚠️ 這個梯次有 ${n} 筆報名資料，會一起被刪除，而且無法復原。只是想暫停報名的話，請改按「關閉報名」。` : '';
      if (!window.confirm(`確定刪除梯次「${cohortDel.dataset.name}」嗎？${warn}`)) return;
      const { error } = await window.Members.client.from('cohorts').delete().eq('id', cohortDel.dataset.cohortDel);
      toast(error ? `刪除失敗：${error.message}` : '梯次已刪除');
      if (!error) renderSignups();
      return;
    }
    const classDel = e.target.closest('[data-class-del]');
    if (classDel) {
      if (!window.confirm(`確定刪除班級「${classDel.dataset.name}」嗎？\n\n・加入碼會失效，這班的學員名單會移除（${classDel.dataset.count} 位）\n・學員的帳號、開通狀態、學習進度都不會被刪除\n・刪除後無法復原`)) return;
      const { error } = await window.Members.client.from('classes').delete().eq('id', classDel.dataset.classDel);
      toast(error ? `刪除失敗：${error.message}` : '班級已刪除');
      if (!error) renderClasses();
      return;
    }
    const backupBtn = e.target.closest('[data-backup-all]');
    if (backupBtn) { exportAll(backupBtn); return; }
    const exp = e.target.closest('[data-export]');
    if (exp) {
      const body = $('[data-admin-body]');
      const kind = exp.dataset.export;
      const text = { members: body.dataset.membersCsv, stuck: body.dataset.stuckCsv, signups: body.dataset.signupsCsv, messages: body.dataset.messagesCsv }[kind];
      download({ members: '會員名單.csv', stuck: '各單元作答狀況.csv', signups: '報名名單.csv', messages: '聯絡留言.csv' }[kind] || '匯出.csv', text || '');
      return;
    }
    const classCsv = e.target.closest('[data-class-csv]');
    if (classCsv) {
      const box = host.querySelector(`[data-csv-for="${classCsv.dataset.classCsv}"]`);
      download('班級進度.csv', box ? box.value : '');
      return;
    }
    const copyMail = e.target.closest('[data-copy-mail]');
    if (copyMail) {
      navigator.clipboard.writeText(copyMail.dataset.copyMail).then(() => toast('已複製'), () => toast('複製失敗，請手動選取'));
      return;
    }
    const handled = e.target.closest('[data-msg-handled]');
    if (handled) {
      const { error } = await window.Members.client.from('contact_messages')
        .update({ handled: handled.dataset.now !== '1' }).eq('id', handled.dataset.msgHandled);
      toast(error ? `更新失敗：${error.message}` : '已更新');
      if (!error) { renderMessages(); window.Members.refreshUnread?.(); }
      return;
    }
    const msgDel = e.target.closest('[data-msg-del]');
    if (msgDel) {
      if (!window.confirm('確定刪除這則留言嗎？刪除後無法復原。')) return;
      const { error } = await window.Members.client.from('contact_messages').delete().eq('id', msgDel.dataset.msgDel);
      toast(error ? `刪除失敗：${error.message}` : '已刪除');
      if (!error) { renderMessages(); window.Members.refreshUnread?.(); }
      return;
    }
    const cohortToggle = e.target.closest('[data-cohort-toggle]');
    if (cohortToggle) {
      const open = cohortToggle.dataset.open !== '1';
      const { error } = await window.Members.client.from('cohorts')
        .update({ is_open: open }).eq('id', cohortToggle.dataset.cohortToggle);
      if (error) { toast(`更新失敗：${error.message}`); return; }
      toast(open ? '這個梯次已開放報名' : '已關閉報名');
      renderSignups();
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
    { tour: 'dash', title: '管理後台', text: '「會員管理」可以開通學員、設定講師；「班級」可以開班、把 6 碼加入碼給學員，看全班進度、刪除不用的班；「報名管理」可以新增、編輯梯次（時間、地點、費用、名額），招生頁會自動顯示；「聯絡留言」是招生頁聯絡表單收到的洽詢，回覆完記得標記。「總覽」的「資料備份」可以一鍵匯出全部資料，每個月存一份。' },
  ]);
})();

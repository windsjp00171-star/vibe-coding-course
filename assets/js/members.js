/*
 * members.js — 會員功能：Google 登入、雲端進度、加入班級、講師內容。
 * 沒有設定 COURSE_CONFIG 時完全不做事（不載入套件、不畫按鈕），網站照常運作。
 * 權限一律由資料庫 RLS 把關（supabase/schema.sql），這支程式公開也沒關係。
 */
(function () {
  'use strict';
  const cfg = window.COURSE_CONFIG || {};
  const enabled = Boolean(cfg.supabaseUrl && cfg.supabaseKey);
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js';

  let client = null;
  let user = null;
  let profile = null;
  let classLimits = []; // 學員所在各班級「開放到單元幾」
  if (enabled) applyGateSoon();
  // 套件載入失敗時解除畫面鎖定：目前的鎖只是畫面限制，寧可讓學員繼續上課
  const ready = enabled
    ? loadSdk().then(init).catch((err) => {
      document.body.classList.remove('is-locked');
      window.Course?.toast(`${err.message}，先以訪客身分瀏覽`);
      return null;
    })
    : Promise.resolve(null);

  function loadSdk() {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.onload = resolve;
      s.onerror = () => reject(new Error('會員功能載入失敗'));
      document.head.append(s);
    });
  }

  async function init() {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    const { data } = await client.auth.getSession();
    await setUser(data.session?.user || null);
    client.auth.onAuthStateChange((_event, session) => {
      // 回呼裡不直接 await Supabase 呼叫，避免卡住 auth 的內部鎖
      setTimeout(() => setUser(session?.user || null), 0);
    });
    return client;
  }

  async function setUser(next) {
    if ((next?.id || null) === (user?.id || null) && profile) return;
    user = next;
    profile = null;
    classLimits = [];
    if (user) {
      const { data, error } = await client.from('profiles').select('display_name, role, enrolled').eq('id', user.id).maybeSingle();
      if (error) console.warn('[會員] 讀取會員資料失敗', error.message);
      profile = data || { display_name: '', role: 'student', enrolled: false };
      classLimits = await loadClassLimits();
      await syncProgress();
      if (profile.role === 'teacher') await loadTeacherNotes();
    }
    renderAuth();
    applyGate();
    document.dispatchEvent(new CustomEvent('course:auth', { detail: { user, profile } }));
  }

  // ---------- 試用閘門：非試用單元要登入、開通，而且班級已開放 ----------
  // 注意：這只是畫面上的限制，公開 repo 裡仍有完整內容；正式收費前要把付費內容移到資料庫。
  // 班級沒設定開放進度（或還沒執行 add-class-open-until.sql）時一律視為全部開放，不會把學員鎖在門外。
  async function loadClassLimits() {
    if (profile.role === 'teacher' || !profile.enrolled) return [];
    const { data, error } = await client.from('classes').select('open_until');
    if (error) { console.warn('[會員] 讀取班級開放進度失敗，先全部開放', error.message); return []; }
    return (data || []).map((c) => c.open_until ?? null);
  }

  function access(unit) {
    if (!enabled || !unit) return 'open';
    const viewer = user ? { role: profile?.role, enrolled: profile?.enrolled, limits: classLimits } : null;
    // 依課程實際順序判斷開放進度（單元編號不等於順序，見 lib.js unitAccess）
    const order = (window.Course?.MODULES || []).map((m) => m.id);
    return window.CourseLib.unitAccess(unit, viewer, order);
  }

  function openUntil() {
    return classLimits.length && !classLimits.includes(null) ? Math.max(...classLimits) : null;
  }

  function gateMessage(state) {
    const home = `${document.body.dataset.base || './'}learn.html`;
    if (state === 'class') {
      return `<h2>🔒 講師還沒開放這個單元</h2>
        <p>你的班級目前開放到<b>單元 ${openUntil()}</b>。上到這裡時，講師會再開放，先把前面的單元複習一下吧。</p>
        <p><a class="btn" href="${home}">回課程地圖</a></p>`;
    }
    if (state === 'enroll') {
      return `<h2>🔒 這個單元需要開通</h2>
        <p>你已經登入了，還差一步：到<a href="${home}#join">課程首頁</a>輸入講師給你的 6 碼加入碼，就會自動開通。</p>
        <p class="muted">還沒有加入碼？如果你已經報名，請聯繫講師；還沒報名的話，<a href="${home.replace('learn.html', 'enroll.html')}#signup">看課程介紹與報名</a>。</p>`;
    }
    return `<h2>🔒 這是正式課程單元</h2>
      <p>你正在試用。單元 ${trialList()} 和踩坑圖鑑可以免費看；其他單元請用 Google 登入，並輸入講師給你的加入碼。</p>
      <p><button type="button" class="btn btn-primary" data-auth="in">已經報名：用 Google 登入</button>
        <a class="btn" href="${home.replace('learn.html', 'enroll.html')}#signup">還沒報名：看課程介紹與報名</a></p>
      <p class="muted">加入碼是報名後講師給你的 6 碼，登入後在課程首頁輸入。</p>`;
  }

  function applyGate() {
    const current = window.Course.MODULES.find((m) => m.id === document.body.dataset.module);
    const state = current ? access(current) : 'open';
    document.body.classList.toggle('is-locked', state !== 'open');
    document.querySelector('[data-gate-card]')?.remove();
    if (state === 'open') return;
    const card = document.createElement('section');
    card.className = 'slide';
    card.dataset.gateCard = '';
    card.innerHTML = `<div class="card" style="border:2px solid var(--brand)">${gateMessage(state)}</div>`;
    document.querySelector('main .module-hero')?.after(card);
  }

  function trialList() {
    return window.Course.MODULES.filter((m) => m.trial).map((m) => m.id.slice(1)).join('、');
  }

  // SDK 載入前先擋住，避免非試用單元內容先閃一下
  function applyGateSoon() {
    const current = window.Course?.MODULES.find((m) => m.id === document.body.dataset.module);
    if (current && !current.trial) document.body.classList.add('is-locked');
  }

  // ---------- 登入／登出 ----------
  async function signIn() {
    await ready;
    const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } });
    if (error) window.Course.toast(`登入失敗：${error.message}`);
  }

  async function signOut() {
    await ready;
    await client.auth.signOut();
    window.Course.toast('已登出，進度仍保留在這台電腦的瀏覽器');
  }

  function renderAuth() {
    const slot = document.querySelector('[data-auth-slot]');
    if (!slot) return;
    const { esc } = window.Course;
    const adminLink = profile?.role === 'teacher'
      ? `<a class="btn btn-sm btn-ghost" href="${document.body.dataset.base || './'}teacher.html" title="開通會員、邀請講師、開班級、看進度">🛠️ 管理後台</a> `
      : '';
    const base = document.body.dataset.base || './';
    const meLink = `<a class="btn btn-sm btn-ghost" href="${base}me.html" title="看自己的進度、改顯示名稱">📈 我的學習</a> `;
    slot.innerHTML = user
      ? `${adminLink}${meLink}<button type="button" class="btn btn-sm btn-ghost" data-auth="out" title="登出">👤 ${esc(profile?.display_name || user.email || '已登入')}${profile?.role === 'teacher' ? '．講師' : ''}</button>`
      : '<button type="button" class="btn btn-sm btn-ghost" data-auth="in" title="用 Google 登入，換電腦也能接著學">☁️ 登入保存進度</button>';
  }

  document.addEventListener('click', (e) => {
    const action = e.target.closest('[data-auth]')?.dataset.auth;
    if (action === 'in') signIn();
    if (action === 'out' && window.confirm('要登出嗎？')) signOut();
  });

  // ---------- 進度同步：本機與雲端取最好成績合併 ----------
  async function syncProgress() {
    const { getState, update } = window.Course;
    const local = getState().progress || {};
    const { data, error } = await client.from('progress').select('module_id, best, done').eq('user_id', user.id);
    if (error) { console.warn('[會員] 讀取雲端進度失敗', error.message); return; }
    const merged = { ...local };
    (data || []).forEach((row) => {
      const mine = merged[row.module_id] || {};
      merged[row.module_id] = { best: Math.max(mine.best || 0, row.best), done: Boolean(mine.done || row.done) };
    });
    update({ progress: merged });
    const rows = Object.entries(merged).map(([moduleId, p]) => ({ user_id: user.id, module_id: moduleId, best: p.best || 0, done: Boolean(p.done) }));
    if (rows.length) {
      const { error: upErr } = await client.from('progress').upsert(rows);
      if (upErr) console.warn('[會員] 上傳進度失敗', upErr.message);
    }
  }

  // core.js 每次記錄成績都會發出這個事件；登入中就同步到雲端
  document.addEventListener('course:progress', async (e) => {
    if (!user) return;
    const { moduleId, best, done } = e.detail;
    const { error } = await client.from('progress').upsert({ user_id: user.id, module_id: moduleId, best, done });
    if (error) window.Course.toast('進度暫時沒存到雲端，下次登入會再同步');
  });

  // ---------- 講師內容：資料庫只回傳給講師（RLS） ----------
  async function loadTeacherNotes() {
    if (!document.querySelector('[data-teacher-slot]')) return;
    const { data, error } = await client.from('teacher_notes').select('slot, cls, html');
    if (error || !data?.length) return;
    const notes = Object.fromEntries(data.map((n) => [n.slot, { cls: n.cls, html: n.html }]));
    window.Course.enableTeacher(notes);
  }

  // ---------- 加入班級 ----------
  async function joinClass(code) {
    await ready;
    if (!user) throw new Error('請先登入');
    const { data, error } = await client.rpc('join_class', { code });
    if (error) throw new Error(error.message);
    // 加入後重新讀一次會員資料：開通狀態和班級開放進度都變了
    profile = null;
    await setUser(user);
    return data;
  }

  // ---------- 結業證書 ----------
  // 證書本身是列印出來的紙，光靠紙沒辦法證明真假；
  // 所以發證時在雲端留一筆，證書上印編號，任何人都能用 verify.html 查。
  async function issueCertificate(displayName, score) {
    await ready;
    if (!user) throw new Error('請先登入');
    const existing = await myCertificate();
    if (existing) {
      // 重考更高分或改名字時更新同一張，不再發新編號
      if (existing.display_name === displayName && existing.score >= score) return existing;
      const { data, error } = await client.from('certificates')
        .update({ display_name: displayName, score: Math.max(score, existing.score) })
        .eq('user_id', user.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    const bytes = crypto.getRandomValues(new Uint8Array(window.CourseLib.CERT_LENGTH));
    const code = window.CourseLib.certCode(bytes);
    const { data, error } = await client.from('certificates')
      .insert({ user_id: user.id, code, display_name: displayName, score }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async function myCertificate() {
    await ready;
    if (!user) return null;
    const { data, error } = await client.from('certificates').select('code, display_name, score, issued_at')
      .eq('user_id', user.id).maybeSingle();
    if (error) return null;
    return data;
  }

  async function verifyCertificate(code) {
    await ready;
    const { data, error } = await client.rpc('verify_certificate', { cert_code: code });
    if (error) throw new Error(error.message);
    return (data && data[0]) || null;
  }

  window.Members = {
    enabled,
    ready,
    signIn,
    signOut,
    joinClass,
    issueCertificate,
    myCertificate,
    verifyCertificate,
    get user() { return user; },
    get profile() { return profile; },
    access,
    openUntil,
    gateMessage,
    get client() { return client; },
  };

  if (enabled) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderAuth);
    else renderAuth();
  }
})();

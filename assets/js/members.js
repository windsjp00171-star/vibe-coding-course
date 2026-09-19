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
    if (user) {
      const { data, error } = await client.from('profiles').select('display_name, role, enrolled').eq('id', user.id).maybeSingle();
      if (error) console.warn('[會員] 讀取會員資料失敗', error.message);
      profile = data || { display_name: '', role: 'student', enrolled: false };
      await syncProgress();
      if (profile.role === 'teacher') await loadTeacherNotes();
    }
    renderAuth();
    applyGate();
    document.dispatchEvent(new CustomEvent('course:auth', { detail: { user, profile } }));
  }

  // ---------- 試用閘門：非試用單元要登入並開通 ----------
  // 注意：這只是畫面上的限制，公開 repo 裡仍有完整內容；正式收費前要把付費內容移到資料庫。
  function canSeeAll() { return Boolean(profile && (profile.enrolled || profile.role === 'teacher')); }

  function applyGate() {
    const current = window.Course.MODULES.find((m) => m.id === document.body.dataset.module);
    const locked = Boolean(current && !current.trial && !canSeeAll());
    document.body.classList.toggle('is-locked', locked);
    document.querySelector('[data-gate-card]')?.remove();
    if (!locked) return;
    const card = document.createElement('section');
    card.className = 'slide';
    card.dataset.gateCard = '';
    card.innerHTML = user
      ? `<div class="card" style="border:2px solid var(--brand)"><h2>🔒 這個單元需要開通</h2>
          <p>你已經登入了，還差一步：到<a href="${document.body.dataset.base || './'}index.html#join">課程首頁</a>輸入講師給你的 6 碼加入碼，就會自動開通全部單元。</p>
          <p class="muted">還沒有加入碼？請聯繫講師。</p></div>`
      : `<div class="card" style="border:2px solid var(--brand)"><h2>🔒 這是正式課程單元</h2>
          <p>你正在試用。單元 ${trialList()} 和踩坑圖鑑可以免費看；其他單元請用 Google 登入，並輸入講師給你的加入碼。</p>
          <button type="button" class="btn btn-primary" data-auth="in">用 Google 登入</button></div>`;
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
    slot.innerHTML = user
      ? `${adminLink}<button type="button" class="btn btn-sm btn-ghost" data-auth="out" title="登出">👤 ${esc(profile?.display_name || user.email || '已登入')}${profile?.role === 'teacher' ? '．講師' : ''}</button>`
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
    return data;
  }

  window.Members = {
    enabled,
    ready,
    signIn,
    signOut,
    joinClass,
    get user() { return user; },
    get profile() { return profile; },
    get client() { return client; },
  };

  if (enabled) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderAuth);
    else renderAuth();
  }
})();

/*
 * core.js — 每一頁都會載入的共用骨架：
 * 頁首、學員／講師模式、投影模式、進度、測驗引擎、計時器、提示訊息。
 * 頁面用 <body data-module="m1" data-base="../"> 告訴這支程式自己是誰。
 */
(function () {
  'use strict';

  const MODULES = [
    { id: 'm0', part: 'A 起步', emoji: '🧠', title: 'AI 到底在做什麼？', file: 'modules/00-ai-basics.html', minutes: 25, inClass: 25, post: 10 },
    { id: 'm1', part: 'A 起步', emoji: '🚗', title: '什麼是 Vibe Coding？', file: 'modules/01-vibe-coding.html', minutes: 15, inClass: 30, post: 10 },
    { id: 'm2', part: 'A 起步', emoji: '🧰', title: '安裝你的 AI 工程師', file: 'modules/02-install.html', minutes: 15, inClass: 40, post: 10 },
    { id: 'm3', part: 'A 起步', emoji: '🗣️', title: '怎麼跟 Claude Code 合作', file: 'modules/03-work-with-claude.html', minutes: 25, inClass: 45, post: 20 },
    { id: 'm4', part: 'B 上線', emoji: '💾', title: 'Git 與 GitHub 白話講', file: 'modules/04-git-github.html', minutes: 20, inClass: 25, post: 15 },
    { id: 'm5', part: 'B 上線', emoji: '🚀', title: '把作品放上網路', file: 'modules/05-deploy.html', minutes: 20, inClass: 35, post: 15 },
    { id: 'm6', part: 'C 資安', emoji: '🔑', title: '鑰匙與機密別外流', file: 'modules/06-secrets.html', minutes: 20, inClass: 30, post: 10 },
    { id: 'm7', part: 'C 資安', emoji: '🛡️', title: 'AI 會被騙：你是門神', file: 'modules/07-ai-attacks.html', minutes: 20, inClass: 35, post: 10 },
    { id: 'm19', part: 'C 資安', emoji: '🎭', title: 'AI 詐騙：變臉與變聲', file: 'modules/19-deepfake.html', minutes: 25, inClass: 30, post: 15 },
    { id: 'm8', part: 'C 資安', emoji: '🩺', title: '上線前的 Vibe Check', file: 'modules/08-vibe-check.html', minutes: 25, inClass: 35, post: 15 },
    { id: 'm20', part: 'C 資安', emoji: '🛟', title: '三個月後還救得回來嗎', file: 'modules/20-handover.html', minutes: 20, inClass: 35, post: 15 },
    { id: 'm9', part: '結業', emoji: '🎓', title: '總測驗與結業證書', file: 'modules/09-final.html', minutes: 15, inClass: 60, post: 0 },
    { id: 'm10', part: 'D 進階選修', emoji: '🗄️', title: 'Supabase：雲端資料庫', file: 'modules/10-supabase.html', minutes: 20, inClass: 35, post: 15 },
    { id: 'm11', part: 'D 進階選修', emoji: '🪪', title: '會員系統：註冊、登入、權限', file: 'modules/11-members.html', minutes: 20, inClass: 40, post: 15 },
    { id: 'm12', part: 'D 進階選修', emoji: '🤖', title: 'LINE Bot：做一個 AI 小秘書', file: 'modules/12-line-bot.html', minutes: 20, inClass: 40, post: 20 },
    { id: 'm13', part: 'D 進階選修', emoji: '💚', title: 'LINE 登入：免記帳號密碼', file: 'modules/13-line-login.html', minutes: 20, inClass: 35, post: 15 },
    { id: 'm14', part: 'D 進階選修', emoji: '📱', title: 'PWA：讓網站變成手機 App', file: 'modules/14-pwa.html', minutes: 15, inClass: 35, post: 10 },
    { id: 'm15', part: 'D 進階選修', emoji: '🔔', title: '推播通知：主動提醒使用者', file: 'modules/15-push.html', minutes: 20, inClass: 30, post: 10 },
    { id: 'm16', part: 'D 進階選修', emoji: '🧩', title: 'Agent、MCP 與 Skill', file: 'modules/16-agents.html', minutes: 25, inClass: 35, post: 15 },
    { id: 'm17', part: 'D 進階選修', emoji: '📊', title: 'AI 時代的資料整理', file: 'modules/17-data.html', minutes: 25, inClass: 30, post: 15 },
    { id: 'm18', part: 'D 進階選修', emoji: '💬', title: '怎麼問出好答案', file: 'modules/18-prompting.html', minutes: 25, inClass: 30, post: 10 },
    { id: 'm21', part: 'D 進階選修', emoji: '⚖️', title: '這東西能不能用？', file: 'modules/21-compliance.html', minutes: 25, inClass: 35, post: 15 },
    { id: 'm22', part: 'D 進階選修', emoji: '💸', title: 'AI 要花多少錢', file: 'modules/22-cost.html', minutes: 20, inClass: 30, post: 10 },
  ];
  // 已經做好、可以點進去的單元（其餘在課程地圖上顯示「製作中」）
  const READY = new Set(['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm13', 'm14', 'm15', 'm16', 'm17', 'm18', 'm19', 'm20', 'm21', 'm22']);
  // 會員功能啟用時，訪客可以免費試用的單元（其餘要登入並開通）。會員功能沒啟用時全部開放。
  const TRIAL = new Set(['m0', 'm1', 'm4', 'm7', 'm19']); // 19 防詐騙：公益性質，講座後會友回家複習不用登入
  MODULES.forEach((m) => { m.ready = READY.has(m.id); m.trial = TRIAL.has(m.id); });

  const STORE_KEY = 'vibe-course-v1';

  // ---------- 儲存（瀏覽器可能封鎖 localStorage，所有存取都要包 try） ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* 無痕模式：進度不保存，但頁面照常運作 */ }
  }
  function getState() { return { progress: {}, mode: 'student', name: '', ...load() }; }
  function update(patch) { const next = { ...getState(), ...patch }; save(next); return next; }

  function recordModule(moduleId, result) {
    const state = getState();
    const prev = state.progress[moduleId] || {};
    const best = Math.max(prev.best || 0, result.percent);
    const progress = { ...state.progress, [moduleId]: { done: prev.done || result.passed, best } };
    update({ progress });
    refreshProgressBar();
    document.dispatchEvent(new CustomEvent('course:progress', { detail: { moduleId, ...progress[moduleId] } }));
  }

  function completedCount() {
    const { progress } = getState();
    return MODULES.filter((m) => progress[m.id]?.done).length;
  }

  // ---------- 小工具 ----------
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  let toastTimer = null;
  function toast(message) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2400);
  }

  // ---------- 模式 ----------
  // 講師內容不在公開網站裡：只有載入講師檔案（本機）或講師登入（雲端）後才會有
  let teacherReady = false;

  function applyMode(requested) {
    const mode = teacherReady ? requested : 'student';
    document.documentElement.dataset.mode = mode;
    $$('.mode-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    const banner = $('.teacher-banner');
    if (banner) banner.hidden = mode !== 'teacher';
  }

  function setMode(mode) {
    update({ mode });
    applyMode(mode);
    toast(mode === 'teacher' ? '已切到講師模式：紫色框是教學提示' : '已切回學員模式');
  }

  // ---------- 講師內容：填進各頁的 data-teacher-slot ----------
  function enableTeacher(notes) {
    if (!notes) return;
    $$('[data-teacher-slot]').forEach((slot) => {
      const note = notes[slot.dataset.teacherSlot];
      if (!note) return;
      slot.className = note.cls;
      slot.innerHTML = note.html; // 內容來自講師自己的檔案或受權限保護的資料庫，不是使用者輸入
    });
    teacherReady = true;
    document.dispatchEvent(new CustomEvent('course:teacher'));
    const sw = $('.mode-switch');
    if (sw) sw.hidden = false;
    applyMode(getState().mode);
  }

  // 講師在自己電腦上課時，課程資料夾裡會有私人的 teacher/notes.js（公開 repo 不含這個檔案）
  function loadLocalTeacherNotes() {
    const local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
    if (!local) return;
    const script = document.createElement('script');
    script.src = `${document.body.dataset.base || './'}teacher/notes.js`;
    script.onload = () => enableTeacher(window.TEACHER_NOTES);
    script.onerror = () => {}; // 學員自己在本機開也沒有這個檔案，安靜略過
    document.head.append(script);
  }

  // ---------- 頁首 ----------
  function renderHeader() {
    const host = $('[data-course-header]');
    if (!host) return;
    const base = document.body.dataset.base || './';
    const current = MODULES.find((m) => m.id === document.body.dataset.module);
    // 每一頁都要說得出自己是誰。原本每一頁都寫「課程首頁」，
    // 逛起來會分不出「介紹頁」和「教材頁」的差別。
    const PAGE_NAMES = {
      index: '首頁', learn: '課程教材', enroll: '課程介紹與報名', security: '半日資安課', church: 'AI 資安講座',
      works: '學員作品牆', verify: '證書查證', me: '我的學習', glossary: '名詞小辭典',
      pitfalls: '踩坑圖鑑', quizshow: '課堂搶答', handout: '紙本講義', teacher: '管理後台', quote: '內訓報價單',
    };
    const pageKey = (location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';
    const where = current ? `單元 ${current.id.slice(1)}／${MODULES.length}` : (PAGE_NAMES[pageKey] || '課程網站');
    host.className = 'site-header';
    host.innerHTML = `
      <div class="teacher-banner" hidden>講師模式：紫色虛線框是教學提示、討論題和時間建議，學員看不到。按 <kbd>P</kbd> 進入投影模式</div>
      <div class="wrap">
        <a class="brand" href="${base}learn.html" data-tour="home">
          <span class="brand-mark" aria-hidden="true">V</span>
          <span>Vibe Coding 實戰課<small>${esc(where)}</small></span>
        </a>
        <div class="header-tools">
          <div class="mode-switch" role="group" aria-label="檢視模式" data-tour="mode" hidden>
            <button type="button" data-mode="student" aria-pressed="true">學員</button>
            <button type="button" data-mode="teacher" aria-pressed="false">講師</button>
          </div>
          <a class="btn btn-sm btn-ghost${pageKey === 'learn' ? ' is-here' : ''}" href="${base}learn.html#map" data-tour="map-link"${pageKey === 'learn' ? ' aria-current="page"' : ''} title="所有單元的清單，可以跳著上">🗺️ 課程地圖</a>
          <button type="button" class="btn btn-sm btn-ghost" data-action="present" data-tour="present" title="投影模式（快捷鍵 P）">🖥️ 投影</button>
          <a class="btn btn-sm btn-ghost${pageKey === 'quizshow' ? ' is-here' : ''}" href="${base}quizshow.html" data-tour="quizshow"${pageKey === 'quizshow' ? ' aria-current="page"' : ''} title="課堂搶答：投影出來，學員舉手作答">🎯 搶答</a>
          ${current ? '<button type="button" class="btn btn-sm btn-ghost" data-action="print" data-tour="print" title="打開這個單元的紙本講義（2～4 張 A4）">🖨️ 講義</button>' : ''}
          <a class="btn btn-sm btn-ghost" href="${base}glossary.html${current ? `?from=${current.id}` : ''}" data-tour="glossary" title="看不懂的專業名詞，這裡查">📖 名詞</a>
          <span data-auth-slot data-tour="auth"></span>
          <button type="button" class="btn btn-sm btn-help" data-action="tour">？ 教學</button>
        </div>
      </div>
      <div class="progress-bar" aria-hidden="true"><span></span></div>`;
    host.addEventListener('click', (e) => {
      const modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) setMode(modeBtn.dataset.mode);
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'present') togglePresent();
      if (action === 'print') window.open(`${base}handout.html?m=${current.id}`, '_blank', 'noopener');
      if (action === 'tour' && window.Tour) window.Tour.start();
    });
    refreshProgressBar();
    renderPageNav();
  }

  // 單元開頭那排方塊就是「這個單元的目標」，補上標題免得看不懂
  function labelGoals() {
    const list = document.querySelector('.module-hero .goals');
    if (!list || list.previousElementSibling?.classList.contains('goals-label')) return;
    const label = document.createElement('p');
    label.className = 'goals-label';
    label.textContent = '🎯 這個單元的目標';
    list.before(label);
  }

  function refreshProgressBar() {
    const bar = $('.progress-bar span');
    if (bar) bar.style.width = `${(completedCount() / MODULES.length) * 100}%`;
  }

  // ---------- 上一單元／下一單元 ----------
  function renderModuleNav() {
    const host = $('[data-module-nav]');
    const index = MODULES.findIndex((m) => m.id === document.body.dataset.module);
    if (!host || index < 0) return;
    const base = document.body.dataset.base || './';
    const prev = MODULES[index - 1];
    const next = MODULES[index + 1];
    host.className = 'wrap module-nav';
    host.innerHTML = `
      ${prev ? `<a class="btn" href="${base}${prev.file}">← ${prev.emoji} ${esc(prev.title)}</a>` : `<a class="btn" href="${base}learn.html">← 回課程首頁</a>`}
      ${next ? `<a class="btn btn-primary" href="${base}${next.file}" data-tour="next">下一單元：${next.emoji} ${esc(next.title)} →</a>` : `<a class="btn btn-primary" href="${base}learn.html">回課程首頁</a>`}`;
  }

  // 只給講師看的連結（例如頁尾的後台入口）。預設藏著，確定是講師才顯示——
  // 學員點進去只會看到「這個帳號不是講師」，那是沒有意義的死路。
  function syncTeacherOnly(profile) {
    const on = profile?.role === 'teacher';
    $$('[data-teacher-only]').forEach((el) => { el.hidden = !on; });
  }
  syncTeacherOnly(window.Members?.profile);
  document.addEventListener('course:auth', (e) => syncTeacherOnly(e.detail.profile));

  // ---------- 區段目錄 ----------
  // 長頁面（教材首頁、招生頁）捲到一半會不知道自己在哪、還有什麼。
  // 在 <nav data-pagenav> 放一條貼齊頁首的目錄，項目直接從頁面上有 id 的段落產生，
  // 不用另外維護一份清單——新增段落就自動出現。
  function renderPageNav() {
    const host = $('[data-pagenav]');
    if (!host) return;
    const items = $$('main .slide[id]')
      .filter((sec) => !sec.hidden && sec.dataset.navSkip === undefined)
      .map((sec) => ({ id: sec.id, label: sec.dataset.nav || $('h2', sec)?.textContent.trim() || sec.id }))
      .filter((item) => item.label);
    if (items.length < 3) { host.hidden = true; return; }
    host.className = 'page-nav';
    host.hidden = false; // 標記是 hidden 起手，確定有東西可放才顯示
    host.innerHTML = `<div class="wrap"><ul>${items.map((item) =>
      `<li><a href="#${esc(item.id)}">${esc(item.label)}</a></li>`).join('')}</ul></div>`;

    // 捲到哪一段，目錄就標哪一項
    const links = new Map($$('a', host).map((a) => [a.getAttribute('href').slice(1), a]));
    const mark = (id) => links.forEach((a, key) => a.classList.toggle('is-here', key === id));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        const seen = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (seen) mark(seen.target.id);
      }, { rootMargin: '-96px 0px -60% 0px' });
      items.forEach((item) => { const el = document.getElementById(item.id); if (el) io.observe(el); });
    }
  }

  // ---------- 投影模式：一段一頁，方向鍵換頁 ----------
  let slideIndex = 0;
  function slides() { return $$('.slide'); }

  // 投影時一段一頁。內容比螢幕高就整段等比縮小，否則下面會被切掉看不到。
  const HEADER_H = 84;
  const MIN_ZOOM = 0.72; // 再小投影幕後排就看不清楚了，寧可分兩次捲
  let fitTimer = null;

  function fitSlide(el) {
    el.style.zoom = '';
    el.style.minHeight = '';
    if (!document.documentElement.classList.contains('presenting')) return;
    if (el.offsetParent === null) return; // 還沒開放或被隱藏的段落，等它出現再量
    const avail = window.innerHeight - HEADER_H;
    const zoom = el.scrollHeight > avail ? Math.max(MIN_ZOOM, avail / el.scrollHeight) : 1;
    if (zoom < 1) el.style.zoom = zoom.toFixed(3);
    el.style.minHeight = `${Math.round(avail / zoom)}px`;
  }

  function fitAll() { slides().forEach(fitSlide); }

  function scheduleFit() { clearTimeout(fitTimer); fitTimer = setTimeout(fitAll, 120); }

  function togglePresent(force) {
    const on = document.documentElement.classList.toggle('presenting', force);
    toast(on ? '投影模式：← → 或空白鍵換段，Esc 離開' : '已離開投影模式');
    fitAll();
    if (on) goSlide(currentSlide());
  }

  // 互動練習做到一半會變高（例如模擬器一直長出新訊息），要重新算一次。
  // 不用 ResizeObserver：改動 zoom 本身會再觸發一次觀察，容易互相追著跑。
  window.addEventListener('resize', scheduleFit);
  document.addEventListener('course:resize', scheduleFit);
  document.addEventListener('click', (e) => {
    if (!document.documentElement.classList.contains('presenting')) return;
    const slide = e.target.closest && e.target.closest('.slide');
    if (slide) setTimeout(() => fitSlide(slide), 260);
  });

  function currentSlide() {
    const list = slides();
    const y = window.scrollY + 90;
    let idx = 0;
    list.forEach((s, i) => { if (s.offsetTop <= y) idx = i; });
    return idx;
  }

  function goSlide(i) {
    const list = slides();
    if (!list.length) return;
    slideIndex = Math.max(0, Math.min(list.length - 1, i));
    fitSlide(list[slideIndex]);
    list[slideIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    let counter = $('.slide-counter');
    if (!counter) { counter = document.createElement('div'); counter.className = 'slide-counter'; document.body.append(counter); }
    counter.textContent = `${slideIndex + 1} / ${list.length}`;
  }

  function onKey(e) {
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'p' || e.key === 'P') { togglePresent(); return; }
    if (!document.documentElement.classList.contains('presenting')) return;
    if (e.key === 'Escape') togglePresent(false);
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
      e.preventDefault();
      // 縮到最小還是放不下的長段落（例如課程地圖），先把這一段捲完再換頁，不要跳過去
      const here = slides()[currentSlide()];
      const bottom = here ? here.getBoundingClientRect().bottom : 0;
      if (bottom > window.innerHeight + 8) window.scrollBy({ top: window.innerHeight - HEADER_H - 40, behavior: 'smooth' });
      else goSlide(currentSlide() + 1);
    }
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); goSlide(currentSlide() - 1); }
  }

  // ---------- 講師計時器 ----------
  function renderTimer() {
    const el = document.createElement('div');
    el.className = 'timer no-print';
    el.setAttribute('aria-label', '課堂計時器');
    el.innerHTML = `<span>⏱</span><output>05:00</output>
      <button type="button" data-t="3">3分</button><button type="button" data-t="5">5分</button>
      <button type="button" data-t="10">10分</button><button type="button" data-t="stop">停</button>`;
    document.body.append(el);
    let end = 0; let handle = null;
    const out = $('output', el);
    const tick = () => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      out.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      if (left === 0) { clearInterval(handle); el.classList.add('is-done'); }
    };
    el.addEventListener('click', (e) => {
      const t = e.target.dataset.t;
      if (!t) return;
      clearInterval(handle); el.classList.remove('is-done');
      if (t === 'stop') { out.textContent = '00:00'; return; }
      end = Date.now() + Number(t) * 60000; tick(); handle = setInterval(tick, 500);
    });
  }

  // ---------- 測驗引擎 ----------
  // questions: [{ q, options: [...], answer: 索引, why: '解說' }]
  // 測驗區加一顆課堂搶答入口：講師在這一課就能直接開投影版
  function addQuizShowLink(host, moduleId) {
    if (!host || !moduleId || host.parentElement.querySelector('[data-quizshow-link]')) return;
    const base = document.body.dataset.base || './';
    const p = document.createElement('p');
    p.className = 'screen-only quizshow-link';
    p.dataset.quizshowLink = '';
    p.innerHTML = `<a class="btn btn-sm" href="${base}quizshow.html?units=${moduleId}&go=1" target="_blank" rel="noopener">🎯 用這一課的題目玩課堂搶答</a>
      <span class="muted">投影出來，學員舉手搶答（講師用）</span>`;
    host.after(p);
  }

  function mountQuiz(host, questions, { moduleId, title = '隨堂小測驗', onFinish, onRetry, passPercent = window.CourseLib.PASS_PERCENT } = {}) {
    if (!host) return;
    addQuizShowLink(host, moduleId);
    const answers = [];
    let i = 0;

    function renderQuestion() {
      const item = questions[i];
      const dots = questions.map((_, k) => {
        let cls = '';
        if (k === i) cls = 'now';
        else if (k < i) cls = answers[k] === questions[k].answer ? 'ok' : 'bad';
        return `<i class="${cls}"></i>`;
      }).join('');
      host.innerHTML = `
        <div class="quiz-head"><span class="kicker">${esc(title)}．第 ${i + 1} 題／共 ${questions.length} 題</span><span class="quiz-dots">${dots}</span></div>
        <p class="quiz-q">${esc(item.q)}</p>
        <div class="options">${item.options.map((o, k) => `
          <button type="button" class="option" data-k="${k}"><span class="key">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`).join('')}
        </div>
        <div class="quiz-after"></div>`;
      $$('.option', host).forEach((btn) => btn.addEventListener('click', () => choose(Number(btn.dataset.k))));
    }

    function choose(k) {
      const item = questions[i];
      answers[i] = k;
      $$('.option', host).forEach((btn) => {
        btn.disabled = true;
        const n = Number(btn.dataset.k);
        if (n === item.answer) btn.classList.add('is-right');
        else if (n === k) btn.classList.add('is-wrong');
      });
      const ok = k === item.answer;
      const last = i === questions.length - 1;
      $('.quiz-after', host).innerHTML = `
        <div class="feedback ${ok ? 'ok' : 'bad'}"><b>${ok ? '✅ 答對了！' : '❌ 差一點'}</b> ${esc(item.why)}</div>
        <p style="margin-top:14px"><button type="button" class="btn btn-primary" data-next>${last ? '看成績' : '下一題 →'}</button></p>`;
      $('[data-next]', host).addEventListener('click', () => { if (last) finish(); else { i += 1; renderQuestion(); } });
      $('[data-next]', host).focus();
    }

    function finish() {
      const result = window.CourseLib.scoreQuiz(questions, answers, passPercent);
      if (moduleId) recordModule(moduleId, result);
      const message = result.passed
        ? '這個單元過關了！進度已經幫你記下來。'
        : `還差一點，${passPercent} 分就過關。回頭看一下答錯的地方再試一次吧。`;
      host.innerHTML = `
        <div class="reveal" style="text-align:center">
          <p class="kicker">${esc(title)}成績</p>
          <div class="score-big">${result.percent}<small style="font-size:.35em">分</small></div>
          <p>答對 ${result.correct}／${result.total} 題．${esc(message)}</p>
          <button type="button" class="btn" data-retry>再做一次</button>
        </div>`;
      // onRetry：讓呼叫者決定重做的方式（例如總測驗要重新抽題）
      $('[data-retry]', host).addEventListener('click', () => {
        if (onRetry) { onRetry(); return; }
        answers.length = 0; i = 0; renderQuestion();
      });
      if (onFinish) onFinish(result);
    }

    renderQuestion();
  }

  // ---------- 翻牌卡：點一下翻面 ----------
  function initFlips(root = document) {
    // 單元程式可能先綁過一次，boot 時會再掃全頁；已綁過的跳過，避免點一下翻兩次
    $$('.flip:not([data-flip-ready])', root).forEach((card) => {
      card.dataset.flipReady = '';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      const flip = () => card.classList.toggle('is-flipped');
      card.addEventListener('click', flip);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    });
  }

  // ---------- 分頁：<div data-tabs> 內 [data-tab] 按鈕對應 [data-panel] ----------
  function initTabs(root = document) {
    $$('[data-tabs]', root).forEach((group) => {
      const buttons = $$('[data-tab]', group);
      const show = (name) => {
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === name)));
        $$('[data-panel]', group).forEach((p) => { p.hidden = p.dataset.panel !== name; });
      };
      buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
      if (buttons[0]) show(group.dataset.default || buttons[0].dataset.tab);
    });
  }

  // ---------- 課後任務勾選：<ul data-checklist="唯一名稱"> 內的 checkbox 自動記住 ----------
  function initChecklists(root = document) {
    $$('[data-checklist]:not([data-checklist-ready])', root).forEach((list) => {
      list.dataset.checklistReady = '';
      const key = list.dataset.checklist;
      const saved = getState().checklists?.[key] || [];
      $$('input[type="checkbox"]', list).forEach((box) => {
        box.checked = saved.includes(box.value);
        box.addEventListener('change', () => {
          const values = $$('input[type="checkbox"]:checked', list).map((b) => b.value);
          update({ checklists: { ...(getState().checklists || {}), [key]: values } });
          if (values.length === $$('input[type="checkbox"]', list).length) toast('🎉 課後任務全部完成！');
        });
      });
    });
  }

  // ---------- 講義用：把測驗題印成紙本選擇題（不附答案） ----------
  // 五種能力自評的拉桿。stateKey 決定存在哪一格（單元 1 是上課前，結業單元是現在）
  function mountMeters(host, stateKey, onChange) {
    const { SELF_SKILLS, DEFAULT_RATING, ratingLevel } = window.CourseLib;
    const saved = getState()[stateKey] || {};
    // 拉桿本身仍是原生 range：鍵盤、螢幕報讀都照常可用；
    // 旁邊改顯示「這一格代表什麼程度」，而不是一個沒有意義的數字
    const pct = (v) => `${((Number(v) - 1) / 4) * 100}%`;
    const outHtml = (v) => { const lv = ratingLevel(v); return `<span class="meter-emoji" aria-hidden="true">${lv.emoji}</span><span class="meter-label">${esc(lv.label)}</span>`; };
    host.classList.add('meters');
    host.innerHTML = `<div class="meter-scale" aria-hidden="true">${window.CourseLib.RATING_LEVELS.map((lv) => `<span>${lv.emoji}</span>`).join('')}</div>`
      + SELF_SKILLS.map((s, i) => {
        const v = saved[s.name] ?? DEFAULT_RATING;
        return `<div class="meter-row"><label for="${stateKey}-${i}">${esc(s.name)}</label>
        <input type="range" id="${stateKey}-${i}" min="1" max="5" step="1" value="${v}" data-skill="${esc(s.name)}"
          style="--pct:${pct(v)}" aria-valuetext="${esc(ratingLevel(v).label)}">
        <output class="meter-out" for="${stateKey}-${i}">${outHtml(v)}</output></div>`;
      }).join('');
    // 拖曳時每動一格都會觸發：畫面先更新，寫入 localStorage 延後合併，避免卡頓
    const values = { ...saved };
    let pending = null;
    host.addEventListener('input', (e) => {
      const r = e.target.closest('[data-skill]');
      if (!r) return;
      const out = r.nextElementSibling;
      const changed = Number(out.dataset.v || 0) !== Number(r.value);
      r.style.setProperty('--pct', pct(r.value));
      r.setAttribute('aria-valuetext', ratingLevel(r.value).label);
      out.innerHTML = outHtml(r.value);
      out.dataset.v = r.value;
      // 換到新的一格才彈一下，拖曳時同一格不要一直閃
      if (changed) { out.classList.remove('is-pop'); void out.offsetWidth; out.classList.add('is-pop'); }
      values[r.dataset.skill] = Number(r.value);
      onChange(values);
      clearTimeout(pending);
      pending = setTimeout(() => update({ [stateKey]: { ...(getState()[stateKey] || {}), ...values } }), 200);
    });
    onChange(saved);
  }

  function renderPrintQuiz(host, questions) {
    if (!host) return;
    host.innerHTML = `<h3>✍️ 小測驗（圈出答案）</h3>${questions.map((q, i) => `
      <div class="print-q"><b>${i + 1}. ${esc(q.q)}</b><ol>${q.options.map((o) => `<li>${esc(o)}</li>`).join('')}</ol></div>`).join('')}`;
  }

  // ---------- 分類遊戲：一次一張卡，選一個類別，立刻看解說 ----------
  // items: [{ text, answer: 類別 key, why }]；categories: [{ key, label }]
  function mountClassify(host, items, categories, { title = '分類挑戰', onFinish } = {}) {
    if (!host) return;
    let i = 0; let right = 0;
    function render() {
      const item = items[i];
      host.innerHTML = `
        <div class="quiz-head"><span class="kicker">${esc(title)}．${i + 1}／${items.length}</span><span class="pill pill-ok">答對 ${right}</span></div>
        <div class="classify-card reveal">${esc(item.text)}</div>
        <div class="classify-choices">${categories.map((c) =>
          `<button type="button" class="btn" data-cat="${esc(c.key)}">${esc(c.label)}</button>`).join('')}</div>
        <div class="classify-after"></div>`;
      $$('[data-cat]', host).forEach((b) => b.addEventListener('click', () => choose(b.dataset.cat)));
    }
    function choose(key) {
      const item = items[i];
      const ok = key === item.answer;
      if (ok) right += 1;
      $$('[data-cat]', host).forEach((b) => {
        b.disabled = true;
        if (b.dataset.cat === item.answer) b.classList.add('btn-ok');
        else if (b.dataset.cat === key) b.classList.add('btn-danger');
      });
      const last = i === items.length - 1;
      const label = categories.find((c) => c.key === item.answer).label;
      $('.classify-after', host).innerHTML = `
        <div class="feedback ${ok ? 'ok' : 'bad'}"><b>${ok ? '✅ 沒錯' : `❌ 答案是「${esc(label)}」`}</b>　${esc(item.why)}</div>
        <p style="margin-top:12px"><button type="button" class="btn btn-primary" data-next>${last ? '看結果' : '下一張 →'}</button></p>`;
      $('[data-next]', host).addEventListener('click', () => {
        if (!last) { i += 1; render(); return; }
        host.innerHTML = `<div class="reveal" style="text-align:center"><p class="kicker">${esc(title)}</p>
          <div class="score-big">${right}<small style="font-size:.35em">／${items.length}</small></div>
          <p>${right === items.length ? '全對！你已經很有概念了。' : '錯的那幾張，上課時我們會拿出來討論。'}</p>
          <button type="button" class="btn" data-again>再玩一次</button></div>`;
        $('[data-again]', host).addEventListener('click', () => { i = 0; right = 0; render(); });
        if (onFinish) onFinish(right);
      });
      $('[data-next]', host).focus();
    }
    render();
  }

  // ---------- 排序遊戲：用 ↑↓ 把步驟排好再檢查（不用拖曳，投影和鍵盤都好操作） ----------
  // steps: 正確順序的字串陣列
  function mountOrder(host, steps, { title = '排出正確順序', explain = '' } = {}) {
    if (!host) return;
    let order = window.CourseLib.shuffle(steps.map((s, k) => k));
    if (order.every((v, k) => v === k)) order = order.slice().reverse();
    function render(checked) {
      host.innerHTML = `
        <p class="kicker">${esc(title)}</p>
        <ol class="order-list">${order.map((k, pos) => {
          let cls = '';
          if (checked) cls = k === pos ? 'is-right' : 'is-wrong';
          return `<li class="${cls}"><span>${esc(steps[k])}</span>
            <span class="order-btns"><button type="button" class="btn btn-sm" data-move="${pos}" data-dir="-1" aria-label="往上" ${pos === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="btn btn-sm" data-move="${pos}" data-dir="1" aria-label="往下" ${pos === order.length - 1 ? 'disabled' : ''}>↓</button></span></li>`;
        }).join('')}</ol>
        <p><button type="button" class="btn btn-primary" data-check>檢查順序</button></p>
        <div class="order-after"></div>`;
      $$('[data-move]', host).forEach((b) => b.addEventListener('click', () => {
        const pos = Number(b.dataset.move); const to = pos + Number(b.dataset.dir);
        const next = order.slice(); [next[pos], next[to]] = [next[to], next[pos]]; order = next; render(false);
        $(`[data-move="${to}"][data-dir="${b.dataset.dir}"]`, host)?.focus();
      }));
      $('[data-check]', host).addEventListener('click', () => {
        render(true);
        const ok = order.every((v, k) => v === k);
        $('.order-after', host).innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}"><b>${ok ? '✅ 順序完全正確！' : '還有幾個位置不對（紅色的），再調整看看。'}</b> ${ok ? esc(explain) : ''}</div>`;
      });
    }
    render(false);
  }

  // ---------- 複製按鈕：<button data-copy="#目標元素"> ----------
  function initCopy(root = document) {
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;
      const target = $(btn.dataset.copy);
      const text = target ? (target.value ?? target.textContent) : '';
      try { await navigator.clipboard.writeText(text); toast('已複製，可以貼到 Claude Code 了'); } catch { toast('瀏覽器不讓我複製，請手動選取文字'); }
    });
  }

  // ---------- 啟動 ----------
  function boot() {
    renderHeader();
    renderModuleNav();
    renderTimer();
    applyMode(getState().mode);
    labelGoals();
    loadLocalTeacherNotes();
    initFlips();
    initTabs();
    initChecklists();
    initCopy();
    document.addEventListener('keydown', onKey);
  }

  window.Course = {
    MODULES, isTeacher: () => teacherReady, getState, update, recordModule, completedCount, esc, $, $$, toast, mountQuiz, renderPrintQuiz, mountMeters,
    mountClassify, mountOrder, initFlips, initTabs, initChecklists, goSlide, enableTeacher,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

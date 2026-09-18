/*
 * core.js — 每一頁都會載入的共用骨架：
 * 頁首、學員／講師模式、投影模式、進度、測驗引擎、計時器、提示訊息。
 * 頁面用 <body data-module="m1" data-base="../"> 告訴這支程式自己是誰。
 */
(function () {
  'use strict';

  const MODULES = [
    { id: 'm1', part: 'A 起步', emoji: '🚗', title: '什麼是 Vibe Coding？', file: 'modules/01-vibe-coding.html', minutes: 25 },
    { id: 'm2', part: 'A 起步', emoji: '🧰', title: '安裝你的 AI 工程師', file: 'modules/02-install.html', minutes: 35 },
    { id: 'm3', part: 'A 起步', emoji: '🗣️', title: '怎麼跟 Claude Code 合作', file: 'modules/03-work-with-claude.html', minutes: 40 },
    { id: 'm4', part: 'B 上線', emoji: '💾', title: 'Git 與 GitHub 白話講', file: 'modules/04-git-github.html', minutes: 45 },
    { id: 'm5', part: 'B 上線', emoji: '🚀', title: '把作品放上網路', file: 'modules/05-deploy.html', minutes: 35 },
    { id: 'm6', part: 'C 資安', emoji: '🔑', title: '鑰匙與機密別外流', file: 'modules/06-secrets.html', minutes: 30 },
    { id: 'm7', part: 'C 資安', emoji: '🛡️', title: 'AI 會被騙：你是門神', file: 'modules/07-ai-attacks.html', minutes: 35 },
    { id: 'm8', part: 'C 資安', emoji: '🩺', title: '上線前的 Vibe Check', file: 'modules/08-vibe-check.html', minutes: 35 },
    { id: 'm9', part: '結業', emoji: '🎓', title: '總測驗與結業證書', file: 'modules/09-final.html', minutes: 25 },
    { id: 'm10', part: 'D 進階選修', emoji: '🗄️', title: 'Supabase：雲端資料庫', file: 'modules/10-supabase.html', minutes: 35 },
    { id: 'm11', part: 'D 進階選修', emoji: '🪪', title: '會員系統：註冊、登入、權限', file: 'modules/11-members.html', minutes: 40 },
    { id: 'm12', part: 'D 進階選修', emoji: '🤖', title: 'LINE Bot：做一個 AI 小秘書', file: 'modules/12-line-bot.html', minutes: 40 },
    { id: 'm13', part: 'D 進階選修', emoji: '💚', title: 'LINE 登入：免記帳號密碼', file: 'modules/13-line-login.html', minutes: 35 },
    { id: 'm14', part: 'D 進階選修', emoji: '📱', title: 'PWA：讓網站變成手機 App', file: 'modules/14-pwa.html', minutes: 30 },
    { id: 'm15', part: 'D 進階選修', emoji: '🔔', title: '推播通知：主動提醒使用者', file: 'modules/15-push.html', minutes: 30 },
  ];
  // 已經做好、可以點進去的單元（其餘在課程地圖上顯示「製作中」）
  const READY = new Set(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9']);
  // 會員功能啟用時，訪客可以免費試用的單元（其餘要登入並開通）。會員功能沒啟用時全部開放。
  const TRIAL = new Set(['m1', 'm2', 'm4']);
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
    const where = current ? `單元 ${current.id.slice(1)}／${MODULES.length}` : '課程首頁';
    host.className = 'site-header';
    host.innerHTML = `
      <div class="teacher-banner" hidden>講師模式：紫色虛線框是教學提示、討論題和時間建議，學員看不到。按 <kbd>P</kbd> 進入投影模式</div>
      <div class="wrap">
        <a class="brand" href="${base}index.html" data-tour="home">
          <span class="brand-mark" aria-hidden="true">V</span>
          <span>Vibe Coding 實戰課<small>${esc(where)}</small></span>
        </a>
        <div class="header-tools">
          <div class="mode-switch" role="group" aria-label="檢視模式" data-tour="mode" hidden>
            <button type="button" data-mode="student" aria-pressed="true">學員</button>
            <button type="button" data-mode="teacher" aria-pressed="false">講師</button>
          </div>
          <button type="button" class="btn btn-sm btn-ghost" data-action="present" data-tour="present" title="投影模式（快捷鍵 P）">🖥️ 投影</button>
          ${current ? '<button type="button" class="btn btn-sm btn-ghost" data-action="print" data-tour="print" title="印出本單元的學習單">🖨️ 講義</button>' : ''}
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
      if (action === 'print') window.print();
      if (action === 'tour' && window.Tour) window.Tour.start();
    });
    refreshProgressBar();
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
      ${prev ? `<a class="btn" href="${base}${prev.file}">← ${prev.emoji} ${esc(prev.title)}</a>` : `<a class="btn" href="${base}index.html">← 回課程首頁</a>`}
      ${next ? `<a class="btn btn-primary" href="${base}${next.file}" data-tour="next">下一單元：${next.emoji} ${esc(next.title)} →</a>` : `<a class="btn btn-primary" href="${base}index.html">回課程首頁</a>`}`;
  }

  // ---------- 投影模式：一段一頁，方向鍵換頁 ----------
  let slideIndex = 0;
  function slides() { return $$('.slide'); }

  function togglePresent(force) {
    const on = document.documentElement.classList.toggle('presenting', force);
    toast(on ? '投影模式：← → 或空白鍵換段，Esc 離開' : '已離開投影模式');
    if (on) goSlide(currentSlide());
  }

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
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); goSlide(currentSlide() + 1); }
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
  function mountQuiz(host, questions, { moduleId, title = '隨堂小測驗', onFinish, onRetry, passPercent = window.CourseLib.PASS_PERCENT } = {}) {
    if (!host) return;
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
    loadLocalTeacherNotes();
    initFlips();
    initTabs();
    initChecklists();
    initCopy();
    document.addEventListener('keydown', onKey);
  }

  window.Course = {
    MODULES, getState, update, recordModule, completedCount, esc, $, $$, toast, mountQuiz, renderPrintQuiz,
    mountClassify, mountOrder, initFlips, initTabs, initChecklists, goSlide, enableTeacher,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/*
 * home.js — 首頁的動態展示：AI 對話示意視窗、數字跳動、講師作品牆。
 * 開啟「減少動態效果」的使用者，直接看到完整的第一個示意，不播動畫。
 */
(function () {
  'use strict';
  const { $, esc, MODULES } = window.Course;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 每個情境：標題換成什麼字、你說的話、AI 的步驟、最後一句。步驟內容都是課程裡真的會教的重點。
  const SCENES = [
    { word: '自己的網站', prompt: '幫我做一個部門聚餐的報名網頁，要能選葷素', lines: ['讀取專案資料夾…', '✓ 建立 index.html', '✓ 加上報名表單和葷素選項', '✓ 手機上也不會跑版'], done: '做好了！用瀏覽器打開 index.html 看看 👀' },
    { word: 'LINE 機器人', prompt: '做一個 LINE 機器人，每週一早上提醒大家交週報', lines: ['✓ 建立接收 LINE 訊息的 Webhook', '✓ 排程：每週一 08:00（已換算成台灣時間）', '! 金鑰放進環境變數，不寫進程式碼'], done: '要我幫你部署到 Vercel 嗎？' },
    { word: '會員報名系統', prompt: '報名資料存進資料庫，只有管理員看得到全部', lines: ['✓ 建立 Supabase 資料表', '✓ 開啟 RLS：每個人只看得到自己的資料', '✓ 加上管理員頁面'], done: '上線前，要不要先跑一次資安檢查？' },
    { word: '手機 App', prompt: '讓它可以加到手機主畫面，打開像 App 一樣', lines: ['✓ 加上 App 名稱和圖示', '✓ 註冊 Service Worker（離線也能開）', '! iPhone 要從 Safari「加入主畫面」'], done: '好了！拿手機掃 QR Code 試試 📱' },
  ];

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function paintScene(scene, full) {
    $('[data-rotator]').textContent = scene.word;
    $('[data-ai-prompt]').textContent = full ? scene.prompt : '';
    $('[data-ai-lines]').innerHTML = full ? scene.lines.map(lineHtml).join('') : '';
    $('[data-ai-done]').innerHTML = full ? `<div class="ai-done">${esc(scene.done)}</div>` : '';
  }

  function lineHtml(text) {
    const cls = text.startsWith('!') ? 'warn' : text.startsWith('✓') ? '' : 'dim';
    return `<li class="${cls}">${esc(text.replace(/^! /, '⚠ '))}</li>`;
  }

  async function play() {
    for (let i = 0; ; i = (i + 1) % SCENES.length) {
      const scene = SCENES[i];
      paintScene(scene, false);
      const out = $('[data-ai-prompt]');
      for (const ch of scene.prompt) { out.textContent += ch; await wait(55); }
      await wait(400);
      for (const line of scene.lines) { $('[data-ai-lines]').insertAdjacentHTML('beforeend', lineHtml(line)); await wait(650); }
      $('[data-ai-done]').innerHTML = `<div class="ai-done">${esc(scene.done)}</div>`;
      await wait(3200);
    }
  }

  function countUp() {
    const els = document.querySelectorAll('[data-count]');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const to = Number(e.target.dataset.count);
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 900);
        e.target.textContent = Math.round(to * (1 - (1 - k) ** 3));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }));
    els.forEach((el) => io.observe(el));
  }

  // 講師的公開作品。learn 是做這個作品用到、而在本課程學得到的單元。
  // 線上版已下線的作品只留原始碼，並老實標出來，不放點了會壞掉的連結
  const RETIRED = '🪦 線上試玩版已下線，原始碼還在';
  const WORKS = [
    { glyph: '🍜', kind: 'RPG 小遊戲', name: '美食獵人', text: '把「今天吃什麼」變成打怪接懸賞令的遊戲，餐廳資料來自 Google 地圖。', hl: '從空的 repo 到正式上線，只花了 36 小時', learn: ['m5', 'm10'], code: 'https://github.com/windsjp00171-star/fooding-hunter', note: RETIRED },
    { glyph: '🎹', kind: '音樂工具', name: 'PitchPal', text: '自動偵測一首歌是什麼調（Key），再用滑桿一鍵移調。給敬拜團帶領者用。', hl: '放在 Hugging Face Spaces，任何人都能免費用', learn: ['m5'], demo: 'https://winds00171-pitchpal.hf.space/', code: 'https://github.com/windsjp00171-star/pitchpal', note: '⏳ 沒人用時會進入休眠，打開後要等它醒來（單元 5 會講為什麼）' },
    { glyph: '📖', kind: '聖經閱讀器', name: '聖經互動全書', text: '讀經時看不懂的人名、地名，點一下就跳出解釋和地圖。這個網站的「名詞小辭典」就是同一個點子。', hl: '字典→資料庫→AI 三層查詢，常見的詞不用每次都花錢問 AI', learn: ['m10'], demo: 'https://bibile-actionbook.vercel.app/', code: 'https://github.com/windsjp00171-star/bibile-actionbook' },
    { glyph: '🌱', kind: '小組共讀 App', name: '群體共讀靈修', text: '小組每天讀同一段經文、留下心得，用 LINE 登入，可以加到手機主畫面。', hl: '為了守住「經文不能被改」，親手拿掉一個功能：判斷比功能重要', learn: ['m13', 'm14'], code: 'https://github.com/windsjp00171-star/GROUP-Devotion', note: RETIRED },
    { glyph: '🏛', kind: '整合平台', name: '教會整合管理系統（示範版）', text: '把靈修日記、小組回報、檔案分享、活動報名四個系統整合在一起。', hl: '講師最大的專案，約 4.4 萬行程式碼', learn: ['m11', 'm10'], code: 'https://github.com/windsjp00171-star/Church-Management-System-demo', note: RETIRED },
    { glyph: '🤖', kind: 'LINE Bot', name: 'Emmark 小秘書', text: '在 LINE 上隨口說一句「週五下午三點開會」，它就記下來，時間到主動提醒你。', hl: '單元 12 的 LINE Bot 案例就是它', learn: ['m12', 'm15'], code: 'https://github.com/windsjp00171-star/emmask-secret' },
  ];

  function renderWorks() {
    const host = $('[data-showcase]');
    if (!host) return;
    const mod = (id) => MODULES.find((m) => m.id === id);
    host.innerHTML = WORKS.map((w) => `
      <article class="show-card">
        <div style="display:flex;gap:12px;align-items:center"><span class="show-glyph" aria-hidden="true">${w.glyph}</span>
          <div><span class="show-kind">${esc(w.kind)}</span><h3>${esc(w.name)}</h3></div></div>
        <p>${esc(w.text)}</p>
        <div class="show-hl">★ ${esc(w.hl)}</div>
        ${w.note ? `<p style="font-size:.82rem">${esc(w.note)}</p>` : ''}
        <div class="show-links">${w.demo ? `<a href="${w.demo}" target="_blank" rel="noopener">▶ 打開來玩 ↗</a>` : ''}${w.code ? `<a href="${w.code}" target="_blank" rel="noopener">看原始碼 ↗</a>` : ''}</div>
        <div class="show-learn">${w.learn.map(mod).filter(Boolean).map((m) => `<a href="${m.file}">${m.emoji} 單元 ${m.id.slice(1)} ${esc(m.title)}</a>`).join('')}</div>
      </article>`).join('');
    if (calm) return;
    host.addEventListener('pointermove', (e) => {
      const card = e.target.closest('.show-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 6}deg`);
      card.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`);
    });
    host.addEventListener('pointerout', (e) => {
      const card = e.target.closest('.show-card');
      if (card && !card.contains(e.relatedTarget)) { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }
    });
  }

  renderWorks();
  if (calm) { paintScene(SCENES[0], true); return; }
  countUp();
  play();
})();

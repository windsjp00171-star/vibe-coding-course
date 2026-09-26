/*
 * presenter.js — 講師提詞視窗（只有網址帶 ?presenter=1 時才會載入）。
 *
 * 用法：投影機那個視窗按 S（或頁首「🎤 提詞」），會開出這個視窗；
 * 把它拖到講師自己的筆電螢幕。兩個視窗用 BroadcastChannel 同步：
 * 這裡按方向鍵，投影機跟著換段；投影機那邊換段，這裡也跟著更新。
 *
 * 顯示的內容全部從同一頁讀出來：段落標題、段落裡的講師提示（data-teacher-slot）、
 * 段落上的預計時間（data-plan）。不另外維護一份提詞稿，改頁面就同步改好。
 */
(function () {
  'use strict';
  const { $, esc, slides, toast } = window.Course;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('course-presenter') : null;
  const page = location.pathname;

  document.documentElement.classList.add('is-presenter');
  document.title = `🎤 提詞｜${document.title}`;

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  const ver = document.querySelector('script[src*="core.js"]')?.src.split('v=')[1] || '';
  css.href = `${document.body.dataset.base || './'}assets/css/presenter.css?v=${ver}`;
  document.head.append(css);

  const panel = document.createElement('div');
  panel.className = 'pv';
  panel.innerHTML = `
    <header class="pv-top">
      <span class="pv-badge">🎤 講師提詞</span>
      <span class="pv-status" data-pv-status>連線中…</span>
      <span class="pv-clock"><b data-pv-total>00:00</b><small>總時間</small></span>
      <span class="pv-clock"><b data-pv-sec>00:00</b><small>這一段</small></span>
      <button type="button" class="btn btn-sm" data-pv-reset>計時歸零</button>
    </header>
    <main class="pv-main">
      <section class="pv-now">
        <p class="pv-count" data-pv-count></p>
        <h1 data-pv-title></h1>
        <p class="pv-plan" data-pv-plan></p>
        <div class="pv-notes" data-pv-notes></div>
      </section>
      <aside class="pv-next">
        <p class="pv-label">下一段</p>
        <h2 data-pv-next></h2>
        <p class="pv-label" style="margin-top:18px">全部段落</p>
        <ol class="pv-list" data-pv-list></ol>
      </aside>
    </main>
    <footer class="pv-bottom">
      <button type="button" class="btn" data-pv-go="-1">← 上一段</button>
      <span class="muted">方向鍵、空白鍵都可以換段．這個視窗學員看不到</span>
      <button type="button" class="btn btn-primary" data-pv-go="1">下一段 →</button>
    </footer>`;
  document.body.append(panel);

  let index = 0;
  let connected = false;
  const started = Date.now();
  let sectionStarted = Date.now();

  const titleOf = (sec) => {
    if (!sec) return '（結束）';
    if (sec.dataset.nav) return sec.dataset.nav;
    const h = sec.querySelector('h1, h2');
    return h ? h.textContent.replace(/\s+/g, ' ').trim() : '（這一段）';
  };

  // 講師提示：優先用已經填進段落的內容（線上講師登入後由資料庫填入），
  // 沒填到就直接查本機的 TEACHER_NOTES
  function notesOf(sec) {
    if (!sec) return '';
    const parts = [...sec.querySelectorAll('[data-teacher-slot]')].map((slot) => {
      if (slot.innerHTML.trim()) return slot.innerHTML;
      const note = window.TEACHER_NOTES?.[slot.dataset.teacherSlot];
      return note ? note.html : '';
    }).filter(Boolean);
    return parts.join('<hr>');
  }

  function render() {
    const list = slides();
    const sec = list[index];
    $('[data-pv-count]').textContent = `${index + 1} / ${list.length}`;
    $('[data-pv-title]').textContent = titleOf(sec);
    $('[data-pv-plan]').textContent = sec?.dataset.plan ? `⏱ 預計 ${sec.dataset.plan}` : '';
    const notes = notesOf(sec);
    $('[data-pv-notes]').innerHTML = notes
      || `<p class="muted">這一段沒有講師提示。${window.Course.isTeacher() || window.Members?.profile?.role === 'teacher'
        ? '' : '<br>（如果應該要有：請確認已用講師帳號登入）'}</p>`;
    $('[data-pv-next]').textContent = titleOf(list[index + 1]);
    $('[data-pv-list]').innerHTML = list.map((s, i) =>
      `<li class="${i === index ? 'is-here' : ''}${i < index ? ' is-done' : ''}"><button type="button" data-pv-jump="${i}">${esc(titleOf(s))}</button></li>`).join('');
  }

  function go(i) {
    const max = slides().length - 1;
    index = Math.max(0, Math.min(max, i));
    sectionStarted = Date.now();
    channel?.postMessage({ type: 'go', page, index });
    render();
  }

  channel?.addEventListener('message', (e) => {
    const msg = e.data || {};
    if (msg.page !== page || msg.type !== 'at') return;
    if (!connected) {
      connected = true;
      $('[data-pv-status]').textContent = '✅ 已連上投影視窗';
      $('[data-pv-status]').classList.add('is-ok');
    }
    if (msg.index !== index) { index = msg.index; sectionStarted = Date.now(); render(); }
  });

  panel.addEventListener('click', (e) => {
    const step = e.target.closest('[data-pv-go]');
    if (step) go(index + Number(step.dataset.pvGo));
    const jump = e.target.closest('[data-pv-jump]');
    if (jump) go(Number(jump.dataset.pvJump));
    if (e.target.closest('[data-pv-reset]')) { sectionStarted = Date.now(); toast('這一段的計時已歸零'); }
  });

  document.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); go(index + 1); }
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); go(index - 1); }
  }, true);

  const mmss = (ms) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  setInterval(() => {
    $('[data-pv-total]').textContent = mmss(Date.now() - started);
    $('[data-pv-sec]').textContent = mmss(Date.now() - sectionStarted);
  }, 1000);

  // 講師提示可能晚一點才載好（本機檔案或登入後從資料庫讀），載好了重畫一次
  document.addEventListener('course:teacher', render);
  document.addEventListener('course:auth', render);

  if (!channel) {
    $('[data-pv-status]').textContent = '⚠️ 這個瀏覽器不支援視窗同步，請用 Chrome 或 Edge';
  } else {
    channel.postMessage({ type: 'hello', page });
    setTimeout(() => {
      if (!connected) $('[data-pv-status]').textContent = '⚠️ 找不到投影視窗：請在同一個瀏覽器開著這一頁（沒有 ?presenter=1 的那個）';
    }, 2500);
  }
  render();
})();

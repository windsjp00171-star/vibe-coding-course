/* m15.js — 單元 15：推播通知（設計模擬器、正確的權限詢問） */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz, toast } = window.Course;
  const { simulatePushWeek } = window.CourseLib;

  const TOGGLES = [
    { id: 'askOnClick', label: '使用者自己按「開啟提醒」後，才問「允許通知嗎？」' },
    { id: 'window', label: '只在白天 09:00–20:00 發送' },
    { id: 'dedupe', label: '去重：同一件事、同一週只發一次' },
    { id: 'siteFirst', label: '先在網站上留一份通知，再發推播' },
  ];
  const DAYS = ['一', '二', '三', '四', '五', '六', '日'];
  // 一開始全部關掉，讓學員看到最糟的情況，再一個一個打開
  let opts = { askOnClick: true, window: false, dedupe: false, siteFirst: false };

  function render() {
    $('[data-push-toggles]').innerHTML = TOGGLES.map((t) => `
      <label><input type="checkbox" data-toggle="${t.id}" ${opts[t.id] ? 'checked' : ''}><span>${esc(t.label)}</span></label>`).join('');
    const r = simulatePushWeek(opts);
    $('[data-push-week]').innerHTML = r.perDay.map((n, i) => `
      <div class="push-day ${n > 5 ? 'is-noisy' : n > 0 ? 'is-calm' : ''}">週${DAYS[i]}<b>${n}</b>則</div>`).join('');
    const notes = [];
    if (!r.subscribed) notes.push('<div class="feedback bad">🚫 小明一打開網站就被問「允許通知嗎？」，他直覺按了「不允許」。<b>瀏覽器永久記住了這個拒絕</b>，這一週一則都收不到，以後也問不到他了。</div>');
    else {
      if (r.total > 10) notes.push(`<div class="feedback bad">📣 小明這週收到 <b>${r.total}</b> 則一模一樣的提醒。他會做的第一件事，就是把通知關掉。</div>`);
      if (r.firstTime === '00:07') notes.push('<div class="feedback bad">🌙 第一則在<b>半夜 00:07</b> 送達，全部沒交的人都被吵醒。</div>');
      if (r.emptyOnClick) notes.push('<div class="feedback" style="background:var(--warn-soft)">🤔 小明點了通知進到網站，卻找不到這則提醒在哪裡。</div>');
      if (!notes.length) notes.push('<div class="feedback ok">✅ 一週一則、白天送達、點進來看得到。小明週四就交了回報，而且沒有把通知關掉。</div>');
    }
    $('[data-push-verdict]').innerHTML = notes.join('');
  }

  $('[data-push-toggles]').addEventListener('change', (e) => {
    const t = e.target.closest('[data-toggle]');
    if (!t) return;
    opts = { ...opts, [t.dataset.toggle]: t.checked };
    render();
  });
  render();

  // ---------- 由點擊觸發的真實通知示範（瀏覽器內建功能，不需要伺服器） ----------
  $('[data-notify]').addEventListener('click', async () => {
    const msg = $('[data-notify-msg]');
    if (!('Notification' in window)) { msg.textContent = '這個瀏覽器不支援通知。iPhone 要先把網站加到主畫面。'; return; }
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission === 'granted') {
      new Notification('Vibe Coding 實戰課', { body: '這週的學習還沒完成喔，點進來看看 👀', tag: 'course-demo' });
      msg.textContent = '✅ 通知送出了！注意：這是因為你先按了按鈕，瀏覽器才問你。';
      toast('通知送出了');
    } else {
      msg.textContent = '你選了不允許（或之前拒絕過）。這就是「一旦拒絕就很難再問到」：要到瀏覽器設定裡才改得回來。';
    }
  });

  const QUIZ = window.QuizBank.m15;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm15' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'designer', title: '推播設計模擬器', text: '一開始故意關掉大部分設計，打開每個開關，看小明這週會收到什麼。' },
    { tour: 'try', title: '親自體驗', text: '按按鈕試發一則通知，體驗「由使用者點擊才詢問」。' },
    { tour: 'twelve', title: '12 個坑', text: '講師推播工具包整理的坑，分成三種失敗的樣子。' },
    { tour: 'workshop', title: '工作坊', text: '課堂上設計你自己的不吵人提醒。' },
  ]);
})();

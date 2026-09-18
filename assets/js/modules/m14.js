/* m14.js — 單元 14：PWA（快取更新模擬） */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz } = window.Course;
  const { renderPitCards } = window.Electives;

  // 三種策略對「新版上線後，使用者第 N 次打開看到哪一版」的行為（教學簡化）
  const STRATEGIES = [
    { id: 'forever', label: '永遠用手機上存的檔案，不檢查更新', note: '開得最快，但除非使用者刪掉 App 重裝，否則永遠停在舊版。這就是講師遇過的「修好的 bug，有些人說還在」。', seesNew: () => false },
    { id: 'version', label: '檔案加上版本號，每次發布都換號碼', note: '這個課程網站用的就是這招：每次發布都換版本號，瀏覽器看到新號碼就會重新下載。缺點是要記得換號碼，講師就發生過「版本號忘了改」的事故。', seesNew: (n) => n >= 1 },
    { id: 'swr', label: '先顯示存著的版本，同時在背景下載新版（stale-while-revalidate）', note: '第一次打開還是舊版（但很快），背景已經偷偷換好，第二次打開就是新版。講師的小組共讀工具後來改用這招，不用再靠人記得換號碼。', seesNew: (n) => n >= 2 },
  ];
  let strategy = 'forever';
  let released = false;
  let opens = 0;
  let log = [];

  function render() {
    const s = STRATEGIES.find((x) => x.id === strategy);
    $('[data-strategies]').innerHTML = STRATEGIES.map((x) => `
      <label><input type="radio" name="cache-strategy" value="${x.id}" ${x.id === strategy ? 'checked' : ''}><span>${esc(x.label)}</span></label>`).join('');
    const latest = log[log.length - 1];
    $('[data-cache-view]').innerHTML = `
      <p class="kicker">使用者的手機</p>
      <div class="score-big" style="font-size:3rem;color:${latest === 'v2' ? 'var(--ok)' : 'var(--ink)'}">${latest || 'v1'}</div>
      <p>網站目前的最新版：<b>${released ? 'v2' : 'v1'}</b></p>
      <ol class="muted" style="padding-left:1.2em">${log.map((v, i) => `<li>第 ${i + 1} 次打開：看到 ${v}${released && v === 'v1' ? '（舊版！）' : ''}</li>`).join('')}</ol>
      ${released && opens > 0 ? `<div class="feedback ${latest === 'v2' ? 'ok' : 'bad'}">${esc(s.note)}</div>` : '<p class="muted">先按「發布新版」，再按「使用者打開 App」幾次。</p>'}`;
  }

  $('[data-strategies]').addEventListener('change', (e) => {
    if (e.target.name !== 'cache-strategy') return;
    strategy = e.target.value; released = false; opens = 0; log = [];
    render();
  });
  $('[data-release]').addEventListener('click', () => { released = true; opens = 0; render(); window.Course.toast('v2 已上線'); });
  $('[data-open-app]').addEventListener('click', () => {
    const s = STRATEGIES.find((x) => x.id === strategy);
    if (released) opens += 1;
    log = [...log, released && s.seesNew(opens) ? 'v2' : 'v1'];
    render();
  });
  $('[data-cache-reset]').addEventListener('click', () => { released = false; opens = 0; log = []; render(); });
  render();

  renderPitCards($('[data-pits]'), ['sw-cache', 'pwa-password', 'ios-download']);

  const QUIZ = window.QuizBank.m14;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm14' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'install', title: '安裝方式', text: '切換 iPhone 或 Android，看各自怎麼把網站加到主畫面。' },
    { tour: 'cache', title: '快取模擬器', text: '選一種更新策略，發布新版後打開幾次 App，看使用者什麼時候才看到新版。' },
    { tour: 'pits', title: '真實事故', text: '講師做 PWA 時踩過的坑。' },
    { tour: 'workshop', title: '工作坊', text: '課堂上把你的網站變成可以安裝的 App。' },
  ]);
})();

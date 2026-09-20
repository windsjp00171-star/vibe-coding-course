/* m22.js — 單元 22：AI 要花多少錢（成本估算與不被綁死） */
(function () {
  'use strict';
  const { $, $$, esc, mountQuiz, renderPrintQuiz, initChecklists } = window.Course;
  const { estimateCost } = window.CourseLib;

  const VERDICT = {
    free: { icon: '🟢', head: '應該可以完全免費', text: '這個規模落在各服務的免費範圍內。還是建議去設定裡設一個用量上限，免得哪天被別人大量使用。' },
    watch: { icon: '🟡', head: '大致免費，但有一項要盯著', text: '下面標示的那一項可能超過免費額度。先去看那個服務「超過會停掉還是自動收費」，再決定要不要設上限。' },
    paid: { icon: '🔴', head: '這個規模會開始花錢', text: '有兩項以上會超過免費額度。不是不能做，而是要先估好預算，並且設定用量上限，避免帳單爆掉。' },
  };

  function read() {
    const val = (k) => Number($(`[data-cs="${k}"]`).value) || 0;
    return { users: val('users'), uses: val('uses'), ai: val('ai'), notify: val('notify') };
  }

  function render() {
    const input = read();
    const { calls, rows, level } = estimateCost(input);
    const v = VERDICT[level];
    $('[data-cs-out]').innerHTML = `
      <div class="cs-big">${v.icon} ${esc(v.head)}</div>
      <p style="margin:8px 0 0">每個月大約 <b>${calls.toLocaleString('zh-TW')}</b> 次使用。${esc(v.text)}</p>
      <ul class="cs-rows">${rows.map((r) => `<li><span>${esc(r.name)}</span><span>${r.over ? '⚠️ ' : ''}${esc(r.note)}</span></li>`).join('')}</ul>
      <p class="cs-note">這是量級估算，不是報價。各服務的方案和額度會變動，實際數字請以官網為準；真的要簽約前，把這張表拿去跟官網對一次。</p>`;
  }

  $$('[data-cs]').forEach((el) => el.addEventListener('input', render));
  $$('[data-cs]').forEach((el) => el.addEventListener('change', render));
  render();
  initChecklists();

  const QUIZ = window.QuizBank.m22;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm22' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'models', title: '三種收費方式', text: '訂閱制好預算、用量制最容易爆、免費額度要搞清楚超過會怎樣。' },
    { tour: 'stack', title: '免費範圍', text: '這門課用到的服務，小工具多半完全免費。數字會變，看量級就好。' },
    { tour: 'calc', title: '成本估算', text: '填人數和次數，馬上知道要不要擔心。這是量級估算，不是報價。' },
    { tour: 'lockin', title: '不要被綁死', text: '真正的風險是想走走不掉。挑服務前先問「我搬得走什麼」。' },
    { tour: 'workshop', title: '工作坊', text: '幫自己的作品做一份成本與退場評估，主管問的時候你答得出來。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關，可以重做。' },
  ]);
})();

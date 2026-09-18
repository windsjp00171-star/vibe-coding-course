/* m9.js — 單元 09：總測驗與結業證書 */
(function () {
  'use strict';
  const { $, esc, MODULES, getState, update, mountQuiz } = window.Course;
  const { buildExam } = window.CourseLib;

  const CORE_UNITS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];
  const EXAM_SIZE = 12;
  const FINAL_PASS_PERCENT = 80;

  // ---------- 學習紀錄 ----------
  function renderReview() {
    const { progress } = getState();
    $('[data-review]').innerHTML = MODULES.filter((m) => CORE_UNITS.includes(m.id)).map((m) => {
      const p = progress[m.id];
      return `<a class="review-item ${p?.done ? 'is-done' : ''}" href="../${m.file}">
        <span>${m.emoji} <b>${esc(m.title)}</b></span>
        <span class="pill ${p?.done ? 'pill-ok' : 'pill-warn'}">${p?.done ? `✅ ${p.best} 分` : p ? `${p.best} 分` : '未作答'}</span></a>`;
    }).join('');
  }

  // ---------- 總測驗（每次重新抽題、打亂選項） ----------
  function startExam() {
    const exam = buildExam(window.QuizBank, CORE_UNITS, EXAM_SIZE);
    mountQuiz($('[data-exam]'), exam, {
      moduleId: 'm9',
      title: '總測驗',
      passPercent: FINAL_PASS_PERCENT,
      onFinish: (result) => {
        if (result.passed) update({ finalScore: Math.max(getState().finalScore || 0, result.percent) });
        renderCert();
      },
      onRetry: startExam, // 重做時重新抽一份新考卷
    });
  }

  // ---------- 證書 ----------
  function renderCert() {
    const state = getState();
    const earned = Boolean(state.finalScore);
    const name = state.name || '';
    $('[data-cert-name]').value = name;
    $('[data-cert-out-name]').textContent = name || '＿＿＿＿＿＿';
    $('[data-cert-date]').textContent = `結業日期　${new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    $('[data-cert-score]').textContent = earned ? `總測驗　${state.finalScore} 分` : '';
    $('[data-cert]').classList.toggle('is-earned', earned);
    $('[data-cert-print]').disabled = !(earned && name);
    $('[data-cert-status]').innerHTML = earned
      ? (name ? '<div class="feedback ok">🎉 恭喜結業！可以列印證書了。</div>' : '<div class="feedback ok">🎉 已通過總測驗！輸入名字就能列印證書。</div>')
      : `<div class="callout callout-warn">總測驗 ${FINAL_PASS_PERCENT} 分以上才能列印證書。</div>`;
  }

  $('[data-cert-name]').addEventListener('input', (e) => { update({ name: e.target.value.trim().slice(0, 20) }); renderCert(); });
  $('[data-cert-print]').addEventListener('click', () => {
    document.documentElement.classList.add('print-cert');
    window.print();
  });
  window.addEventListener('afterprint', () => document.documentElement.classList.remove('print-cert'));

  renderReview();
  startExam();
  renderCert();

  window.Tour.register([
    { tour: 'review', title: '學習紀錄', text: '八個必修單元的小測驗成績。沒過的可以點進去重做。' },
    { tour: 'exam', title: '總測驗', text: '12 題、80 分過關。每次都會重新抽題、打亂選項。' },
    { tour: 'cert', title: '結業證書', text: '通過總測驗並輸入名字後，就能列印證書或存成 PDF。' },
    { tour: 'next', title: '結業之後', text: '明天就能做的五件事，做完打勾。' },
  ]);
})();

/* m18.js — 單元 18：怎麼問出好答案 */
(function () {
  'use strict';
  const { $, $$, esc, mountQuiz, renderPrintQuiz, initFlips, initChecklists } = window.Course;
  const { PROMPT_UPGRADES, upgradePrompt } = window.CourseLib;

  // ---------- 指令改造器 ----------
  const TIPS = {
    who: '不同的讀者，寫法完全不同。',
    format: '拿到就能直接貼出去，不用再刪客套話。',
    example: '一個例子勝過三句形容詞。',
    ask: '大任務一定要加，避免白做一場。',
    unsure: '把幻覺從「看不出來」變成「標在那裡」。',
  };

  $('[data-up-opts]').innerHTML = PROMPT_UPGRADES.map((u) => `
    <label><input type="checkbox" data-up="${esc(u.id)}">
      <span>${esc(u.label)}<small>${esc(TIPS[u.id] || '')}</small></span></label>`).join('');

  function renderUpgrade() {
    const ids = $$('[data-up]').filter((b) => b.checked).map((b) => b.dataset.up);
    const base = $('[data-up-base]').value.trim() || '幫我寫公告';
    $('[data-up-count]').textContent = String(ids.length);
    $('[data-up-out]').textContent = upgradePrompt(base, ids);
  }
  $('[data-up-opts]').addEventListener('change', renderUpgrade);
  $('[data-up-base]').addEventListener('input', renderUpgrade);
  renderUpgrade();

  initFlips();
  initChecklists();

  // ---------- 測驗 ----------
  const QUIZ = window.QuizBank.m18;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm18' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'why', title: '為什麼要講清楚', text: '你不是在下命令，是在幫 AI 縮小猜測範圍。' },
    { tour: 'upgrade', title: '指令改造器', text: '勾選零件，右邊即時組出改造後的指令，可以直接複製去用。' },
    { tour: 'tricks', title: '五個技巧', text: '點卡片看「給例子」「請它先問你」等技巧怎麼用。' },
    { tour: 'toomuch', title: '反過來說', text: '還在找方向的時候，限制太多反而會得到平庸的答案。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關。' },
  ]);
})();

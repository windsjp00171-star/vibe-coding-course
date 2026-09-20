/* m20.js — 單元 20：三個月後還救得回來嗎（交接包、備份、還原演練） */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz, initChecklists, getState, update } = window.Course;
  const { BACKUP_LAYERS, backupCoverage } = window.CourseLib;

  // ---------- 備份體檢 ----------
  const KEY = 'backupLayers';
  const picked = () => getState()[KEY] || [];

  function renderLayers() {
    $('[data-hv-layers]').innerHTML = BACKUP_LAYERS.map((l) => {
      const on = picked().includes(l.id);
      return `<label class="hv-layer ${on ? 'is-on' : ''}">
        <input type="checkbox" value="${l.id}" ${on ? 'checked' : ''}>
        <span><b>${esc(l.name)}</b><small>${esc(l.hint)}</small></span>
        <span aria-hidden="true">${on ? '✅' : '—'}</span>
      </label>`;
    }).join('');
    renderVerdict();
  }

  function renderVerdict() {
    const { rows, covered, total, level } = backupCoverage(picked());
    const head = level === 2
      ? '🛡️ 五種狀況你都救得回來，而且演練過了'
      : level === 1
        ? `⚠️ 五種狀況裡，你現在救得回 ${covered} 種`
        : '🚨 現在任何一種狀況發生，你都救不回來';
    const list = rows.map((r) => `<li>${r.ok ? '✅' : '❌'} ${esc(r.name)}${r.ok ? ''
      : `　<span class="muted">缺：${r.missing.map((id) => esc(BACKUP_LAYERS.find((l) => l.id === id).name)).join('、')}</span>`}</li>`).join('');
    const tail = picked().includes('drill') ? ''
      : '<p style="margin-top:10px">最關鍵的一項是「還原演練」。沒有救回來過一次，上面的勾選都只是你以為。</p>';
    $('[data-hv-verdict]').className = `hv-verdict hv-v${level}`;
    $('[data-hv-verdict]').innerHTML = `${head}<ul>${list}</ul>${tail}`;
  }

  $('[data-hv-layers]').addEventListener('change', (e) => {
    const box = e.target.closest('input[type="checkbox"]');
    if (!box) return;
    const next = box.checked
      ? [...new Set([...picked(), box.value])]
      : picked().filter((id) => id !== box.value);
    update({ [KEY]: next });
    renderLayers();
  });

  renderLayers();
  initChecklists();

  const QUIZ = window.QuizBank.m20;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm20' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'future', title: '先承認會忘記', text: '用 AI 協作時很多決定沒留下痕跡，三個月後忘光是必然的，不是你記性不好。' },
    { tour: 'pack', title: '交接包', text: 'README、CLAUDE.md、commit 訊息，各回答一個未來的你會問的問題。三份都可以請 AI 起草，你負責挑錯。' },
    { tour: 'backup', title: '備份體檢', text: '勾你真的有的東西，下面會告訴你哪種災難救得回來。沒演練過的備份不算數。' },
    { tour: 'drill', title: '還原演練', text: '開一個新資料夾，只用 GitHub 上的東西把它救回來。卡住的地方就是你漏掉的東西。' },
    { tour: 'vendor', title: '服務會消失', text: '挑服務時先問「三年後我搬得走什麼」。拿不走的，就不要放重要的東西。' },
    { tour: 'workshop', title: '工作坊', text: '兩人一組互相演練。目標不是成功，是找出你救不回來的東西。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關，可以重做。' },
  ]);
})();

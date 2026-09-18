/* m11.js — 單元 11：會員系統（權限矩陣設計器） */
(function () {
  'use strict';
  const { $, $$, esc, mountQuiz, renderPrintQuiz } = window.Course;
  const { renderPitCards } = window.Electives;

  const ROLES = [
    { id: 'guest', label: '🕶️ 訪客' },
    { id: 'pending', label: '⏳ 待開通會員' },
    { id: 'member', label: '🙋 會員' },
    { id: 'host', label: '🧑‍💼 主辦人' },
  ];
  const ACTIONS = [
    { id: 'public', label: '看活動介紹' },
    { id: 'signup', label: '報名' },
    { id: 'own', label: '看自己的報名' },
    { id: 'all', label: '看全部名單（含電話）' },
    { id: 'settings', label: '改活動設定' },
    { id: 'delete', label: '刪除報名資料' },
  ];
  const SUGGESTED = {
    guest: ['public'],
    pending: ['public'],
    member: ['public', 'signup', 'own'],
    host: ['public', 'signup', 'own', 'all', 'settings', 'delete'],
  };
  // 檢查規則：on = 勾了才觸發；off = 沒勾才觸發
  const RULES = [
    { role: 'guest', action: 'all', on: true, level: 'danger', msg: '訪客看得到全部人的電話：任何路過的人都能抓走個資。' },
    { role: 'guest', action: 'settings', on: true, level: 'danger', msg: '訪客可以改活動設定：誰都能把活動改掉。' },
    { role: 'guest', action: 'delete', on: true, level: 'danger', msg: '訪客可以刪除資料：這是最嚴重的漏洞。' },
    { role: 'guest', action: 'signup', on: true, level: 'warn', msg: '訪客可以報名：不知道是誰報的，容易被灌假資料。至少要有防灌票機制。' },
    { role: 'pending', action: 'all', on: true, level: 'danger', msg: '還沒被確認身分的人就能看全部名單，等於沒有開通這道關。' },
    { role: 'pending', action: 'delete', on: true, level: 'danger', msg: '待開通的人可以刪資料，太危險了。' },
    { role: 'pending', action: 'settings', on: true, level: 'danger', msg: '待開通的人可以改設定，太危險了。' },
    { role: 'member', action: 'all', on: true, level: 'danger', msg: '一般會員看得到所有人的電話：這是講師在全域稽核時抓到過的那種權限漏洞。' },
    { role: 'member', action: 'delete', on: true, level: 'danger', msg: '一般會員可以刪除別人的資料。' },
    { role: 'member', action: 'settings', on: true, level: 'danger', msg: '一般會員可以改活動設定。' },
    { role: 'member', action: 'own', on: false, level: 'warn', msg: '會員看不到自己報了什麼，會一直來問主辦人。' },
    { role: 'host', action: 'all', on: false, level: 'warn', msg: '主辦人看不到名單，沒辦法辦活動。' },
    { role: 'host', action: 'delete', on: true, level: 'tip', msg: '主辦人可以刪除：建議改成「軟刪除」並留下紀錄，才查得到是誰刪的。' },
  ];
  let grid = {};

  function reset(preset) {
    grid = Object.fromEntries(ROLES.map((r) => [r.id, new Set(preset ? preset[r.id] : ['public'])]));
    render();
  }

  function render() {
    const flagged = new Map();
    const findings = RULES.filter((rule) => grid[rule.role].has(rule.action) === rule.on);
    findings.forEach((f) => { if (f.level === 'danger') flagged.set(`${f.role}:${f.action}`, true); });
    $('[data-matrix]').innerHTML = `<thead><tr><th>身分 ＼ 可以</th>${ACTIONS.map((a) => `<th>${esc(a.label)}</th>`).join('')}</tr></thead>
      <tbody>${ROLES.map((r) => `<tr><td>${esc(r.label)}</td>${ACTIONS.map((a) => `
        <td class="${flagged.has(`${r.id}:${a.id}`) ? 'is-risky' : ''}"><input type="checkbox" aria-label="${esc(r.label)} ${esc(a.label)}"
          data-cell="${r.id}:${a.id}" ${grid[r.id].has(a.id) ? 'checked' : ''}></td>`).join('')}</tr>`).join('')}</tbody>`;
    const dangers = findings.filter((f) => f.level === 'danger');
    const others = findings.filter((f) => f.level !== 'danger');
    const tone = { danger: 'bad', warn: '', tip: 'ok' };
    $('[data-matrix-report]').innerHTML = `<p class="kicker">檢查結果</p>
      ${dangers.length ? `<div class="score-big" style="font-size:2.6rem;color:var(--danger)">${dangers.length}<small style="font-size:.4em"> 個危險</small></div>` : '<div class="score-big" style="font-size:2.6rem;color:var(--ok)">安全<small style="font-size:.4em"> ✓</small></div>'}
      ${[...dangers, ...others].map((f) => `<div class="feedback ${tone[f.level]}" style="margin-top:8px;${f.level === 'warn' ? 'background:var(--warn-soft)' : ''}">${f.level === 'danger' ? '🚨' : f.level === 'warn' ? '⚠️' : '💡'} ${esc(f.msg)}</div>`).join('')}
      ${findings.length ? '' : '<p class="muted">每個身分都只拿到剛好需要的權限，這就是「最小權限原則」。</p>'}`;
  }

  $('[data-matrix]').addEventListener('change', (e) => {
    const cell = e.target.closest('[data-cell]');
    if (!cell) return;
    const [role, action] = cell.dataset.cell.split(':');
    const next = new Set(grid[role]);
    if (cell.checked) next.add(action); else next.delete(action);
    grid = { ...grid, [role]: next };
    render();
  });
  $('[data-matrix-reset]').addEventListener('click', () => reset());
  $('[data-matrix-good]').addEventListener('click', () => reset(SUGGESTED));
  // 一開始故意放一個常見的錯誤設定，讓學員自己發現問題
  reset({ guest: ['public', 'all'], pending: ['public'], member: ['public', 'signup', 'own', 'all'], host: ['public', 'own', 'all', 'settings', 'delete'] });

  renderPitCards($('[data-pits]'), ['id-mask', '2fa-too-hard', 'line-loop', 'leaky-error']);

  const QUIZ = window.QuizBank.m11;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm11' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'methods', title: '四種登入方式', text: '依照你的使用者，選一種最順的登入方式。' },
    { tour: 'matrix', title: '權限矩陣設計器', text: '一開始故意放了幾個錯誤設定，試著把紅色警告都修掉。卡住可以按「看建議的設定」。' },
    { tour: 'pits', title: '真實事故', text: '講師的會員系統踩過的坑。' },
    { tour: 'workshop', title: '工作坊', text: '課堂上設計你自己題目的會員規則。' },
  ]);
})();

/* m17.js — 單元 17：AI 時代的資料整理 */
(function () {
  'use strict';
  const { $, $$, esc, mountQuiz, renderPrintQuiz, initChecklists } = window.Course;
  const { maskPII, cleanRows } = window.CourseLib;

  // ---------- 個資遮罩（和單元 6 共用同一套規則）----------
  const input = $('[data-mask-input]');
  function renderMask() {
    const { masked, found } = maskPII(input.value);
    $('[data-mask-out]').textContent = masked || '（貼上資料就會顯示遮好的版本）';
    const kinds = [...new Set(found.map((f) => f.type))];
    $('[data-mask-found]').textContent = found.length
      ? `遮掉 ${found.length} 處：${kinds.join('、')}。整理完再把代號換回真實資料。`
      : '目前沒有偵測到個資。注意：這只是簡單的比對，姓名、住址這類還是要自己看過。';
  }
  input.addEventListener('input', renderMask);
  renderMask();

  // ---------- 資料清洗：勾一個看一個 ----------
  const MESSY = [
    { name: '  王小明 ', date: '2026/3/5', phone: '０９１２３４５６７８', amount: '1,200' },
    { name: '李美美', date: '3-5', phone: '0912-345-679', amount: '800' },
    { name: ' 陳大文', date: '2026.03.06', phone: '0933 222 111', amount: '1,200' },
  ];
  const COLS = [['name', '姓名'], ['date', '場次日期'], ['phone', '電話'], ['amount', '金額']];

  function renderClean() {
    const options = {};
    $$('[data-clean]').forEach((box) => { options[box.dataset.clean] = box.checked; });
    const rows = cleanRows(MESSY, options);
    $('[data-clean-table]').innerHTML = `
      <thead><tr>${COLS.map(([, label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row, i) => `<tr>${COLS.map(([key]) => {
        const changed = row[key] !== MESSY[i][key];
        const flag = key === 'date' && row.guessed;
        return `<td class="${flag ? 'flag' : changed ? 'changed' : ''}">${esc(row[key])}${flag ? '（猜的）' : ''}</td>`;
      }).join('')}</tr>`).join('')}</tbody>`;
    const on = Object.values(options).filter(Boolean).length;
    $('[data-clean-note]').textContent = on
      ? '綠色是被改過的欄位，黃色是 AI 猜的、需要你確認。金額欄永遠不動。'
      : '先勾一個看看。三個都勾起來，就是最常用的組合。';
  }
  $$('[data-clean]').forEach((box) => box.addEventListener('change', renderClean));
  renderClean();

  initChecklists();

  // ---------- 測驗 ----------
  const QUIZ = window.QuizBank.m17;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm17' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'fit', title: '能交／不能交', text: '格式整理和分類交給 AI，算錢交給試算表公式。' },
    { tour: 'mask', title: '個資遮罩', text: '貼資料給 AI 之前，先在這裡把電話、Email 換成代號。' },
    { tour: 'clean', title: '資料清洗', text: '勾選要做的整理，表格會立刻變給你看，綠色是改過的、黃色是 AI 猜的。' },
    { tour: 'prompt', title: '指令範本', text: '可以直接複製來用，重點是「不要自己編」和「告訴我總共幾列」。' },
    { tour: 'verify', title: '抽查四個地方', text: '資料整理的錯誤不會報錯，一定要自己抽查。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關。' },
  ]);
})();

/* m21.js — 單元 21：這東西能不能用？（AI 的界線與責任） */
(function () {
  'use strict';
  const { $, $$, esc, mountQuiz, renderPrintQuiz, initChecklists, getState, update, toast } = window.Course;
  const { POLICY_CLAUSES, buildPolicy } = window.CourseLib;

  // ---------- 這個能不能貼給 AI ----------
  // 界線不在「機不機密」，而在「外流會不會害到別人」，所以每一題都給理由。
  const CASES = [
    { text: '一份公開活動的議程，要請 AI 幫忙改得通順', ok: true, why: '本來就要公開的東西，沒有外流問題。' },
    { text: '同事的手機號碼和 Email，要請 AI 整理成表格', ok: false, why: '這是別人的個資，外流受害的是他們。要先遮罩成代號（單元 17）。' },
    { text: '你自己寫的一段程式碼，裡面沒有密碼', ok: true, why: '沒有金鑰、沒有客戶資料的程式碼，通常可以。真的很敏感的商業邏輯則另外評估。' },
    { text: '公司還沒公開的報價單，要請 AI 幫忙算總額', ok: false, why: '未公開的商業資訊外流，可能直接影響標案結果。算錢也不該交給 AI（單元 17）。' },
    { text: '網路上找得到的法規條文，要請 AI 解釋白話版', ok: true, why: '公開資料。但它解釋的內容要自己回去對原文。' },
    { text: '設定檔整段貼上，裡面有資料庫連線字串', ok: false, why: '連線字串等於鑰匙（單元 6）。要貼也要先把金鑰換成 XXXX。' },
  ];

  const answers = {};

  function renderSort() {
    $('[data-cp-sort]').innerHTML = CASES.map((c, i) => {
      const picked = answers[i];
      const state = picked === undefined ? '' : picked === c.ok ? 'is-right' : 'is-wrong';
      return `<div class="cp-row ${state}">
        <span>${esc(c.text)}</span>
        <span class="btns">
          <button type="button" class="btn btn-sm" data-cp="${i}" data-val="1">可以貼</button>
          <button type="button" class="btn btn-sm" data-cp="${i}" data-val="0">不要貼</button>
        </span>
        ${picked === undefined ? '' : `<span class="cp-why">${picked === c.ok ? '✅ 對' : '❌ 再想一下'}：${esc(c.why)}</span>`}
      </div>`;
    }).join('');
    const done = Object.keys(answers).length;
    const right = Object.entries(answers).filter(([i, v]) => v === CASES[i].ok).length;
    $('[data-cp-score]').textContent = done
      ? `已作答 ${done}／${CASES.length}，答對 ${right} 題。${done === CASES.length && right === CASES.length ? '你抓到重點了：看的是「外流會害到誰」。' : ''}`
      : '選「可以貼」或「不要貼」，答完會告訴你為什麼。';
  }

  $('[data-cp-sort]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cp]');
    if (!btn) return;
    answers[btn.dataset.cp] = btn.dataset.val === '1';
    renderSort();
  });

  // ---------- 守則產生器 ----------
  const KEY = 'policyClauses';
  const chosen = () => getState()[KEY] || POLICY_CLAUSES.map((c) => c.id);

  function renderPolicy() {
    const ids = chosen();
    $('[data-cp-opts]').innerHTML = `
      <label style="font-weight:700">單位名稱
        <input type="text" data-cp-unit value="${esc(getState().policyUnit || '')}" placeholder="例如：行政部" style="font:inherit;padding:6px 10px;border-radius:10px;border:1.5px solid var(--line);margin-left:8px">
      </label>` + POLICY_CLAUSES.map((c) => `
      <label><input type="checkbox" value="${c.id}" ${ids.includes(c.id) ? 'checked' : ''}>
        <span>${esc(c.text)}<small>${esc(c.why)}</small></span></label>`).join('');
    $('[data-cp-out]').textContent = buildPolicy(ids, getState().policyUnit);
  }

  $('[data-cp-opts]').addEventListener('change', (e) => {
    const box = e.target.closest('input[type="checkbox"]');
    if (!box) return;
    const ids = box.checked ? [...new Set([...chosen(), box.value])] : chosen().filter((id) => id !== box.value);
    update({ [KEY]: ids });
    $('[data-cp-out]').textContent = buildPolicy(ids, getState().policyUnit);
  });

  $('[data-cp-opts]').addEventListener('input', (e) => {
    if (!e.target.closest('[data-cp-unit]')) return;
    update({ policyUnit: e.target.value.slice(0, 20) });
    $('[data-cp-out]').textContent = buildPolicy(chosen(), getState().policyUnit);
  });

  $('[data-cp-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('[data-cp-out]').textContent);
      $('[data-cp-msg]').textContent = '已複製，可以貼進公告或 Word。';
    } catch {
      $('[data-cp-msg]').textContent = '複製失敗，請手動選取上面的文字。';
    }
  });

  renderSort();
  renderPolicy();
  initChecklists();

  const QUIZ = window.QuizBank.m21;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm21' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'three', title: '三個問題', text: '丟進去的能丟嗎、吐出來的是誰的、出事誰負責。每次用 AI 做東西都先問一次。' },
    { tour: 'sort', title: '能不能貼', text: '六個情境自己判斷，答完會說明理由。重點是「外流會害到誰」。' },
    { tour: 'copyright', title: '著作權', text: '完全由 AI 生成的東西可能不受保護；對外用之前要確認來源與授權。' },
    { tour: 'privacy', title: '個資法白話版', text: '說清楚要幹嘛、只收需要的、人家要查要刪做得到。報名表就適用。' },
    { tour: 'policy', title: '守則產生器', text: '勾選條款會生成可以直接公告的文字，記得改成你們的用語。' },
    { tour: 'workshop', title: '工作坊', text: '同單位坐一起寫守則。做不到的條款要講出來，比照抄有價值。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關，可以重做。' },
  ]);
})();

/* m16.js — 單元 16：Agent、MCP 與 Skill */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz, mountOrder, initChecklists } = window.Course;

  // ---------- Agent 的一次任務：排順序 ----------
  mountOrder($('[data-order-loop]'), [
    '你說：「把這個月的報名表整理成統計表」',
    '它先規劃步驟，列出要做什麼給你看',
    '它問你「可以讀取這個資料夾嗎？」，你允許',
    '它開啟檔案、分類加總、產生統計表',
    '它自己檢查結果：筆數對不對、有沒有空白欄位',
    '它回報做了什麼，並告訴你檔案存在哪裡',
  ], { title: 'Agent 做一件事的順序', explain: '重點是最後兩步：會動手的 AI 一定要「自己檢查」再「回報」，你才有辦法驗收。' });

  // ---------- Skill 草稿產生器 ----------
  $('[data-skill-make]').addEventListener('click', () => {
    const v = (sel) => $(sel).value.trim();
    const name = v('[data-skill-name]') || '（還沒命名）';
    const when = v('[data-skill-when]') || '（還沒寫：什麼時候要用）';
    const steps = v('[data-skill-steps]') || '（還沒寫步驟）';
    const never = v('[data-skill-never]') || '（還沒寫：不准做的事）';
    const out = $('[data-skill-out]');
    out.hidden = false;
    out.textContent = `# ${name}

## 什麼時候用
${when}

## 步驟
${steps}

## 不准做的事
${never}

## 做完要檢查
- 結果自己看過一遍，確認沒有明顯錯誤
- 跟上一次的結果比對，差太多要先問人

---
把這段存成一個檔案（例如 SKILL.md），放進專案資料夾，
再對 Claude Code 說：「照這份文件做一次，哪一步寫得不清楚請告訴我。」`;
  });

  initChecklists();

  // ---------- 測驗 ----------
  const QUIZ = window.QuizBank.m16;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm16' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'loop', title: 'Agent 的迴圈', text: '想、動手、看結果、修正。把步驟排成正確順序試試看。' },
    { tour: 'mcp', title: 'MCP', text: '讓 AI 連上瀏覽器、資料庫、行事曆的共通插座，裝之前要先想權限。' },
    { tour: 'skill', title: 'Skill', text: '把一種工作的做法打包給 AI，跟 CLAUDE.md 的差別看右邊的表。' },
    { tour: 'workshop', title: '寫你自己的 Skill', text: '填四個欄位，就會產生一份可以直接交給 Claude Code 的草稿。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關。' },
  ]);
})();

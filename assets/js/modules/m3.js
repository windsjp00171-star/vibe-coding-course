/* m3.js — 單元 03：跟 Claude Code 合作 */
(function () {
  'use strict';
  const { $, $$, esc, mountQuiz, renderPrintQuiz, mountOrder, initFlips } = window.Course;
  const { checkPrompt } = window.CourseLib;

  // ---------- 指令健檢 ----------
  const GOOD_EXAMPLE = '請先列出步驟給我看，我同意再開始。\n幫我做一個部門聚餐報名表，給同事用手機填。\n只要一個 html 檔就好，不要用框架，欄位只要姓名、葷素、交通方式。\n做完自己測一次，並告訴我怎麼打開。';
  const input = $('[data-prompt-input]');
  function renderPrompt() {
    const r = checkPrompt(input.value);
    $('[data-prompt-result]').innerHTML = `
      <p class="kicker">健檢結果</p>
      <div class="score-big" style="font-size:3rem">${r.score}<small style="font-size:.4em">／${r.max} 個零件</small></div>
      <ul class="checklist" style="margin-top:10px">${r.parts.map((p) => `
        <li><span>${p.ok ? '✅' : '⬜'} <b>${esc(p.label)}</b>${p.ok ? '' : `<br><span class="muted" style="font-size:.9rem">${esc(p.tip)}</span>`}</span></li>`).join('')}
      </ul>`;
  }
  input.addEventListener('input', renderPrompt);
  $('[data-prompt-example]').addEventListener('click', () => { input.value = GOOD_EXAMPLE; renderPrompt(); });
  renderPrompt();

  // ---------- 拆步驟排序 ----------
  mountOrder($('[data-order]'), [
    '先做一個只有標題和說明文字的活動頁',
    '加上報名表單（姓名、電話、葷素），先不用存資料',
    '讓送出的資料真的存起來，自己填一次確認',
    '做一個只有主辦人看得到的報名名單頁',
    '名額滿了自動顯示「已額滿，可候補」',
  ], { title: '把「報名系統」拆成小步驟，排出合理的順序', explain: '先做看得到的、再做存資料、最後才做進階規則。每一步都能獨立測試。' });

  // ---------- 講師守則白話版（來源：講師的全域 CLAUDE.md） ----------
  const RULES = [
    { n: '1', t: '先想再做', d: '把假設說出來；不確定就問，不要用猜的。有更簡單的做法要直接講。', why: 'AI 最常出錯的不是寫錯，而是誤會你的意思還很有自信地做完。' },
    { n: '2', t: '越簡單越好', d: '只寫解決問題需要的最少程式，不要多做沒要求的功能。', why: '多做的每一行，以後都要有人維護、都可能出錯。' },
    { n: '3', t: '只動該動的地方', d: '不要順手「改善」旁邊的程式和排版。', why: '順手改的地方最難追查，常常修一個壞兩個。' },
    { n: '4', t: '說清楚怎樣算完成', d: '先定義成功標準，做到驗證通過為止。', why: '沒有標準，AI 就會在「看起來差不多」的時候停下來。' },
    { n: '5', t: '能用程式判斷的，就不要問 AI', d: 'AI 負責需要判斷的事（分類、撰寫、摘要），固定規則交給程式。', why: '程式每次結果都一樣，AI 不一定，而且比較貴。' },
    { n: '6', t: '預算不是參考用的', d: '每個任務、每次對話都有額度上限，快用完要主動說。', why: '額度用完卡在一半，比提早收工更麻煩。' },
    { n: '7', t: '衝突要說出來', d: '兩種做法矛盾時，選一種並說明理由，不要混在一起。', why: '兩種寫法混用，是專案變亂的開始。' },
    { n: '8', t: '動手前先讀', d: '加新東西前，先看現有的程式和誰會用到它。', why: '「看起來沒關係」的地方，往往就是會壞掉的地方。' },
    { n: '9', t: '測試要守住「為什麼」', d: '測試要能在規則被改錯時發出警告，不是只證明程式會跑。', why: '一個永遠不會失敗的測試，等於沒有測試。' },
    { n: '10', t: '每一步都要能說清楚進度', d: '做完一個段落就總結：做了什麼、驗證了什麼、還剩什麼。', why: '說不清楚目前狀態時，就該停下來，而不是繼續往前衝。' },
    { n: '11', t: '照專案原本的習慣', d: '就算不喜歡，也先照原本的寫法；覺得有害就提出來，不要偷偷改。', why: '一個專案兩種風格，比一種不完美的風格更難維護。' },
    { n: '12', t: '失敗要大聲說', d: '有跳過的步驟就說跳過，測試沒跑就說沒跑，不要說「都完成了」。', why: '最危險的不是出錯，而是以為沒錯。' },
    { n: '13', t: '收工要留紙條', d: '每次結束都寫 Session Snapshot：做到哪、狀態、卡點、下一步。', why: 'AI 下次不會記得，你可能也不會。' },
    { n: '15', t: '新功能要附教學導覽', d: '每加一個功能，就更新畫面上的「？ 教學」步驟。', why: '使用者不是工程師，沒有導覽就不會用。這個網站的「？ 教學」就是照這條做的。' },
    { n: '16', t: '存檔前先寫更新日誌', d: '每次 commit 前，把「對使用者有意義的變動」寫進 CHANGELOG.md。', why: '三個月後你會想知道「這個功能是什麼時候、為什麼加的」。' },
  ];
  $('[data-rules]').innerHTML = RULES.map((r) => `
    <div class="flip" style="min-height:220px"><div class="flip-inner">
      <div class="flip-face flip-front"><span class="pill pill-brand">守則 ${esc(r.n)}</span><h3 style="margin-top:8px">${esc(r.t)}</h3><p>${esc(r.d)}</p><span class="flip-hint">為什麼？點我 ↻</span></div>
      <div class="flip-face flip-back"><span class="pill pill-warn">為什麼要這條</span><p style="margin-top:8px">${esc(r.why)}</p></div>
    </div></div>`).join('');
  initFlips($('[data-rules]'));

  // ---------- CLAUDE.md 產生器 ----------
  const GEN_RULES = [
    { id: 'think', on: true, text: '不確定我的意思時先問我，不要用猜的。' },
    { id: 'plan', on: true, text: '動手前先列出計畫，我同意後再開始。' },
    { id: 'simple', on: true, text: '只做我要求的，不要多加功能；有更簡單的做法請告訴我。' },
    { id: 'surgical', on: true, text: '只修改跟這次任務有關的檔案，不要順手改別的地方。' },
    { id: 'plain', on: true, text: '用白話跟我說明你做了什麼，我不是工程師。' },
    { id: 'verify', on: true, text: '做完要自己測試一次，並告訴我怎麼確認結果。' },
    { id: 'honest', on: true, text: '有跳過或沒做到的地方要明講，不要說「全部完成」。' },
    { id: 'secret', on: true, text: '密碼和金鑰一律放在 .env，不可以寫在程式裡，也不可以上傳到 GitHub。' },
    { id: 'commit', on: false, text: '每完成一個小段落就存檔（commit），說明寫清楚這次做了什麼。' },
    { id: 'changelog', on: false, text: '存檔前先更新 CHANGELOG.md，記錄對使用者有意義的變動。' },
    { id: 'snapshot', on: false, text: '每次結束時寫一段 Session Snapshot：做到哪、目前狀態、卡點、下一步。' },
  ];
  $('[data-gen-rules]').innerHTML = GEN_RULES.map((r) => `
    <label><input type="checkbox" data-gen-rule="${r.id}" ${r.on ? 'checked' : ''}><span>${esc(r.text)}</span></label>`).join('');

  function renderGen() {
    const val = (k) => $(`[data-gen="${k}"]`).value.trim();
    const chosen = GEN_RULES.filter((r) => $(`[data-gen-rule="${r.id}"]`).checked);
    $('[data-gen-out]').textContent = [
      `# ${val('name') || '我的專案'}`,
      '',
      '## 這個專案',
      `- 使用者：${val('who') || '（請填寫）'}`,
      `- 介面語言：${val('lang')}`,
      '',
      '## 合作規矩',
      ...chosen.map((r, i) => `${i + 1}. ${r.text}`),
    ].join('\n');
  }
  $('#generator').addEventListener('input', renderGen);
  $('#generator').addEventListener('change', renderGen);
  renderGen();

  // ---------- 萬用救援句 ----------
  const RESCUE = [
    { when: '越改越亂', say: '先不要改任何東西。請用白話說明你認為問題出在哪裡，列出三個可能原因，從最可能的開始。' },
    { when: '改壞了想回去', say: '剛剛那次修改讓畫面壞掉了，請退回到上一個存檔點，然後告訴我退回了哪些東西。' },
    { when: '看不懂錯誤訊息', say: '請用白話解釋這個錯誤訊息是什麼意思，以及它可能是哪一步造成的。' },
    { when: '它一直動到不相關的檔案', say: '這次只能修改 index.html 這一個檔案，其他檔案都不要動。' },
    { when: '同一個錯誤修了三次還在', say: '我們停一下。請先寫一個能重現這個問題的最小測試，確認它會失敗，再來修。' },
    { when: '對話太長、它開始忘東忘西', say: '請寫一段 Session Snapshot 總結目前進度，我要開一個新對話繼續。' },
  ];
  $('[data-rescue]').innerHTML = RESCUE.map((r, i) => `
    <div class="card"><span class="pill pill-warn">${esc(r.when)}</span>
      <p id="rescue-${i}" style="margin:10px 0">${esc(r.say)}</p>
      <button type="button" class="btn btn-sm" data-copy="#rescue-${i}">📋 複製</button></div>`).join('');

  // ---------- 測驗 ----------
  const QUIZ = [
    { q: '下面哪一句指令最好？', options: ['幫我做一個網站', '幫我做一個給同事用手機填的聚餐報名表，只要一個 html 檔，做完告訴我怎麼測試', '做一個很棒很漂亮功能很多的系統'], answer: 1, why: '有做什麼、給誰、限制、驗收，四個零件都有了。' },
    { q: '想請 Claude Code 做一個比較大的改動，最好先用哪種模式？', options: ['規劃模式：先看計畫再動手', '略過所有權限：讓它快點做完', '都一樣'], answer: 0, why: '規劃模式只提計畫不動手，你同意了才開始，最不容易走歪。' },
    { q: 'CLAUDE.md 是什麼？', options: ['Claude 的安裝檔', '放在專案裡、每次對話都會先讀的「員工手冊」', '存密碼的檔案'], answer: 1, why: '把規矩寫一次，每次新對話它都會照做。' },
    { q: 'Claude Code 同一個錯誤修了三次都沒修好，比較好的做法是？', options: ['繼續叫它修第四次', '停下來，請它先說明原因、寫能重現問題的測試', '刪掉專案重來'], answer: 1, why: '一直原地打轉時，先停下來找原因，比一直叫它「再修一次」有效。' },
    { q: '為什麼要寫 Session Snapshot（收工紙條）？', options: ['因為 AI 下次開新對話不會記得之前的事', '因為老闆要看', '因為可以節省電費'], answer: 0, why: '新對話從零開始。一張好紙條可以讓下一次馬上接著做。' },
  ];
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm3' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'parts', title: '指令健檢', text: '在左邊輸入你的指令，右邊會即時檢查五個零件齊不齊。' },
    { tour: 'steps', title: '拆成小步驟', text: '用 ↑ ↓ 把步驟排好，再按「檢查順序」。' },
    { tour: 'modes', title: '三種模式', text: '決定 Claude Code 要多自動。新手先用規劃模式和每次詢問。' },
    { tour: 'claudemd', title: '講師的守則', text: '講師所有專案共用的規矩，點卡片看每一條背後的原因。' },
    { tour: 'generator', title: 'CLAUDE.md 產生器', text: '填好勾好，右邊就會產生你的 CLAUDE.md，按複製貼給 Claude Code。' },
    { tour: 'rescue', title: '萬用救援句', text: '卡住的時候，直接複製這些句子給它。' },
  ]);
})();

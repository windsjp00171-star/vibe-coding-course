/* m0.js — 單元 00：AI 到底在做什麼 */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz, mountClassify, initFlips } = window.Course;

  // ---------- 接話遊戲：讓學員自己當一次「猜下一個字」的機器 ----------
  // 機率是示意用的整數，重點在「它一次只挑一個字，而且是用猜的」。
  const STEPS = [
    { picks: [['熱', 62], ['冷', 21], ['好', 17]] },
    { picks: [['，', 55], ['到', 30], ['死', 15]] },
    { picks: [['記得', 48], ['要', 32], ['出門', 20]] },
    { picks: [['多喝水', 57], ['帶傘', 28], ['穿外套', 15]] },
  ];
  const START = '今天天氣很';
  let step = 0;
  let sentence = START;

  function renderNextWord() {
    const done = step >= STEPS.length;
    $('[data-nw-sentence]').innerHTML = `${esc(sentence)}${done ? '' : '<span class="nw-caret">▌</span>'}`;
    $('[data-nw-picks]').innerHTML = done
      ? '<button type="button" class="btn btn-sm" data-nw-again>↺ 再玩一次</button>'
      : STEPS[step].picks.map(([word, pct]) => `
        <button type="button" class="nw-pick" data-nw-word="${esc(word)}">
          <span>${esc(word)}</span><span class="nw-bar"><i style="width:${pct}%"></i></span><span class="nw-pct">${pct}%</span>
        </button>`).join('');
    $('[data-nw-note]').textContent = done
      ? '你剛剛做的事，就是 AI 在做的事：看著前面的字，從幾個可能裡挑一個，再重複一次。它沒有「先想好整句話」。'
      : `第 ${step + 1} 步：從三個選項裡挑一個接下去。百分比是「AI 覺得有多可能」。`;
  }

  $('[data-nw-picks]').addEventListener('click', (e) => {
    const pick = e.target.closest('[data-nw-word]');
    if (pick) { sentence += pick.dataset.nwWord; step += 1; renderNextWord(); return; }
    if (e.target.closest('[data-nw-again]')) { sentence = START; step = 0; renderNextWord(); }
  });
  renderNextWord();

  // ---------- 哪些話要查證 ----------
  mountClassify($('[data-classify-trust]'), [
    { text: 'AI 說：「你可以安裝 super-form-helper 這個套件來做表單驗證。」', answer: 'check', why: '套件名字最容易被編出來。安裝前一定要到官方套件網站搜尋，確認它真的存在、而且有人在用。' },
    { text: 'AI 幫你把一段落落長的會議紀錄整理成五個重點。', answer: 'trust', why: '整理你自己給它的文字，是它最強的事。還是掃一眼有沒有漏掉重點就好。' },
    { text: 'AI 說：「根據勞基法第 87 條，這種情況要提前 45 天通知。」', answer: 'check', why: '法條編號、天數、金額這種「很具體的數字」最危險。它講得越肯定，越要去原始出處核對。' },
    { text: 'AI 給你一個參考資料的網址，說裡面有完整說明。', answer: 'check', why: '網址是幻覺的重災區。點開來看過才算數。' },
    { text: 'AI 把你寫的中文公告改寫得更通順。', answer: 'trust', why: '改寫你自己的文字，沒有「事實」可以捏造，風險很低。' },
    { text: 'AI 說：「這個功能我已經做好而且測試過了。」', answer: 'check', why: '它常常「以為」自己做好了。一定要自己打開來操作一次。' },
  ], [
    { key: 'trust', label: '✅ 可以直接相信' },
    { key: 'check', label: '🔍 一定要查證' },
  ], { title: '相信還是查證' });

  // ---------- 上下文長度模擬 ----------
  const CTX_NOTES = [
    '對話還很短，它記得你講過的每一件事。',
    '很順，它清楚記得需求和剛剛改過的東西。',
    '還行，但已經開始「重複問你講過的事」了。',
    '開始忘記最前面的設定，例如你一開始說過的風格要求。',
    '它會重複做同一件事，或改掉剛剛修好的地方。',
    '桌子快滿了：最早的對話被擠掉，它只看得到後半段。',
    '這時候硬撐，通常會越改越亂，而且每一次回答都更貴。',
  ];
  const range = $('[data-ctx-range]');
  function renderCtx() {
    const v = Number(range.value);
    const pct = v * 10;
    $('[data-ctx-fill]').style.width = `${pct}%`;
    const note = CTX_NOTES[Math.min(CTX_NOTES.length - 1, Math.floor((v - 1) / 1.5))];
    $('[data-ctx-note]').innerHTML = v >= 8
      ? `${esc(note)}<br><b style="color:var(--danger)">👉 該開新對話了</b>`
      : esc(note);
  }
  range.addEventListener('input', renderCtx);
  renderCtx();

  initFlips();

  // ---------- 測驗 ----------
  const QUIZ = window.QuizBank.m0;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm0' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'nextword', title: '接話遊戲', text: '自己挑字接下去，體會 AI 是怎麼一個字一個字生出答案的。' },
    { tour: 'halluc', title: '幻覺', text: '判斷哪些回答可以直接相信、哪些一定要查證。' },
    { tour: 'context', title: '上下文', text: '拉滑桿看對話變長之後會發生什麼事，以及什麼時候該開新對話。' },
    { tour: 'kinds', title: '三種 AI', text: '點卡片看聊天型、編輯器型、代理型的差別。這門課用的是代理型。' },
    { tour: 'workshop', title: '抓唬爛大賽', text: '課堂活動：用自己熟的領域出題，抓出 AI 講錯的地方。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關。' },
  ]);
})();

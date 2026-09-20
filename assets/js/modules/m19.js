/* m19.js — 單元 19：AI 詐騙（深偽變臉、變聲） */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz, initChecklists } = window.Course;

  // ---------- 沉浸式任務 ----------
  window.Workbench.mount($('[data-workbench]'), {
    id: 'm19',
    missions: ['接到視訊', '看出套路', '換管道確認', '頂住施壓'],
    after: '往下看，這個單元會把剛剛用到的判斷整理成可以帶回公司的規則。',
    run: window.SimM19.run,
  });

  // ---------- 五個警訊：勾起來看風險上升 ----------
  const SIGNALS = [
    { id: 'urgent', label: '非常急，現在就要', weight: 25 },
    { id: 'secret', label: '叫你先不要跟別人講', weight: 30 },
    { id: 'channel', label: '不方便講電話、只能用訊息', weight: 20 },
    { id: 'money', label: '要匯款、給驗證碼或改帳號', weight: 15 },
    { id: 'auth', label: '搬出職位或權威壓你', weight: 10 },
  ];

  const host = $('[data-df-signals]');
  host.innerHTML = SIGNALS.map((s) => `
    <label class="df-row"><span><input type="checkbox" data-df="${esc(s.id)}"> ${esc(s.label)}</span>
      <span class="df-bar"><i style="width:0"></i></span>
      <span class="df-val">0</span></label>`).join('');

  function renderSignals() {
    let total = 0;
    host.querySelectorAll('.df-row').forEach((row, i) => {
      const on = row.querySelector('[data-df]').checked;
      const v = on ? SIGNALS[i].weight : 0;
      total += v;
      row.querySelector('.df-bar i').style.width = `${on ? 100 : 0}%`;
      row.querySelector('.df-val').textContent = String(v);
    });
    const note = total === 0 ? '勾選你在情境裡遇到的訊號，看看可疑程度。'
      : total < 40 ? `可疑指數 ${total}：還不確定，但值得花三分鐘用別的管道確認。`
        : total < 70 ? `可疑指數 ${total}：高度可疑。先不要答應任何事，改用你原本就有的號碼回撥。`
          : `可疑指數 ${total}：幾乎就是詐騙。停止對話、回撥確認、告訴同事或家人。`;
    $('[data-df-note]').textContent = note;
  }
  host.addEventListener('change', renderSignals);
  renderSignals();

  // ---------- 查核規則產生器 ----------
  $('[data-rule-make]').addEventListener('click', () => {
    const org = $('[data-rule-org]').value.trim() || '本單位';
    const amountRaw = Number(String($('[data-rule-amount]').value).replace(/[^0-9]/g, ''));
    const amount = amountRaw > 0 ? amountRaw.toLocaleString('zh-TW') : '10,000';
    const who = $('[data-rule-who]').value.trim() || '主管';
    const out = $('[data-rule-out]');
    out.hidden = false;
    out.textContent = `【${org}．匯款與帳號異動查核規則】

1. 下列四件事，一律不接受「只靠視訊、電話或訊息」的指示：
   匯款、變更收款帳號、提供密碼、提供驗證碼。

2. 金額超過新台幣 ${amount} 元，或變更既有收款帳號時：
   ａ. 由承辦人用「通訊錄內原有的號碼」回撥確認，不使用對方提供的號碼。
   ｂ. 經 ${who} 另行核可後才可執行。

3. 遇到「很急」「先不要跟別人講」「不方便講電話」三句話的任何一句，
   一律暫停作業並回報 ${who}。延遲造成的損失由本規則承擔，不追究承辦人。

4. 若已匯出：立即致電銀行辦理圈存止付 → 撥 165 報案 →
   保留對話紀錄、匯款單與對方帳號 → 通報 ${who} 並提醒同仁。

（本規則由 ${org} 公布，張貼於辦公區並納入新人訓練。）`;
  });

  initChecklists();

  // ---------- 測驗 ----------
  const QUIZ = window.QuizBank.m19;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm19' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'sim', title: '先玩再學', text: '模擬一次變臉詐騙：你會接到視訊和訊息，每一步都要自己決定怎麼做。' },
    { tour: 'how', title: '三種手法', text: '換臉、變聲、偽造文件，難度都比想像中低。' },
    { tour: 'pattern', title: '共同套路', text: '勾選遇到的訊號，看可疑指數。會阻止你確認的，就是詐騙。' },
    { tour: 'defense', title: '兩道防線', text: '回撥驗證和暗號，不用學會辨識假影片也擋得住。' },
    { tour: 'builder', title: '查核規則', text: '填三個欄位，產生可以貼進員工手冊的規定。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關。' },
  ]);
})();

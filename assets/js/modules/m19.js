/* m19.js — 單元 19：AI 詐騙（深偽變臉、變聲） */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz, initChecklists } = window.Course;

  // ---------- 開場①：破綻退役表 ----------
  // 為什麼不放照片讓學員猜：一來不能用真實人物的臉，二來就算今天猜得出來，
  // 工具下個月又進步一次。會過期的技巧不值得當防線，所以直接讓他們看到「哪些線索已經死了」。
  const TELLS = [
    { id: 'fingers', name: '數手指：手指數量或形狀怪怪的', alive: false,
      why: '早期生成模型的老問題，現在大多已經修掉。而且視訊時手根本不常入鏡。' },
    { id: 'blink', name: '看眨眼：假的人不太眨眼', alive: false,
      why: '這是好幾年前的研究結論，被指出之後很快就被針對性改掉了。' },
    { id: 'detail', name: '看細節：耳環、眼鏡、牙齒不對稱', alive: false,
      why: '細節一致性進步很多；更何況視訊壓縮過後，真人的細節也一樣糊。' },
    { id: 'text', name: '看背景文字：招牌、字幕會扭曲', alive: false,
      why: '新一代工具的文字生成明顯改善。這條線索現在只能抓到最粗糙的偽造。' },
    { id: 'lip', name: '看嘴型：聲音和嘴型對不上', alive: false,
      why: '口型同步是被重點優化的項目。反過來說，網路卡頓時真人也會對不上——用它判斷還會冤枉真人。' },
    { id: 'behavior', name: '看行為：很急、叫你先別跟別人講、要你匯款', alive: true,
      why: '這不是畫面上的破綻，是行為上的破綻。不管畫面做得多真，詐騙都必須阻止你去查證——這一點沒辦法用技術修掉。' },
  ];

  const tellAnswers = {};

  function renderTells() {
    $('[data-df-tells]').innerHTML = TELLS.map((t, i) => {
      const picked = tellAnswers[i];
      const state = picked === undefined ? '' : t.alive ? 'is-alive' : 'is-dead';
      return `<div class="df-tell ${state}">
        <span><b>${esc(t.name)}</b></span>
        <span class="btns">
          <button type="button" class="btn btn-sm" data-tell="${i}" data-val="1">還靠得住</button>
          <button type="button" class="btn btn-sm" data-tell="${i}" data-val="0">已經沒用了</button>
        </span>
        ${picked === undefined ? '' : `<span class="why">${t.alive ? '✅ 還有效' : '❌ 已退役'}：${esc(t.why)}</span>`}
      </div>`;
    }).join('');
    renderTellsOut();
  }

  function renderTellsOut() {
    const done = Object.keys(tellAnswers).length;
    const out = $('[data-df-tells-out]');
    if (done < TELLS.length) { out.textContent = ''; return; }
    const right = Object.entries(tellAnswers).filter(([i, v]) => v === TELLS[i].alive).length;
    out.innerHTML = `<b>六個線索裡，五個已經退役了。</b>你答對 ${right}／${TELLS.length}。<br><br>
      唯一還有效的那一個，<b>不在畫面上</b>——它在對方的行為裡。<br>
      所以這個單元不教你「怎麼看出假影片」，教你<b>怎麼查證</b>：換一個管道確認、事先約好暗號。<br>
      <span style="opacity:.85">這兩招不會因為工具進步而失效。</span>`;
  }

  $('[data-df-tells]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tell]');
    if (!btn) return;
    tellAnswers[btn.dataset.tell] = btn.dataset.val === '1';
    renderTells();
  });

  // ---------- 開場②：這幾件事真的發生過嗎 ----------
  // 全部都是經媒體或執法機關公開報導過的類型，沒有虛構案例，
  // 也不點名任何個人或公司的受害者姓名。
  const CASES = [
    '一家跨國工程顧問公司的財務人員，參加一場視訊會議，畫面上「所有同事」都是深偽假造的，結果匯出約 2 億港幣。',
    '一家能源公司的主管接到「母公司執行長」來電，聲音幾乎一模一樣，依指示匯出約 22 萬歐元。',
    '家長接到「孩子」哭著求救的電話，聲音是從公開影片裡複製出來的；多國警方都對這類假求救發出過警告。',
    '社群平台上出現大量名人換臉的假投資廣告，被冒用的包括主播與企業家。',
    '遠距職缺的視訊面試裡，有人用即時換臉冒充他人應徵；執法機關曾公開提醒企業注意。',
  ];

  $('[data-df-cases]').innerHTML = CASES.map((c) => `<li>${esc(c)}</li>`).join('');

  $('[data-df-cases-go]').addEventListener('click', () => {
    $('[data-df-cases-out]').innerHTML = `<b>答案：五件都真的發生過。</b><br><br>
      這些不是實驗室裡的示範，是已經被報導出來的案子——而且共同點都不是「有人眼力不好」，
      是<b>沒有人在當下換一個管道確認</b>。<br>
      <span style="opacity:.85">金額和細節以各家報導為準，這裡只取情境。</span>`;
    $('[data-df-cases-go]').disabled = true;
  });

  renderTells();

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
    { tour: 'tells', title: '破綻退役表', text: '六個常聽到的「AI 假影片破綻」，一個一個判斷還靠不靠得住。答完會發現只剩一個有效。' },
    { tour: 'realcases', title: '真實案例', text: '先猜幾件是真的，再按看答案。共同點不是眼力不好，是沒有換管道確認。' },
    { tour: 'sim', title: '先玩再學', text: '模擬一次變臉詐騙：你會接到視訊和訊息，每一步都要自己決定怎麼做。' },
    { tour: 'how', title: '三種手法', text: '換臉、變聲、偽造文件，難度都比想像中低。' },
    { tour: 'pattern', title: '共同套路', text: '勾選遇到的訊號，看可疑指數。會阻止你確認的，就是詐騙。' },
    { tour: 'defense', title: '兩道防線', text: '回撥驗證和暗號，不用學會辨識假影片也擋得住。' },
    { tour: 'builder', title: '查核規則', text: '填三個欄位，產生可以貼進員工手冊的規定。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關。' },
  ]);
})();

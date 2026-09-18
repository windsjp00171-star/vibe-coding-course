/* m5.js — 單元 05：部署上線 */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz, mountClassify, mountOrder } = window.Course;

  // ---------- 靜態／動態分類 ----------
  mountClassify($('[data-classify-static]'), [
    { text: '個人作品集：放履歷、作品照片、聯絡方式。', answer: 'static', why: '每個人看到的都一樣，不用存任何東西。' },
    { text: '活動報名表：大家填完，主辦人要看得到名單。', answer: 'dynamic', why: '要「存」大家填的資料，就需要後端和資料庫。' },
    { text: '你現在看的這個課程網站。', answer: 'static', why: '對，它是靜態的！進度存在你自己的瀏覽器，不是存在主機上，所以可以免費放在 GitHub Pages。' },
    { text: 'LINE 機器人：大家傳訊息給它，它會回覆。', answer: 'dynamic', why: '要有一台一直開著的主機接收 LINE 傳來的訊息。' },
    { text: 'BMI 計算機：輸入身高體重，馬上算出結果。', answer: 'static', why: '計算在使用者的瀏覽器裡完成，不用存資料，是靜態網站。' },
    { text: '會員系統：每個人登入後看到自己的訂單。', answer: 'dynamic', why: '要登入、每個人看到的不一樣，一定是動態的。' },
  ], [{ key: 'static', label: '🖨️ 靜態網站' }, { key: 'dynamic', label: '🧑‍💼 動態網站' }], { title: '靜態還是動態？' });

  // ---------- 平台選擇器（小型決策樹） ----------
  const TREE = {
    start: { q: '你的網站需要「存資料」或「登入」嗎？', yes: 'backend', no: 'ai', hint: '例如報名表要存名單、會員要登入，就選「需要」。' },
    ai: { q: '這是一個 AI 模型的展示小工具嗎？（例如上傳音檔讓 AI 分析）', yes: 'hf', no: 'pages' },
    backend: { q: '後端是用 Python 寫的嗎？（不知道的話，問 Claude Code「這個專案後端用什麼語言？」）', yes: 'server', no: 'vercel' },
    pages: { result: 'GitHub Pages', why: '靜態網站最簡單的選擇：免費、跟 GitHub 直接整合，push 就自動更新。這個課程網站就是放在這裡。', warn: '免費方案 repo 要設成 Public，裡面不能有任何密碼。' },
    hf: { result: 'Hugging Face Spaces', why: '專門展示 AI 小工具的平台，講師的 PitchPal 就放在這裡。', warn: '記得把套件版本鎖死，避免哪天自己壞掉。' },
    vercel: { result: 'Vercel', why: '適合 JavaScript 寫的網站加上簡單的後端功能，設定很少，push 就自動部署。講師的 LINE 小秘書就放在這裡。', warn: '密碼一律放在 Vercel 後台的環境變數。' },
    server: { result: 'Render／Railway／Fly.io', why: '提供一直開著的主機，適合 Python（Flask、Django）這類後端。講師的報名系統和檔案分享平台放在 Render。', warn: '免費方案可能會「睡著」；重要系統考慮付費，或設定定時喚醒。' },
  };
  let node = 'start';
  function renderPicker() {
    const n = TREE[node];
    const host = $('[data-picker]');
    if (n.result) {
      host.innerHTML = `<p class="kicker">建議你用</p><h3 style="font-size:1.6rem">${esc(n.result)}</h3>
        <p>${esc(n.why)}</p><div class="callout callout-warn">⚠️ ${esc(n.warn)}</div>
        <button type="button" class="btn" data-pick="restart">重新選一次</button>`;
    } else {
      host.innerHTML = `<p class="kicker">回答問題</p><h3>${esc(n.q)}</h3>${n.hint ? `<p class="muted">${esc(n.hint)}</p>` : ''}
        <div class="classify-choices"><button type="button" class="btn btn-primary" data-pick="yes">是 / 需要</button>
        <button type="button" class="btn" data-pick="no">不是 / 不需要</button></div>`;
    }
  }
  $('[data-picker]').addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick]')?.dataset.pick;
    if (!pick) return;
    node = pick === 'restart' ? 'start' : TREE[node][pick];
    renderPicker();
  });
  renderPicker();

  // ---------- 上線順序 ----------
  mountOrder($('[data-order]'), [
    '在自己電腦上測試，確認功能都正常',
    '存檔 commit，說明寫清楚',
    'push 到 GitHub',
    '上線平台自動部署',
    '用手機打開正式網址實際操作一遍',
    '請朋友試用，收集問題回報',
  ], { title: '把上線步驟排好', explain: '每一步都是下一步的前提。最常被跳過的是最後兩步：在正式網址上自己測、再請別人試。' });

  // ---------- 測驗 ----------
  const QUIZ = [
    { q: 'Claude Code 給你一個 localhost:5173 的網址，你傳給朋友，朋友打不開。為什麼？', options: ['朋友的網路太慢', 'localhost 指的是「你自己這台電腦」，還沒有部署到網路上', 'Claude Code 壞了'], answer: 1, why: 'localhost 就是「自家廚房」。要給別人看，必須部署到網路主機上。' },
    { q: '一個報名表，大家填完主辦人要看得到名單，它是？', options: ['靜態網站', '動態網站'], answer: 1, why: '要存資料就是動態網站，需要後端和資料庫。' },
    { q: '動態網站需要資料庫密碼，這個密碼應該放在哪裡？', options: ['寫在程式碼裡，push 上 GitHub', '上線平台後台的「環境變數」', '寫在網頁上方便查'], answer: 1, why: '密碼永遠不進 GitHub，上線的網站從平台的環境變數讀取。' },
    { q: '部署失敗了，最有效的第一步是？', options: ['一直重新部署到成功為止', '打開平台的錯誤紀錄（log），複製給 Claude Code 請它解釋', '換一個平台'], answer: 1, why: '錯誤紀錄會告訴你真正的原因。講師就曾經在沒看 log 的情況下連續重試了四次。' },
    { q: '網站什麼都沒改，突然壞了，可能是什麼原因？', options: ['用到的套件自己升級了，新版改了用法', '網站會自己變老', '一定是被駭客攻擊'], answer: 0, why: '這就是為什麼要「鎖版本」。講師的 PitchPal 就遇過這件事。' },
  ];
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm5' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'static', title: '靜態還是動態', text: '這是選平台前最重要的判斷，玩一下分類遊戲。' },
    { tour: 'picker', title: '平台選擇器', text: '回答兩三個問題，推薦你適合的上線平台。' },
    { tour: 'pages', title: 'GitHub Pages', text: '最簡單的上線方式。可以請 Claude Code 幫你做，也可以自己點。' },
    { tour: 'env', title: '環境變數', text: '動態網站的密碼要放哪裡？這裡用「店長手機」來比喻。' },
    { tour: 'stories', title: '真實踩坑', text: '講師上線時真的遇過的四個問題和解法。' },
    { tour: 'workshop', title: '上線挑戰', text: '課堂上 30 分鐘內把自己的網頁放上網路。' },
  ]);
})();

/* m13.js — 單元 13：LINE 登入 */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz, mountOrder, initFlips } = window.Course;
  const { mountFlow } = window.Electives;

  mountFlow($('[data-flow]'), [
    { title: '按「用 LINE 登入」', text: '網站先蓋一個防偽印章（state），再把你送去 LINE。' },
    { title: '到 LINE 的櫃台', text: 'LINE 問你：「要讓這個網站知道你的名字嗎？」你按同意。' },
    { title: '拿著回程票回來', text: 'LINE 把你送回網站，網址上帶著一張只能用一次的回程票（code）和原本的印章。' },
    { title: '先核對印章', text: '網站確認印章和出發時一樣，防止有人偽造。' },
    { title: '伺服器去換證', text: '伺服器拿回程票，在背後向 LINE 換到你的正式身分。' },
    { title: '登入完成', text: '網站記住你是誰，並重新讀一次你最新的權限。' },
  ]);

  // 講師 LINE 登入工具包「十個會靜默失敗的地方」精選，改寫成非技術語言
  const PITS = [
    { icon: '📱', t: '裝成 App 反而要打密碼', s: '把網站加到手機桌面後打開，跳出 LINE 的 Email 和密碼畫面，大家根本不記得。', c: 'iPhone 桌面 App 的登入狀態和 Safari 分開，LINE 把它當成陌生裝置。', f: '已登入的人抓 App 設定時，順便夾帶一張有簽章、會過期的通行證，App 第一次打開就直接登入。' },
    { icon: '🔁', t: '在 LINE 裡跳不出去', s: '按「用瀏覽器開啟」沒反應，畫面只寫「請點右上角⋯」，沒有人會照做。', c: '跳轉用的設定值漏填了，功能靜靜地失效。', f: '準備三段備案，最後一招是「複製網址」按鈕：給能按的按鈕，不要只給文字指示。' },
    { icon: '🎣', t: '連結被拿去釣魚', s: '連結看起來完全是你的網站，登入後卻被送到假網站。', c: '登入後「要回到哪一頁」的參數沒檢查，壞人可以指定任何網址。', f: '回程網址只允許自己網站裡的頁面，連奇怪的寫法（例如反斜線）都要擋。' },
    { icon: '🪪', t: '別人的帳號被綁進你的瀏覽器', s: '畫面顯示你已經登入，但其實登入的是壞人的帳號。', c: '沒有核對 state 防偽印章，或是核對完沒有作廢。', f: '每次登入都核對印章，用完立刻作廢，不能重複使用。' },
    { icon: '🎖️', t: '升級了權限卻沒生效', s: '管理員剛把某人設成管理者，他重新登入後還是一般身分。', c: '登入時沿用舊的使用者資料，沒有重新讀一次。', f: '登入成功後一定重新讀取最新的身分和權限。' },
  ];
  $('[data-line-pits]').innerHTML = PITS.map((p) => `
    <div class="flip" style="min-height:280px"><div class="flip-inner">
      <div class="flip-face flip-front"><div class="emoji">${p.icon}</div><h3>${esc(p.t)}</h3><p>${esc(p.s)}</p><span class="flip-hint">為什麼？點我 ↻</span></div>
      <div class="flip-face flip-back"><p><b>原因：</b>${esc(p.c)}</p><p><b>講師的解法：</b>${esc(p.f)}</p></div>
    </div></div>`).join('');
  initFlips($('[data-line-pits]'));

  mountOrder($('[data-order]'), [
    '使用者按「用 LINE 登入」，網站蓋上防偽印章',
    'LINE 詢問使用者是否同意',
    '使用者帶著回程票和印章回到網站',
    '網站核對印章是否一致',
    '伺服器拿回程票向 LINE 換正式身分',
    '重新讀取使用者最新的權限，登入完成',
  ], { title: '把 LINE 登入的步驟排好', explain: '核對印章一定要在換證之前，換證一定要在伺服器端做。' });

  const QUIZ = window.QuizBank.m13;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm13' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'flow', title: '登入流程', text: '用「去櫃台換證」的比喻，一步一步看 LINE 登入怎麼運作。' },
    { tour: 'pits', title: '五個隱形的坑', text: '從講師踩過的十個坑裡精選五個，點卡片看原因和解法。' },
    { tour: 'handoff', title: '交接文件', text: '把踩過的坑寫成文件交給 AI，是這個單元最重要的技巧。' },
    { tour: 'workshop', title: '工作坊', text: '課堂上寫一份你自己的交接文件。' },
  ]);
})();

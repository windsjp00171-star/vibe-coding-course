/* m1.js — 單元 01：什麼是 Vibe Coding */
(function () {
  'use strict';
  const { $, $$, esc, MODULES, mountQuiz, renderPrintQuiz, mountClassify, mountMeters } = window.Course;

  // ---------- 三種駕駛分類 ----------
  const DRIVERS = [
    { key: 'chef', label: '🧑‍🍳 廚師（全部手寫）' },
    { key: 'blind', label: '🙈 閉眼踩油門' },
    { key: 'director', label: '🎬 導演' },
  ];
  mountClassify($('[data-classify-driver]'), [
    { text: '小美請 AI 做報名表，AI 說「完成了」，她沒打開看就直接把網址傳到公司群組。', answer: 'blind', why: '沒有驗收就上線。至少要自己填一次表單，確認資料真的有存進去。' },
    { text: '阿明請 AI 先列出做法，看完後說「第 3 步先不要做」，再請它開始寫。', answer: 'director', why: '先看計畫再動手，這就是導演。Claude Code 有「規劃模式」專門做這件事（單元 3）。' },
    { text: '工程師小陳花了兩週，一行一行寫出公司的請假系統。', answer: 'chef', why: '傳統寫法，掌控度高但很慢。' },
    { text: 'AI 說要執行一個看不懂的指令，大雄直接按「全部允許，以後不要再問」。', answer: 'blind', why: '看不懂的指令就先拒絕，問 AI「這是要做什麼？」。單元 7 會教你怎麼判斷。' },
    { text: '靜香每做完一小段就存檔，並請 AI 用白話說明這次改了什麼。', answer: 'director', why: '小步前進、每步存檔、要求 AI 解釋，都是導演的好習慣。' },
    { text: '為了測試方便，胖虎請 AI 把資料庫密碼直接寫在程式裡，然後上傳到 GitHub。', answer: 'blind', why: '密碼上傳到網路，幾分鐘內就可能被盜用。單元 6 會教你用 .env 保管鑰匙。' },
    { text: '小玉發現 AI 做的畫面跟她想的不一樣，她截圖圈出來，告訴 AI「這裡要改成這樣」。', answer: 'director', why: '具體指出哪裡不對，比說「感覺怪怪的」有效十倍。' },
    { text: 'AI 推薦安裝一個套件，阿福沒查過名字就照裝了。', answer: 'blind', why: 'AI 有時會編出不存在的套件名稱，壞人會搶先註冊同名的有毒套件。單元 8 會教你怎麼查證。' },
  ], DRIVERS, { title: '三種駕駛' });

  // ---------- 適合度分類 ----------
  mountClassify($('[data-classify-fit]'), [
    { text: '部門聚餐的報名表，要收大家的葷素和交通方式。', answer: 'go', why: '內部小工具、沒有敏感資料，非常適合當第一個作品。' },
    { text: '線上商店，客人要輸入信用卡付款。', answer: 'care', why: '碰到金流就要非常小心。建議串接成熟的金流服務，並請專業的人一起看。' },
    { text: '把每週要手動整理的 Excel 報表，改成按一個按鈕自動產生。', answer: 'go', why: '重複性高、規則清楚，是 AI 最擅長的類型。' },
    { text: '診所的病歷系統，要存病人的診斷紀錄。', answer: 'care', why: '病歷是最高等級的個資，法規要求很多，不適合新手自己做。' },
    { text: '自己的作品集網站，放履歷和作品照片。', answer: 'go', why: '公開資訊、出錯影響很小，非常適合練習。' },
    { text: '公司人資系統，存全體員工的身分證字號和薪資。', answer: 'care', why: '大量敏感個資，一旦外洩後果嚴重。要做就要有資安專業的人把關。' },
    { text: '社團的 LINE 機器人，每週提醒大家練習時間。', answer: 'go', why: '功能單純、資料不敏感，很適合。講師就做過好幾個 LINE 小幫手。' },
    { text: '控制工廠機台開關的程式。', answer: 'care', why: '出錯會傷人的系統，一定要專業工程師負責。' },
  ], [{ key: 'go', label: '🟢 很適合' }, { key: 'care', label: '🔴 要很小心' }], { title: '適合 Vibe Coding 嗎？' });

  // ---------- 講師作品牆（私人專案已匿名化） ----------
  const WALL = [
    { when: '2025/12', kind: 'work', title: '靈修日記平台', desc: '會眾每天寫靈修日記，有後台開通權限、可以裝到手機桌面。' },
    { when: '2026/02', kind: 'tool', title: '講道準備助手', desc: '用另一套 AI 工具 Manus 做的，拿來比較不同工具的差別。' },
    { when: '2026/04', kind: 'work', title: '活動報名與學程系統', desc: '報名、簽到、學程證書，存檔超過 600 次，是講師最大的專案。' },
    { when: '2026/04', kind: 'work', title: '小組週報系統', desc: '小組長每週回報人數和狀況，專門為年長使用者調整過操作。' },
    { when: '2026/05', kind: 'work', title: '內部檔案分享平台', desc: '用 LINE 帳號登入，分享檔案、音檔，可以設定誰看得到。' },
    { when: '2026/05', kind: 'work', title: '整合行政系統（公開展示版）', desc: 'Church-Management-System-demo：報名、小組、差勤整合在一起。' },
    { when: '2026/05', kind: 'tool', title: 'PitchPal 音樂調性偵測', desc: '上傳歌曲，自動判斷調性和速度，幫樂手快速轉調。' },
    { when: '2026/05', kind: 'fun', title: '手勢互動故事遊戲', desc: '用攝影機偵測手勢，投影在牆上的互動故事，給營會使用。' },
    { when: '2026/05', kind: 'tool', title: 'Claude Code 外掛工具箱', desc: '講師自己的 CLAUDE.md 守則範本，還有多帳號切換工具。' },
    { when: '2026/06', kind: 'work', title: '財務記帳與報表系統', desc: '會計輸入流水帳，自動產生報表，有權限控管和稽核紀錄。' },
    { when: '2026/06', kind: 'work', title: '整合行政系統（第二個單位版）', desc: '把展示版整包複製給另一個單位用，後來學到這樣做的代價（見單元 4）。' },
    { when: '2026/06', kind: 'fun', title: '美食獵人執照', desc: '用定位找附近美食、收集圖鑑的小遊戲。' },
    { when: '2026/06', kind: 'fun', title: '聖經互動全書', desc: '互動讀經網站，逐章整理人物地名，存檔超過 200 次。' },
    { when: '2026/06', kind: 'tool', title: 'LINE 小秘書機器人', desc: '在 LINE 裡設定提醒、排班表，搭配管理後台。' },
    { when: '2026/06', kind: 'tool', title: '個人作品集網站', desc: '從 Claude 對話產出的網頁，瘦身後放在 GitHub Pages。' },
    { when: '2026/07', kind: 'work', title: '小組共讀靈修', desc: '學生小組每天讀同一段經文、分享一句話，刻意不做排行榜。' },
    { when: '2026/07', kind: 'tool', title: '吉他鋼琴練習工具', desc: '和弦指法、掉落式練習，給初學者用的練習網站。' },
  ];

  function renderWall(kind) {
    $('[data-wall]').innerHTML = WALL.filter((w) => kind === 'all' || w.kind === kind).map((w) => `
      <div class="wall-item"><span class="when">${esc(w.when)}</span><h4>${esc(w.title)}</h4><p>${esc(w.desc)}</p></div>`).join('');
  }
  $('[data-wall-filter]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-kind]');
    if (!chip) return;
    $$('[data-kind]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderWall(chip.dataset.kind);
  });
  renderWall('all');

  // ---------- 五種能力自評（上課前的起點，結業單元會拿來比較） ----------
  mountMeters($('[data-meters]'), 'selfRating', (ratings) => {
    const low = window.CourseLib.weakestSkill(ratings);
    const mod = MODULES.find((m) => m.id === low.m);
    $('[data-meter-note]').innerHTML = `你目前最想加強的是「${esc(low.name)}」。這項能力在這裡學：<br>
      <a class="btn btn-sm" href="${esc(mod.file.replace('modules/', ''))}" style="margin-top:8px">👉 單元 ${mod.id.slice(1)}：${esc(mod.title)}</a>`;
  });

  // ---------- 測驗 ----------
  const QUIZ = window.QuizBank.m1;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm1' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'drivers', title: '三種開車方式', text: '先點三張卡片翻面，看看用 AI 寫程式的三種態度。' },
    { tour: 'classify', title: '分類挑戰', text: '讀情境、選答案，選完會馬上看到解說。' },
    { tour: 'wall', title: '講師作品牆', text: '講師 9 個月內做的 17 個專案，上面的按鈕可以篩選類型。' },
    { tour: 'fit', title: '適合嗎？', text: '學會判斷什麼題目適合 Vibe Coding，什麼要找專業的人。' },
    { tour: 'workshop', title: '課中工作坊', text: '上課時把你的煩惱改寫成一句話的題目，之後的單元都會用它練習。' },
    { tour: 'quiz', title: '小測驗', text: '答對 70% 就算過關。' },
  ]);
})();

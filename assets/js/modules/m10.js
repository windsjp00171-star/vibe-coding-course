/* m10.js — 單元 10：Supabase 雲端資料庫 */
(function () {
  'use strict';
  const { $, $$, esc, mountQuiz, renderPrintQuiz, mountClassify } = window.Course;
  const { renderPitCards } = window.Electives;

  // ---------- RLS 模擬：同一張表，不同身分看到的列不同 ----------
  const ROWS = [
    { owner: 'xiaoming', name: '小明', food: '葷', ride: '自行前往', phone: '0912-***-678' },
    { owner: 'xiaohua', name: '小華', food: '素', ride: '需要共乘', phone: '0928-***-321' },
    { owner: 'amei', name: '阿美', food: '葷', ride: '自行前往', phone: '0935-***-114' },
    { owner: 'afu', name: '阿福', food: '素', ride: '需要共乘', phone: '0987-***-552' },
  ];
  const VIEWERS = [
    { id: 'guest', label: '🕶️ 沒登入的訪客' },
    { id: 'xiaoming', label: '🙋 小明（報名者）' },
    { id: 'xiaohua', label: '🙋 小華（報名者）' },
    { id: 'host', label: '🧑‍💼 主辦人' },
  ];
  let viewer = 'xiaoming';

  function canSee(row, rlsOn) {
    if (!rlsOn) return true; // RLS 關掉：拿著公開金鑰的任何人都讀得到全部
    if (viewer === 'host') return true;
    return viewer === row.owner;
  }

  function renderRls() {
    const rlsOn = $('[data-rls]').checked;
    $('[data-viewers]').innerHTML = VIEWERS.map((v) =>
      `<button type="button" class="chip" aria-pressed="${v.id === viewer}" data-viewer="${v.id}">${esc(v.label)}</button>`).join('');
    const visible = ROWS.filter((r) => canSee(r, rlsOn)).length;
    $('[data-sim-table]').innerHTML = `<thead><tr><th>姓名</th><th>葷素</th><th>交通</th><th>電話</th></tr></thead><tbody>${ROWS.map((r) => {
      const ok = canSee(r, rlsOn);
      return `<tr class="${ok ? 'is-visible' : 'is-hidden'}"><td>${esc(r.name)}</td><td>${esc(r.food)}</td><td>${esc(r.ride)}</td><td>${esc(r.phone)}</td></tr>`;
    }).join('')}</tbody>`;
    let verdict;
    if (!rlsOn) verdict = '<div class="feedback bad"><b>🚨 RLS 關掉了！</b>連沒登入的訪客都看得到全部人的電話。只要有人打開網頁原始碼、拿到公開金鑰，就能把整張表抓走。</div>';
    else if (viewer === 'guest') verdict = '<div class="feedback ok"><b>✅ 訪客什麼都看不到。</b>沒登入，就沒有任何一列符合規則。</div>';
    else if (viewer === 'host') verdict = `<div class="feedback ok"><b>✅ 主辦人看得到全部 ${visible} 筆。</b>因為規則寫了「主辦人可以看全部」。</div>`;
    else verdict = '<div class="feedback ok"><b>✅ 只看得到自己那一筆。</b>其他人的資料，資料庫根本不會送出來。</div>';
    $('[data-rls-verdict]').innerHTML = verdict;
    $('[data-policy]').textContent = rlsOn
      ? '規則 1：報名者只能看自己的那一筆\n  → 這一列的報名者帳號 = 目前登入的人\n\n規則 2：主辦人可以看全部\n  → 目前登入的人是主辦人\n\n不符合任何規則 → 這一列不會被送出去'
      : '（沒有任何規則）\n\n任何拿著公開金鑰的人\n都能讀取整張表的每一列。';
  }

  $('[data-viewers]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-viewer]');
    if (b) { viewer = b.dataset.viewer; renderRls(); }
  });
  $('[data-rls]').addEventListener('change', renderRls);
  renderRls();

  // ---------- 哪把鑰匙可以放在哪 ----------
  mountClassify($('[data-classify-keys]'), [
    { text: '把 sb_publishable_ 開頭的金鑰寫在網頁的 config.js 裡。', answer: 'ok', why: '這把本來就是設計給網頁用的，真正的保護靠 RLS。這個課程網站就是這樣做的。' },
    { text: '為了「測試方便」，把 service_role key 寫在網頁程式裡。', answer: 'no', why: '萬能鑰匙會跳過所有 RLS。寫在網頁上等於把整個資料庫送給任何人。' },
    { text: '把 service_role key 放在 Vercel 後台的環境變數，只給伺服器端的程式用。', answer: 'ok', why: '萬能鑰匙只能待在伺服器。講師的 LINE 小秘書就是這樣放的。' },
    { text: '把資料庫密碼貼給 AI，請它幫忙查為什麼連不上。', answer: 'no', why: '密碼不給任何人。請 AI 協助時，把密碼換成 xxx 再貼錯誤訊息。' },
    { text: '把 Supabase 的專案網址（https://xxx.supabase.co）放在網頁上。', answer: 'ok', why: '網址本身不是秘密，就像公司地址。能不能進門看的是鑰匙和規則。' },
  ], [{ key: 'ok', label: '🟢 可以這樣做' }, { key: 'no', label: '🔴 絕對不行' }], { title: '鑰匙放哪裡？' });

  renderPitCards($('[data-pits]'), ['zombie-seed', 'delete-log', 'backup-17', 'column-rename']);

  const QUIZ = window.QuizBank.m10;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm10' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'rls', title: 'RLS 模擬', text: '切換「你是誰」和 RLS 開關，看看同一張表每個人能看到什麼。' },
    { tour: 'keys', title: '兩把鑰匙', text: '分清楚哪把鑰匙可以放在網頁上、哪把絕對不行。' },
    { tour: 'pits', title: '真實事故', text: '講師在資料庫上踩過的坑，點卡片翻面。' },
    { tour: 'workshop', title: '工作坊', text: '課堂上用 Claude Code 建一張有門禁的報名表。' },
  ]);
})();

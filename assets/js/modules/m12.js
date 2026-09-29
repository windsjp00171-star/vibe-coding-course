/* m12.js — 單元 12：LINE Bot 小秘書 */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz } = window.Course;

  // ---------- 沉浸式任務：模擬 Claude Code 工作台 ----------
  window.Workbench.mount(window.Course.$('[data-workbench]'), {
    id: 'm12',
    missions: ['訊息怎麼進來', '鑰匙放哪', '排程時區', '自己測一次'],
    after: '往下看，這個單元會拆解小秘書的每一個零件。',
    run: window.SimM12.run,
  });
  const { classifyNote, utcToTaiwan } = window.CourseLib;
  const { mountFlow } = window.Electives;

  mountFlow($('[data-flow]'), [
    { title: '你在 LINE 傳訊息', text: '「明天下午去阿秦家」' },
    { title: 'LINE 轉送給你的程式', text: 'LINE 把訊息送到你設定的網址（/api/webhook），程式放在 Vercel。先檢查簽章、確認是主人傳的，不是就不理。' },
    { title: 'Gemini 分類', text: '程式把訊息交給 Gemini：這是待辦，日期是明天。時區由程式補上台灣時間。' },
    { title: '存進 Supabase', text: '待辦和日期存進資料庫。' },
    { title: '馬上回覆你', text: '「行程記下了，需要提醒出發時間嗎？」' },
    { title: '每 5 分鐘、每天早上 7 點', text: 'cron-job.org 每 5 分鐘叫醒程式檢查快到的提醒；Vercel 的排程每天早上推早安簡報給你。' },
  ]);

  // ---------- 小秘書模擬器 ----------
  const TYPE_LABEL = { task: '📌 待辦', reminder: '⏰ 提醒', project_update: '🛠️ 專案進度', note: '📝 筆記' };
  const EXAMPLES = ['明天下午去阿秦家', '提醒我後天繳電話費', '報名系統的推播功能完成了', '會議重點：下一季多辦親子活動'];
  const chat = $('[data-chat]');

  function send(text) {
    const value = text.trim();
    if (!value) return;
    const result = classifyNote(value);
    chat.insertAdjacentHTML('beforeend', `<div class="bubble me">${esc(value)}</div>
      <div class="bubble bot">${esc(TYPE_LABEL[result.type])}　${esc(result.reply)}</div>`);
    chat.scrollTop = chat.scrollHeight;
    $('[data-json]').textContent = JSON.stringify(result, null, 2);
  }

  $('[data-chat-examples]').innerHTML = EXAMPLES.map((t) => `<button type="button" class="chip" data-example="${esc(t)}">${esc(t)}</button>`).join('');
  $('[data-chat-examples]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-example]');
    if (b) send(b.dataset.example);
  });
  $('[data-chat-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = e.target.elements.msg;
    send(input.value);
    input.value = '';
  });
  chat.innerHTML = '<div class="bubble bot">嗨，我是小秘書。傳一句話給我，我幫你記下來。</div>';

  // ---------- 時區換算 ----------
  const utc = $('[data-utc]');
  function renderTz() {
    const h = Number(utc.value);
    const tw = utcToTaiwan(h);
    $('[data-utc-out]').textContent = h;
    $('[data-tw-out]').textContent = tw;
    const notes = [];
    if (h === 23) notes.push('✅ 這就是小秘書的早安簡報：UTC 23 點＝台灣隔天早上 7 點。');
    if (h === 0) notes.push('✅ 這就是小秘書的週報（每週五）：UTC 0 點＝台灣早上 8 點。');
    if (tw < 7) notes.push('⚠️ 台灣這時候大家都在睡覺，推播會把人吵醒。');
    if (h >= 16) notes.push('⚠️ UTC 16 點以後，台灣已經是「隔天」了，日期也要跟著換算。');
    $('[data-tz-note]').textContent = notes.join(' ');
  }
  utc.addEventListener('input', renderTz);
  renderTz();

  const QUIZ = window.QuizBank.m12;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm12' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  window.Tour.register([
    { tour: 'sim', title: '先玩再學', text: '模擬的 Claude Code：跟著情境自己下指令、做判斷，玩壞了按「重來一次」。' },
    { tour: 'flow', title: '訊息的旅程', text: '按「下一步」或「從頭播放」，看一則訊息經過哪些地方。' },
    { tour: 'sim', title: '小秘書模擬器', text: '輸入或點選例句，看它被分類成什麼，以及程式收到的資料格式。' },
    { tour: 'tz', title: '時區陷阱', text: '拉動滑桿，看排程時間換算成台灣時間是幾點。' },
    { tour: 'template', title: '講師的開源小秘書', text: 'Fork 一份就是你的：簽章、只理主人、提醒、設定精靈都做好了，你決定它要幫誰、懂什麼、怎麼回。' },
    { tour: 'lessons', title: '真實踩過的坑', text: '講師的小秘書壞過的四次，共通點是壞掉時沒人知道。' },
    { tour: 'workshop', title: 'LINE 場', text: '半天：先設計、照圖解讓小秘書上工，再把設計稿講給 Claude Code 聽，讓它改成你的，最後自己驗收。' },
    { tour: 'challenge', title: '延伸挑戰', text: '請 Claude Code 教小秘書一招新的。需求自己講清楚、自己驗收，這才是 Vibe Coding。' },
  ]);
})();

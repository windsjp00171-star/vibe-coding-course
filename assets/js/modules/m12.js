/* m12.js — 單元 12：LINE Bot 小秘書 */
(function () {
  'use strict';
  const { $, esc, mountQuiz, renderPrintQuiz } = window.Course;
  const { classifyNote, utcToTaiwan } = window.CourseLib;
  const { mountFlow } = window.Electives;

  mountFlow($('[data-flow]'), [
    { title: '你在 LINE 傳訊息', text: '「明天下午去阿秦家」' },
    { title: 'LINE 轉送給你的程式', text: 'LINE 把訊息送到你設定的網址（webhook），程式放在 Vercel。' },
    { title: 'Claude 分類', text: '程式把訊息交給 Claude：這是待辦，日期是明天。' },
    { title: '存進 Supabase', text: '待辦和日期存進資料庫。' },
    { title: '馬上回覆你', text: '「行程記下了，需要提醒出發時間嗎？」' },
    { title: '隔天早上 8 點', text: 'Vercel 的排程每天叫醒程式，查出今天的待辦，推播給你。' },
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
    if (tw === 8) notes.push('✅ 這就是小秘書的設定：台灣早上 8 點，剛起床看得到。');
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
    { tour: 'flow', title: '訊息的旅程', text: '按「下一步」或「從頭播放」，看一則訊息經過哪些地方。' },
    { tour: 'sim', title: '小秘書模擬器', text: '輸入或點選例句，看它被分類成什麼，以及程式收到的資料格式。' },
    { tour: 'tz', title: '時區陷阱', text: '拉動滑桿，看排程時間換算成台灣時間是幾點。' },
    { tour: 'workshop', title: '工作坊', text: '課堂上分組設計你自己的小秘書。' },
  ]);
})();

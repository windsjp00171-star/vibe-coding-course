/*
 * sims/m12-bot.js — 單元 12 沉浸式任務「讓小秘書上工」。
 * 四關：訊息怎麼進來（Webhook）→ 三把鑰匙放哪 → 排程時區 → 自己傳一句話測試。
 * 分類用的是課程裡同一支 classifyNote（lib.js），學員在這裡看到的就是後面單元教的東西。
 */
(function (root) {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const CRONS = [
    { value: '0 8 * * 1', label: '0 8 * * 1（UTC 早上 8 點）', taiwan: '下午 4 點', ok: false },
    { value: '0 0 * * 1', label: '0 0 * * 1（UTC 午夜）', taiwan: '早上 8 點', ok: true },
    { value: '0 16 * * 1', label: '0 16 * * 1（UTC 下午 4 點）', taiwan: '半夜 12 點', ok: false },
  ];

  // 預覽面板：模擬的 LINE 聊天視窗
  function buildChat(messages) {
    const bubble = (m) => (m.me
      ? `<div class="row me"><div class="me-b">${esc(m.text)}</div></div>`
      : `<div class="row"><div class="av">秘</div><div class="bot">${esc(m.text)}</div></div>`);
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
      body{font-family:system-ui,"Noto Sans TC",sans-serif;margin:0;background:#8aa6c0;min-height:100%}
      header{background:#f5f5f7;padding:9px 12px;font-weight:800;font-size:.85rem;color:#2c2c34;border-bottom:1px solid #dcdce2}
      .log{padding:12px;display:flex;flex-direction:column;gap:10px}
      .row{display:flex;gap:7px;align-items:flex-end}
      .row.me{justify-content:flex-end}
      .av{width:26px;height:26px;border-radius:50%;background:#06c755;color:#fff;display:grid;place-items:center;font-size:.72rem;flex:none}
      .bot,.me-b{max-width:78%;padding:8px 11px;border-radius:14px;font-size:.85rem;line-height:1.6;white-space:pre-wrap}
      .bot{background:#fff;color:#22222a;border-top-left-radius:4px}
      .me-b{background:#06c755;color:#fff;border-bottom-right-radius:4px}
      .empty{color:#eef3f8;text-align:center;font-size:.85rem;padding:30px 10px}
    </style></head><body>
      <header>💬 Emmark 小秘書</header>
      <div class="log">${messages.length ? messages.map(bubble).join('') : '<p class="empty">還沒有訊息。<br>設定完成後就可以跟它說話。</p>'}</div>
    </body></html>`;
  }

  async function run(wb) {
    const lib = root.CourseLib;
    const chat = [];
    const paint = () => wb.setSite(buildChat(chat));

    await wb.story('📱 你自己', '每週一都要提醒大家交週報，好煩。做一個 LINE 小秘書來做這件事吧。', '開始設定');
    wb.setFolder('line-小秘書');
    wb.addFile('📄 webhook.py');
    paint();

    // 第 1 關：訊息怎麼進來
    wb.mission(0);
    await wb.claude('先想清楚一件事：有人在 LINE 上傳訊息給你的機器人，LINE 要怎麼把這則訊息交到你的程式手上？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'poll', label: '我的程式每分鐘去問 LINE 一次「有新訊息嗎」' },
        { value: 'hook', label: '給 LINE 一個網址，有訊息它就打到這個網址' },
        { value: 'mail', label: 'LINE 會寄 Email 通知我' },
      ]);
      if (pick === 'hook') break;
      wb.mistake();
      await wb.coach('LINE 的做法是：你給它一個網址（Webhook），有人傳訊息，它就把訊息送到那個網址。你不用一直去問。', 'warn');
    }
    wb.tool('⚙️ 設定 Webhook', ['+ https://你的專案.vercel.app/webhook', '✓ LINE 驗證成功']);
    await wb.coach('Webhook 就是「有事打這支電話」。這個觀念之後串金流、串表單都會再遇到。', 'good');

    // 第 2 關：鑰匙放哪
    wb.mission(1);
    await wb.claude('這個小秘書需要三把鑰匙：LINE 的兩把，加上請 AI 幫忙判斷訊息用的一把。要放哪裡？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'code', label: '寫在程式碼最上面，方便看' },
        { value: 'env', label: '放到平台的環境變數' },
        { value: 'note', label: '存在自己的記事本，每次貼上去' },
      ]);
      if (pick === 'env') break;
      wb.mistake();
      await wb.coach(pick === 'code'
        ? '程式一推上 GitHub，那三把鑰匙就等於公開了（單元 6 演過那一晚）。'
        : '每次手動貼很容易貼錯，而且部署到雲端時根本沒有你的記事本。', 'warn');
    }
    await wb.permission('設定環境變數', 'LINE_CHANNEL_SECRET、LINE_ACCESS_TOKEN、AI_API_KEY', '存在平台的設定裡，不進程式碼、不進 GitHub。');
    wb.tool('🔒 已設定 3 個環境變數', ['LINE_CHANNEL_SECRET', 'LINE_ACCESS_TOKEN', 'AI_API_KEY']);
    wb.addFile('📄 .gitignore');

    // 第 3 關：排程時區
    wb.mission(2);
    await wb.claude('再來設定排程：每週一「台灣時間早上 8 點」提醒大家交週報。平台的排程用的是國際標準時間（UTC），台灣比它快 8 小時。你要選哪一個？');
    for (;;) {
      const pick = await wb.choose(CRONS.map((c) => ({ value: c.value, label: c.label })));
      const chosen = CRONS.find((c) => c.value === pick);
      if (chosen.ok) { await wb.coach('正確。UTC 午夜 = 台灣早上 8 點。設定跟時間有關的東西，一定要先換算，再用真實日期試一次。', 'good'); break; }
      wb.mistake();
      await wb.boom(`⏰ 這樣設定，提醒會在台灣時間${chosen.taiwan}送出。`);
      await wb.coach('台灣 = UTC + 8。要在台灣早上 8 點發，UTC 要設成午夜 0 點。講師的系統真的在半夜 00:07 吵醒過所有人（踩坑圖鑑有這一則）。', 'warn');
    }
    wb.tool('⏰ 已設定排程', ['0 0 * * 1（= 台灣時間每週一 08:00）']);

    // 第 4 關：自己測一次
    wb.mission(3);
    await wb.claude('設定都好了。你自己傳一句話給它試試看，例如「下週三下午三點開會」。');
    for (let done = false; !done;) {
      const text = await wb.prompt({ placeholder: '傳一句話給小秘書……', hints: ['下週三下午三點跟廠商開會'] });
      chat.push({ me: true, text });
      const result = lib.classifyNote(text);
      const kind = { reminder: '提醒', task: '待辦', project_update: '專案進度', note: '筆記' }[result.type];
      chat.push({ me: false, text: `${result.reply}\n（分類：${kind}${result.due_date ? `．日期 ${result.due_date}` : ''}）` });
      paint();
      await wb.claude(`它把這句話判斷成「${kind}」${result.due_date ? `，日期抓到 ${result.due_date}` : ''}。`);
      const pick = await wb.choose([
        { value: 'more', label: '再傳一句試試看' },
        { value: 'ok', label: '可以了，收工' },
      ]);
      done = pick === 'ok';
    }
    await wb.coach('注意這裡的分工：判斷「這句話是什麼意思」交給 AI，「每週一早上發提醒」交給程式的排程。規則固定的事不要交給 AI，它每次答案可能不一樣。', 'good');

    wb.finish([
      'Webhook 就是「有事打這支電話」的網址',
      '三把鑰匙放環境變數，不進程式碼、不進 GitHub',
      '排程平台用 UTC，台灣要 +8，設定前先換算',
      '判斷語意交給 AI，固定規則交給程式',
      '設定完自己傳一句話測，別等使用者幫你測',
    ]);
  }

  const api = { CRONS, buildChat, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimM12 = api;
})(typeof self !== 'undefined' ? self : this);

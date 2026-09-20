/*
 * sims/m19-deepfake.js — 單元 19 沉浸式任務「週五下午的視訊指令」。
 * 四關：接到視訊 → 辨識催促話術 → 換管道確認 → 對方加碼施壓時仍守住流程。
 * 只演「怎麼防」，不示範任何偽造技術。
 */
(function (root) {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 預覽面板：手機畫面（視訊中／通話中／結果）
  function buildPhone({ scene, caption }) {
    const body = {
      video: `<div class="face">👤</div><p class="name">老闆（視訊中）</p><p class="sub">畫面有點卡，聲音很像本人</p>`,
      chat: `<div class="msg">陳總：我在開會不方便講電話，先照剛剛視訊說的匯款，帳號我傳給你</div>
             <div class="msg">陳總：這件事先不要跟其他人講，談判還沒公開</div>`,
      calling: `<div class="face ring">📞</div><p class="name">撥打中…</p><p class="sub">用通訊錄裡原本的號碼</p>`,
      safe: `<div class="face ok">✅</div><p class="name">本人接起來了</p><p class="sub">「我沒有找你匯款」</p>`,
      lost: `<div class="face bad">💸</div><p class="name">款項已轉出</p><p class="sub">對方帳號隨即被清空</p>`,
    }[scene];
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
      body{font-family:system-ui,"Noto Sans TC",sans-serif;margin:0;background:#12131a;color:#e9e9f2;min-height:100%}
      .screen{padding:26px 18px;text-align:center}
      .face{width:92px;height:92px;margin:0 auto 14px;border-radius:50%;background:#2a2c3a;display:grid;place-items:center;font-size:2.6rem}
      .face.ring{animation:p 1.2s infinite}
      .face.ok{background:#17402c}.face.bad{background:#48201c}
      @keyframes p{50%{box-shadow:0 0 0 12px rgba(255,255,255,.06)}}
      .name{font-weight:800;margin:0 0 4px}
      .sub{color:#9a9ab0;font-size:.85rem;margin:0}
      .msg{background:#1f2130;border-radius:14px;padding:10px 13px;margin:0 0 9px;text-align:left;font-size:.86rem;line-height:1.7}
      .cap{margin:18px 10px 0;background:#23243a;border-radius:10px;padding:9px 12px;font-size:.82rem;color:#c9c9de}
    </style></head><body>
      <div class="screen">${body}${caption ? `<p class="cap">${esc(caption)}</p>` : ''}</div>
    </body></html>`;
  }

  async function run(wb) {
    const view = { scene: 'video', caption: '' };
    const paint = () => wb.setSite(buildPhone(view));

    await wb.story('📞 來電：陳總（老闆）', '週五下午 4 點半，你接到老闆的視訊。畫面是他本人，聲音也是他。', '接起來');
    wb.setFolder('公司帳務');
    paint();

    // 第 1 關：視訊裡的指令
    wb.mission(0);
    await wb.claude('「我人在外面談併購，現在要付一筆訂金 48 萬，對方等著。你先用公司帳戶匯過去，單據我回去補。」');
    for (;;) {
      const pick = await wb.choose([
        { value: 'do', label: '老闆親口說的，馬上去辦' },
        { value: 'ask', label: '在視訊裡追問細節，確認是不是本人' },
        { value: 'hold', label: '先不承諾，說「我確認一下流程再回覆」' },
      ]);
      if (pick === 'hold') break;
      wb.mistake();
      await wb.coach(pick === 'do'
        ? '這一步就是關鍵。畫面和聲音現在都做得出來，「親口說的」已經不是證據。'
        : '在同一個視窗裡追問沒有用——能偽造畫面的人，也準備好了答案。要換一個管道確認，不是在原管道裡追問。', 'warn');
    }
    await wb.coach('答得好。不要否定對方、也不用當場拆穿，只要不當場承諾，留下確認的時間就夠了。', 'good');

    // 第 2 關：催促話術
    wb.mission(1);
    view.scene = 'chat';
    paint();
    await wb.notify('💬 LINE 陳總', '我在開會不方便講電話，先匯款，帳號我傳給你。這件事先別跟其他人講。');
    await wb.claude('訊息裡有三個訊號。你覺得最可疑的是哪一個？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'money', label: '金額很大' },
        { value: 'silence', label: '要你「先別跟其他人講」' },
        { value: 'line', label: '用 LINE 聯絡' },
      ]);
      if (pick === 'silence') break;
      wb.mistake();
      await wb.coach(pick === 'money'
        ? '金額大只是讓損失大，不是判斷依據；小額詐騙也很多。真正的紅旗是「不准你確認」。'
        : '用 LINE 談公事很常見，本身不可疑。可疑的是「不要告訴別人」——正當的流程不怕被知道。', 'warn');
    }
    await wb.coach('對。「保密」＋「急」＋「不方便講電話」是同一套劇本：目的都是讓你來不及用別的管道查證。', 'good');

    // 第 3 關：換管道確認
    wb.mission(2);
    await wb.claude('那你要怎麼確認？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'reply', label: '在 LINE 上回問「是你本人嗎？」' },
        { value: 'new', label: '打訊息裡附的那支電話' },
        { value: 'old', label: '用通訊錄裡原本的號碼打給老闆' },
      ]);
      if (pick === 'old') break;
      wb.mistake();
      await wb.coach(pick === 'reply'
        ? '帳號可能已經被盜，問了也是同一個人回你「是我」。要離開這個管道。'
        : '對方給的號碼當然由對方接。一定要用你自己原本就有的聯絡方式。', 'warn');
    }
    view.scene = 'calling';
    paint();
    await wb.claude('（電話響了三聲……）');
    view.scene = 'safe';
    view.caption = '老闆：「我沒有找你匯款，我現在在開會。」';
    paint();
    await wb.coach('這就是回撥驗證。整個過程花你三分鐘，擋下 48 萬。', 'good');

    // 第 4 關：加碼施壓
    wb.mission(3);
    await wb.notify('💬 LINE 陳總', '你怎麼還沒匯？對方要取消合作了，出事你負責！');
    for (;;) {
      const pick = await wb.choose([
        { value: 'fear', label: '被罵了，還是先匯再說' },
        { value: 'stop', label: '停止匯款，通報主管與會計，保留所有紀錄' },
      ]);
      if (pick === 'stop') break;
      wb.mistake();
      view.scene = 'lost';
      view.caption = '（模擬）款項已轉出，對方帳號隨即被清空。';
      paint();
      await wb.boom('💸（模擬）48 萬匯出了。實際案例中，錢通常在幾分鐘內就被轉走。');
      await wb.coach('罵人、催促、「出事你負責」都是劇本的一部分。你已經用可信管道確認過了——確認結果比威脅更可信。', 'warn');
      view.scene = 'safe';
      paint();
    }
    wb.tool('🛡️ 你做的處置', ['✓ 停止匯款', '✓ 通報主管與會計', '✓ 保留對話紀錄與來電時間', '✓ 提醒同事可能接到同樣的電話']);
    await wb.coach('最後一步很重要：同一批人常會換個名義再打給你的同事。說出來，不要覺得丟臉。', 'good');

    wb.finish([
      '畫面和聲音都能偽造，「像本人」不是證據',
      '急、保密、不方便講電話＝典型詐騙套路',
      '用你自己通訊錄裡的舊號碼回撥確認',
      '被罵、被施壓時，確認結果比威脅可信',
      '真的中了：先止付、打 165、留證據、通知身邊的人',
    ]);
  }

  const api = { buildPhone, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimM19 = api;
})(typeof self !== 'undefined' ? self : this);

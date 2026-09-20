/*
 * sims/m13-login.js — 單元 13 沉浸式任務「LINE 登入的五個坑」。
 * 四關：設定白名單 → LINE 內建瀏覽器打不開 → 登入後回到首頁而不是原本那一頁 → 憑證過期。
 * 這些坑的共同點：都不會跳錯誤訊息，使用者只會安靜地離開。
 */
(function (root) {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 預覽面板：使用者的手機畫面
  function buildPhone({ scene, note }) {
    const body = {
      form: '<div class="card"><h1>🍱 部門聚餐報名</h1><p class="sub">請先登入才能報名</p><button class="line">用 LINE 登入</button></div>',
      error: '<div class="card err"><h1>400 Bad Request</h1><p class="sub">redirect_uri 不在允許清單內</p><p class="hint">使用者看到這一頁通常就直接關掉了。</p></div>',
      blank: '<div class="card err"><h1>⬜</h1><p class="sub">一片空白，按什麼都沒反應</p><p class="hint">在 LINE 裡面打開時才會這樣，用 Safari 開就正常。</p></div>',
      home: '<div class="card"><h1>🏠 首頁</h1><p class="sub">（登入成功了，但回到首頁）</p><p class="hint">使用者：「咦？我剛剛不是在報名嗎？」然後就放棄了。</p></div>',
      back: '<div class="card ok"><h1>🍱 部門聚餐報名</h1><p class="sub">王小明，你已登入</p><div class="row">姓名：王小明</div><div class="row">飲食：葷食 / 素食</div><button class="go">送出報名</button></div>',
      expired: '<div class="card err"><h1>😵 又要我登入一次？</h1><p class="sub">昨天明明登入過了</p><p class="hint">憑證過期後沒有自動更新，使用者每天都要重登。</p></div>',
    }[scene];
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
      body{font-family:system-ui,"Noto Sans TC",sans-serif;margin:0;padding:18px;background:#e9eaf0;color:#23212e}
      .card{background:#fff;border-radius:16px;padding:20px 16px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.08)}
      .card.err{background:#fdf1f0}
      .card.ok{border:2px solid #06c755}
      h1{font-size:1.2rem;margin:0 0 6px}
      .sub{color:#6b6880;font-size:.86rem;margin:0 0 12px}
      .hint{color:#8a3b2f;font-size:.8rem;line-height:1.7;margin:10px 0 0}
      button{border:0;border-radius:999px;padding:10px 18px;font:inherit;font-weight:800;color:#fff;background:#06c755;width:100%}
      button.go{background:#e8743b}
      .row{background:#f5f5f8;border-radius:10px;padding:8px 10px;margin:8px 0;font-size:.85rem;text-align:left}
      .note{margin-top:14px;background:#fff8e6;border-radius:10px;padding:9px 12px;font-size:.82rem;color:#7a5510}
    </style></head><body>${body}${note ? `<p class="note">${esc(note)}</p>` : ''}</body></html>`;
  }

  async function run(wb) {
    const view = { scene: 'form', note: '' };
    const paint = () => wb.setSite(buildPhone(view));

    await wb.story('📱 同事阿珍', '我要報名聚餐，按了「用 LINE 登入」，結果跳出一頁英文的錯誤，我就關掉了。', '來看看怎麼回事');
    wb.setFolder('聚餐報名．LINE 登入');
    wb.addFile('📄 login.py');
    paint();

    // 第 1 關：白名單
    wb.mission(0);
    view.scene = 'error';
    paint();
    await wb.claude('錯誤訊息寫 redirect_uri 不在允許清單內。你覺得是哪裡的問題？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'code', label: '程式寫錯了，重寫登入功能' },
        { value: 'whitelist', label: 'LINE 後台的「回呼網址」沒加上這個網站' },
        { value: 'user', label: '同事的 LINE 版本太舊' },
      ]);
      if (pick === 'whitelist') break;
      wb.mistake();
      await wb.coach(pick === 'code'
        ? '先別動程式。這個錯誤是 LINE 那邊回的：它只允許你事先登記過的網址跳回來，沒登記就擋掉。'
        : '跟使用者的版本無關。LINE 只允許登記過的網址，沒登記的一律擋下。', 'warn');
    }
    wb.tool('⚙️ LINE 後台設定', ['+ 回呼網址：https://你的網站/callback', '（網址要一字不差，https、斜線都算）']);
    await wb.coach('重點：網址要一字不差。多一個斜線、用了 http 而不是 https、測試網址沒登記，都會是同一個錯誤。', 'good');
    view.scene = 'form';
    paint();

    // 第 2 關：LINE 內建瀏覽器
    wb.mission(1);
    await wb.notify('📱 同事阿珍', '可以登入了！但我從 LINE 群組點連結進去，畫面一片空白。');
    view.scene = 'blank';
    paint();
    for (;;) {
      const pick = await wb.choose([
        { value: 'ignore', label: '我這邊測都正常，應該是她手機的問題' },
        { value: 'test', label: '自己也從 LINE 點一次連結來測' },
      ]);
      if (pick === 'test') break;
      wb.mistake();
      await wb.coach('「我這邊正常」是最貴的一句話。使用者怎麼打開，你就要怎麼測一次——從 LINE 群組點進去。', 'warn');
    }
    await wb.claude('我從 LINE 裡面打開，果然是空白。LINE 有自己的內建瀏覽器，有些寫法它不支援。');
    wb.tool('✏️ 修正', ['~ 改用 LINE 內建瀏覽器支援的寫法', '+ 頁面加上「用外部瀏覽器開啟」的提示連結']);
    view.scene = 'form';
    view.note = '已加上：在 LINE 裡打不開時，提示改用 Safari／Chrome 開啟。';
    paint();

    // 第 3 關：登入後跳錯頁
    wb.mission(2);
    await wb.notify('📱 同事阿珍', '登入完之後跑到首頁去了，我要再找一次報名頁……算了。');
    view.scene = 'home';
    view.note = '';
    paint();
    await wb.claude('登入成功之後，我們把使用者導回首頁。要改嗎？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'keep', label: '還好吧，首頁也找得到報名頁' },
        { value: 'fix', label: '要改：登入後回到他原本要去的那一頁' },
      ]);
      if (pick === 'fix') break;
      wb.mistake();
      await wb.coach('多按兩下就會流失一半的人。而且這種事沒有人會回報，你只會看到「報名的人很少」。', 'warn');
    }
    wb.tool('✏️ 修正', ['+ 登入前先記住原本的網址', '+ 登入成功後跳回那一頁']);
    view.scene = 'back';
    paint();
    await wb.coach('這叫「回到原處」。任何需要登入才能做的事，都要做這件事。', 'good');

    // 第 4 關：憑證過期
    wb.mission(3);
    await wb.notify('📱 同事阿珍', '（隔天）怎麼又要我登入一次？', '');
    view.scene = 'expired';
    paint();
    await wb.claude('登入憑證有期限。時間到了如果沒有自動換新的，使用者就要重登一次。你希望怎麼處理？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'long', label: '把期限設成永久，一勞永逸' },
        { value: 'refresh', label: '到期前自動換新的，換不成才請他重登' },
        { value: 'ignore', label: '就讓他每天重登，反正只是按一下' },
      ]);
      if (pick === 'refresh') break;
      wb.mistake();
      await wb.coach(pick === 'long'
        ? '永久有效的憑證等於永久有效的鑰匙——手機掉了、帳號借人看過，就一直有效。安全和方便要取平衡，不是把鎖拆掉。'
        : '對長輩和不熟手機的人來說，「每次都要重登」就等於不能用。這類系統的使用者流失都是這樣一點一滴來的。', 'warn');
    }
    wb.tool('✏️ 修正', ['+ 憑證到期前自動更新', '+ 更新失敗才導到登入頁，並記住原本的頁面']);
    view.scene = 'back';
    view.note = '阿珍：「這次都不用重登了，很順。」';
    paint();

    await wb.coach('這四個坑有個共同點：程式都沒有報錯。你要靠「自己用一次」和「使用者的抱怨」才會發現——所以每一個都值得寫進交接文件。', 'good');

    wb.finish([
      '回呼網址要一字不差地登記在 LINE 後台',
      '使用者怎麼打開，你就怎麼測一次（從 LINE 裡點）',
      '登入後要回到他原本要去的那一頁',
      '憑證要能自動更新，不是設成永久',
      '這些坑都不報錯，所以一定要寫交接文件',
    ]);
  }

  const api = { buildPhone, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimM13 = api;
})(typeof self !== 'undefined' ? self : this);

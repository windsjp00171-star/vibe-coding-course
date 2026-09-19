/*
 * sims/m6-leak.js — 單元 6 沉浸式任務「金鑰外洩的那一晚」。
 * 四關：找出寫死的金鑰 → 第一步先停用舊金鑰 → 改成環境變數並擋住 .env → 記取教訓。
 * 這個劇本的關鍵教學點：止血順序（先停用，再清理），以及「清掉歷史不等於沒外洩」。
 */
(function (root) {
  'use strict';

  const NEEDS = {
    fix: [{ id: 'env', label: '把金鑰改放到程式外面', re: /(環境變數|\.env|env|設定檔|外面|不要寫在|拿掉|移出)/ }],
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const CODE = [
    { n: 1, text: 'import os, requests', bad: false },
    { n: 2, text: 'API_KEY = "sk-live-8f3b91d0c7a24e55"', bad: true },
    { n: 3, text: 'def send(msg):', bad: false },
    { n: 4, text: '    return requests.post(URL, json={"text": msg})', bad: false },
  ];

  // 預覽面板：一份 AI 寫好的程式，學員要看出哪一行有問題
  function buildCode({ fixed, picked }) {
    const lines = fixed
      ? [{ n: 1, text: 'import os, requests', bad: false },
        { n: 2, text: 'API_KEY = os.environ["API_KEY"]   # 從環境變數讀', bad: false },
        { n: 3, text: 'def send(msg):', bad: false },
        { n: 4, text: '    return requests.post(URL, json={"text": msg})', bad: false }]
      : CODE;
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
      body{font-family:ui-monospace,Consolas,monospace;margin:0;padding:16px;background:#14131c;color:#e8e6f5;font-size:.84rem;line-height:1.9}
      h2{font-family:system-ui,"Noto Sans TC",sans-serif;font-size:.8rem;color:#9b95c9;margin:0 0 10px;letter-spacing:.05em}
      .ln{display:flex;gap:12px;border-radius:6px;padding:0 8px}
      .ln i{color:#6b6790;font-style:normal;width:1.2em;text-align:right;flex:none}
      .ln.bad{background:#4a1d1b;color:#ffcfc9}
      .ln.pick{outline:2px solid #ffcc4d}
      .ok{font-family:system-ui,"Noto Sans TC",sans-serif;margin-top:12px;background:#1f3a2c;color:#7ee0a7;border-radius:8px;padding:8px 10px;font-size:.85rem}
    </style></head><body>
      <h2>${fixed ? '✅ notify.py（已修好）' : '📄 notify.py（AI 寫好的，你直接推上 GitHub 了）'}</h2>
      ${lines.map((l) => `<div class="ln ${!fixed && l.bad ? 'bad' : ''} ${picked === l.n ? 'pick' : ''}"><i>${l.n}</i><span>${esc(l.text)}</span></div>`).join('')}
      ${fixed ? '<p class="ok">金鑰已經不在程式碼裡了，改從執行環境讀取。</p>' : ''}
    </body></html>`;
  }

  async function run(wb) {
    const lib = root.CourseLib;
    const view = { fixed: false, picked: 0 };
    const paint = () => wb.setSite(buildCode(view));

    await wb.story('📧 服務商來信', '偵測到異常用量：你的帳號在過去 6 小時被呼叫了 41,300 次，來自 7 個國家。目前累積費用 USD 427。', '糟糕，怎麼會');
    wb.setFolder('活動通知小工具');
    wb.addFile('📄 notify.py');
    paint();

    // 第 1 關：找出問題那一行
    wb.mission(0);
    await wb.claude('先看程式。這是你昨天請我寫、然後推上 GitHub 的檔案。你看得出哪一行有問題嗎？');
    for (;;) {
      const pick = await wb.choose(CODE.map((l) => ({ value: String(l.n), label: `第 ${l.n} 行` })));
      view.picked = Number(pick);
      paint();
      if (view.picked === 2) break;
      wb.mistake();
      await wb.coach('再看一次。哪一行「把祕密直接寫進程式碼」了？程式一推上 GitHub，那行字就等於貼在公佈欄上。', 'warn');
    }
    await wb.coach('就是第 2 行。金鑰寫死在程式裡，而這個 repo 是公開的。網路上有機器人專門掃 GitHub 找這種字串，幾分鐘內就會被撿走。', 'warn');

    // 第 2 關：止血順序
    wb.mission(1);
    await wb.claude('現在最緊急的是止血。你想先做哪一件？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'delete', label: '把那一行刪掉，重新 push' },
        { value: 'private', label: '把 repo 改成私人的' },
        { value: 'revoke', label: '到服務商後台把這把金鑰停用' },
      ]);
      if (pick === 'revoke') break;
      wb.mistake();
      await wb.boom(pick === 'delete'
        ? '💸 費用還在跳：金鑰已經被人拿走了，刪掉程式碼那一行，對方手上那一把照樣能用。而且 Git 的歷史裡還留著。'
        : '💸 費用還在跳：改成私人也來不及了，金鑰早就被抄走。');
      await wb.coach('外洩的第一步永遠是「讓那把鑰匙失效」，其他都是之後的事。就像掉了門卡，要先掛失，不是先回家換門。', 'warn');
    }
    wb.tool('🔒 已到服務商後台', ['~ 舊金鑰：已停用', '+ 產生新金鑰（這次不寫進程式碼）']);
    await wb.coach('止血完成，費用停止增加。接下來才是清理。', 'good');

    // 第 3 關：改成環境變數
    wb.mission(2);
    await wb.claude('那程式要怎麼改？新的金鑰要放哪裡？');
    for (;;) {
      const text = await wb.prompt({ placeholder: '告訴 Claude Code 怎麼改……', hints: ['把金鑰改成從環境變數讀取，不要寫在程式碼裡，並把 .env 加進 .gitignore'] });
      if (lib.matchNeeds(text, NEEDS.fix).missing.length === 0) break;
      await wb.claude('你希望金鑰放在哪裡呢？（提示：放在程式碼「外面」，程式執行時才去拿）');
    }
    await wb.permission('修改檔案', 'notify.py：金鑰改從環境變數讀取', '同時建立 .env 存放金鑰，並把 .env 加進 .gitignore。');
    view.fixed = true;
    view.picked = 0;
    paint();
    wb.tool('✏️ 修改 3 個檔案', ['~ notify.py：改讀環境變數', '+ .env：放新的金鑰（只在你電腦上）', '+ .gitignore：加入 .env']);
    wb.addFile('📄 .env（不會上傳）');
    wb.addFile('📄 .gitignore');
    await wb.coach('.gitignore 是「不要存進 Git 的清單」。金鑰檔一定要在裡面，否則下次又會跟著上傳。', 'good');

    // 第 4 關：善後觀念
    wb.mission(3);
    await wb.claude('我可以順手把 Git 歷史裡那行金鑰也清掉。清掉之後，是不是就等於沒外洩了？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'yes', label: '對，清掉就沒事了' },
        { value: 'no', label: '不對，還是要當作已經外洩' },
      ]);
      if (pick === 'no') break;
      wb.mistake();
      await wb.coach('清歷史只是讓它以後看不到。在那之前抄走的人、快取、備份、別人 clone 的副本都還在。所以「停用舊金鑰」才是真正有效的動作。', 'warn');
    }
    await wb.coach('完全正確。清理要做，但心態上一律當作「已經外洩」。', 'good');
    await wb.notify('📧 服務商', '新的用量已恢復正常。本期費用停止增加。');

    wb.finish([
      '祕密不寫進程式碼，放到環境變數',
      '.env 一定要寫進 .gitignore',
      '外洩第一步是停用舊金鑰，不是刪程式碼',
      '清掉歷史不等於沒外洩，要當作已經被拿走',
      '上線前用全域搜尋找一次 key、password、token',
    ]);
  }

  const api = { NEEDS, buildCode, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimM6 = api;
})(typeof self !== 'undefined' ? self : this);

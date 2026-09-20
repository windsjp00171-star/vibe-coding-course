/*
 * sims/m5-ship.js — 單元 5 沉浸式任務「把作品放上網路」。
 * 五關：怎麼給別人看 → 選對平台 → 第一次上線 → 打開是 404 怎麼辦 → 改一行再上線（快取）。
 * 這個劇本的重點不是記住平台操作，而是判斷：這個作品需要什麼、出問題時先看哪裡。
 */
(function (root) {
  'use strict';

  const NEEDS = {
    edit: [{ id: 'title', label: '說出要改什麼', re: /(標題|名稱|字|文案|改成|換成)/ }],
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 預覽面板：一個瀏覽器視窗，網址列和內容會跟著上線狀態改變
  function buildBrowser({ url, state, title }) {
    const body = {
      local: '<p class="hint">這是你電腦上的檔案。<br>只有你看得到，網址是 file:/// 開頭。</p>',
      building: '<p class="hint">⏳ 部署中……<br>第一次通常要等一兩分鐘。</p>',
      404: '<h1 class="err">404</h1><p class="hint">找不到頁面<br>（網站還在部署，或檔名不是 index.html）</p>',
      live: `<h1>${esc(title)}</h1><p>週五 18:30．公司附近餐廳</p><p class="ok">✅ 這一頁現在全世界都打得開</p>`,
    }[state];
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
      body{font-family:system-ui,"Noto Sans TC",sans-serif;margin:0;background:#eceaf4;height:100%}
      .bar{display:flex;gap:8px;align-items:center;background:#dedbec;padding:8px 10px}
      .dots span{display:inline-block;width:9px;height:9px;border-radius:50%;background:#bbb7ce;margin-right:4px}
      .url{flex:1;background:#fff;border-radius:999px;padding:5px 12px;font-size:.76rem;color:#4a4560;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      .page{background:#fff;margin:10px;border-radius:10px;padding:22px 18px;min-height:190px;text-align:center}
      h1{font-size:1.3rem;margin:.2em 0 .4em}
      .err{font-size:3rem;color:#d4483f;margin:0}
      .hint{color:#6b6880;font-size:.86rem;line-height:1.8}
      .ok{color:#17663f;font-weight:700;font-size:.85rem;background:#e7f6ee;border-radius:8px;padding:6px 10px;display:inline-block}
    </style></head><body>
      <div class="bar"><span class="dots"><span></span><span></span><span></span></span><span class="url">${esc(url)}</span></div>
      <div class="page">${body}</div>
    </body></html>`;
  }

  async function run(wb) {
    const lib = root.CourseLib;
    const view = { url: 'file:///C:/Users/你/聚餐報名/index.html', state: 'local', title: '🍱 週五部門聚餐報名' };
    const paint = () => wb.setSite(buildBrowser(view));

    await wb.story('👔 林經理', '報名頁做好了嗎？傳給我看一下！', '做好了，但是……');
    wb.setFolder('聚餐報名');
    wb.addFile('📄 index.html');
    paint();

    // 第 1 關：怎麼給別人看
    wb.mission(0);
    await wb.claude('目前這個網頁只存在你的電腦裡。要怎麼讓林經理看到？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'shot', label: '📸 截圖傳給他' },
        { value: 'file', label: '📎 把 index.html 用 LINE 傳給他' },
        { value: 'web', label: '🌐 放到網路上，給他一個網址' },
      ]);
      if (pick === 'web') break;
      wb.mistake();
      await wb.coach(pick === 'shot'
        ? '截圖看得到畫面，但他不能填、不能按。報名表不能用，等於沒做。'
        : '傳檔案有三個問題：他點開可能版面跑掉、你一改就要重傳一次、而且手機通常打不開。', 'warn');
    }
    await wb.coach('把作品放到網路上，讓任何人用網址就打得開——這件事就叫「部署」。', 'info');

    // 第 2 關：選平台
    wb.mission(1);
    await wb.claude('這個作品只有 index.html，沒有資料庫、沒有後端程式。你想放在哪裡？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'pages', label: 'GitHub Pages（放純網頁，免費）' },
        { value: 'render', label: 'Render（可以跑後端程式）' },
        { value: 'vps', label: '自己租一台主機來架' },
      ]);
      if (pick === 'pages') break;
      wb.mistake();
      await wb.coach(pick === 'render'
        ? '也可以，但這個作品沒有後端，用不到它的能力，而且免費方案閒置久了會休眠，第一次打開要等。挑「剛好夠用」的就好。'
        : '自己租主機要自己管作業系統、憑證、更新，對這個作品來說太重了。先用免費的靜態網站空間。', 'warn');
    }

    // 第 3 關：第一次上線
    wb.mission(2);
    await wb.claude('好，我幫你把專案推上 GitHub，再開啟 GitHub Pages。');
    await wb.permission('上傳並設定', 'git push + 開啟 GitHub Pages', '把檔案推上你的 repo，並開啟免費網站空間。');
    wb.tool('🚀 部署中', ['⬆️ 已推上 GitHub', '⚙️ 已開啟 Pages', '⏳ 產生網站中……']);
    view.url = 'https://你的帳號.github.io/聚餐報名/';
    view.state = 'building';
    paint();
    await wb.claude('網址出來了，你先打開看看。');

    // 第 4 關：打開是 404
    view.state = '404';
    paint();
    await wb.notify('👔 林經理', '我點了，怎麼是 404？是不是壞了 😅');
    for (;;) {
      const pick = await wb.choose([
        { value: 'redo', label: '重做一次，從頭再部署' },
        { value: 'wait', label: '等一兩分鐘再重新整理' },
        { value: 'name', label: '檢查首頁檔名是不是 index.html' },
      ]);
      if (pick === 'wait' || pick === 'name') {
        await wb.coach(pick === 'wait'
          ? '對。第一次部署要跑一段時間，剛設定好馬上點常常是 404。等一下再重新整理。'
          : '也是對的方向！首頁檔名一定要是 index.html，叫 home.html 或 首頁.html 都會 404。這兩件事是 404 的前兩大原因。', 'good');
        break;
      }
      wb.mistake();
      await wb.coach('先別重做。上線後出問題，先問兩件事：是不是還沒部署完？首頁檔名對不對？重做通常只是把同樣的問題再來一次。', 'warn');
    }
    view.state = 'live';
    paint();
    wb.tool('✅ 部署完成', ['網站已上線', '任何人用這個網址都打得開']);
    await wb.notify('👔 林經理', '打開了！我丟到部門群組囉 🎉');

    // 第 5 關：改一行再上線
    wb.mission(3);
    await wb.notify('👔 林經理', '標題可以改成「12 月部門聚餐報名」嗎？');
    for (;;) {
      const text = await wb.prompt({ placeholder: '把新需求告訴 Claude Code……', hints: ['請把網頁標題改成「12 月部門聚餐報名」'] });
      if (lib.matchNeeds(text, NEEDS.edit).missing.length === 0) break;
      await wb.claude('要改哪裡呢？可以直接說「把標題改成……」。');
    }
    wb.tool('✏️ 修改並上傳', ['~ 標題：12 月部門聚餐報名', '⬆️ git push（推上去就會自動重新上線）']);
    view.title = '🍱 12 月部門聚餐報名';
    paint();
    await wb.coach('接上 GitHub 之後，以後每次 push 網站就自動更新，不用再手動上傳檔案。', 'good');

    // 第 5 關後半：快取
    wb.mission(4);
    await wb.notify('👔 林經理', '我重新整理了，標題還是舊的耶？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'again', label: '再改一次，可能剛剛沒存到' },
        { value: 'cache', label: '請他強制重新整理（Ctrl／Cmd + Shift + R）' },
      ]);
      if (pick === 'cache') break;
      wb.mistake();
      await wb.coach('先別急著改。你剛剛看到的新標題是對的，代表檔案有更新——問題出在他那邊看到的是舊的暫存版本（快取）。', 'warn');
    }
    await wb.coach('瀏覽器為了開得快，會把舊檔案存起來。上線後「改了卻沒變」，十次有八次是快取。先強制重新整理，再懷疑自己改錯。', 'good');
    await wb.notify('👔 林經理', '出現了！謝啦 🙌');

    wb.finish([
      '要給別人用，就要「部署」：放到網路上，給一個網址',
      '挑剛好夠用的平台：純網頁用免費的靜態空間就好',
      '第一次 404，先等一下、再檢查檔名是不是 index.html',
      '接上 GitHub 之後，push 就自動更新',
      '「改了卻沒變」先想快取，強制重新整理再說',
    ]);
  }

  const api = { NEEDS, buildBrowser, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimM5 = api;
})(typeof self !== 'undefined' ? self : this);

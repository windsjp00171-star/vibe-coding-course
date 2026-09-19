/*
 * sims/m4-rescue.js — 單元 4 沉浸式任務「把改壞的網頁救回來」。
 * 五關：開工先存檔 → 寫清楚的存檔說明 → 改壞了回到上一個存檔 → 上傳 GitHub → 同事也改了要先下載。
 * NEEDS 與 buildBoard 是純邏輯，tests/workbench.test.js 會測。
 */
(function (root) {
  'use strict';

  const NEEDS = {
    // 存檔說明要看得出「改了什麼」，不能只寫「更新」
    message: [{ id: 'what', label: '寫出改了什麼', re: /(加|新增|改|修|換|刪|移除|調整|完成|建立)[^，。]{1,}/ }],
    fix: [{ id: 'revert', label: '說出要回到上一個存檔', re: /(回到|退回|還原|復原|上一個|昨天|之前|revert)/ }],
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 預覽面板畫的是「存檔點地圖」：上面是你的電腦，下面是 GitHub
  function buildBoard({ local, remote, broken }) {
    const dot = (c) => `<li class="${c.bad ? 'bad' : ''}"><b>${esc(c.msg)}</b><span>${esc(c.time)}</span></li>`;
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
      body{font-family:system-ui,"Noto Sans TC",sans-serif;margin:0;padding:18px;background:#f7f7fb;color:#1f1d2b}
      h2{font-size:.95rem;margin:0 0 8px;color:#4f46e5;letter-spacing:.04em}
      section{margin-bottom:18px}
      ul{list-style:none;margin:0;padding:0;border-left:3px solid #c7c5e6;padding-left:14px}
      li{position:relative;margin-bottom:10px;font-size:.88rem}
      li::before{content:"";position:absolute;left:-21px;top:4px;width:11px;height:11px;border-radius:50%;background:#4f46e5;border:2px solid #fff}
      li.bad::before{background:#d4483f}
      li b{display:block}
      li span{color:#6b6880;font-size:.78rem}
      .empty{color:#8b88a0;font-size:.85rem;border-left:3px dashed #c7c5e6;padding-left:14px}
      .warn{margin-top:10px;background:#fde8e6;color:#9c2d24;border-radius:10px;padding:8px 12px;font-size:.85rem;font-weight:700}
    </style></head><body>
      <section><h2>💻 你的電腦</h2>${local.length ? `<ul>${local.map(dot).join('')}</ul>` : '<p class="empty">還沒有任何存檔點</p>'}
      ${broken ? '<p class="warn">⚠️ 目前的檔案是壞的：版面全跑掉了</p>' : ''}</section>
      <section><h2>☁️ GitHub</h2>${remote.length ? `<ul>${remote.map(dot).join('')}</ul>` : '<p class="empty">還沒上傳過</p>'}</section>
    </body></html>`;
  }

  async function run(wb) {
    const lib = root.CourseLib;
    const state = { local: [], remote: [], broken: false };
    const paint = () => wb.setSite(buildBoard(state));

    await wb.story('📱 你自己', '明天要交的活動報名網頁做好了。晚上十點，你想再調一下版面……', '好，動手改');
    wb.setFolder('活動報名網頁');
    wb.addFile('📄 index.html');
    paint();

    // 第 1 關：動手前先存檔
    wb.mission(0);
    await wb.claude('要開始改囉。開工前，我建議先做一件事，你覺得是什麼？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'go', label: '直接改，反正等等就好了' },
        { value: 'copy', label: '另存一份 index-最終版-2.html' },
        { value: 'commit', label: '先存一個檔（commit）' },
      ]);
      if (pick === 'commit') break;
      wb.mistake();
      await wb.coach(pick === 'go'
        ? '先存檔只要 10 秒，改壞了卻可能要重做兩小時。Git 的存檔點就是保險。'
        : '「最終版、最終版2、真的最終版」這條路你走過吧？檔案會爆炸，而且不知道哪個是哪個。Git 幫你記住每一版和說明。', 'warn');
    }

    // 第 2 關：存檔說明要寫清楚
    wb.mission(1);
    await wb.claude('好，我來存檔。這次存檔的說明要寫什麼？（寫給未來的自己看）');
    for (;;) {
      const text = await wb.prompt({ placeholder: '例如：完成報名表單，加上葷素選項', hints: ['完成報名表單，加上葷素選項和送出按鈕'] });
      if (text.length >= 6 && lib.matchNeeds(text, NEEDS.message).missing.length === 0) {
        state.local.push({ msg: text.slice(0, 24), time: '今天 22:05' });
        break;
      }
      wb.mistake();
      await wb.coach('「更新」「修改一些東西」這種說明，三個月後的你會看不懂。寫「改了什麼」，例如「完成報名表單，加上葷素選項」。', 'warn');
    }
    wb.tool('💾 git commit', [`+ 存檔點：${state.local[0].msg}`]);
    paint();
    await wb.coach('這就是一個存檔點。檔案怎麼改都沒關係了，隨時回得來。', 'good');

    // 第 3 關：改壞了
    wb.mission(2);
    await wb.claude('好，我來調版面。改一下排版、換個顏色、再把選單移到上面……');
    await wb.notify('📱 你自己', '欸？怎麼整個版面都跑掉了，文字疊在一起……');
    state.broken = true;
    paint();
    for (;;) {
      const pick = await wb.choose([
        { value: 'redo', label: '認了，整頁重做一次' },
        { value: 'back', label: '回到剛剛那個存檔點' },
        { value: 'ask', label: '拜託 Claude 把它改回原樣' },
      ]);
      if (pick === 'back') break;
      wb.mistake();
      await wb.coach(pick === 'redo'
        ? '不用！你剛剛存過檔了，一句話就能回去，不用重做。'
        : '「改回原樣」很難，因為沒人記得原樣長什麼樣子。有存檔點就不用猜——直接回到那個時間點。', 'warn');
    }
    await wb.claude('沒問題，你要回到哪一個時間點？跟我說就好。');
    for (;;) {
      const text = await wb.prompt({ placeholder: '用自己的話說……', hints: ['請幫我回到上一個存檔點，剛剛那些版面改動都不要'] });
      if (lib.matchNeeds(text, NEEDS.fix).missing.length === 0) break;
      await wb.claude('你希望我怎麼做呢？可以說「回到上一個存檔」或「還原剛剛的修改」。');
    }
    const ok = await wb.permission('執行指令', 'git revert（回到上一個存檔點）', '這會把剛剛那些改動退掉，回到你存檔時的樣子。');
    if (!ok) { await wb.coach('沒關係，但這一步正是你要的。我們再做一次。', 'info'); await wb.permission('執行指令', 'git revert（回到上一個存檔點）', '退回剛剛的改動。'); }
    state.broken = false;
    state.local.push({ msg: '退回版面改動', time: '今天 22:40' });
    wb.tool('↩️ git revert', ['~ 版面改回存檔時的樣子']);
    paint();
    await wb.coach('救回來了。注意：它是「加一個新的存檔點把改動退掉」，不是把歷史擦掉——你做過的事都還看得到。', 'good');

    // 第 4 關：上傳
    wb.mission(3);
    await wb.claude('要不要把存檔點上傳到 GitHub？這樣電腦壞掉、或換一台電腦，東西都還在。');
    await wb.permission('上傳到 GitHub', 'git push', '把你電腦上的存檔點複製到雲端。');
    state.remote = state.local.slice();
    wb.tool('⬆️ git push', [`+ 上傳 ${state.remote.length} 個存檔點到 GitHub`]);
    paint();
    await wb.coach('現在兩邊一樣了。沒有 push 之前，GitHub 上看不到你的新改動——這是初學者最常誤會的地方。', 'good');

    // 第 5 關：同事也改了
    wb.mission(4);
    await wb.notify('👥 同事阿明', '我剛剛在 GitHub 上把頁尾的電話改成新的了，你記得同步喔！');
    state.remote.push({ msg: '更新頁尾電話（阿明）', time: '今天 23:10' });
    paint();
    for (;;) {
      const pick = await wb.choose([
        { value: 'push', label: '繼續改我的，改完直接 push' },
        { value: 'pull', label: '先把 GitHub 上的新版本下載下來（pull）' },
      ]);
      if (pick === 'pull') break;
      wb.mistake();
      await wb.boom('❌ 上傳被拒絕：GitHub 上有你電腦上沒有的新東西。');
      await wb.coach('這個錯誤訊息每個人都會遇到。意思是「雲端比你新」。解法固定：先 pull 下載，再 push 上傳。', 'warn');
    }
    wb.tool('⬇️ git pull', ['+ 取得：更新頁尾電話（阿明）']);
    state.local = state.remote.slice();
    paint();
    await wb.coach('習慣養成：開工前先 pull，收工後 push。多人一起做事時，這兩個動作可以省掉大部分的麻煩。', 'good');

    wb.finish([
      '開始改之前，先存一個檔',
      '存檔說明寫「改了什麼」，不要寫「更新」',
      '改壞了不用重做，回到上一個存檔點',
      '沒有 push，GitHub 上就看不到你的新版本',
      '同事也在改：先 pull 再 push',
    ]);
  }

  const api = { NEEDS, buildBoard, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimM4 = api;
})(typeof self !== 'undefined' ? self : this);

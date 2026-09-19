/*
 * sims/m2-party.js — 單元 2 沉浸式任務「週五聚餐報名頁」。
 * 劇本（run）交給 workbench.js 播放；NEEDS 與 buildSite 是純邏輯，tests/workbench.test.js 會測。
 * 每一關都對應單元裡教的一件事：選對資料夾、把需求說清楚、判斷允許與拒絕、親手驗收、再改一次。
 */
(function (root) {
  'use strict';

  // 學員打的話要講到哪些重點（同一個重點接受很多種說法）
  const NEEDS = {
    first: [
      { id: 'page', label: '要做報名頁', re: /(報名|表單|網頁|頁面|填寫|登記)/ },
      { id: 'diet', label: '可以選葷素', re: /(葷|素|飲食|吃什麼|餐點|忌口)/ },
    ],
    diet: [{ id: 'diet', label: '可以選葷素', re: /(葷|素|飲食|吃什麼|餐點|忌口)/ }],
    bug: [{ id: 'bug', label: '說出哪裡不對', re: /(送出|按鈕|提交|沒反應|沒有反應|沒動靜|按了|點了|不能按|按不了)/ }],
    deadline: [{ id: 'deadline', label: '加上截止日期', re: /(截止|期限|最晚|前報名|週三|星期三|禮拜三|日期)/ }],
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 預覽視窗裡的報名頁：跟著學員說過的需求長出來
  function buildSite({ diet, fixed, deadline }) {
    const onSubmit = fixed
      ? "document.getElementById('done').hidden=false;parent.postMessage({sim:'submit-ok'},'*');"
      : "parent.postMessage({sim:'submit-bug'},'*');";
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
      body{font-family:system-ui,"Noto Sans TC",sans-serif;margin:0;padding:22px;background:#fff8ef;color:#2b2118}
      h1{font-size:1.35rem;margin:0 0 4px} p{margin:0 0 14px;color:#6b5a48;font-size:.92rem}
      label{display:block;font-weight:700;margin:12px 0 6px} input[type=text]{width:100%;box-sizing:border-box;padding:9px 10px;border:1.5px solid #e2cfb8;border-radius:10px;font:inherit}
      .opt{display:flex;gap:14px;font-weight:500} .opt label{display:flex;gap:6px;margin:0;font-weight:500}
      button{margin-top:16px;width:100%;padding:11px;border:0;border-radius:999px;background:#e8743b;color:#fff;font:inherit;font-weight:800;cursor:pointer}
      .dead{display:inline-block;background:#fde2d2;color:#9a3d12;border-radius:8px;padding:3px 10px;font-size:.85rem;font-weight:700;margin-bottom:10px}
      #done{margin-top:14px;padding:10px;border-radius:10px;background:#dff3e6;color:#17663f;font-weight:700;text-align:center}
    </style></head><body>
      <h1>🍱 週五部門聚餐報名</h1><p>週五晚上 6:30．公司附近的餐廳</p>
      ${deadline ? '<span class="dead">📅 報名截止：本週三</span>' : ''}
      <label for="n">你的名字</label><input id="n" type="text" placeholder="例如：王小明">
      ${diet ? '<label>飲食</label><div class="opt"><label><input type="radio" name="d" checked> 葷食</label><label><input type="radio" name="d"> 素食</label></div>' : ''}
      <button type="button" onclick="${esc(onSubmit)}">送出報名</button>
      <div id="done" hidden>✅ 收到了！週五見 🎉</div>
    </body></html>`;
  }

  // ---------- 劇本 ----------
  async function run(wb) {
    const site = { diet: false, fixed: false, deadline: false };
    const lib = root.CourseLib;

    await wb.story('👔 林經理', '週五部門聚餐，今天下班前幫我做一個線上報名頁好嗎？大家要能填名字，還要能選葷素，有同事吃素。', '收到！');

    // 第 1 關：選資料夾
    wb.mission(0);
    await wb.claude('嗨，我是 Claude Code。開工前，先選一個資料夾讓我在裡面工作。我只會動這個資料夾裡的東西。');
    for (;;) {
      const pick = await wb.choose([
        { value: 'c', label: '💽 整個 C 槽' },
        { value: 'desk', label: '🖥️ 桌面' },
        { value: 'new', label: '📁 新建一個「聚餐報名」資料夾' },
      ]);
      if (pick === 'new') break;
      wb.mistake();
      await wb.coach(pick === 'c'
        ? '等等！選整個 C 槽，等於把整台電腦的鑰匙交給它，改錯東西會很麻煩。一個專案就開一個專門的資料夾。'
        : '桌面上通常堆了很多無關的檔案，它可能會去讀、甚至改到。一個專案就開一個專門的資料夾。', 'warn');
    }
    wb.setFolder('聚餐報名');
    wb.addFile('📁 聚餐報名/');

    // 第 2 關：用自己的話說需求
    wb.mission(1);
    await wb.claude('好了！想做什麼，直接用一般的話告訴我就好。');
    for (;;) {
      const text = await wb.prompt({ placeholder: '用自己的話告訴 Claude Code 要做什麼……', hints: ['幫我做一個部門聚餐的報名網頁，要能填名字、選葷食或素食'] });
      const r = lib.matchNeeds(text, NEEDS.first);
      if (!r.met.includes('page')) {
        await wb.claude('你想要我做什麼呢？可以說說要做給誰用、上面要有哪些欄位。');
        continue;
      }
      site.diet = r.met.includes('diet');
      break;
    }
    await wb.claude('了解，我來做一個報名頁。');

    // 第 3 關：允許嗎？
    wb.mission(2);
    for (;;) {
      const ok = await wb.permission('建立新檔案', 'index.html（報名頁）', '這是它要幫你建立的網頁，在你選的資料夾裡。');
      if (ok) break;
      await wb.coach('拒絕也沒關係，它不會動手。不過這一步正是你要它做的事，可以放心允許。', 'info');
      await wb.claude('好的，我先不建立。需要的話我再問一次。');
    }
    wb.tool('✏️ 建立 index.html', ['+ 標題：週五部門聚餐報名', '+ 名字欄位', site.diet ? '+ 葷食／素食選項' : '', '+ 送出按鈕'].filter(Boolean));
    wb.addFile('📄 index.html');
    wb.setSite(buildSite(site));

    if (!site.diet) {
      await wb.notify('👔 林經理', '我看了一下，怎麼沒有葷素可以選？有同事吃素喔。');
      await wb.coach('這就是「需求沒說清楚」：AI 只會做你講到的東西。直接跟它說少了什麼就好。', 'info');
      for (;;) {
        const text = await wb.prompt({ placeholder: '告訴 Claude Code 要補什麼……', hints: ['請加上葷食／素食的選項'] });
        if (lib.matchNeeds(text, NEEDS.diet).missing.length === 0) break;
        await wb.claude('要補上什麼呢？可以直接說欄位名稱，例如「要能選……」。');
      }
      site.diet = true;
      wb.tool('✏️ 修改 index.html', ['+ 葷食／素食選項']);
      wb.setSite(buildSite(site));
    }

    await wb.claude('順便整理一下：你的電腦暫存檔好像很多，我來幫你清一清。');
    for (;;) {
      const ok = await wb.permission('執行指令', 'rm -rf ~/*', '看不懂在做什麼？');
      if (!ok) {
        await wb.coach('拒絕得好！這行指令會把你「家目錄」裡的檔案全部刪掉，而且不會進資源回收筒。看不懂的指令，一律先拒絕，再請它用白話解釋。', 'good');
        break;
      }
      wb.mistake();
      await wb.boom('💥（模擬）你的文件、照片、下載資料夾……全部被刪掉了，資源回收筒裡也找不到。');
      await wb.coach('還好這只是模擬。rm -rf 是「強制刪除、不問第二次」。看不懂的指令先拒絕，請它用白話解釋在做什麼。我們倒帶一次：', 'warn');
    }
    await wb.claude('好的，不清了。抱歉，那個指令太危險，不該建議你執行。');

    // 第 4 關：親手驗收
    wb.mission(3);
    await wb.claude('✅ 報名頁做好了！可以交給林經理了。');
    const trust = await wb.choose([
      { value: 'send', label: '📨 直接把連結傳給林經理' },
      { value: 'test', label: '🧪 自己先填一次試試看' },
    ]);
    if (trust === 'send') {
      wb.mistake();
      await wb.notify('👔 林經理', '我填好名字按「送出報名」，怎麼都沒反應？😅');
      await wb.coach('AI 說「做好了」，不代表真的能用。以後交出去之前，一定自己先試一次。現在去右邊的預覽，親手填填看。', 'warn');
    } else {
      await wb.coach('好習慣！AI 說做好了，也要自己試一次。到右邊的預覽填填看，按「送出報名」。', 'good');
    }
    await wb.waitSite('submit-bug', '👉 到右邊預覽填一次，按「送出報名」');
    await wb.coach('按下去什麼都沒發生，這就是 bug。回去告訴 Claude Code：你做了什麼、看到什麼。', 'info');
    for (;;) {
      const text = await wb.prompt({ placeholder: '告訴 Claude Code 發生了什麼……', hints: ['我按了「送出報名」，但是沒有任何反應，請幫我修好'] });
      if (lib.matchNeeds(text, NEEDS.bug).missing.length === 0) break;
      await wb.claude('哪裡不對呢？你按了什麼、原本期待看到什麼、實際看到什麼？說得越具體，我越快找到問題。');
    }
    await wb.claude('找到了，送出按鈕沒有接上動作。我修一下。');
    site.fixed = true;
    wb.tool('✏️ 修改 index.html', ['~ 送出按鈕：送出後顯示「收到了」']);
    wb.setSite(buildSite(site));
    await wb.waitSite('submit-ok', '👉 再到右邊預覽試一次');
    await wb.coach('成功了！「說清楚問題 → 讓它修 → 自己再試一次」，這個循環你之後會用很多次。', 'good');

    // 第 5 關：需求改了
    wb.mission(4);
    await wb.notify('👔 林經理', '太好了！可以再加一行「報名截止：本週三」嗎？');
    for (;;) {
      const text = await wb.prompt({ placeholder: '把林經理的新需求告訴 Claude Code……', hints: ['請在標題下面加上「報名截止：本週三」'] });
      if (lib.matchNeeds(text, NEEDS.deadline).missing.length === 0) break;
      await wb.claude('要加什麼呢？可以直接把林經理的話轉告給我。');
    }
    site.deadline = true;
    wb.tool('✏️ 修改 index.html', ['+ 報名截止：本週三']);
    wb.setSite(buildSite(site));
    await wb.notify('👔 林經理', '完美，謝啦！我丟到部門群組了 🙌');
    wb.finish([
      '開一個專門的資料夾給它工作',
      '用自己的話把需求說清楚，漏了就補',
      '看得懂才允許，看不懂先拒絕',
      'AI 說做好了，自己一定要試一次',
      '需求改了，直接跟它說',
    ]);
  }

  const api = { NEEDS, buildSite, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimM2 = api;
})(typeof self !== 'undefined' ? self : this);

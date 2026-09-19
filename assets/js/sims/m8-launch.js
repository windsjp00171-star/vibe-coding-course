/*
 * sims/m8-launch.js — 單元 8 沉浸式任務「上線前 10 分鐘」。
 * 四關：跑一次體檢 → 幫每個發現分輕重 → 先修會出事的 → 自己再驗一次才上線。
 * 教學點：不是每個警告都要立刻修，但「會外洩、會被塞壞、會刪資料」的一定要。
 */
(function (root) {
  'use strict';

  const FINDINGS = [
    { id: 'key', icon: '🔑', title: 'notify.py 第 2 行有一串寫死的金鑰', now: true,
      why: '程式一上線就等於公開。金鑰外洩會被拿去刷你的額度（單元 6 演過一次）。' },
    { id: 'input', icon: '📝', title: '報名表單沒有檢查輸入內容', now: true,
      why: '別人可以在姓名欄塞入程式碼或超長文字，輕則版面壞掉，重則資料庫被翻出來。' },
    { id: 'log', icon: '🖨️', title: '有 12 行 console.log 忘了拿掉', now: false,
      why: '不會出事，但會把內部資訊印在瀏覽器主控台，而且很吵。上線後找時間清掉就好。' },
    { id: 'pkg', icon: '📦', title: '用到一個沒聽過的套件 form-magic-pro', now: true,
      why: 'AI 有時會編出不存在的套件名，而壞人會搶註冊同名的有毒套件。上線前一定要查證。' },
  ];

  const NEEDS = {
    fix: [{ id: 'fix', label: '說出要先修哪些', re: /(修|改|處理|拿掉|移除|換成|驗證|檢查)/ }],
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 預覽面板：一張體檢報告，狀態會跟著學員的處理更新
  function buildReport({ done, tested }) {
    const row = (f) => {
      const fixed = done.includes(f.id);
      return `<li class="${fixed ? 'ok' : f.now ? 'bad' : 'warn'}">
        <b>${f.icon} ${esc(f.title)}</b>
        <span>${fixed ? '已處理' : f.now ? '上線前一定要修' : '可以上線後再處理'}</span></li>`;
    };
    const blocking = FINDINGS.filter((f) => f.now && !done.includes(f.id)).length;
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
      body{font-family:system-ui,"Noto Sans TC",sans-serif;margin:0;padding:18px;background:#fbfaf7;color:#231f2e}
      h2{font-size:1rem;margin:0 0 4px}
      p.sub{margin:0 0 14px;color:#6c6780;font-size:.82rem}
      ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
      li{border-radius:10px;padding:9px 12px;font-size:.85rem;border:1.5px solid}
      li b{display:block;font-weight:800}
      li span{font-size:.78rem}
      li.bad{background:#fdeceb;border-color:#e7a19b;color:#8c2f26}
      li.warn{background:#fdf4e3;border-color:#e6cb95;color:#7a5510}
      li.ok{background:#e7f6ee;border-color:#9ed7ba;color:#166b46}
      .verdict{margin-top:14px;border-radius:10px;padding:10px 12px;font-weight:800;text-align:center}
      .no{background:#4a1d1b;color:#ffd7d2}
      .go{background:#166b46;color:#e7f6ee}
    </style></head><body>
      <h2>🩺 上線前體檢報告</h2><p class="sub">報名表單．${new Date().getFullYear()} 年度活動</p>
      <ul>${FINDINGS.map(row).join('')}</ul>
      <div class="verdict ${blocking ? 'no' : 'go'}">${blocking ? `還不能上線：${blocking} 個項目會出事` : tested ? '✅ 可以上線' : '修好了，但你還沒自己測過'}</div>
    </body></html>`;
  }

  async function run(wb) {
    const lib = root.CourseLib;
    const view = { done: [], tested: false };
    const paint = () => wb.setSite(buildReport(view));

    await wb.story('👔 林經理', '報名表單今天下班前要開放喔，我已經把連結貼到群組了！', '等等，先檢查一下');
    wb.setFolder('活動報名系統');
    wb.addFile('📄 index.html');
    wb.addFile('📄 notify.py');

    // 第 1 關：先跑體檢
    wb.mission(0);
    await wb.claude('上線前要不要我先做一次全專案檢查？我會看有沒有寫死的祕密、沒驗證的輸入、可疑的套件。');
    const go = await wb.permission('執行檢查', '全專案安全與品質體檢', '只讀取檔案，不會修改任何東西。');
    if (!go) { await wb.coach('這一步只讀不寫，很安全，而且正是你需要的。我們再來一次。', 'info'); await wb.permission('執行檢查', '全專案安全與品質體檢', '只讀取，不修改。'); }
    wb.tool('🩺 體檢完成', ['掃描 18 個檔案', '發現 4 個項目需要你判斷']);
    paint();

    // 第 2 關：分輕重
    wb.mission(1);
    await wb.coach('重點來了：不是每個警告都要立刻修。你要判斷的是「這個會不會出事」。', 'info');
    for (const f of FINDINGS) {
      for (;;) {
        await wb.claude(`${f.icon} ${f.title}`);
        const pick = await wb.choose([
          { value: 'now', label: '上線前一定要修' },
          { value: 'later', label: '可以上線後再處理' },
        ]);
        if ((pick === 'now') === f.now) { await wb.coach(f.why, 'good'); break; }
        wb.mistake();
        await wb.coach(f.now
          ? `這個不能拖。${f.why}`
          : `這個沒那麼嚴重。${f.why}　把力氣留給會出事的項目。`, 'warn');
      }
    }

    // 第 3 關：修掉會出事的
    wb.mission(2);
    await wb.claude('那我先處理哪些？用你自己的話告訴我。');
    for (;;) {
      const text = await wb.prompt({ placeholder: '告訴 Claude Code 先修什麼……', hints: ['先修金鑰、表單輸入檢查和那個可疑套件，console.log 上線後再清'] });
      if (lib.matchNeeds(text, NEEDS.fix).missing.length === 0) break;
      await wb.claude('你想先處理哪幾項呢？可以直接說「先修金鑰和輸入檢查」。');
    }
    wb.tool('✏️ 修改 4 個檔案', ['~ 金鑰改讀環境變數', '~ 表單加上長度與格式檢查', '~ 移除可疑套件，改用內建做法']);
    view.done = ['key', 'input', 'pkg'];
    paint();
    await wb.claude('三個會出事的項目都處理好了。console.log 依你的判斷留到上線後清。');

    // 第 4 關：自己驗一次
    wb.mission(3);
    await wb.claude('✅ 我這邊測試都通過，可以上線了。');
    for (;;) {
      const pick = await wb.choose([
        { value: 'ship', label: '那就上線，通知林經理' },
        { value: 'test', label: '我自己先填一次報名表' },
      ]);
      if (pick === 'test') break;
      wb.mistake();
      await wb.notify('👔 林經理', '我填了報名表，按送出出現一串英文錯誤……是不是壞了？😅');
      await wb.coach('「我測試都通過」是 AI 說的。真正算數的是你自己用一次。上線前最後一步永遠是親手驗收。', 'warn');
    }
    view.tested = true;
    paint();
    wb.tool('🧪 你親手測試', ['填寫姓名、選葷素、按送出', '✓ 出現「收到了」', '✓ 後台看得到這筆報名']);
    await wb.coach('這樣才算完成。體檢工具負責找出你想不到的問題，你負責判斷輕重、並且親手驗收。', 'good');
    await wb.notify('👔 林經理', '收到報名了，太好了！辛苦你 🙌');

    wb.finish([
      '上線前跑一次全專案體檢',
      '不是每個警告都要立刻修，先問「會不會出事」',
      '會外洩、會被塞壞、來路不明的套件：一定先修',
      'console.log 這類小問題，可以排到上線後',
      'AI 說測試通過不算數，自己走一次流程才算',
    ]);
  }

  const api = { FINDINGS, NEEDS, buildReport, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimM8 = api;
})(typeof self !== 'undefined' ? self : this);

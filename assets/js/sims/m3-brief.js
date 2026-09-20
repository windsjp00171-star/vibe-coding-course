/*
 * sims/m3-brief.js — 單元 3 沉浸式任務「同一個需求，講兩次」。
 * 五關：模糊指令做出歪東西 → 用五個零件重講 → 大改動先規劃 → 同一個錯誤修三次要停 → 收工紙條。
 * 指令好不好，用 lib.checkPrompt 的五個零件判斷（和單元 3 的指令健檢同一套規則）。
 */
(function (root) {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 預覽面板：AI 做出來的東西。vague = 只聽到一半的版本
  function buildResult({ stage, parts }) {
    const rows = (parts || []).map((p) => `<li class="${p.ok ? 'ok' : 'no'}">${esc(p.label)}</li>`).join('');
    const body = {
      empty: '<p class="hint">還沒開始。跟 Claude Code 說你要什麼，它做出來的東西會顯示在這裡。</p>',
      vague: `<h1>會議記錄系統</h1>
        <p class="warn">⚠️ 它猜了很多你沒講的東西：</p>
        <ul class="guess"><li>做成需要註冊登入的網站</li><li>用你沒聽過的框架</li><li>資料存在它自己建的資料庫</li><li>介面全是英文</li></ul>
        <p class="hint">你只是想要一頁「貼上錄音逐字稿，整理成重點」而已。</p>`,
      good: `<h1>📝 會議記錄整理小幫手</h1>
        <p class="sub">貼上逐字稿 → 產生重點、待辦、負責人</p>
        <div class="box">會議重點（3 點）<br>待辦事項（含負責人）<br>下次會議時間</div>
        <p class="ok">✅ 一個檔案、打開就能用、中文介面</p>`,
      plan: `<h1>它先給你計畫</h1>
        <ol class="plan"><li>建立 index.html，放貼上逐字稿的輸入框</li><li>加上「整理」按鈕與結果區</li><li>加上複製結果的按鈕</li><li>手機版排版</li></ol>
        <p class="hint">你同意之後它才動手。</p>`,
    }[stage];
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
      body{font-family:system-ui,"Noto Sans TC",sans-serif;margin:0;padding:20px;background:#f7f6fb;color:#241f33}
      h1{font-size:1.25rem;margin:0 0 6px}
      .sub{color:#6b6880;font-size:.88rem;margin:0 0 12px}
      .hint{color:#6b6880;font-size:.86rem;line-height:1.8}
      .warn{color:#9a3d12;font-weight:700;font-size:.9rem;margin:6px 0}
      .ok{color:#17663f;font-weight:700;font-size:.88rem;background:#e7f6ee;border-radius:8px;padding:7px 10px;display:inline-block}
      .guess{margin:0 0 10px;padding-left:1.1em;color:#8a3b1c;font-size:.86rem;line-height:1.9}
      .plan{padding-left:1.2em;font-size:.88rem;line-height:1.9}
      .box{background:#fff;border:1.5px dashed #cfcbe6;border-radius:12px;padding:14px;font-size:.86rem;line-height:2;color:#4a4560;margin-bottom:12px}
      ul.parts{list-style:none;margin:14px 0 0;padding:0;font-size:.82rem}
      ul.parts li{padding:3px 0}
      ul.parts li.ok::before{content:"✅ "}
      ul.parts li.no::before{content:"⬜ "}
      ul.parts li.no{color:#8a87a0}
    </style></head><body>${body}${rows ? `<ul class="parts">${rows}</ul>` : ''}</body></html>`;
  }

  async function run(wb) {
    const lib = root.CourseLib;
    const view = { stage: 'empty', parts: null };
    const paint = () => wb.setSite(buildResult(view));

    await wb.story('🗓️ 你自己', '每週的部門會議都要寫紀錄，寫到懷疑人生。做一個小工具：貼上逐字稿，自動整理成重點和待辦。', '開始交代');
    wb.setFolder('會議小幫手');
    paint();

    // 第 1 關：先用模糊的說法
    wb.mission(0);
    await wb.claude('嗨，今天要做什麼？');
    await wb.coach('先故意講得模糊一點，看看會發生什麼事。等一下我們再重講一次。', 'info');
    await wb.prompt({ placeholder: '隨便講一句，例如：幫我做一個會議記錄系統', hints: ['幫我做一個會議記錄系統'] });
    await wb.claude('好的！我來做一個完整的會議記錄系統。');
    wb.tool('✏️ 建立 12 個檔案', ['+ 使用者註冊與登入', '+ 資料庫設定', '+ 後端 API', '+ 英文介面', '…還有 8 個檔案']);
    view.stage = 'vague';
    paint();
    await wb.notify('🤯 你自己', '等等，我只是想貼逐字稿整理重點，怎麼還要註冊帳號？');
    await wb.coach('它沒有猜錯，是你沒講。AI 會把你沒說的部分自己補滿——這就是為什麼「講清楚」是這門課最重要的技能。', 'warn');

    // 第 2 關：用五個零件重講
    wb.mission(1);
    await wb.claude('那我們重來。這次多告訴我一些：要做什麼、給誰用、有什麼限制、怎樣算完成。');
    for (;;) {
      const text = await wb.prompt({
        placeholder: '重新講一次，這次講清楚一點……',
        hints: ['幫我做一個單頁網頁，給不懂電腦的同事用：貼上會議逐字稿，整理成三個重點和待辦清單。只要一個 html 檔案、不要資料庫、不要登入，中文介面。做完告訴我怎麼打開'],
      });
      const check = lib.checkPrompt(text);
      view.parts = check.parts;
      paint();
      if (check.score >= 3) {
        await wb.coach(`這次講到了 ${check.score} 個零件（右邊打勾的部分）。零件不用湊滿五個，夠清楚就好。`, 'good');
        break;
      }
      wb.mistake();
      const missing = check.parts.filter((p) => !p.ok).slice(0, 2).map((p) => `「${p.label}」`).join('、');
      await wb.claude(`我大概懂了，但還有地方要猜。可以再補上 ${missing} 嗎？`);
    }
    wb.tool('✏️ 建立 index.html', ['+ 貼逐字稿的輸入框', '+ 整理成重點與待辦', '+ 中文介面、單一檔案']);
    view.stage = 'good';
    view.parts = null;
    paint();
    wb.addFile('📄 index.html');

    // 第 3 關：大改動先規劃
    wb.mission(2);
    await wb.notify('🗓️ 你自己', '好用！再加上：可以存檔、可以查以前的紀錄、可以匯出 Word。');
    await wb.claude('這三件事會動到不少地方。要我直接開始，還是先列計畫給你看？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'go', label: '直接開始做，快一點' },
        { value: 'plan', label: '先列計畫給我看' },
      ]);
      if (pick === 'plan') break;
      wb.mistake();
      await wb.boom('😵 它一口氣改了 9 個檔案，其中兩個地方跟你想的不一樣，而且你已經分不清哪個改動是哪一步做的。');
      await wb.coach('小改動可以直接做；「一次動好幾個地方」的需求，先看計畫再動手，你才有機會說「第 3 點不用做」。', 'warn');
    }
    view.stage = 'plan';
    paint();
    await wb.claude('這是我的計畫，你看要不要調整？');
    await wb.coach('這就是「先規劃再動手」。你在這一步花 30 秒，可以省下之後半小時的來回。', 'good');

    // 第 4 關：修三次還不對
    wb.mission(3);
    await wb.claude('匯出 Word 好了！……啊，你說匯出的檔案打不開嗎？我再修一次。');
    await wb.claude('（第二次修）還是打不開？我換個方式再試一次。');
    await wb.claude('（第三次修）奇怪，應該好了才對……');
    for (;;) {
      const pick = await wb.choose([
        { value: 'again', label: '叫它再修第四次' },
        { value: 'stop', label: '喊停，請它先說明為什麼會壞' },
        { value: 'quit', label: '放棄這個功能' },
      ]);
      if (pick === 'stop') break;
      wb.mistake();
      await wb.coach(pick === 'again'
        ? '同一個錯誤修三次還在，代表它猜錯方向了。再修第四次通常只會越改越亂，而且每一次都在花錢。'
        : '先別急著放棄。停下來問「為什麼會壞」，常常一問就找到真正的原因。', 'warn');
    }
    await wb.claude('讓我說明一下：我一直在改匯出的程式，但真正的問題可能是「檔案格式不對」。我先寫一個最小的測試確認……找到了，是格式標頭少了一段。');
    await wb.coach('這個習慣值錢：修兩次還不對，就要求它「先解釋原因、寫一個最小測試」，不要再盲修。', 'good');

    // 第 5 關：收工紙條
    wb.mission(4);
    await wb.claude('今天做得差不多了。要不要我寫一張收工紙條，你下次開新對話直接貼給我？');
    await wb.permission('建立檔案', 'NOTES.md（今天的收工紙條）', '記錄做到哪裡、還沒決定什麼、下一步做什麼。');
    wb.tool('📝 建立 NOTES.md', ['做到哪裡：貼逐字稿 → 整理重點，可存檔', '未決定：匯出格式要 Word 還是 PDF', '下一步：查詢舊紀錄', '注意：匯出的格式標頭不能少']);
    wb.addFile('📄 NOTES.md');
    await wb.coach('AI 的記憶有限（單元 0 的那張桌子）。把重要的決定寫進檔案，下次開新對話貼給它，就不用重講一遍。', 'good');

    wb.finish([
      '你沒講的部分，AI 會自己補——所以要講清楚',
      '五個零件不用湊滿，講到三個通常就夠了',
      '一次動好幾個地方的需求，先看計畫再動手',
      '同一個錯誤修三次還在，喊停問原因',
      '收工前寫一張紙條，下次開新對話直接貼',
    ]);
  }

  const api = { buildResult, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimM3 = api;
})(typeof self !== 'undefined' ? self : this);

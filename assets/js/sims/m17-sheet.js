/*
 * sims/m17-sheet.js — 單元 17 沉浸式任務「AI 幫你整理，但少了兩列」。
 * 四關：先遮個資 → 下一段不會讓它亂編的指令 → 核對筆數發現少兩列 → 金額交給公式。
 * 最重要的一關是第三關：錯誤不會報錯，只能靠核對總筆數抓出來。
 */
(function (root) {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TOTAL_ROWS = 42;
  const MISSING_ROWS = 2;

  const NEEDS = {
    rule: [{ id: 'nofake', label: '要求不要自己編', re: /(不要(自己)?編|不確定|待確認|不要猜|標(出|示)|如實)/ }],
  };

  // 預覽面板：整理出來的表格（rows 是示意用的前幾列）
  function buildSheet({ stage, count }) {
    const sample = [
      ['王小明', '2026-03-05', '0912345678', '1,200'],
      ['李美美', '2026-03-05', '0912345679', '800'],
      ['陳大文', '2026-03-06', '0933222111', '1,200'],
      ['（待確認）', '2026-03-06', '0955111222', '800'],
    ];
    const body = {
      raw: '<p class="hint">原始資料：42 列，日期五種寫法、電話有全形、名字前後有空白，還有幾格是空的。</p>',
      masked: '<p class="ok">✅ 個資已遮成代號，可以貼給 AI 了</p><p class="hint">整理完再把代號換回真實資料。</p>',
      table: `<table><thead><tr><th>姓名</th><th>日期</th><th>電話</th><th>金額</th></tr></thead>
        <tbody>${sample.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}
        <tr class="more"><td colspan="4">……其他 ${count - sample.length} 列</td></tr></tbody></table>
        <p class="count ${count < TOTAL_ROWS ? 'bad' : 'ok'}">整理後共 <b>${count}</b> 列${count < TOTAL_ROWS ? `（原始有 ${TOTAL_ROWS} 列）` : ''}</p>`,
      formula: `<p class="ok">✅ 金額交給試算表公式</p><pre>=SUM(D2:D${TOTAL_ROWS + 1})</pre>
        <p class="hint">公式每次算的結果都一樣，AI 每次可能不一樣。</p>`,
    }[stage];
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
      body{font-family:system-ui,"Noto Sans TC",sans-serif;margin:0;padding:16px;background:#fbfaf7;color:#241f2e;font-size:.86rem}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd9ea;padding:5px 7px;text-align:left}
      th{background:#f1eefb;font-size:.8rem}
      tr.more td{text-align:center;color:#807c95;background:#f7f6fb}
      .count{margin:12px 0 0;font-weight:800}
      .count.bad{color:#b3261e}.count.ok{color:#17663f}
      .hint{color:#6b6880;line-height:1.8}
      .ok{color:#17663f;font-weight:700;background:#e7f6ee;border-radius:8px;padding:7px 10px;display:inline-block}
      pre{background:#fff;border:1px solid #ddd9ea;border-radius:8px;padding:10px;font-size:.85rem}
    </style></head><body>${body}</body></html>`;
  }

  async function run(wb) {
    const lib = root.CourseLib;
    const view = { stage: 'raw', count: TOTAL_ROWS };
    const paint = () => wb.setSite(buildSheet(view));

    await wb.story('📊 你自己', '活動報名表收了 42 筆，格式亂七八糟：日期五種寫法、電話有全形、名字前後有空白。主管一小時後要統計。', '交給 AI 整理');
    wb.setFolder('活動報名整理');
    wb.addFile('📄 報名原始檔.csv');
    paint();

    // 第 1 關：先遮個資
    wb.mission(0);
    await wb.claude('我可以幫你整理。要直接把整份資料貼給我嗎？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'paste', label: '直接貼，反正是內部資料' },
        { value: 'mask', label: '先把電話和 Email 換成代號再貼' },
        { value: 'no', label: '算了，我自己慢慢整理' },
      ]);
      if (pick === 'mask') break;
      wb.mistake();
      await wb.coach(pick === 'paste'
        ? '你無法控制這份對話會被誰看到、留存多久。個資送出去就收不回來了（單元 6 講過）。'
        : '不用因為有個資就放棄。遮成代號就可以安心用，整理完再換回來。', 'warn');
    }
    wb.tool('🎭 遮蔽個資', ['電話 → [手機號碼]', 'Email → [Email]', '（對照表只留在你電腦上）']);
    view.stage = 'masked';
    paint();

    // 第 2 關：下一段不會亂編的指令
    wb.mission(1);
    await wb.claude('好，遮好了。你要我怎麼整理？');
    for (;;) {
      const text = await wb.prompt({
        placeholder: '告訴它要整理成什麼樣子……',
        hints: ['整理成表格：姓名、日期、電話、金額。日期統一 YYYY-MM-DD，缺年份的補今年並標註。看不懂或缺漏的填「待確認」，不要自己編。最後告訴我總共幾列'],
      });
      if (lib.matchNeeds(text, NEEDS.rule).missing.length === 0) break;
      wb.mistake();
      await wb.coach('少了最重要的一句：「不確定的標成待確認，不要自己編」。沒有這句，它會把空白欄位猜一個看起來合理的值填進去，而你看不出來。', 'warn');
    }
    wb.tool('🧹 整理中', ['統一日期格式', '電話轉半形', '去掉前後空白', '缺漏標「待確認」']);
    view.stage = 'table';
    view.count = TOTAL_ROWS - MISSING_ROWS;
    paint();
    await wb.claude(`整理好了！表格如右邊所示，看起來很整齊。`);

    // 第 3 關：核對筆數
    wb.mission(2);
    for (;;) {
      const pick = await wb.choose([
        { value: 'ship', label: '很整齊，直接交給主管' },
        { value: 'spot', label: '抽查頭尾各一筆' },
        { value: 'count', label: '先核對總筆數對不對' },
      ]);
      if (pick === 'count') break;
      if (pick === 'spot') {
        wb.mistake();
        await wb.coach('抽查是對的習慣，但這次抽到的兩筆都正確——所以你會以為沒問題。先數總筆數，才抓得到「整列不見」。', 'warn');
        continue;
      }
      wb.mistake();
      await wb.boom('😰（模擬）主管拿去核銷時發現：有兩位同事明明報名了，名單上卻找不到人。');
      await wb.coach('資料整理的錯誤不會報錯。看起來越整齊，越要核對數量。', 'warn');
    }
    await wb.claude('我數了一下：整理後是 40 列。');
    await wb.notify('📊 你自己', '原始檔是 42 列，少了 2 列！');
    await wb.coach('抓到了。AI 處理長資料時，最常見的錯誤就是默默少幾列——通常是格式特別奇怪的那幾筆。', 'good');
    await wb.claude('抱歉，有兩列的日期格式我沒看懂，就跳過了。我把它們補回來，並標成「待確認」。');
    wb.tool('✏️ 補回遺漏', ['+ 2 列（日期標「待確認」）', '總計 42 列']);
    view.count = TOTAL_ROWS;
    paint();

    // 第 4 關：金額交給公式
    wb.mission(3);
    await wb.claude('要不要我順便幫你算金額總和？');
    for (;;) {
      const pick = await wb.choose([
        { value: 'ai', label: '好啊，你直接算給我' },
        { value: 'formula', label: '不用，幫我寫一條試算表公式就好' },
      ]);
      if (pick === 'formula') break;
      wb.mistake();
      await wb.coach('它會給你一個數字，而且看起來很肯定——但它是用猜的，不是用算的，42 筆裡錯一筆你也看不出來。要算錢，用公式。', 'warn');
    }
    view.stage = 'formula';
    paint();
    wb.tool('🧮 產生公式', ['=SUM(D2:D43)', '（貼進試算表，數字由試算表計算）']);
    await wb.coach('分工記起來：格式和分類交給 AI，計算交給公式。這條界線在單元 0 講過——它是猜字的，不是計算機。', 'good');

    wb.finish([
      '貼資料給 AI 之前，先把個資換成代號',
      '指令一定要加「不確定的標待確認，不要自己編」',
      '整理完先核對總筆數，再抽查最奇怪的那一列',
      '少掉的資料不會報錯，只能靠數量核對抓出來',
      '格式交給 AI，算錢交給試算表公式',
    ]);
  }

  const api = { NEEDS, buildSheet, TOTAL_ROWS, MISSING_ROWS, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimM17 = api;
})(typeof self !== 'undefined' ? self : this);

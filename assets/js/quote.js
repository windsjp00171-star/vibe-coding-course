/*
 * quote.js — 企業內訓報價單（講師自己用）。
 * 填的內容只存在這台電腦的瀏覽器（localStorage），不會上傳，也不會進版控。
 */
(function () {
  'use strict';
  const { esc, $, $$ } = window.Course;
  const KEY = 'vibe-course-quote';

  // 每個課程方案預設會出現的費用項目；金額留空就不會印出來
  const PLANS = {
    security: {
      name: 'AI 資安意識（半日場，3 小時）',
      desc: '全體同仁適用，不需電腦。含兩段模擬演練與分組工作坊，結訓帶走一條可公告的匯款查核規則。',
      lines: [
        ['course', '課程費用（半日 3 小時）', ''],
        ['custom', '客製化（換成貴單位的流程與案例）', ''],
        ['material', '講義（電子檔，可全單位分送）', ''],
        ['travel', '交通費', ''],
      ],
    },
    core: {
      name: 'Vibe Coding 實戰課．必修（三個半天，課中共約 6.5 小時）',
      desc: '翻轉教室：課前自學線上教材，課中實作。結訓時每位學員有一個真的上線的小工具與結業證書。',
      lines: [
        ['course', '課程費用（三個半天）', ''],
        ['custom', '客製化（改用貴單位的實際流程當練習題）', ''],
        ['material', '教材與學習平台帳號（含課後持續使用）', ''],
        ['support', '課後 30 天問答支援', ''],
        ['travel', '交通費', ''],
      ],
    },
    core2: {
      name: 'Vibe Coding 實戰課．精簡（兩個半天，課中共約 6 小時）',
      desc: '必修內容濃縮為兩個半天，成果發表改為線上收尾。適合時間有限的單位。',
      lines: [
        ['course', '課程費用（兩個半天）', ''],
        ['custom', '客製化（改用貴單位的實際流程當練習題）', ''],
        ['material', '教材與學習平台帳號（含課後持續使用）', ''],
        ['travel', '交通費', ''],
      ],
    },
    custom: {
      name: '',
      desc: '',
      lines: [
        ['course', '課程費用', ''],
        ['custom', '客製化', ''],
        ['material', '教材', ''],
        ['travel', '交通費', ''],
      ],
    },
  };

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = (data) => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* 無痕模式：不存就好 */ } };
  let data = load();
  const money = (n) => `NT$ ${Number(n).toLocaleString('zh-TW')}`;
  const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };

  function plan() { return PLANS[data.course || 'security']; }

  function renderLines() {
    const lines = plan().lines;
    $('[data-q-lines]').innerHTML = lines.map(([id, label]) => `
      <label class="qt-line"><span>${esc(label)}</span>
        <input type="text" inputmode="numeric" data-line="${id}" value="${esc(data[`line_${id}`] || '')}" placeholder="金額（留空＝不列出）"></label>`).join('');
  }

  function renderPaper() {
    const p = plan();
    const title = data.course === 'custom' ? (data.customName || '（課程名稱）') : p.name;
    const rows = p.lines
      .map(([id, label]) => [label, num(data[`line_${id}`])])
      .filter(([, amount]) => amount > 0);
    const subtotal = rows.reduce((n, [, amount]) => n + amount, 0);
    const discount = num(data.discount);
    const total = Math.max(0, subtotal - discount);
    const today = new Date().toLocaleDateString('zh-TW');

    $('[data-q-paper]').innerHTML = `
      <header class="qt-head">
        <div>
          <p class="qt-eyebrow">教育訓練報價單</p>
          <h1>${esc(title)}</h1>
          <p class="qt-desc">${esc(data.course === 'custom' ? (data.note || '') : p.desc)}</p>
        </div>
        <div class="qt-meta">
          <p>報價日期：${esc(today)}</p>
          <p>講師：${esc(data.teacher || '（講師姓名）')}</p>
          <p>${esc(data.myContact || '')}</p>
        </div>
      </header>

      <table class="qt-info">
        <tbody>
          <tr><th>單位名稱</th><td>${esc(data.client || '（待填）')}</td><th>聯絡人</th><td>${esc(data.contact || '—')}</td></tr>
          <tr><th>場次日期</th><td>${esc(data.date || '（依雙方確認）')}</td><th>預計人數</th><td>${esc(data.people || '—')}</td></tr>
          <tr><th>地點</th><td colspan="3">${esc(data.place || '（依雙方確認）')}</td></tr>
        </tbody>
      </table>

      <table class="qt-lines-out">
        <thead><tr><th>項目</th><th class="right">金額</th></tr></thead>
        <tbody>
          ${rows.length ? rows.map(([label, amount]) => `<tr><td>${esc(label)}</td><td class="right">${money(amount)}</td></tr>`).join('')
        : '<tr><td colspan="2" class="muted">（尚未填入任何金額）</td></tr>'}
          ${discount > 0 ? `<tr class="qt-discount"><td>${esc(data.discountNote || '優惠')}</td><td class="right">－${money(discount)}</td></tr>` : ''}
        </tbody>
        <tfoot><tr><th>合計</th><th class="right">${money(total)}</th></tr></tfoot>
      </table>

      ${data.note && data.course !== 'custom' ? `<div class="qt-note"><b>備註</b><p>${esc(data.note)}</p></div>` : ''}

      <div class="qt-terms">
        <p><b>報價有效期</b>${esc(data.valid || '')}</p>
        <p><b>付款方式</b>${esc(data.pay || '')}</p>
        <p class="muted">本報價單金額未稅。確認後將另行提供課前訪談時間，以便調整課程案例。</p>
      </div>

      <footer class="qt-foot">
        <span>Vibe Coding 實戰課</span>
        <span>課程介紹：windsjp00171-star.github.io/vibe-coding-course/enroll.html</span>
      </footer>`;
  }

  function render() { renderLines(); renderPaper(); }

  document.addEventListener('input', (e) => {
    const field = e.target.closest('[data-q]');
    const line = e.target.closest('[data-line]');
    if (field) {
      data = { ...data, [field.dataset.q]: field.value };
      if (field.dataset.q === 'course') { save(data); render(); return; }
    } else if (line) {
      data = { ...data, [`line_${line.dataset.line}`]: line.value };
    } else return;
    save(data);
    renderPaper();
  });

  $('[data-q-print]').addEventListener('click', () => window.print());
  $('[data-q-reset]').addEventListener('click', () => {
    if (!window.confirm('清空所有欄位？')) return;
    data = {};
    save(data);
    $$('[data-q]').forEach((el) => { if (el.tagName !== 'SELECT') el.value = ''; });
    render();
  });

  // 回填上次填過的內容
  $$('[data-q]').forEach((el) => { if (data[el.dataset.q] !== undefined) el.value = data[el.dataset.q]; });
  render();

  window.Tour.register([]);
})();

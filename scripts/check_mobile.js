/*
 * check_mobile.js — 手機版逐頁檢查（375px 寬，模擬已開通學員）
 *
 * 用法（在 scripts 資料夾）：
 *   第一次：npm install　然後　npx playwright install chromium
 *   之後：  node check_mobile.js            → 檢查全站
 *          node check_mobile.js 02-install  → 只檢查檔名含這段字的頁面
 *
 * 會抓出：橫向捲動、超出畫面、按鈕被裁掉、表格擠成一格一個字、
 *        可以點的東西被別的東西蓋住（例如步驟數字蓋住勾選框）、點擊區太小、字太小、JS 錯誤。
 * 有問題時結束代碼為 1，沒問題是 0。
 */
const { chromium } = require('playwright');
const { serve, allPages, unlock } = require('./browser_check_lib');

const WIDTH = 375;
// 故意的、不算問題的：單元 7 藏起來的攻擊示範字、證書與講義這類縮小顯示的列印文件
const IGNORE = '.hidden-text, .cert, .cert-preview, [data-cert], .print-only, .handout-page, .ho-qr, .qt-paper, svg, .fx-sparks, .fx-confetti';

(async () => {
  const only = process.argv[2];
  const pages = allPages().filter((p) => !only || p.includes(only));
  const { base, close } = await serve();
  const browser = await chromium.launch();
  let bad = 0;
  for (const p of pages) {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: 812 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + p);
    await page.waitForTimeout(600);
    await unlock(page);
    // 慢慢捲到底，讓「捲到才出現」的圖解都播放完
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 600) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(40); }
    await page.waitForTimeout(800);

    const found = await page.evaluate((ignore) => {
      const vw = window.innerWidth; const out = [];
      const shown = (el) => { const s = getComputedStyle(el); return el.getClientRects().length && s.visibility !== 'hidden' && Number(s.opacity) > 0.05; };
      const skip = (el) => el.closest(ignore);
      const name = (el) => `${el.tagName.toLowerCase()}「${(el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 20)}」`;

      const over = document.documentElement.scrollWidth - vw;
      if (over > 0) out.push(`整頁可以左右滑 ${over}px`);

      // 被 overflow:hidden 的外框裁掉的按鈕（外框可以左右滑的不算）
      document.querySelectorAll('button, .btn').forEach((el) => {
        if (!shown(el) || skip(el)) return;
        const rects = [...el.getClientRects()]; // 換行的行內元素要一行一行看，整體範圍會橫跨整行
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX;
          if (ox === 'auto' || ox === 'scroll') break;
          if (ox === 'hidden' || ox === 'clip') {
            const ar = a.getBoundingClientRect();
            if (rects.some((r) => r.right > ar.right + 1 || r.left < ar.left - 1)) out.push(`按鈕被裁掉：${name(el)}`);
            break;
          }
        }
      });

      // 表格比外框寬、又不能左右滑：右半邊會被切掉看不到
      document.querySelectorAll('table').forEach((t) => {
        if (!shown(t) || skip(t)) return;
        let a = t.parentElement;
        for (; a && a !== document.body; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX;
          if (ox === 'auto' || ox === 'scroll') return;
          if (ox === 'hidden' || ox === 'clip') break;
        }
        if (t.getBoundingClientRect().right > t.parentElement.getBoundingClientRect().right + 1) out.push(`表格超出外框、又不能左右滑：${name(t.querySelector('th, td') || t)}`);
      });

      // 表格擠成一格一個字
      document.querySelectorAll('td, th').forEach((c) => {
        if (!shown(c) || skip(c)) return;
        if (c.innerText.trim().length >= 3 && c.getBoundingClientRect().width < 50) out.push(`表格太擠：${name(c)} 只有 ${Math.round(c.getBoundingClientRect().width)}px 寬`);
      });

      // 可以點的東西被蓋住：點它的正中央，點到的必須是它自己（或包著它的 label）
      document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary').forEach((el) => {
        if (!shown(el) || skip(el) || el.closest('[hidden], details:not([open]) > :not(summary)')) return;
        if (el.closest('.flip')) return; // 翻牌卡：沒翻過來時背面本來就被正面蓋著
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        const r = el.getClientRects()[0]; // 換行的連結量第一行，整體範圍的正中央可能落在別的字上
        const x = r.left + r.width / 2; const y = r.top + r.height / 2;
        if (r.width < 2 || x < 0 || x > vw || y < 0 || y > innerHeight) return; // 刻意移出畫面的（例如防機器人欄位）
        const hit = document.elementFromPoint(x, y);
        if (!hit || hit === el || el.contains(hit)) return;
        if (hit.closest('label')?.contains(el)) return;
        if (hit.closest('.toast, .timer, .site-header, .page-nav, .slide-counter, [class^="tour-"]')) return; // 固定在畫面上的浮動元件
        out.push(`被蓋住：${name(el)} 被 ${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]} 擋住`);
      });

      // 點擊區太小（段落裡的文字連結、包在 label 裡的勾選框不算：整行文字都能點）
      document.querySelectorAll('button, input:not([type=hidden]), select, a.btn').forEach((el) => {
        if (!shown(el) || skip(el) || el.classList.contains('term')) return;
        if ((el.type === 'checkbox' || el.type === 'radio') && el.closest('label')) return;
        const r = el.getBoundingClientRect();
        if (r.width < 24 || r.height < 24) out.push(`太小不好點：${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      });

      // 字小於 12px
      document.querySelectorAll('body *').forEach((el) => {
        if (!shown(el) || skip(el) || el.classList.contains('term')) return;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 12) out.push(`字太小：${name(el)} ${fs.toFixed(1)}px`);
      });
      return [...new Set(out)];
    }, IGNORE);

    const all = [...found, ...errors.map((e) => `JS 錯誤：${e}`)];
    if (all.length) { bad += 1; console.log(`✗ ${p}\n    ${all.slice(0, 12).join('\n    ')}${all.length > 12 ? `\n    …還有 ${all.length - 12} 項` : ''}`); }
    else console.log(`✓ ${p}`);
    await page.close();
  }
  await browser.close();
  close();
  console.log(bad ? `\n${bad}／${pages.length} 頁有問題` : `\n全部 ${pages.length} 頁通過`);
  process.exit(bad ? 1 : 0);
})();

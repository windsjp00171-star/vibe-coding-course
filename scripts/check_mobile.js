/*
 * check_mobile.js — 手機版逐頁檢查（375px 寬，模擬已開通學員）
 *
 * 用法（在 scripts 資料夾）：
 *   第一次：npm install　然後　npx playwright install chromium
 *   之後：  node check_mobile.js            → 檢查全站
 *          node check_mobile.js 02-install  → 只檢查檔名含這段字的頁面
 *          node check_mobile.js --dark      → 用深色模式檢查（手機設成深色主題時看到的樣子）
 *
 * 會抓出：橫向捲動、超出畫面、按鈕被裁掉、表格擠成一格一個字、
 *        可以點的東西被別的東西蓋住（例如步驟數字蓋住勾選框）、點擊區太小、字太小、
 *        字和背景對比不夠（看不清楚）、深色模式下出現刺眼的大塊白底、JS 錯誤。
 * 有問題時結束代碼為 1，沒問題是 0。
 */
const { chromium } = require('playwright');
const { serve, allPages, unlock } = require('./browser_check_lib');

const WIDTH = 375;
// 故意的、不算問題的：單元 7 藏起來的攻擊示範字、證書與講義這類縮小顯示的列印文件
const IGNORE = '.hidden-text, .cert, .cert-preview, [data-cert], .print-only, .handout-page, .ho-qr, .qt-paper, svg, .fx-sparks, .fx-confetti';

(async () => {
  const dark = process.argv.includes('--dark');
  const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const pages = allPages().filter((p) => !only || p.includes(only));
  const { base, close } = await serve();
  const browser = await chromium.launch();
  let bad = 0;
  for (const p of pages) {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: 812 }, isMobile: true, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
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
      // 字和背景的對比度（WCAG AA：一般字 4.5、大字 3）。背景是漸層或圖片的算不準，略過
      // 顏色轉成 [r, g, b, a]；color-mix() 算出來的是 color(srgb 0~1 …) 格式，要換算成 0~255
      const rgb = (c) => {
        if (/^(oklab|oklch|lab|lch|hsl)/.test(c)) return null; // 動畫中間或其他色彩空間，算不準就略過
        const m = c.match(/[\d.]+/g); if (!m) return null;
        const v = m.map(Number);
        if (c.startsWith('color(')) return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1];
        return v;
      };
      const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
      const bgOf = (el) => {
        for (let a = el; a; a = a.parentElement) {
          const s = getComputedStyle(a);
          if (s.backgroundImage !== 'none') return null;
          const c = rgb(s.backgroundColor);
          if (c && (c.length < 4 || c[3] > 0.9)) return c;
          if (c && c[3] > 0.05) return null; // 半透明疊在別的顏色上，算不準
        }
        return [255, 255, 255];
      };
      document.querySelectorAll('body *').forEach((el) => {
        if (!shown(el) || skip(el) || el.closest('[class^="tour-"], .toast')) return;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
        const s = getComputedStyle(el);
        if ((rgb(s.color) || [])[3] < 0.95) return; // 故意淡掉的半透明字（例如已勾選、翻牌卡提示）
        if (el.closest('[disabled], .is-dim, .is-done, .is-soon')) return; // 停用或已完成的，故意變淡
        const bg = bgOf(el); const fg = rgb(s.color);
        if (!bg || !fg) return;
        const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
        const ratio = (l1 + 0.05) / (l2 + 0.05);
        const big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.6 && Number(s.fontWeight) >= 700);
        if (ratio < (big ? 3 : 4.5)) out.push(`對比不夠：${name(el)} ${ratio.toFixed(2)}:1`);
      });

      // 深色模式：頁面上出現大塊亮白底，會很刺眼（多半是寫死了 #fff）
      if (matchMedia('(prefers-color-scheme: dark)').matches) {
        document.querySelectorAll('body *').forEach((el) => {
          // 故意做成白紙或手機畫面的（講義、模擬的手機通知、網頁預覽），以及勾選清單的刪除線（用漸層畫的細線）
          if (!shown(el) || skip(el) || el.closest('img, video, iframe, .wb-preview, .msg-notify, .wb-phone, .ho-paper, .doc-paper, .ck-line')) return;
          const r = el.getBoundingClientRect();
          if (r.width * r.height < 20000) return;
          const s = getComputedStyle(el);
          const c = rgb(s.backgroundColor);
          const light = (c && (c.length < 4 || c[3] > 0.9) && lum(c) > 0.7) || /rgb\((2[3-5]\d), (2[3-5]\d), (2[3-5]\d)\)/.test(s.backgroundImage);
          if (light) out.push(`深色模式下的白底：${name(el)}`);
        });
      }
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

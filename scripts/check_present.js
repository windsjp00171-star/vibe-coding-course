/*
 * check_present.js — 投影模式模擬：在投影機常見解析度下，從第一段一直按 → 走到最後一段
 *
 * 用法（在 scripts 資料夾，第一次要先 npm install 和 npx playwright install chromium）：
 *   node check_present.js              → 所有單元、課程地圖、講座頁，三種解析度
 *   node check_present.js 05-deploy    → 只檢查檔名含這段字的頁面
 *
 * 會抓出：跳段、卡住、長段落的底部沒被看到、縮小後字小於 13px、JS 錯誤。
 * 有問題時結束代碼為 1。
 */
const { chromium } = require('playwright');
const { serve, allPages, unlock } = require('./browser_check_lib');

const SIZES = [[1024, 768], [1280, 720], [1920, 1080]];
const MIN_PX = 13;

(async () => {
  const only = process.argv[2];
  const pages = allPages()
    .filter((p) => p.startsWith('modules/') || ['learn.html', 'church.html', 'security.html'].includes(p))
    .filter((p) => !only || p.includes(only));
  const { base, close } = await serve();
  const browser = await chromium.launch();
  let bad = 0;
  for (const [w, h] of SIZES) {
    for (const p of pages) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // 平滑捲動改成直接跳，測試才穩定；換頁邏輯本身不變（「減少動態」的使用者也是這樣跳）
      await page.addInitScript(() => {
        const flat = (o) => (o && typeof o === 'object' ? { ...o, behavior: 'auto' } : o);
        const to = window.scrollTo.bind(window); const by = window.scrollBy.bind(window);
        window.scrollTo = (o, y) => (typeof o === 'object' ? to(flat(o)) : to(o, y));
        window.scrollBy = (o, y) => (typeof o === 'object' ? by(flat(o)) : by(o, y));
      });
      await page.goto(base + p);
      await page.waitForTimeout(600);
      await unlock(page);
      await page.keyboard.press('p');
      await page.waitForTimeout(300);
      await page.evaluate(() => window.Course.goSlide(0));
      await page.waitForTimeout(200);

      const total = await page.evaluate(() => window.Course.slides().length);
      const seen = new Set(); const bottomSeen = new Set();
      let lastY = -1; let still = 0; let backwards = false; let prev = 0;
      for (let k = 0; k < total * 8 + 10; k++) {
        const st = await page.evaluate(() => {
          const list = window.Course.slides(); const i = window.Course.currentSlide();
          return { i, y: Math.round(scrollY), atBottom: list[i].getBoundingClientRect().bottom <= innerHeight + 8,
            end: scrollY >= document.documentElement.scrollHeight - innerHeight - 2 };
        });
        if (st.i < prev) backwards = true;
        prev = st.i; seen.add(st.i);
        if (st.atBottom || st.end) bottomSeen.add(st.i);
        if (st.i === total - 1 && (st.atBottom || st.end)) break;
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);
        const y = await page.evaluate(() => Math.round(scrollY));
        still = y === lastY ? still + 1 : 0;
        lastY = y;
        if (still >= 3) break;
      }
      const fit = await page.evaluate(() => window.Course.slides().map((s) => {
        const z = Number(s.style.zoom || 1);
        const fs = parseFloat(getComputedStyle(s.querySelector('p, li, td') || s).fontSize);
        return { id: s.id || '開頭', px: +(fs * z).toFixed(1) };
      }));
      const flags = [];
      const skipped = fit.filter((f, i) => !seen.has(i)).map((f) => f.id);
      if (skipped.length) flags.push(`跳過 ${skipped.join('、')}`);
      if (backwards) flags.push('按 → 卻往回跳');
      if (still >= 3) flags.push(`卡住（第 ${prev + 1} 段）`);
      const unseen = fit.filter((f, i) => seen.has(i) && !bottomSeen.has(i)).map((f) => f.id);
      if (unseen.length) flags.push(`底部沒被看到 ${unseen.join('、')}`);
      const small = fit.filter((f) => f.px < MIN_PX).map((f) => `${f.id}(${f.px}px)`);
      if (small.length) flags.push(`字太小 ${small.join('、')}`);
      if (errors.length) flags.push(`JS 錯誤：${errors[0]}`);
      if (flags.length) { bad += 1; console.log(`✗ ${w}×${h} ${p}：${flags.join('；')}`); }
      else console.log(`✓ ${w}×${h} ${p}（${total} 段）`);
      await page.close();
    }
  }
  await browser.close();
  close();
  console.log(bad ? `\n${bad} 項有問題` : '\n全部通過');
  process.exit(bad ? 1 : 0);
})();

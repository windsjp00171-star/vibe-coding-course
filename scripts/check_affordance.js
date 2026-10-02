#!/usr/bin/env node
/* check_affordance.js — 找兩種讓人困惑的元件：
 *   假按鈕：長得像可以按（有框、有底色、字很短），點了卻什麼都沒發生
 *   隱形按鈕：真的可以按，但游標、外框、底色都看不出來
 * 用法：先在 repo 根目錄開 python3 -m http.server 5173，再跑 node scripts/check_affordance.js [頁面關鍵字]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const filter = process.argv[2] || '';
const pages = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...fs.readdirSync(path.join(ROOT, 'modules')).filter((f) => f.endsWith('.html')).map((f) => 'modules/' + f),
].filter((p) => p.includes(filter));

(async () => {
  const browser = await chromium.launch();
  const fake = {}; const hidden = {};
  for (const p of pages) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => { try { localStorage.setItem('vibe-course-tour-seen', JSON.stringify({ x: true })); } catch {} });
    await page.goto(`http://localhost:5173/${p}`, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    // 找候選
    const found = await page.evaluate(() => {
      const NATIVE = 'a[href],button,input,select,textarea,label,summary,[role=button],[role=tab],[tabindex],[contenteditable=true],[draggable=true]';
      const out = { fake: [], hidden: [] };
      const sig = (el) => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''));
      const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && el.offsetParent !== null; };
      const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') return b; } return 'rgb(255, 255, 255)'; };
      let i = 0;
      for (const el of document.querySelectorAll('body *')) {
        if (!visible(el)) continue;
        const cs = getComputedStyle(el);
        const text = (el.innerText || '').trim();
        const isNative = el.matches(NATIVE) || el.closest(NATIVE);
        // 標明是示意圖（.shot、role=img）的畫面，裡面畫的按鈕本來就不能按
        if (el.closest('.shot, [role=img], [aria-hidden=true], kbd')) continue; // kbd：畫成鍵盤按鍵，大家都知道是在說鍵盤
        if (!isNative && text.length >= 1 && text.length <= 28 && !text.includes('\n')) {
          const r = el.getBoundingClientRect();
          const radius = parseFloat(cs.borderTopLeftRadius) || 0;
          const border = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
          const own = cs.backgroundColor; const hasBg = own !== 'rgba(0, 0, 0, 0)' && own !== bgOf(el.parentElement || el);
          const padded = parseFloat(cs.paddingLeft) >= 4;
          const btnLike = r.width < 320 && r.height < 60 && radius >= 4 && padded && (border || hasBg);
          if (btnLike || cs.cursor === 'pointer') { el.dataset.afId = ++i; out.fake.push({ id: i, sig: sig(el), text: text.slice(0, 20), pointer: cs.cursor === 'pointer' }); }
        }
        if (el.matches('button,[role=button],summary,label,input[type=range],input[type=checkbox],input[type=radio],a[href]') && !el.closest('.site-header,.site-footer,nav')) {
          if (el.matches('input[type=checkbox],input[type=radio]') && el.closest('label')) continue;
          if (el.disabled) continue;
          // 翻牌卡的外觀在正面（.flip-front）；可以點的程式碼在外層（.code.is-clickable）有提示
          if (el.matches('.flip') || el.matches('.is-clickable .code-line')) continue;
          const pointer = cs.cursor === 'pointer' || el.matches('a[href]') && cs.cursor === 'pointer';
          const border = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
          const own = cs.backgroundColor; const hasBg = own !== 'rgba(0, 0, 0, 0)';
          const underline = cs.textDecorationLine.includes('underline');
          const problems = [];
          if (!pointer && !el.matches('label,input[type=range]')) problems.push('游標不是手指');
          if (el.matches('button,[role=button]') && !border && !hasBg && !underline) problems.push('沒有框、沒有底色、沒有底線');
          if (el.matches('a[href]') && !border && !hasBg && !underline && el.closest('p,li,td')) problems.push('文字連結沒底線');
          if (problems.length) out.hidden.push({ sig: sig(el), text: (el.innerText || el.value || '').trim().slice(0, 20), problems });
        }
      }
      return out;
    });
    // 假按鈕：真的點點看，有沒有任何變化
    for (const c of found.fake) {
      const loc = page.locator(`[data-af-id="${c.id}"]`);
      try {
        await loc.scrollIntoViewIfNeeded({ timeout: 800 });
        const before = await page.evaluate(() => { window.__afMut = 0; window.__afObs?.disconnect(); window.__afObs = new MutationObserver((m) => { window.__afMut += m.filter((x) => !(x.type === 'attributes' && x.attributeName === 'data-af-id')).length; }); window.__afObs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); return location.href; });
        await loc.click({ timeout: 800, force: true });
        await page.waitForTimeout(250);
        const after = await page.evaluate(() => ({ mut: window.__afMut, href: location.href }));
        if (after.mut === 0 && after.href === before) {
          (fake[c.sig] ||= { pages: new Set(), texts: new Set(), pointer: c.pointer }).pages.add(p);
          fake[c.sig].texts.add(c.text);
        }
        if (after.href !== before) { await page.goBack().catch(() => {}); await page.waitForTimeout(300); }
      } catch { /* 被別的東西擋住或已經消失，略過 */ }
    }
    for (const h of found.hidden) {
      const k = h.sig + '｜' + h.problems.join('、');
      (hidden[k] ||= { pages: new Set(), texts: new Set() }).pages.add(p);
      hidden[k].texts.add(h.text);
    }
    await page.close();
    process.stderr.write('.');
  }
  await browser.close();
  const show = (o) => Object.entries(o).sort((a, b) => b[1].pages.size - a[1].pages.size).map(([k, v]) => `  ${k}${v.pointer ? '（手指游標！）' : ''}\n     例：${[...v.texts].slice(0, 5).join('／')}\n     頁：${[...v.pages].slice(0, 6).join(' ')}${v.pages.size > 6 ? ` …共 ${v.pages.size} 頁` : ''}`).join('\n');
  console.log(`\n\n=== 假按鈕（長得像可以按，點了沒反應）：${Object.keys(fake).length} 種 ===\n${show(fake)}`);
  console.log(`\n=== 隱形按鈕（可以按，看不出來）：${Object.keys(hidden).length} 種 ===\n${show(hidden)}`);
})();

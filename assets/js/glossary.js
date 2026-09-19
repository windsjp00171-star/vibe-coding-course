/*
 * glossary.js — 內文的專業名詞自動加上虛線底線，點一下跳出白話解釋。
 * 名詞資料在 glossary-data.js；比對規則在 lib.js 的 matchTerms（有測試）。
 * 每個名詞一頁只標第一次；程式碼、標題、按鈕、連結、互動練習裡面不標。
 */
(function () {
  'use strict';

  const list = window.Glossary || [];
  const byId = new Map(list.map((g) => [g.id, g]));
  const SKIP = 'code, pre, a, button, h1, h2, h3, h4, input, textarea, select, label, kbd, script, style, .term, [data-no-gloss], [data-glossary], [data-quiz], .gen-out, [data-teacher-slot], .quiz, .site-header, .tour-pop, .print-only, .eyebrow, .kicker, .show-kind';
  let pop = null;
  let current = null;

  function annotate(root) {
    const used = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() && !n.parentElement.closest(SKIP) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      const hits = window.CourseLib.matchTerms(text, list, used);
      if (!hits.length) continue;
      const frag = document.createDocumentFragment();
      let last = 0;
      for (const h of hits) {
        used.add(h.id);
        frag.append(text.slice(last, h.start));
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'term';
        btn.dataset.term = h.id;
        btn.textContent = text.slice(h.start, h.end);
        btn.setAttribute('aria-label', `${btn.textContent}：點一下看白話解釋`);
        frag.append(btn);
        last = h.end;
      }
      frag.append(text.slice(last));
      node.replaceWith(frag);
    }
  }

  function moduleLink(id) {
    const m = window.Course?.MODULES.find((x) => x.id === id);
    if (!m || m.id === document.body.dataset.module) return '';
    return `<a href="${document.body.dataset.base || './'}${m.file}">在單元 ${m.id.slice(1)}「${window.Course.esc(m.title)}」學 →</a>`;
  }

  function open(btn) {
    const g = byId.get(btn.dataset.term);
    if (!g) return;
    const esc = window.Course.esc;
    close();
    pop = document.createElement('div');
    pop.className = 'term-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', g.term);
    pop.innerHTML = `
      <span class="term-cat">${esc(g.cat)}</span>
      <h4>${esc(g.term)}</h4>
      <p>${esc(g.plain)}</p>
      ${g.like ? `<p class="term-like">💡 ${esc(g.like)}</p>` : ''}
      <footer>${g.m ? moduleLink(g.m) : ''}<a href="${document.body.dataset.base || './'}glossary.html#${g.id}">所有名詞</a></footer>`;
    document.body.append(pop);
    current = btn;
    btn.setAttribute('aria-expanded', 'true');
    place();
  }

  function place() {
    if (!pop || !current) return;
    const r = current.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const below = r.bottom + 10;
    const top = below + h < window.innerHeight ? below : Math.max(10, r.top - h - 10);
    const left = Math.min(Math.max(10, r.left + r.width / 2 - w / 2), window.innerWidth - w - 10);
    Object.assign(pop.style, { top: `${top + window.scrollY}px`, left: `${left + window.scrollX}px` });
  }

  function close() {
    pop?.remove();
    current?.setAttribute('aria-expanded', 'false');
    pop = null;
    current = null;
  }

  function init() {
    const main = document.querySelector('main');
    if (!main || !window.CourseLib?.matchTerms) return;
    annotate(main);
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.term');
      if (btn) { if (btn === current) close(); else open(btn); return; }
      if (pop && !pop.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop) { const b = current; close(); b?.focus(); } });
    window.addEventListener('resize', close);
  }

  // 等各單元的腳本把靜態內容排好再標，互動練習是事後產生的，本來就會被略過
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 0);
})();

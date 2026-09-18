/*
 * tour.js — 聚焦式教學導覽（全站共用）。
 * 規則：步驟只能用 data-tour 屬性定位，不可用 id／class，
 * 以免版面調整改掉 class 後導覽默默失效。
 *
 * 用法：Tour.register([{ tour: 'mode', title: '…', text: '…' }, …])
 * 首次來訪會自動播放一次；之後按右上角「？ 教學」重看。
 */
(function () {
  'use strict';

  const SEEN_KEY = 'vibe-course-tour-seen';
  let steps = [];
  let index = 0;
  let nodes = null;

  // 每一頁都有的頁首步驟，放在各頁步驟前面
  const COMMON = [
    { tour: 'mode', title: '學員／講師模式', text: '上課的老師切到「講師」，會看到紫色的教學提示和工作坊流程。自己學的話，維持「學員」就好。' },
    { tour: 'present', title: '投影模式', text: '上課投影時按這裡（或鍵盤 P），字會放大，用方向鍵一段一段往下講。' },
    { tour: 'print', title: '印出講義', text: '按這裡會印出這個單元的紙本學習單，裡面有填空和練習，也可以存成 PDF。' },
  ];

  function register(pageSteps) {
    steps = [...COMMON, ...pageSteps];
    const page = document.body.dataset.module || 'home';
    let seen = {};
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch { /* 忽略 */ }
    if (!seen[page]) {
      try { localStorage.setItem(SEEN_KEY, JSON.stringify({ ...seen, [page]: true })); } catch { /* 忽略 */ }
      setTimeout(start, 700);
    }
  }

  function visibleSteps() {
    return steps.filter((s) => {
      const el = document.querySelector(`[data-tour="${s.tour}"]`);
      return el && el.getClientRects().length > 0;
    });
  }

  function start() {
    const list = visibleSteps();
    if (!list.length) return;
    stop();
    index = 0;
    nodes = {
      backdrop: Object.assign(document.createElement('div'), { className: 'tour-backdrop' }),
      spot: Object.assign(document.createElement('div'), { className: 'tour-spot' }),
      pop: Object.assign(document.createElement('div'), { className: 'tour-pop' }),
    };
    nodes.pop.setAttribute('role', 'dialog');
    nodes.pop.setAttribute('aria-live', 'polite');
    nodes.backdrop.addEventListener('click', stop);
    document.body.append(nodes.backdrop, nodes.spot, nodes.pop);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', place);
    show(list);
  }

  function show(list) {
    const step = list[index];
    const target = document.querySelector(`[data-tour="${step.tour}"]`);
    target.scrollIntoView({ block: 'center', behavior: 'instant' in window ? 'instant' : 'auto' });
    const esc = window.Course ? window.Course.esc : (s) => s;
    nodes.pop.innerHTML = `
      <h4>${esc(step.title)}</h4>
      <p>${esc(step.text)}</p>
      <footer>
        <span class="muted" style="font-size:.8rem">${index + 1} / ${list.length}</span>
        <span style="display:flex;gap:6px">
          <button type="button" class="btn btn-sm btn-ghost" data-t="skip">跳過</button>
          ${index > 0 ? '<button type="button" class="btn btn-sm" data-t="prev">上一步</button>' : ''}
          <button type="button" class="btn btn-sm btn-primary" data-t="next">${index === list.length - 1 ? '開始上課' : '下一步'}</button>
        </span>
      </footer>`;
    nodes.pop.onclick = (e) => {
      const t = e.target.dataset.t;
      if (t === 'skip') stop();
      if (t === 'prev') { index -= 1; show(list); }
      if (t === 'next') { if (index === list.length - 1) stop(); else { index += 1; show(list); } }
    };
    nodes.current = { list, target };
    requestAnimationFrame(place);
    nodes.pop.querySelector('[data-t="next"]').focus();
  }

  function place() {
    if (!nodes?.current) return;
    const pad = 6;
    const r = nodes.current.target.getBoundingClientRect();
    // 框太高就只框上半部，避免整頁被框住看不出重點
    const h = Math.min(r.height, window.innerHeight * 0.5);
    Object.assign(nodes.spot.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${h + pad * 2}px` });
    const popH = nodes.pop.offsetHeight;
    const popW = nodes.pop.offsetWidth;
    const below = r.top + h + pad * 2 + 12;
    const top = below + popH < window.innerHeight ? below : Math.max(12, r.top - popH - 16);
    const left = Math.min(Math.max(12, r.left), window.innerWidth - popW - 12);
    Object.assign(nodes.pop.style, { top: `${top}px`, left: `${left}px` });
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); stop(); }
  }

  function stop() {
    if (!nodes) return;
    Object.values(nodes).forEach((n) => n instanceof Element && n.remove());
    nodes = null;
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', place);
  }

  window.Tour = { register, start, stop };
})();

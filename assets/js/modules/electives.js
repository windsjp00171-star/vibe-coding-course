/* electives.js — D 段選修共用：踩坑卡片、逐步流程圖 */
(function () {
  'use strict';
  const { $$, esc, initFlips } = window.Course;

  // 從踩坑圖鑑挑出指定的坑做成翻牌卡（資料單一來源：pitfalls-data.js）
  function renderPitCards(host, ids) {
    if (!host || !window.Pitfalls) return;
    const { PITFALLS } = window.Pitfalls;
    host.innerHTML = ids.map((id) => PITFALLS.find((p) => p.id === id)).filter(Boolean).map((p) => `
      <div class="flip" style="min-height:260px"><div class="flip-inner">
        <div class="flip-face flip-front"><h3>${esc(p.title)}</h3><p>${esc(p.symptom)}</p><p class="muted" style="font-size:.8rem">${esc(p.where)}</p><span class="flip-hint">為什麼？點我 ↻</span></div>
        <div class="flip-face flip-back"><p><b>原因：</b>${esc(p.cause)}</p><p><b>學到：</b>${esc(p.lesson)}</p>
          <p style="font-size:.85rem;background:rgb(255 255 255 / 10%);border-radius:8px;padding:8px 10px">🤖 下次這樣說：「${esc(p.say)}」</p></div>
      </div></div>`).join('');
    initFlips(host);
  }

  // 逐步流程圖：steps = [{ title, text, bad? }]；按「下一步」依序亮起
  function mountFlow(host, steps, { autoplayLabel = '▶ 從頭播放' } = {}) {
    if (!host) return;
    host.innerHTML = `<div class="flow-row">${steps.map((s) => `
      <div class="flow-node ${s.bad ? 'is-bad' : ''}"><b>${esc(s.title)}</b>${esc(s.text)}</div>`).join('')}</div>
      <div class="flow-controls"><button type="button" class="btn btn-primary btn-sm" data-flow-next>下一步 →</button>
      <button type="button" class="btn btn-sm" data-flow-play>${esc(autoplayLabel)}</button></div>`;
    const nodes = $$('.flow-node', host);
    let shown = 0;
    let timer = null;
    const show = (n) => { shown = n; nodes.forEach((el, i) => el.classList.toggle('is-on', i < n)); };
    host.querySelector('[data-flow-next]').addEventListener('click', () => show(shown >= nodes.length ? 1 : shown + 1));
    host.querySelector('[data-flow-play]').addEventListener('click', () => {
      clearInterval(timer);
      show(0);
      timer = setInterval(() => { if (shown >= nodes.length) clearInterval(timer); else show(shown + 1); }, 900);
    });
  }

  window.Electives = { renderPitCards, mountFlow };
})();

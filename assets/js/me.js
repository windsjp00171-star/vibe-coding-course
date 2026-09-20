/*
 * me.js — 學員的「我的學習」頁：改暱稱、看班級狀態、看每個單元的成績。
 * 沒登入或沒開會員功能時也能用：進度會從這台電腦的瀏覽器讀出來。
 */
(function () {
  'use strict';
  const { MODULES, getState, esc, $ } = window.Course;

  const body = $('[data-me-body]');

  function progressRows() {
    const { progress } = getState();
    const parts = [...new Set(MODULES.map((m) => m.part))];
    return parts.map((part) => {
      const rows = MODULES.filter((m) => m.part === part).map((m) => {
        const p = progress[m.id];
        const state = window.Members?.enabled ? window.Members.access(m) : 'open';
        const locked = state === 'class';
        const link = locked ? '' : `<a class="btn btn-sm btn-ghost" href="${m.file}">${p?.done ? '複習' : '去上課'}</a>`;
        return `<li class="me-row ${p?.done ? 'is-done' : ''} ${locked ? 'is-locked' : ''}">
          <span class="me-num">${m.id.slice(1)}</span>
          <span aria-hidden="true">${m.emoji}</span>
          <span class="me-title">${esc(m.title)}</span>
          <span class="me-score">${p?.done ? `✅ ${p.best} 分` : p?.best ? `${p.best} 分` : locked ? '🔒 尚未開放' : '—'}</span>
          ${link}</li>`;
      }).join('');
      return `<p class="me-part">${esc(part)}</p><ul class="me-list">${rows}</ul>`;
    }).join('');
  }

  function render() {
    const M = window.Members;
    const user = M?.user;
    const profile = M?.profile;
    const total = MODULES.filter((m) => m.ready).length;
    const done = MODULES.filter((m) => getState().progress[m.id]?.done).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const limit = M?.openUntil?.();

    const status = !M?.enabled ? '<span class="pill">進度只存在這台電腦</span>'
      : !user ? '<span class="pill pill-warn">尚未登入</span>'
        : profile?.role === 'teacher' ? '<span class="pill pill-brand">講師</span>'
          : profile?.enrolled ? '<span class="pill pill-ok">已開通</span>'
            : '<span class="pill pill-warn">待開通</span>';

    body.innerHTML = `
      <div class="me-top">
        <div>
          <div class="card" style="margin-bottom:18px">
            <div class="quiz-head"><h3 style="margin:0">基本資料</h3>${status}</div>
            ${user ? `
              <p class="muted" style="margin:.4em 0">登入帳號：${esc(user.email || '')}</p>
              <label class="form-grid" style="margin-top:10px">顯示名稱（講師在後台看到的就是這個）
                <input type="text" maxlength="40" data-me-name value="${esc(profile?.display_name || '')}" placeholder="例如：王小明"></label>
              <p style="margin-top:10px"><button type="button" class="btn btn-primary btn-sm" data-me-save>儲存名稱</button>
                <span class="muted" data-me-msg aria-live="polite"></span></p>
              ${limit ? `<p class="muted" style="margin-top:10px">你的班級目前開放到<b>單元 ${limit}</b>。</p>` : ''}
            ` : `
              <p>登入後，進度會存到雲端，換一台電腦也接得上；講師也才看得到你的學習狀況。</p>
              <p><button type="button" class="btn btn-primary" data-auth="in">用 Google 登入</button></p>
            `}
          </div>
          ${progressRows()}
        </div>
        <aside class="card" style="text-align:center">
          <div class="me-ring" style="--p:${pct}"><b>${pct}%</b></div>
          <p style="font-weight:800;margin:.2em 0">完成 ${done} ／ ${total} 個單元</p>
          <p class="muted" style="font-size:.9rem">過關標準是小測驗答對 70%。</p>
          <p><a class="btn btn-sm" href="modules/09-final.html">🎓 總測驗與證書</a></p>
          <p><a class="btn btn-sm btn-ghost" href="handout.html?m=book">🖨️ 印我的講義</a></p>
        </aside>
      </div>`;
  }

  async function saveName() {
    const msg = $('[data-me-msg]');
    const name = $('[data-me-name]').value.trim();
    msg.textContent = '儲存中……';
    try {
      const { error } = await window.Members.client.from('profiles').update({ display_name: name }).eq('id', window.Members.user.id);
      if (error) throw new Error(error.message);
      msg.textContent = '✅ 已儲存';
      window.Course.toast('名稱已更新');
    } catch (err) {
      msg.textContent = `❌ ${err.message}`;
    }
  }

  body.addEventListener('click', (e) => { if (e.target.closest('[data-me-save]')) saveName(); });
  document.addEventListener('course:auth', render);
  document.addEventListener('course:progress', render);
  render();

  window.Tour.register([]);
})();

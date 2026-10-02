/* board.js — 交流留言板（board.html）。
 * 資料在 Supabase 的 board_posts（supabase/add-community.sql）：只有開通的學員和講師讀得到、寫得進去；
 * 名字由資料庫依會員資料填，網頁沒辦法冒名。刪除：自己的留言，或講師刪任何一則。
 */
(function () {
  'use strict';
  const { $, esc, toast } = window.Course;
  const host = $('[data-board]');
  const MAX = 1000;

  const when = (iso) => new Date(iso).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

  async function render() {
    const M = window.Members;
    if (!M?.enabled) { host.innerHTML = '<div class="card"><p>留言板需要會員功能，目前還沒啟用。</p></div>'; return; }
    await M.ready;
    if (!M.user) {
      host.innerHTML = `<div class="card"><h3>先登入</h3><p>留言板只給開通的學員和講師使用。</p>
        <p><button type="button" class="btn btn-primary" data-auth="in">用 Google 登入</button></p></div>`;
      return;
    }
    const isTeacher = M.profile?.role === 'teacher';
    if (!M.profile?.enrolled && !isTeacher) {
      host.innerHTML = `<div class="card"><h3>開通之後就能使用</h3><p>用講師給你的加入連結（或加入碼）加入班級，就會開通。</p>
        <p><a class="btn btn-primary" href="learn.html#join">輸入加入碼</a></p></div>`;
      return;
    }
    const { data, error } = await M.client.from('board_posts')
      .select('id, user_id, author_name, is_teacher, body, created_at').order('created_at', { ascending: false }).limit(200);
    if (error) {
      host.innerHTML = /relation|does not exist|schema cache/i.test(error.message)
        ? '<div class="card"><p>留言板還沒啟用：講師要先到 Supabase 執行一次 <code>supabase/add-community.sql</code>。</p></div>'
        : `<div class="card"><p>讀取留言失敗，請重新整理再試一次。（${esc(error.message)}）</p></div>`;
      return;
    }
    const name = M.profile?.display_name || '';
    host.innerHTML = `
      <form class="card bd-form" data-bd-form data-tour="board-form">
        <label for="bd-text"><b>寫點什麼</b>${name ? '' : '　<span class="muted">（你還沒設定顯示名稱，會顯示成「學員」；到<a href="me.html">我的學習</a>可以改）</span>'}</label>
        <textarea id="bd-text" name="body" rows="4" maxlength="${MAX}" required placeholder="例如：單元 05 部署完網址打開是 404，有人遇過嗎？"></textarea>
        <div class="bd-row"><span class="muted" data-bd-count>0／${MAX}</span>
          <span><button type="button" class="btn btn-ghost btn-sm" data-bd-refresh>重新整理</button>
          <button type="submit" class="btn btn-primary" data-bd-send>送出留言</button></span></div>
      </form>
      <ul class="bd-list">${(data || []).map((p) => `
        <li class="bd-post ${p.is_teacher ? 'is-teacher' : ''}">
          <div class="bd-meta"><b>${esc(p.author_name || '學員')}</b>${p.is_teacher ? '<span class="pill pill-brand">講師</span>' : ''}<span>${when(p.created_at)}</span>
            ${p.user_id === M.user.id || isTeacher ? `<button type="button" class="btn btn-sm btn-ghost bd-del" data-bd-del="${p.id}">刪除</button>` : ''}</div>
          <p class="bd-body">${esc(p.body)}</p>
        </li>`).join('') || '<li class="muted">還沒有人留言，當第一個吧。</li>'}</ul>`;
  }

  host.addEventListener('input', (e) => {
    if (e.target.name === 'body') $('[data-bd-count]', host).textContent = `${e.target.value.length}／${MAX}`;
  });

  host.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target.closest('[data-bd-form]');
    const body = form.elements.body.value.trim();
    if (!body) { toast('先寫點什麼再送出'); return; }
    const btn = $('[data-bd-send]', form);
    btn.disabled = true;
    const { error } = await window.Members.client.from('board_posts').insert({ body });
    btn.disabled = false;
    if (error) { toast(`送出失敗：${error.message}`); return; }
    toast('已送出');
    render();
  });

  host.addEventListener('click', async (e) => {
    if (e.target.closest('[data-bd-refresh]')) { render(); return; }
    const del = e.target.closest('[data-bd-del]');
    if (!del || !window.confirm('確定刪除這則留言嗎？刪了就找不回來。')) return;
    const { error } = await window.Members.client.from('board_posts').delete().eq('id', del.dataset.bdDel);
    if (error) { toast(`刪除失敗：${error.message}`); return; }
    toast('已刪除');
    render();
  });

  document.addEventListener('course:auth', render);
  render();

  window.Tour.register([
    { tour: 'board', title: '交流留言板', text: '開通的學員和講師一起討論的地方。最新的留言在最上面，自己的留言可以刪除。' },
    { tour: 'board-form', title: '寫留言', text: '卡關時把狀況寫清楚：哪個單元、做了什麼、看到什麼。貼錯誤訊息前先把鑰匙換成 xxx。' },
  ]);
})();

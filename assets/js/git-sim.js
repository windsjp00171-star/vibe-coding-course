/*
 * git-sim.js — 教學用的迷你 Git 模型（純邏輯，不碰畫面）。
 * 只模擬課堂需要的觀念：存檔、分支、合併、上傳、下載、被拒絕上傳。
 * 每個動作回傳 { ok, sim, message }，不修改傳入的 sim（每次產生新物件）。
 */
(function (root) {
  'use strict';

  function create() {
    const first = { id: 'c1', msg: '建立專案', branch: 'main', parents: [], by: 'me', seq: 1 };
    return {
      commits: { c1: first },
      seq: 1,
      local: { refs: { main: 'c1' }, head: 'main', dirty: false },
      remote: { refs: { main: 'c1' } },
    };
  }

  function ancestors(sim, id) {
    const seen = new Set();
    const stack = id ? [id] : [];
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...sim.commits[cur].parents);
    }
    return seen;
  }

  function isAncestor(sim, a, b) { return ancestors(sim, b).has(a); }

  function visible(sim, side) {
    const refs = sim[side].refs;
    const ids = new Set();
    Object.values(refs).forEach((id) => ancestors(sim, id).forEach((x) => ids.add(x)));
    return Array.from(ids).map((id) => sim.commits[id]).sort((a, b) => a.seq - b.seq);
  }

  function addCommit(sim, { msg, branch, parents, by }) {
    const seq = sim.seq + 1;
    const id = `c${seq}`;
    return { sim: { ...sim, seq, commits: { ...sim.commits, [id]: { id, msg, branch, parents, by, seq } } }, id };
  }

  const ok = (sim, message) => ({ ok: true, sim, message });
  const fail = (sim, message) => ({ ok: false, sim, message });

  function edit(sim) {
    if (sim.local.dirty) return fail(sim, '你已經有還沒存檔的修改了，先「存檔」吧。');
    return ok({ ...sim, local: { ...sim.local, dirty: true } }, '你改了一些內容（還沒存檔）。');
  }

  function commit(sim, msg) {
    if (!sim.local.dirty) return fail(sim, '沒有任何修改，不需要存檔。先按「修改檔案」。');
    const branch = sim.local.head;
    const { sim: next, id } = addCommit(sim, { msg, branch, parents: [sim.local.refs[branch]], by: 'me' });
    return ok({ ...next, local: { ...next.local, dirty: false, refs: { ...next.local.refs, [branch]: id } } },
      `存檔完成：「${msg}」。注意，這只存在你的電腦裡，GitHub 上還沒有。`);
  }

  function branch(sim, name = 'feature') {
    if (sim.local.refs[name]) return fail(sim, `分支「${name}」已經存在，用「切換分支」就能過去。`);
    const refs = { ...sim.local.refs, [name]: sim.local.refs[sim.local.head] };
    return ok({ ...sim, local: { ...sim.local, refs, head: name } },
      `開了一個平行世界「${name}」，你現在在這裡做實驗，不會弄壞 main。`);
  }

  function checkout(sim, name) {
    if (!sim.local.refs[name]) return fail(sim, `沒有「${name}」這個分支。`);
    if (sim.local.dirty) return fail(sim, '有還沒存檔的修改，切換前先存檔，不然改的東西會跟著跑。');
    return ok({ ...sim, local: { ...sim.local, head: name } }, `切換到「${name}」。`);
  }

  function merge(sim, from = 'feature', into = 'main') {
    const src = sim.local.refs[from];
    const dst = sim.local.refs[into];
    if (!src) return fail(sim, `還沒有「${from}」分支可以合併。`);
    if (sim.local.head !== into) return fail(sim, `合併要站在「${into}」上做：先切換回 ${into}。`);
    if (sim.local.dirty) return fail(sim, '先把手邊的修改存檔，再合併。');
    if (isAncestor(sim, src, dst)) return fail(sim, `「${from}」的內容 ${into} 都已經有了，不需要再合併。`);
    const { sim: next, id } = addCommit(sim, { msg: `合併 ${from}`, branch: into, parents: [dst, src], by: 'me' });
    return ok({ ...next, local: { ...next.local, refs: { ...next.local.refs, [into]: id } } },
      `合併成功！「${from}」的成果現在併進 ${into} 了。`);
  }

  function push(sim) {
    const name = sim.local.head;
    const mine = sim.local.refs[name];
    const theirs = sim.remote.refs[name];
    if (theirs && !isAncestor(sim, theirs, mine)) {
      return fail(sim, '上傳被拒絕！GitHub 上有你電腦裡沒有的新版本（同事改過）。先「下載更新 pull」，再上傳。');
    }
    if (theirs === mine) return fail(sim, 'GitHub 上已經是最新的了，沒有東西要上傳。');
    return ok({ ...sim, remote: { refs: { ...sim.remote.refs, [name]: mine } } }, `已上傳「${name}」到 GitHub，現在雲端也有備份了。`);
  }

  function teammate(sim) {
    const { sim: next, id } = addCommit(sim, { msg: '同事修正錯字', branch: 'main', parents: [sim.remote.refs.main], by: 'mate' });
    return ok({ ...next, remote: { refs: { ...next.remote.refs, main: id } } }, '同事在 GitHub 上直接改了 main（你的電腦還不知道）。');
  }

  function pull(sim) {
    const name = 'main';
    const theirs = sim.remote.refs[name];
    const mine = sim.local.refs[name];
    if (sim.local.dirty) return fail(sim, '先把手邊的修改存檔，再下載更新。');
    if (isAncestor(sim, theirs, mine)) return fail(sim, '你的電腦已經有 GitHub 上的全部內容了。');
    if (isAncestor(sim, mine, theirs)) {
      return ok({ ...sim, local: { ...sim.local, refs: { ...sim.local.refs, [name]: theirs } } }, '下載完成，你的 main 跟 GitHub 一樣新了。');
    }
    const { sim: next, id } = addCommit(sim, { msg: '合併 GitHub 上的更新', branch: name, parents: [mine, theirs], by: 'me' });
    return ok({ ...next, local: { ...next.local, refs: { ...next.local.refs, [name]: id } } },
      '下載並自動合併完成：同事的修改和你的修改現在都在了。');
  }

  // 課堂任務：用目前狀態判斷，不用記錄按過哪些按鈕
  const MISSIONS = [
    { id: 'commit2', text: '在 main 上存檔兩次', check: (s) => visible(s, 'local').filter((c) => c.branch === 'main' && c.by === 'me' && c.parents.length === 1).length >= 2 },
    { id: 'push', text: '把存檔上傳到 GitHub（push）', check: (s) => visible(s, 'remote').some((c) => c.by === 'me' && c.id !== 'c1') },
    { id: 'branch', text: '開一個分支 feature，在上面存檔', check: (s) => Object.values(s.commits).some((c) => c.branch === 'feature') },
    { id: 'merge', text: '切回 main，把 feature 合併進來', check: (s) => Object.values(s.commits).some((c) => c.msg === '合併 feature') },
    { id: 'pull', text: '按「同事改了 GitHub」，再用 pull 把它下載下來', check: (s) => visible(s, 'local').some((c) => c.by === 'mate') },
  ];

  const api = { create, edit, commit, branch, checkout, merge, push, pull, teammate, visible, isAncestor, MISSIONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GitSim = api;
})(typeof self !== 'undefined' ? self : this);

// 模擬器教的是 Git 的「規則」，規則錯了學員會帶著錯誤觀念去用真的 Git。
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../assets/js/git-sim.js');

const run = (sim, ...steps) => steps.reduce((s, [fn, ...args]) => {
  const r = G[fn](s, ...args);
  assert.ok(r.ok, `${fn} 應該成功，卻得到：${r.message}`);
  return r.sim;
}, sim);

test('存檔只存在本機，要 push 之後 GitHub 才看得到（最常見的誤解）', () => {
  const s = run(G.create(), ['edit'], ['commit', '改首頁']);
  assert.equal(G.visible(s, 'local').length, 2);
  assert.equal(G.visible(s, 'remote').length, 1);
  const pushed = run(s, ['push']);
  assert.equal(G.visible(pushed, 'remote').length, 2);
});

test('沒有修改就不能存檔', () => {
  assert.equal(G.commit(G.create(), 'x').ok, false);
});

test('GitHub 上有同事的新版本時，push 必須被拒絕，要先 pull', () => {
  let s = run(G.create(), ['teammate'], ['edit'], ['commit', '我的修改']);
  assert.equal(G.push(s).ok, false);
  s = run(s, ['pull']);
  assert.ok(G.visible(s, 'local').some((c) => c.by === 'mate'), 'pull 之後要看得到同事的修改');
  assert.equal(G.push(s).ok, true);
});

test('在分支上做的實驗不會影響 main，合併後才會進來', () => {
  let s = run(G.create(), ['branch', 'feature'], ['edit'], ['commit', '試做深色模式']);
  const mainTip = s.local.refs.main;
  assert.equal(mainTip, 'c1', 'main 不該被分支上的存檔改動');
  assert.equal(G.merge(s).ok, false, '要站在 main 上才能合併');
  s = run(s, ['checkout', 'main'], ['merge']);
  assert.ok(G.isAncestor(s, 'c2', s.local.refs.main), '合併後 main 包含分支的存檔');
});

test('有未存檔的修改時不能切換分支，避免修改跟著跑', () => {
  const s = run(G.create(), ['branch', 'feature'], ['edit']);
  assert.equal(G.checkout(s, 'main').ok, false);
});

test('動作不修改原本的狀態（每次回傳新物件）', () => {
  const s = G.create();
  G.edit(s);
  assert.equal(s.local.dirty, false);
});

test('五個課堂任務可以依序全部完成', () => {
  const s = run(G.create(),
    ['edit'], ['commit', 'a'], ['edit'], ['commit', 'b'], ['push'],
    ['branch', 'feature'], ['edit'], ['commit', 'c'], ['checkout', 'main'], ['merge'],
    ['teammate'], ['pull']);
  for (const m of G.MISSIONS) assert.ok(m.check(s), `任務沒完成：${m.text}`);
});

test('一開始沒有任何任務被誤判為完成', () => {
  for (const m of G.MISSIONS) assert.equal(m.check(G.create()), false, m.text);
});

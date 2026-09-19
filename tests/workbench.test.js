// 沉浸式工作台：學員自己打字下指令，模擬的 Claude Code 要「聽得懂重點」。
// 判斷太嚴，學員講對了卻卡關；判斷太鬆，沒講到葷素也過關，就學不到「需求要說清楚」。
const test = require('node:test');
const assert = require('node:assert/strict');
const { matchNeeds } = require('../assets/js/lib.js');
const sim = require('../assets/js/sims/m2-party.js');

test('有講到的重點算有、沒講到的列為缺少', () => {
  const r = matchNeeds('幫我做一個聚餐報名網頁', sim.NEEDS.first);
  assert.deepEqual(r.met, ['page']);
  assert.deepEqual(r.missing, ['diet']);
});

test('同一個重點有很多種說法，學員用哪一種都算', () => {
  for (const text of ['做報名表，可以選葷食或素食', '報名網頁要能勾吃素', '做一個表單讓大家填飲食習慣']) {
    assert.deepEqual(matchNeeds(text, sim.NEEDS.first).missing, [], text);
  }
});

test('只打招呼、沒有需求時，什麼重點都不算', () => {
  assert.deepEqual(matchNeeds('你好', sim.NEEDS.first).met, []);
  assert.deepEqual(matchNeeds('', sim.NEEDS.first).met, []);
});

test('回報問題要講到「哪裡不對」，只說「壞了」不夠具體', () => {
  assert.deepEqual(matchNeeds('送出按鈕按了沒反應', sim.NEEDS.bug).missing, []);
  assert.deepEqual(matchNeeds('壞了', sim.NEEDS.bug).met, []);
});

test('做出來的網頁跟著需求長出來：沒講葷素就沒有葷素選項，有講截止日期才有截止日期', () => {
  const plain = sim.buildSite({ diet: false, fixed: false, deadline: false });
  const full = sim.buildSite({ diet: true, fixed: true, deadline: true });
  assert.ok(!plain.includes('素食'));
  assert.ok(full.includes('素食'));
  assert.ok(!plain.includes('截止'));
  assert.ok(full.includes('截止'));
});

test('按鈕還沒修好時，送出不會出現成功訊息（學員才會發現要驗收）', () => {
  assert.ok(sim.buildSite({ diet: true, fixed: false, deadline: false }).includes("'submit-bug'"));
  assert.ok(sim.buildSite({ diet: true, fixed: true, deadline: false }).includes("'submit-ok'"));
});

// ---- 單元 4：救回改壞的網頁 ----
const m4 = require('../assets/js/sims/m4-rescue.js');

test('存檔說明要寫出「改了什麼」，只寫「更新」不算', () => {
  assert.deepEqual(matchNeeds('完成報名表單，加上葷素選項', m4.NEEDS.message).missing, []);
  assert.deepEqual(matchNeeds('更新', m4.NEEDS.message).met, []);
});

test('要救回檔案，學員要說得出「回到之前的版本」', () => {
  for (const t of ['請回到上一個存檔點', '幫我還原剛剛的修改', '退回昨天的版本']) {
    assert.deepEqual(matchNeeds(t, m4.NEEDS.fix).missing, [], t);
  }
  assert.deepEqual(matchNeeds('幫我修好', m4.NEEDS.fix).met, []);
});

test('存檔點地圖：沒上傳過就不會出現在 GitHub 那一欄', () => {
  const board = m4.buildBoard({ local: [{ msg: '完成表單', time: '22:05' }], remote: [], broken: false });
  assert.ok(board.includes('完成表單'));
  assert.ok(board.includes('還沒上傳過'));
  assert.ok(!m4.buildBoard({ local: [], remote: [], broken: false }).includes('版面全跑掉'));
  assert.ok(m4.buildBoard({ local: [], remote: [], broken: true }).includes('版面全跑掉'));
});

// ---- 單元 6：金鑰外洩 ----
const m6 = require('../assets/js/sims/m6-leak.js');

test('修法要講到「把金鑰放到程式外面」才算對', () => {
  for (const t of ['改成從環境變數讀取', '把金鑰放到 .env，不要寫在程式碼裡']) {
    assert.deepEqual(matchNeeds(t, m6.NEEDS.fix).missing, [], t);
  }
  assert.deepEqual(matchNeeds('幫我處理一下', m6.NEEDS.fix).met, []);
});

test('程式碼畫面：修好之後不能還看得到那串金鑰', () => {
  assert.ok(m6.buildCode({ fixed: false, picked: 0 }).includes('sk-live'));
  assert.ok(!m6.buildCode({ fixed: true, picked: 0 }).includes('sk-live'));
});

// ---- 單元 8：上線前體檢 ----
const m8 = require('../assets/js/sims/m8-launch.js');

test('體檢報告分得出「會出事」和「可以晚點修」，而且 console.log 不擋上線', () => {
  const now = m8.FINDINGS.filter((f) => f.now).map((f) => f.id);
  assert.deepEqual(now, ['key', 'input', 'pkg']);
  assert.equal(m8.FINDINGS.find((f) => f.id === 'log').now, false);
});

test('會出事的項目還沒修完，報告就不能顯示可以上線', () => {
  assert.ok(m8.buildReport({ done: [], tested: false }).includes('還不能上線'));
  assert.ok(m8.buildReport({ done: ['key', 'input', 'pkg'], tested: false }).includes('你還沒自己測過'));
  assert.ok(m8.buildReport({ done: ['key', 'input', 'pkg'], tested: true }).includes('可以上線'));
});

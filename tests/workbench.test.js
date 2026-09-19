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

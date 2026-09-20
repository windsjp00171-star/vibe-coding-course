const test = require('node:test');
const assert = require('node:assert');
const { buildPolicy, POLICY_CLAUSES, estimateCost } = require('../assets/js/lib.js');

// --- 守則產生器（單元 21）---
// 這份守則是要拿去公告的，所以「為什麼」必須跟著條款一起出現：
// 沒有理由的規定，同事只會偷偷繞過去。
test('每一條守則都要附上原因', () => {
  const text = buildPolicy(['secret'], '行政部');
  assert.ok(text.includes('原因'), '缺少原因的守則，同事不會照做');
});

test('沒勾任何條款時不要產生一份空守則', () => {
  assert.match(buildPolicy([], '行政部'), /請先勾選/);
});

test('沒填單位名稱時要有一個看得懂的預設值', () => {
  assert.ok(buildPolicy(['secret'], '   ').startsWith('本單位'));
});

test('守則要標明是內部規範而非法律意見', () => {
  const text = buildPolicy(POLICY_CLAUSES.map((c) => c.id), '行政部');
  assert.ok(text.includes('法務'), '要讓讀的人知道個案該找誰');
});

// --- 成本估算（單元 22）---
// 這個工具要回答的是「要不要擔心」，所以分級必須對得起現實：
// 部門內部的小工具不該被嚇成要花錢。
test('部門內部小工具估出來應該是免費', () => {
  assert.strictEqual(estimateCost({ users: 30, uses: 4, ai: 1, notify: 1 }).level, 'free');
});

test('整理長文件的 AI 用量，比短問答重得多', () => {
  const short = estimateCost({ users: 200, uses: 5, ai: 1 });
  const long = estimateCost({ users: 200, uses: 5, ai: 2 });
  assert.ok(long.aiLoad > short.aiLoad, '長文件要算得比較重，否則會低估');
});

test('規模大到兩項以上超額時，要明講會開始花錢', () => {
  assert.strictEqual(estimateCost({ users: 500, uses: 10, ai: 2, notify: 1 }).level, 'paid');
});

test('沒有用到 AI 也沒發通知時，不要虛報成本', () => {
  const r = estimateCost({ users: 100, uses: 3, ai: 0, notify: 0 });
  assert.strictEqual(r.aiLoad, 0);
  assert.strictEqual(r.notices, 0);
  assert.strictEqual(r.level, 'free');
});

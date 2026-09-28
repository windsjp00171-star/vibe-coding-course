const test = require('node:test');
const assert = require('node:assert');
const { prepStatus, CLASS_SESSIONS } = require('../assets/js/lib.js');

const people = [{ id: 'a', display_name: '甲' }, { id: 'b', display_name: '' }];
const rows = [
  { user_id: 'a', module_id: 'm0', done: true },
  { user_id: 'a', module_id: 'm1', done: true },
  { user_id: 'b', module_id: 'm0', done: false }, // 作答過但沒過關，不算
];

test('小測驗過關才算預習完成，列出還沒完成的單元', () => {
  const r = prepStatus(['m0', 'm1'], people, rows);
  assert.deepStrictEqual(r[0].missing, []);
  assert.deepStrictEqual(r[1].missing, ['m0', 'm1']);
  assert.strictEqual(r[1].name, '（未命名）');
});

test('三個半天的預習單元不重複，而且都是必修', () => {
  const all = CLASS_SESSIONS.flatMap((s) => s.units);
  assert.strictEqual(new Set(all).size, all.length);
  assert.ok(!all.includes('m19'), '19 已改成選修');
});

const test = require('node:test');
const assert = require('node:assert');
const { unitAccess } = require('../assets/js/lib.js');

// 課程順序和單元編號不一樣：19（AI 詐騙）和 20（維護與交接）是後來加進必修的，
// 排在單元 8 之後、單元 9（結業）之前。講師選「開放到單元 9」，意思是「必修全部開放」。
const ORDER = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm19', 'm8', 'm20', 'm9',
  'm10', 'm11', 'm12', 'm13', 'm14', 'm15', 'm16', 'm17', 'm18', 'm21', 'm22'];
const student = (limit) => ({ role: 'student', enrolled: true, limits: [limit] });

test('開放到單元 9（必修全部）時，排在前面的必修 19、20 也要開放', () => {
  assert.strictEqual(unitAccess({ id: 'm19' }, student(9), ORDER), 'open');
  assert.strictEqual(unitAccess({ id: 'm20' }, student(9), ORDER), 'open');
});

test('開放到單元 9 時，選修還是鎖著', () => {
  assert.strictEqual(unitAccess({ id: 'm10' }, student(9), ORDER), 'class');
  assert.strictEqual(unitAccess({ id: 'm21' }, student(9), ORDER), 'class');
});

test('開放到單元 8 時，排在 8 之後的單元 20 要鎖住', () => {
  assert.strictEqual(unitAccess({ id: 'm19' }, student(8), ORDER), 'open', '19 排在 8 前面');
  assert.strictEqual(unitAccess({ id: 'm20' }, student(8), ORDER), 'class', '20 排在 8 後面');
});

test('開放到單元 19 時，只到 19 為止，不是「編號 19 以下全部」', () => {
  assert.strictEqual(unitAccess({ id: 'm7' }, student(19), ORDER), 'open');
  assert.strictEqual(unitAccess({ id: 'm8' }, student(19), ORDER), 'class');
  assert.strictEqual(unitAccess({ id: 'm15' }, student(19), ORDER), 'class');
});

test('講師永遠全部看得到，不受班級進度影響', () => {
  assert.strictEqual(unitAccess({ id: 'm22' }, { role: 'teacher', limits: [1] }, ORDER), 'open');
});

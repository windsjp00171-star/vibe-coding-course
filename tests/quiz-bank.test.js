// 題庫是測驗、講義、PPT 共用的單一來源；一題答案指錯，三份教材一起教錯。
const test = require('node:test');
const assert = require('node:assert/strict');
const bank = require('../assets/js/quiz-bank.js');

test('每一題的正確答案都指向存在的選項，而且有解說', () => {
  for (const [unit, questions] of Object.entries(bank)) {
    questions.forEach((q, i) => {
      const where = `${unit} 第 ${i + 1} 題`;
      assert.ok(q.q && q.q.length > 4, `${where} 缺題目`);
      assert.ok(Array.isArray(q.options) && q.options.length >= 2, `${where} 選項少於 2 個`);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${where} 答案索引超出範圍`);
      assert.ok(q.why && q.why.length > 4, `${where} 缺解說`);
      assert.equal(new Set(q.options).size, q.options.length, `${where} 有重複選項`);
    });
  }
});

test('必修 8 個單元都有題目，總測驗才抽得到每個單元', () => {
  for (let n = 1; n <= 8; n += 1) assert.ok(bank[`m${n}`]?.length >= 3, `m${n} 題目不足`);
});

test('正確答案不能總是同一個位置，否則學員用猜的也能過關', () => {
  const positions = new Set(Object.values(bank).flat().map((q) => q.answer));
  assert.ok(positions.size >= 3, `正確答案只出現在位置 ${[...positions]}`);
});

const lib = require('../assets/js/lib.js');
const UNITS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];

test('總測驗：每個必修單元至少一題、題目不重複、題數正確', () => {
  const exam = lib.buildExam(bank, UNITS, 12);
  assert.equal(exam.length, 12);
  for (const u of UNITS) assert.ok(exam.some((q) => q.unit === u), `${u} 沒有被抽到`);
  assert.equal(new Set(exam.map((q) => q.q)).size, 12, '有重複題目');
});

test('總測驗：選項洗牌後，正確答案指向的仍是原本的正確選項', () => {
  for (let run = 0; run < 20; run += 1) {
    for (const q of lib.buildExam(bank, UNITS, 12)) {
      const original = bank[q.unit].find((x) => x.q === q.q);
      assert.equal(q.options[q.answer], original.options[original.answer], q.q);
    }
  }
});

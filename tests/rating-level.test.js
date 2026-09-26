const test = require('node:test');
const assert = require('node:assert');
const { ratingLevel, RATING_LEVELS, DEFAULT_RATING } = require('../assets/js/lib.js');

// 拉桿不再只顯示 1～5 的數字：每一格要讓學員看得懂「這一格代表什麼程度」，
// 否則每個人心中的 3 分都不一樣，上課前後也沒辦法比較。
test('五個等級都要有圖示和一句白話說明', () => {
  assert.strictEqual(RATING_LEVELS.length, 5);
  RATING_LEVELS.forEach((lv, i) => {
    assert.strictEqual(lv.value, i + 1);
    assert.ok(lv.emoji, `第 ${i + 1} 級缺圖示`);
    assert.ok(lv.label.length >= 3, `第 ${i + 1} 級的說明太短`);
  });
});

test('等級由低到高是「沒概念」到「可以教別人」', () => {
  assert.match(ratingLevel(1).label, /沒概念/);
  assert.match(ratingLevel(5).label, /教別人/);
});

test('超出範圍或壞掉的值要收回 1～5，不能讓畫面顯示 undefined', () => {
  assert.strictEqual(ratingLevel(0).value, 1);
  assert.strictEqual(ratingLevel(9).value, 5);
  assert.strictEqual(ratingLevel('abc').value, DEFAULT_RATING);
  assert.strictEqual(ratingLevel(undefined).value, DEFAULT_RATING);
});

test('拉桿傳來的是字串，也要能正確對到等級', () => {
  assert.strictEqual(ratingLevel('4').value, 4);
});

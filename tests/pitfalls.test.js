// 踩坑圖鑑同時餵給網頁、Kahoot 和 PPT；欄位缺一個，三個地方一起壞。
const test = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, PITFALLS } = require('../assets/js/pitfalls-data.js');

test('每個坑都有症狀、原因、教訓、可以對 Claude Code 說的話', () => {
  for (const p of PITFALLS) {
    for (const key of ['id', 'title', 'symptom', 'cause', 'lesson', 'say', 'where']) {
      assert.ok(p[key] && p[key].length > 1, `${p.id} 缺 ${key}`);
    }
    assert.ok(CATEGORIES[p.cat], `${p.id} 的分類 ${p.cat} 不存在`);
  }
});

test('「猜原因」遊戲需要兩個不同、也不等於正解的錯誤選項', () => {
  for (const p of PITFALLS) {
    assert.equal(p.wrong.length, 2, p.id);
    assert.equal(new Set([p.cause, ...p.wrong]).size, 3, `${p.id} 選項重複`);
  }
});

test('id 不重複，Kahoot 與 PPT 才能用 id 對應', () => {
  assert.equal(new Set(PITFALLS.map((p) => p.id)).size, PITFALLS.length);
});

test('公開教材不能出現私人專案或單位名稱', () => {
  const text = JSON.stringify(PITFALLS);
  for (const banned of ['靈糧', '安南', '美玲', 'cell_reporter', 'tianfu', 'event-registration', 'jiankang']) {
    assert.ok(!text.includes(banned), `出現了 ${banned}`);
  }
});

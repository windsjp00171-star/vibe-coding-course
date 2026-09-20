// 講師要把全班進度匯出成 CSV 給行政或自己存檔。
// 逗號、引號、換行沒處理好，Excel 打開會整份錯位——比沒有匯出更糟。
const test = require('node:test');
const assert = require('node:assert/strict');
const { toCSV } = require('../assets/js/lib.js');

test('一般資料原樣輸出，每列一行', () => {
  const csv = toCSV([['姓名', '分數'], ['王小明', 90]]);
  assert.equal(csv, '姓名,分數\r\n王小明,90');
});

test('含逗號、引號、換行的欄位會被正確跳脫，不會把欄位切錯', () => {
  const csv = toCSV([['備註'], ['他說：「好, 我知道了」'], ['第一行\n第二行']]);
  const lines = csv.split('\r\n');
  assert.equal(lines[1], '"他說：「好, 我知道了」"');
  assert.ok(csv.includes('"第一行\n第二行"'));
});

test('空值輸出成空字串，不會變成 undefined', () => {
  assert.equal(toCSV([['a', 'b'], [null, undefined]]), 'a,b\r\n,');
});

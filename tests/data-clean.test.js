// 單元 17：把亂七八糟的資料交給 AI 整理。
// 這裡的清洗規則要跟課程教的一致：整理格式可以放心交給 AI，但「算錢」不行。
const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanRows, upgradePrompt, PROMPT_UPGRADES } = require('../assets/js/lib.js');

const MESSY = [
  { name: '  王小明 ', date: '2026/3/5', phone: '０９１２３４５６７８', amount: '1,200' },
  { name: '李美美', date: '3-5', phone: '0912-345-679', amount: '800' },
];

test('去空白：姓名前後的空白會被清掉', () => {
  assert.equal(cleanRows(MESSY, { trim: true })[0].name, '王小明');
  assert.equal(cleanRows(MESSY, {})[0].name, '  王小明 ');
});

test('全形數字轉半形，電話才比得出是同一支', () => {
  assert.equal(cleanRows(MESSY, { halfwidth: true })[0].phone, '0912345678');
});

test('日期統一成同一種寫法，缺年份的用今年補上並標記', () => {
  const rows = cleanRows(MESSY, { dates: true }, 2026);
  assert.equal(rows[0].date, '2026-03-05');
  assert.equal(rows[1].date, '2026-03-05');
  assert.equal(rows[1].guessed, true);
  assert.notEqual(rows[0].guessed, true);
});

test('沒勾的項目不會被偷偷改掉', () => {
  const rows = cleanRows(MESSY, { trim: true });
  assert.equal(rows[0].phone, '０９１２３４５６７８');
  assert.equal(rows[0].amount, '1,200');
});

// 單元 18：把一句話升級成好指令
test('每個升級零件都會在改造後的指令裡留下對應的句子', () => {
  const base = '幫我寫公告';
  const out = upgradePrompt(base, ['who', 'format', 'ask']);
  assert.ok(out.startsWith(base));
  for (const id of ['who', 'format', 'ask']) {
    assert.ok(out.includes(PROMPT_UPGRADES.find((u) => u.id === id).line), id);
  }
});

test('沒選任何零件時，原句原樣送出，不會自己加料', () => {
  assert.equal(upgradePrompt('幫我寫公告', []), '幫我寫公告');
});

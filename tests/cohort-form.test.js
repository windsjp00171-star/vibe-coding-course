const test = require('node:test');
const assert = require('node:assert');
const { cohortFromForm } = require('../assets/js/lib.js');

const iso = (v) => `${v}:00Z`; // 測試用固定轉法，不受電腦時區影響
const ok = { name: '2026 秋季班（週六）', kind: 'core', schedule_text: '11/14、11/21 13:30–17:00', place: '台南', price: '6,800', capacity: '12', waitlist_enabled: true, reg_start: '2026-10-01T09:00', reg_end: '2026-11-07T23:59' };

test('正常填寫會轉成資料庫的一列', () => {
  const { row, error } = cohortFromForm(ok, iso);
  assert.strictEqual(error, undefined);
  assert.strictEqual(row.price, 6800); // 千分位逗號可以打
  assert.strictEqual(row.capacity, 12);
  assert.strictEqual(row.waitlist_enabled, true);
  assert.strictEqual(row.reg_end, '2026-11-07T23:59:00Z');
  assert.strictEqual(row.waitlist_deadline, null);
});

test('沒填的欄位存成空值：費用未公布、不限人數', () => {
  const { row } = cohortFromForm({ name: '客製場次', kind: 'custom' }, iso);
  assert.strictEqual(row.price, null);
  assert.strictEqual(row.capacity, null);
  assert.strictEqual(row.place, null);
  assert.strictEqual(row.reg_start, null);
});

test('名額填 0 當作不限人數（不然會一開放就額滿）', () => {
  assert.strictEqual(cohortFromForm({ ...ok, capacity: '0' }, iso).row.capacity, null);
});

test('填錯的地方用白話擋下', () => {
  assert.match(cohortFromForm({ ...ok, name: ' ' }, iso).error, /名稱/);
  assert.match(cohortFromForm({ ...ok, kind: 'x' }, iso).error, /類型/);
  assert.match(cohortFromForm({ ...ok, price: '六千' }, iso).error, /費用/);
  assert.match(cohortFromForm({ ...ok, capacity: '-3' }, iso).error, /名額/);
  assert.match(cohortFromForm({ ...ok, reg_start: '2026-11-08T09:00' }, iso).error, /截止/);
});

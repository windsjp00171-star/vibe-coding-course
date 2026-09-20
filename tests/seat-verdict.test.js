const test = require('node:test');
const assert = require('node:assert');
const { seatVerdict, seatsLeft, SEAT, SEAT_MESSAGE } = require('../assets/js/lib.js');

const NOW = Date.parse('2026-10-01T12:00:00+08:00');
const base = { is_open: true, capacity: 12, waitlist_enabled: true };

// 這份判斷是整站唯一一份：頁面上顯示什麼、送出時擋不擋，都問它。
// 分成兩份的下場（教會系統踩過）：頁面說可以報，填完按下去才說額滿。
test('還有名額時放行', () => {
  assert.strictEqual(seatVerdict(base, 5, NOW), SEAT.OK);
});

test('額滿且有開候補時，排候補而不是直接拒絕', () => {
  assert.strictEqual(seatVerdict(base, 12, NOW), SEAT.WAITLIST);
});

test('額滿又沒開候補，就要明講報不進去', () => {
  assert.strictEqual(seatVerdict({ ...base, waitlist_enabled: false }, 12, NOW), SEAT.FULL);
});

test('候補已過截止時間，要說候補截止而不是還能排', () => {
  const cohort = { ...base, waitlist_deadline: '2026-09-30T23:59:00+08:00' };
  assert.strictEqual(seatVerdict(cohort, 12, NOW), SEAT.WAITLIST_CLOSED);
});

test('候補截止時間壞掉時放行——設定打錯不該變成擋人', () => {
  const cohort = { ...base, waitlist_deadline: '不是時間' };
  assert.strictEqual(seatVerdict(cohort, 12, NOW), SEAT.WAITLIST);
});

test('報名期間還沒到、或已經結束，都要分開講清楚', () => {
  assert.strictEqual(seatVerdict({ ...base, reg_start: '2026-11-01T00:00:00+08:00' }, 0, NOW), SEAT.NOT_YET);
  assert.strictEqual(seatVerdict({ ...base, reg_end: '2026-09-01T00:00:00+08:00' }, 0, NOW), SEAT.ENDED);
});

test('梯次還沒開放時不要顯示表單', () => {
  assert.strictEqual(seatVerdict({ ...base, is_open: false }, 0, NOW), SEAT.CLOSED);
});

test('沒有設名額上限就一律放行', () => {
  assert.strictEqual(seatVerdict({ is_open: true, capacity: null }, 999, NOW), SEAT.OK);
  assert.strictEqual(seatsLeft({ capacity: null }, 999), null, '沒設上限要顯示「不限」而不是 0');
});

test('剩餘名額不會變成負數', () => {
  assert.strictEqual(seatsLeft({ capacity: 12 }, 15), 0);
});

test('每一種結果都要有話可以對報名者說', () => {
  Object.values(SEAT).forEach((v) => {
    assert.ok(SEAT_MESSAGE[v], `${v} 少了對應的說明文字`);
  });
});

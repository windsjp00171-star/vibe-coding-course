const test = require('node:test');
const assert = require('node:assert');
const { isFreeCohort, signupLabels, canActivate, activationNotice } = require('../assets/js/lib.js');

test('費用 0 才算免費；沒填費用要講師確認', () => {
  assert.strictEqual(isFreeCohort({ price: 0 }), true);
  assert.strictEqual(isFreeCohort({ price: 6800 }), false);
  assert.strictEqual(isFreeCohort({ price: null }), false);
});

test('付費梯次：報名＝待繳費，改成已繳費才能開通', () => {
  const paid = { price: 6800 };
  assert.strictEqual(signupLabels(paid).registered.label, '待繳費');
  assert.strictEqual(signupLabels(paid).confirmed.label, '已繳費');
  assert.strictEqual(canActivate(paid, 'registered'), false);
  assert.strictEqual(canActivate(paid, 'confirmed'), true);
  assert.strictEqual(canActivate(paid, 'waitlisted'), false);
});

test('免費梯次：報名就能開通，候補與取消不行', () => {
  const free = { price: 0 };
  assert.strictEqual(signupLabels(free).registered.label, '已報名');
  assert.strictEqual(canActivate(free, 'registered'), true);
  assert.strictEqual(canActivate(free, 'waitlisted'), false);
  assert.strictEqual(canActivate(free, 'cancelled'), false);
});

test('開通通知含姓名、梯次、連結、加入碼', () => {
  const t = activationNotice({ name: '王小明', cohort: '2026 冬季班', code: 'K7QM2P', url: 'https://x/learn.html?code=K7QM2P#join' });
  assert.match(t, /^王小明 你好：/);
  assert.match(t, /「2026 冬季班」/);
  assert.match(t, /https:\/\/x\/learn\.html\?code=K7QM2P#join/);
  assert.match(t, /加入碼：K7QM2P/);
  assert.match(activationNotice({ cohort: 'A' }), /^你好：/);
});

test('費用顯示：0 是免費、沒填另行公布、其他加千分位', () => {
  const { priceText } = require('../assets/js/lib.js');
  assert.strictEqual(priceText(0), '免費');
  assert.strictEqual(priceText(null), '費用另行公布');
  assert.strictEqual(priceText(undefined, '待填'), '待填');
  assert.strictEqual(priceText(6800), 'NT$ 6,800');
});

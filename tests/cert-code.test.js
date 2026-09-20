const test = require('node:test');
const assert = require('node:assert');
const { certCode, normalizeCertCode, formatCertCode, isCertCode } = require('../assets/js/lib.js');

const bytes = (n) => Uint8Array.from({ length: 10 }, (_, i) => (i * 7 + n) % 256);

// 編號是拿去給第三方驗證的，抄錯一個字就查不到，所以不能出現容易看錯的字
test('證書編號不含 0/O/1/I，避免抄錯查不到', () => {
  const code = certCode(bytes(3));
  assert.match(code, /^VC[A-HJ-NP-Z2-9]{10}$/);
});

test('編號夠長，讓人猜不到別人的證書', () => {
  assert.strictEqual(certCode(bytes(1)).length, 12);
});

test('顯示時每四碼斷開，念給別人聽比較不會錯', () => {
  assert.strictEqual(formatCertCode('VCH7K2M9QX4T'), 'VCH7-K2M9-QX4T');
});

test('別人手動輸入時，大小寫和連字號都要能容忍', () => {
  assert.strictEqual(normalizeCertCode(' vch7-k2m9 qx4t '), 'VCH7K2M9QX4T');
  assert.ok(isCertCode('vch7-k2m9-qx4t'));
});

test('長度不對或含禁用字元的編號要擋下來，不必打到資料庫', () => {
  assert.ok(!isCertCode('VCH7K2M9QX4'), '少一碼');
  assert.ok(!isCertCode('XXH7K2M9QX4T'), '開頭不是 VC');
  assert.ok(!isCertCode('VCH7K2M0QX4T'), '含 0');
  assert.ok(!isCertCode(''), '空字串');
});

const test = require('node:test');
const assert = require('node:assert');
const { checkContact, CONTACT_TOPICS } = require('../assets/js/lib.js');

const ok = { name: '王小明', contact: 'ming@example.com', topic: 'corporate', message: '想問企業內訓的報價' };

test('資料齊全就放行', () => {
  assert.strictEqual(checkContact(ok), '');
});

test('沒留稱呼或聯絡方式時擋下來', () => {
  assert.match(checkContact({ ...ok, name: '   ' }), /稱呼/);
  assert.match(checkContact({ ...ok, contact: 'ab' }), /聯絡方式/);
});

test('主題只能是表單上那幾種', () => {
  assert.match(checkContact({ ...ok, topic: 'hack' }), /主題/);
  Object.keys(CONTACT_TOPICS).forEach((t) => assert.strictEqual(checkContact({ ...ok, topic: t }), ''));
});

// 長度上限要和 supabase/add-contact.sql 的寫入規則一樣，前台才會先用白話擋下
test('長度上限和資料庫規則一致', () => {
  assert.strictEqual(checkContact({ ...ok, name: '字'.repeat(40) }), '');
  assert.match(checkContact({ ...ok, name: '字'.repeat(41) }), /40/);
  assert.match(checkContact({ ...ok, contact: 'a'.repeat(121) }), /120/);
  assert.match(checkContact({ ...ok, message: '短' }), /多寫幾個字/);
  assert.strictEqual(checkContact({ ...ok, message: '字'.repeat(2000) }), '');
  assert.match(checkContact({ ...ok, message: '字'.repeat(2001) }), /2000/);
});

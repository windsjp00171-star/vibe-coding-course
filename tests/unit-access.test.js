// 班級開放進度：講師決定「這班開到哪個單元」。
// 規則寫錯的後果：學員提早看到還沒上的單元（講師的課就被爆雷），或該開的單元打不開（學員卡住上不了課）。
const test = require('node:test');
const assert = require('node:assert/strict');
const { unitAccess } = require('../assets/js/lib.js');

const u = (n, trial = false) => ({ id: `m${n}`, trial });
const student = (limits, enrolled = true) => ({ role: 'student', enrolled, limits });

test('試用單元任何人都能看，訪客也可以', () => {
  assert.equal(unitAccess(u(1, true), null), 'open');
  assert.equal(unitAccess(u(4, true), student([2])), 'open');
});

test('訪客看非試用單元要先登入；登入但還沒開通要輸入加入碼', () => {
  assert.equal(unitAccess(u(2), null), 'login');
  assert.equal(unitAccess(u(2), student([], false)), 'enroll');
});

test('講師永遠看得到全部單元，才能備課', () => {
  assert.equal(unitAccess(u(15), { role: 'teacher', enrolled: false, limits: [1] }), 'open');
});

test('班級開放到單元 3：單元 3 以前可以看，單元 5 還沒開', () => {
  assert.equal(unitAccess(u(3), student([3])), 'open');
  assert.equal(unitAccess(u(5), student([3])), 'class');
});

test('沒設定開放進度的班級等於全部開放，舊班級不會突然被鎖住', () => {
  assert.equal(unitAccess(u(15), student([null])), 'open');
  assert.equal(unitAccess(u(15), student([])), 'open');
});

test('同時在兩個班，以開得比較多的那班為準', () => {
  assert.equal(unitAccess(u(6), student([3, 6])), 'open');
  assert.equal(unitAccess(u(6), student([3, null])), 'open');
  assert.equal(unitAccess(u(7), student([3, 6])), 'class');
});

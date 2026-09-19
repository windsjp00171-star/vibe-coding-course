// 五種能力自評：拉完要推薦「真的有教這項能力」的單元，結業時要能看到上課前後的差別。
// 推薦錯單元，或把沒拉過的項目當成 0 分，學員會被帶去錯的地方、看到假的進步。
const test = require('node:test');
const assert = require('node:assert/strict');
const { SELF_SKILLS, weakestSkill, compareRatings } = require('../assets/js/lib.js');

test('每一項能力都對應到一個必修單元，推薦按鈕才點得過去', () => {
  assert.equal(SELF_SKILLS.length, 5);
  for (const s of SELF_SKILLS) assert.match(s.m, /^m[1-8]$/, `${s.name} 對應的單元 ${s.m} 不是必修單元`);
});

test('推薦分數最低的那一項；同分時推薦清單裡比較前面、比較基礎的那一項', () => {
  const r = { [SELF_SKILLS[0].name]: 4, [SELF_SKILLS[1].name]: 1, [SELF_SKILLS[2].name]: 1, [SELF_SKILLS[3].name]: 3, [SELF_SKILLS[4].name]: 5 };
  assert.equal(weakestSkill(r).name, SELF_SKILLS[1].name);
});

test('沒拉過的項目用預設 2 分計算，不會被當成 0 分而永遠被推薦', () => {
  const r = { [SELF_SKILLS[0].name]: 3, [SELF_SKILLS[1].name]: 3, [SELF_SKILLS[2].name]: 3, [SELF_SKILLS[3].name]: 3 };
  assert.equal(weakestSkill(r).name, SELF_SKILLS[4].name);
  assert.equal(weakestSkill({}).name, SELF_SKILLS[0].name);
});

test('上課前後比較：算出每一項進步幾分，上課前沒紀錄的項目不能硬算進步', () => {
  const before = { [SELF_SKILLS[0].name]: 2, [SELF_SKILLS[3].name]: 4 };
  const after = { [SELF_SKILLS[0].name]: 5, [SELF_SKILLS[3].name]: 3 };
  const { rows, hasBefore } = compareRatings(before, after);
  assert.equal(hasBefore, true);
  assert.equal(rows[0].delta, 3);
  assert.equal(rows[3].delta, -1);
  assert.equal(rows[1].before, null);
  assert.equal(rows[1].delta, null);
});

test('完全沒在單元 1 拉過，就老實說沒有起點，不顯示進步', () => {
  const { hasBefore, rows } = compareRatings({}, { [SELF_SKILLS[0].name]: 4 });
  assert.equal(hasBefore, false);
  assert.ok(rows.every((r) => r.delta === null));
});

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

// 私人專案、單位、人名清單只存雜湊值：這個檔案是公開的，直接寫出名字等於自己洩漏
// 要加新的字：node -e "console.log(require('crypto').createHash('sha256').update('那個字').digest('hex'))"
const BANNED = [
  ['9249c738f1b3e73e673ecbe49dbda919e90b01deb6ec46241bb879320fb1cf44', 2],
  ['97a50d999831e36c0dad101713ec0c1b6bc8f90748f4c868e29122bb41836b81', 2],
  ['09be08471ea34fd3df2cc0c0dc9891a29ab09c482ed82af7a16f3d76fab24202', 2],
  ['7b1da8d12a54287de8700216fcc8ce647426645be62b626cbccb40611dde9882', 13],
  ['e18fcce6fb8f747a946fe77a13aa2fcaa453f924b676d078be7100d5c4191e6b', 6],
  ['07065ccbe59efcd5ee7a326abeadcbc425370e2bfddd804fb3294731212b2325', 18],
  ['64f9a8b8aa8708bb21ff0640a376401f89a2d83601b4c634ae88aee1a6b97c74', 8],
];
const sha = (t) => require('node:crypto').createHash('sha256').update(t).digest('hex');
function findBanned(text, list = BANNED) {
  const chars = [...text];
  for (const [hash, len] of list) {
    for (let i = 0; i + len <= chars.length; i++) {
      if (sha(chars.slice(i, i + len).join('')) === hash) return chars.slice(i, i + len).join('');
    }
  }
  return null;
}

test('公開教材不能出現私人專案或單位名稱', () => {
  const hit = findBanned(JSON.stringify(PITFALLS));
  assert.equal(hit, null, `出現了私人名稱：${hit}`);
});

test('私人名稱檢查真的抓得到（用雜湊比對）', () => {
  const list = [[sha('測試用字'), 4]];
  assert.equal(findBanned('一般的內容測試用字結尾', list), '測試用字');
  assert.equal(findBanned('完全沒問題的內容', list), null);
});

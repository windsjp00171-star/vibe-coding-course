// 名詞小辭典：自動幫內文的專業名詞加上「點我看白話」。
// 標錯位置（把 GitHub 的 Git 標成 Git）或同一個詞標滿整頁，都會讓學員更混亂。
const test = require('node:test');
const assert = require('node:assert/strict');
const { matchTerms } = require('../assets/js/lib.js');
const GLOSSARY = require('../assets/js/glossary-data.js');

const P = [
  { id: 'git', words: ['Git'] },
  { id: 'github', words: ['GitHub'] },
  { id: 'pages', words: ['GitHub Pages'] },
  { id: 'deploy', words: ['部署', 'deploy'] },
  { id: 'api', words: ['API'] },
];
const words = (text, hits) => hits.map((h) => text.slice(h.start, h.end));

test('英文詞要整個字相符：GitHub 裡的 Git 不能被當成 Git', () => {
  const text = '先把 GitHub 帳號開好';
  assert.deepEqual(words(text, matchTerms(text, P)), ['GitHub']);
});

test('同一個位置有長短兩個詞，取比較完整的（GitHub Pages 不能只標到 GitHub）', () => {
  const text = '用 GitHub Pages 免費上線';
  const hits = matchTerms(text, P);
  assert.deepEqual(words(text, hits), ['GitHub Pages']);
  assert.equal(hits[0].id, 'pages');
});

test('同一個詞只標第一次，整頁畫滿底線反而看不下去', () => {
  const text = '部署很簡單，部署完就能分享，deploy 也一樣';
  const hits = matchTerms(text, P);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].start, 0);
});

test('前面段落標過的詞，後面段落不再標', () => {
  const hits = matchTerms('Git 和 API', P, new Set(['git']));
  assert.deepEqual(hits.map((h) => h.id), ['api']);
});

test('中文詞不需要空白分隔也能找到；英文詞連在字母中間則不算', () => {
  const text = '把網站部署到雲端，但 APIs 或 myAPI 不算';
  assert.deepEqual(matchTerms(text, P).map((h) => h.id), ['deploy']);
});

test('前面出現的是黏在別的字裡的假詞，後面真正的詞仍然要標到', () => {
  const text = 'myAPI 不算，但這個 API 算';
  const hits = matchTerms(text, P);
  assert.deepEqual(hits.map((h) => h.start), [text.lastIndexOf('API')]);
});

test('多個詞依出現順序回傳，而且不會互相重疊', () => {
  const text = 'API 串好後用 Git 存檔再部署';
  const hits = matchTerms(text, P);
  assert.deepEqual(hits.map((h) => h.id), ['api', 'git', 'deploy']);
  hits.slice(1).forEach((h, i) => assert.ok(h.start >= hits[i].end));
});

test('辭典每個詞都有白話解釋，而且解釋夠短，一眼看得完', () => {
  const ids = new Set();
  for (const g of GLOSSARY) {
    assert.ok(g.id && !ids.has(g.id), `id 重複或缺少：${g.id}`);
    ids.add(g.id);
    assert.ok(g.term && g.cat, `${g.id} 缺名稱或分類`);
    assert.ok(g.plain && g.plain.length >= 8 && g.plain.length <= 70, `${g.id} 白話解釋長度 ${g.plain?.length}，要 8–70 字`);
    assert.ok(Array.isArray(g.words) && g.words.length > 0, `${g.id} 沒有可比對的字`);
  }
});

test('同一個字不能同時屬於兩個名詞，不然點下去不知道會跳哪個解釋', () => {
  const seen = new Map();
  for (const g of GLOSSARY) {
    for (const w of g.words) {
      assert.ok(!seen.has(w), `「${w}」同時出現在 ${seen.get(w)} 和 ${g.id}`);
      seen.set(w, g.id);
    }
  }
});

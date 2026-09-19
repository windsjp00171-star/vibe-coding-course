// 紙本講義：從網頁自動整理出重點和名詞。
// 重點句被切在半句話、或名詞表漏掉單元裡真的有出現的詞，學員拿到的紙本就會看不懂。
const test = require('node:test');
const assert = require('node:assert/strict');
const { firstSentence, unitTerms } = require('../assets/js/lib.js');
const GLOSSARY = require('../assets/js/glossary-data.js');

test('重點只取第一句話，而且保留句尾標點，不會切在半句', () => {
  assert.equal(firstSentence('Git 是存檔點。GitHub 是雲端保險箱。'), 'Git 是存檔點。');
  assert.equal(firstSentence('先想清楚要什麼？再動手。'), '先想清楚要什麼？');
  assert.equal(firstSentence('沒有句號的一句話'), '沒有句號的一句話');
});

test('第一句太長時，改用整句中第一個逗號前的片段，並加上刪節號', () => {
  const long = '這是一段非常非常長的說明，' + '後面還有很多很多字'.repeat(10) + '。';
  const out = firstSentence(long, 40);
  assert.ok(out.length <= 41, `長度 ${out.length}`);
  assert.ok(out.endsWith('…'));
});

test('名詞速查只列單元裡真的出現過的詞，而且依出現順序', () => {
  const ids = unitTerms('先用 Git 存檔，再 push 到 GitHub。部署之後……', GLOSSARY);
  assert.deepEqual(ids, ['git', 'push', 'github', 'deploy']);
});

test('同一個詞出現很多次，名詞表只列一次', () => {
  const ids = unitTerms('Git、Git、還是 Git', GLOSSARY);
  assert.deepEqual(ids, ['git']);
});

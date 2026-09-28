const test = require('node:test');
const assert = require('node:assert');
const { projectReady, PROJECT_CHECKS } = require('../assets/js/lib.js');

const allChecks = Object.fromEntries(PROJECT_CHECKS.map((c) => [c.key, true]));

test('網址和四項檢查都有，才算完成', () => {
  assert.deepStrictEqual(projectReady({ url: 'https://someone.github.io/party/', checks: allChecks }), { ok: true, missing: [] });
});

test('localhost、http、亂打的網址都不算', () => {
  for (const url of ['http://localhost:5173', 'https://localhost:5173/', 'http://someone.github.io', '我的網站', '']) {
    const r = projectReady({ url, checks: allChecks });
    assert.strictEqual(r.ok, false, url);
    assert.match(r.missing[0], /作品網址/);
  }
});

test('少勾一項會列出缺什麼', () => {
  const r = projectReady({ url: 'https://a.vercel.app', checks: { ...allChecks, vibecheck: false } });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.missing.length, 1);
  assert.match(r.missing[0], /全域稽核/);
});

test('什麼都沒填：網址加四項都缺', () => {
  assert.strictEqual(projectReady().missing.length, 1 + PROJECT_CHECKS.length);
});

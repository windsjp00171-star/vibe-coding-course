const test = require('node:test');
const assert = require('node:assert');
const { backupCoverage, BACKUP_LAYERS } = require('../assets/js/lib.js');

// 這個工具要教的是：備份不是「有沒有」，是「哪一種災難救得回來」。
test('什麼都沒有的時候，沒有任何一種災難救得回來', () => {
  const r = backupCoverage([]);
  assert.strictEqual(r.covered, 0);
  assert.strictEqual(r.level, 0);
});

test('只把程式碼放 GitHub，救不回被刪掉的資料', () => {
  const r = backupCoverage(['github', 'secrets']);
  const data = r.rows.find((x) => x.name.includes('資料被誤刪'));
  assert.ok(!data.ok, '資料類災難不該因為程式碼有備份就算安全');
  assert.ok(data.missing.includes('dbexport'));
});

test('匯出檔放在同一台電腦，電腦壞掉就一起沒了', () => {
  const r = backupCoverage(['github', 'dbexport', 'secrets']);
  assert.ok(!r.rows.find((x) => x.name.includes('資料被誤刪')).ok);
});

test('沒做過還原演練，就算每層都有也不能算完全安全', () => {
  const all = BACKUP_LAYERS.map((l) => l.id).filter((id) => id !== 'drill');
  const r = backupCoverage(all);
  assert.strictEqual(r.level, 1, '缺演練時最多只能是「差一步」');
});

test('每一層都有而且演練過，才算真的救得回來', () => {
  const r = backupCoverage(BACKUP_LAYERS.map((l) => l.id));
  assert.strictEqual(r.covered, r.total);
  assert.strictEqual(r.level, 2);
});

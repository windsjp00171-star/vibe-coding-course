const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'supabase');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const runAll = read('RUN-ALL.sql');
// RUN-ALL.sql 開頭列的合併清單
const parts = runAll.match(/【\d+／\d+】(\S+\.sql)/g).map((s) => s.replace(/【\d+／\d+】/, ''));

test('RUN-ALL.sql 和各支 SQL 檔一致（改了任何一支要重新合併）', () => {
  for (const f of parts) assert.ok(runAll.includes(read(f).trimEnd()), `RUN-ALL.sql 裡的 ${f} 是舊版：執行 python3 scripts/build_run_all.py`);
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    if (['RUN-ALL.sql', 'check-deploy.sql', 'new-cohort.sql'].includes(f)) continue;
    assert.ok(parts.includes(f), `${f} 沒有合併進 RUN-ALL.sql：加進 scripts/build_run_all.py 的清單`);
  }
  assert.strictEqual(parts.at(-2), 'fix-security.sql', '資安修正要排在後面，重跑才不會被前面的檔案蓋掉');
});

test('重跑任何一支都不會讓網頁自己寫證書', () => {
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const s = read(f);
    assert.ok(!/create policy "[^"]*" on public\.certificates for (insert|update|all)/i.test(s), `${f} 開了寫入證書的規則`);
    assert.ok(!/grant[^;]*\b(insert|update)\b[^;]*on public\.certificates/i.test(s), `${f} 開了寫入證書的權限`);
  }
});

test('check-deploy.sql 只會讀，不會改', () => {
  const s = read('check-deploy.sql').replace(/--.*$/gm, '');
  assert.ok(!/\b(insert|update|delete|drop|alter|create|grant|revoke|truncate)\b\s/i.test(s.replace(/'[^']*'/g, "''")), '健檢不能有寫入指令');
});

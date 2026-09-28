const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = path.join(__dirname, '..', 'starter');
const files = fs.readdirSync(dir);
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

test('範本裡不能出現 service_role／secret key，也沒有填好的真鑰匙', () => {
  for (const f of files) {
    const s = read(f);
    assert.ok(!/eyJ[A-Za-z0-9_-]{20,}\./.test(s), `${f} 看起來有真的金鑰`);
    assert.ok(!/sb_secret_/.test(s), `${f} 有 secret key`);
  }
  assert.match(read('config.js'), /supabaseUrl: '',/);
  assert.match(read('config.js'), /supabaseKey: '',/);
});

test('setup.sql：每張表都開 RLS，訪客沒有任何權限', () => {
  const sql = read('setup.sql');
  for (const t of ['entries', 'admins']) assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`));
  assert.match(sql, /revoke all on public\.entries from anon/);
  assert.match(sql, /revoke all on public\.admins from anon, authenticated/);
  assert.match(sql, /with check \(user_id = auth\.uid\(\) and status = '待處理'\)/, '新增時不能冒名、不能自己設成已確認');
});

test('config.js 的欄位格式正確（key 是英文、type 是支援的種類）', () => {
  const window = {};
  new Function('window', read('config.js'))(window);
  const keys = window.APP.fields.map((f) => f.key);
  assert.strictEqual(new Set(keys).size, keys.length, 'key 重複');
  for (const f of window.APP.fields) {
    assert.match(f.key, /^[a-z][a-z0-9_]*$/);
    assert.ok(['text', 'textarea', 'select', 'date', 'number', 'tel'].includes(f.type), f.type);
    if (f.type === 'select') assert.ok(f.options?.length, `${f.key} 沒有選項`);
  }
});

test('downloads/vibe-starter.zip 和 starter/ 一致（改了範本要重新打包）', () => {
  const list = execFileSync('python3', ['-c', `
import zipfile,sys
z=zipfile.ZipFile(sys.argv[1])
for n in sorted(z.namelist()): print(n, z.read(n) == open(sys.argv[2] + '/' + n.split('/', 1)[1], 'rb').read())
`, path.join(__dirname, '..', 'downloads', 'vibe-starter.zip'), dir]).toString().trim().split('\n');
  assert.strictEqual(list.length, files.length, 'zip 裡的檔案數和 starter/ 不同，請執行 python3 scripts/build_starter.py');
  for (const line of list) assert.ok(line.endsWith('True'), `${line.split(' ')[0]} 和 starter/ 不同，請執行 python3 scripts/build_starter.py`);
});

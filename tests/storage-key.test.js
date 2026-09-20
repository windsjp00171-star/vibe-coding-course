const test = require('node:test');
const assert = require('node:assert');
const { storageKey, storageLabel } = require('../assets/js/lib.js');

// 為什麼要有這兩個函式：Supabase Storage 只接受 ASCII 檔名，
// 講師的教材檔名幾乎都是中文，直接上傳會被擋（Invalid key）。
test('純英數檔名原樣保留，講師在 Supabase 後台也認得出來', () => {
  assert.strictEqual(storageKey('kahoot-m4.xlsx'), 'kahoot-m4.xlsx');
  assert.strictEqual(storageLabel('kahoot/kahoot-m4.xlsx'), 'kahoot-m4.xlsx');
});

test('中文檔名轉成 ASCII 才不會被 Supabase 擋下來', () => {
  const key = storageKey('學習手冊-完整-講師版.pdf');
  assert.match(key, /^[A-Za-z0-9][A-Za-z0-9._-]*$/);
  assert.ok(key.endsWith('.pdf'), '副檔名要留著，下載時才開得起來');
});

test('畫面上要還原成原本的中文，講師才知道那是哪一份', () => {
  const name = '學習手冊-完整-講師版.pdf';
  assert.strictEqual(storageLabel(`handbook/${storageKey(name)}`), name);
});

test('檔名有空白或括號也算不安全，一樣要編碼', () => {
  const name = '投影片 (第二版).pptx';
  assert.match(storageKey(name), /^[A-Za-z0-9][A-Za-z0-9._-]*$/);
  assert.strictEqual(storageLabel(storageKey(name)), name);
});

test('遇到壞掉的編碼不要整頁爆掉，原樣顯示就好', () => {
  assert.strictEqual(storageLabel('u_!!!.pdf'), 'u_!!!.pdf');
});

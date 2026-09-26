/*
 * audit_site.js — 全站體檢（靜態檢查）。
 * 執行：node scripts/audit_site.js
 *
 * 檢查的是「一定是錯的」那種問題，不做主觀判斷：
 * 連結指向不存在的檔案或錨點、重複的 id、圖片沒有替代文字、
 * 表單欄位沒有標籤、資源版本號不一致、教學步驟指向不存在的元素。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pages = [];
walk(ROOT);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'teacher', 'tests'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) pages.push(full);
  }
}

const findings = [];
const add = (level, file, what) => findings.push({ level, file: path.relative(ROOT, file).replace(/\\/g, '/'), what });

const idsOf = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const attrs = (html, name) => [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((m) => m[1]);

const pageIds = new Map();
const pageHtml = new Map();
for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  pageHtml.set(file, html);
  pageIds.set(file, new Set(idsOf(html)));
}

for (const file of pages) {
  // <script> 裡的 `${m.file}` 是執行時才組出來的連結，不是 HTML，檢查連結時要先拿掉
  const html = pageHtml.get(file).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  const dir = path.dirname(file);

  // 1) 重複的 id：JS 抓元素會抓錯一個
  const ids = idsOf(html);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  [...new Set(dupes)].forEach((id) => add('HIGH', file, `重複的 id="${id}"`));

  // 2) 內部連結：檔案與錨點都要存在
  for (const href of attrs(html, 'href')) {
    if (!href || /^(https?:|mailto:|tel:|#|data:)/.test(href)) {
      if (href.startsWith('#') && href.length > 1) {
        const target = decodeURIComponent(href.slice(1));
        // 動態產生的錨點（課程地圖的 part-N）不在靜態 HTML 裡
        if (!pageIds.get(file).has(target) && !/^part-\d+$/.test(target)) {
          add('HIGH', file, `錨點 ${href} 在這一頁找不到對應的 id`);
        }
      }
      continue;
    }
    const [rawPath, hash] = href.split('#');
    if (!rawPath) continue;
    const target = path.resolve(dir, rawPath.split('?')[0]);
    if (!fs.existsSync(target)) { add('HIGH', file, `連結指向不存在的檔案：${href}`); continue; }
    if (hash && target.endsWith('.html')) {
      const targetIds = pageIds.get(target) || new Set(idsOf(fs.readFileSync(target, 'utf8')));
      if (!targetIds.has(decodeURIComponent(hash)) && !/^part-\d+$/.test(hash)) {
        add('MEDIUM', file, `連結 ${href} 的錨點在目標頁不存在`);
      }
    }
  }

  // 3) 靜態資源（css/js）真的在不在
  for (const src of [...attrs(html, 'src'), ...attrs(html, 'href')]) {
    if (!src || !/\.(css|js)(\?|$)/.test(src) || /^https?:/.test(src)) continue;
    const target = path.resolve(dir, src.split('?')[0]);
    if (!fs.existsSync(target)) add('HIGH', file, `載入不存在的資源：${src}`);
  }

  // 4) 版本號要一致，否則會有人拿到舊的 JS 配新的 HTML
  const versions = new Set([...html.matchAll(/\?v=(\d+)/g)].map((m) => m[1]));
  if (versions.size > 1) add('MEDIUM', file, `資源版本號不一致：${[...versions].join(', ')}`);

  // 5) 圖片要有替代文字（螢幕閱讀器與圖片載不出來時）
  for (const img of html.match(/<img\b[^>]*>/g) || []) {
    if (!/\salt=/.test(img)) add('MEDIUM', file, `<img> 沒有 alt：${img.slice(0, 60)}…`);
  }

  // 6) 表單欄位要有標籤或 aria-label
  for (const input of html.match(/<(input|select|textarea)\b[^>]*>/g) || []) {
    if (/type="(hidden|submit|button)"/.test(input)) continue;
    const id = (input.match(/\sid="([^"]+)"/) || [])[1];
    const labelled = /aria-label=|aria-labelledby=/.test(input)
      || (id && html.includes(`for="${id}"`))
      || new RegExp(`<label[^>]*>[^<]*${input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(html);
    if (!labelled) {
      // <label>文字<input ...></label> 這種包起來的寫法也算
      const idx = html.indexOf(input);
      const before = html.slice(Math.max(0, idx - 400), idx);
      const openLabel = before.lastIndexOf('<label');
      const closeLabel = before.lastIndexOf('</label>');
      if (openLabel <= closeLabel) add('MEDIUM', file, `表單欄位沒有標籤：${input.slice(0, 70)}…`);
    }
  }

  // 7) 標題層級不要跳號（h1 → h3）
  const heads = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  for (let i = 1; i < heads.length; i += 1) {
    if (heads[i] - heads[i - 1] > 1) { add('LOW', file, `標題層級跳號：h${heads[i - 1]} 之後直接出現 h${heads[i]}`); break; }
  }

  // 8) 每頁都要有 title 與 description（搜尋結果與分享預覽）
  if (!/<title>[^<]{4,}<\/title>/.test(html)) add('MEDIUM', file, '缺少有意義的 <title>');
  if (!/name="description"/.test(html) && !/noindex/.test(html)) add('LOW', file, '缺少 meta description');
  if (!/<html lang="/.test(html)) add('MEDIUM', file, '<html> 沒有 lang 屬性');
}

// 9) 教學導覽：註冊的步驟要對得到頁面上的元素
const tourTargets = new Map(); // moduleFile -> Set(data-tour)
for (const file of pages) {
  const html = pageHtml.get(file);
  const mod = (html.match(/data-module="(m\d+)"/) || [])[1];
  if (!mod) continue;
  tourTargets.set(mod, new Set(attrs(html, 'data-tour')));
}
const jsDir = path.join(ROOT, 'assets', 'js', 'modules');
if (fs.existsSync(jsDir)) {
  for (const name of fs.readdirSync(jsDir)) {
    const mod = name.replace('.js', '');
    if (!tourTargets.has(mod)) continue;
    const js = fs.readFileSync(path.join(jsDir, name), 'utf8');
    for (const step of [...js.matchAll(/\{\s*tour:\s*'([^']+)'/g)].map((m) => m[1])) {
      if (!tourTargets.get(mod).has(step)) {
        add('HIGH', path.join(jsDir, name), `教學步驟 tour:'${step}' 在單元頁上找不到 data-tour="${step}"`);
      }
    }
  }
}

// ---------- 輸出 ----------
const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
findings.sort((a, b) => order[a.level] - order[b.level] || a.file.localeCompare(b.file));
const counts = findings.reduce((acc, f) => ({ ...acc, [f.level]: (acc[f.level] || 0) + 1 }), {});
console.log(`掃描 ${pages.length} 個頁面，發現 ${findings.length} 項：HIGH ${counts.HIGH || 0}、MEDIUM ${counts.MEDIUM || 0}、LOW ${counts.LOW || 0}\n`);
for (const f of findings) console.log(`[${f.level}] ${f.file}　${f.what}`);
process.exitCode = counts.HIGH ? 1 : 0;

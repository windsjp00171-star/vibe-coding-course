/*
 * browser_check_lib.js — check_mobile.js 和 check_present.js 共用：
 * 開一個本機小伺服器放整個網站，列出要檢查的頁面，並把「試用閘門、導覽教學」拿掉，檢查才看得到完整內容。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

// 起一個只給本機用的靜態伺服器，回傳網址；檢查完呼叫 close()
function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ base: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() });
  }));
}

// 全站頁面（講師後台、報價單這類工具頁也一起檢查）
function allPages() {
  return [
    ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')),
    ...fs.readdirSync(path.join(ROOT, 'modules')).filter((f) => f.endsWith('.html')).map((f) => `modules/${f}`),
  ];
}

// 模擬已開通的學員：拿掉試用閘門與自動跳出的導覽教學
async function unlock(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[class^="tour-"]').forEach((n) => n.remove());
    document.body.classList.remove('is-locked');
    document.querySelector('[data-gate-card]')?.remove();
  });
}

module.exports = { ROOT, serve, allPages, unlock };

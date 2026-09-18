// 執行：node --test tests/
// 這些測試守住的是「教學正確性」：學員看到的判斷若錯了，等於在課堂上教錯觀念。
const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../assets/js/lib.js');

test('maskPII：台灣常見個資都要被遮住，才不會示範「遮了卻漏掉」', () => {
  const input = '我是王小明，身分證 A123456789，手機 0912-345-678，信箱 ming@corp.com.tw，卡號 4111 1111 1111 1111，員編 EMP-20931';
  const { masked, found } = lib.maskPII(input);
  for (const leaked of ['A123456789', '0912-345-678', 'ming@corp.com.tw', '4111 1111 1111 1111', 'EMP-20931']) {
    assert.ok(!masked.includes(leaked), `仍看得到：${leaked}`);
  }
  assert.deepEqual(found.map((f) => f.type).sort(),
    ['Email', '信用卡號', '員工編號', '手機號碼', '身分證字號'].sort());
});

test('maskPII：一般句子不應被誤遮，否則學員會以為什麼都不能給 AI', () => {
  const { masked, found } = lib.maskPII('請幫我把這份週報改得更精簡，重點放在第三季營收成長 12%。');
  assert.equal(found.length, 0);
  assert.equal(masked, '請幫我把這份週報改得更精簡，重點放在第三季營收成長 12%。');
});

test('maskPII：API 金鑰要被遮，這是 Vibe Coding 最常見的外洩', () => {
  const { masked } = lib.maskPII('key = sk-proj-abcdef1234567890');
  assert.ok(!masked.includes('sk-proj'));
});

test('scanCode：課堂三個經典陷阱都要抓得到', () => {
  const rules = (code) => lib.scanCode(code).map((f) => f.rule);
  assert.ok(rules('const openai = new OpenAI({ apiKey: "sk-proj-7890abcdef1234567890" });').includes('secret'));
  assert.ok(rules('os.system("ping " + user_input)').includes('shell'));
  assert.ok(rules('const q = "SELECT * FROM users WHERE id = \'" + userId + "\'";').includes('sql'));
  assert.ok(rules('const auth = require("express-auth-ultra-secure");').includes('package'));
});

test('scanCode：修好的安全範例必須「零問題」，否則示範會自相矛盾', () => {
  const safe = [
    'require("dotenv").config();',
    'const OpenAI = require("openai");',
    'const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });',
    'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
  ].join('\n');
  assert.deepEqual(lib.scanCode(safe), []);
});

test('scanCode：回報的行號要對，講師才能指著那一行講解', () => {
  const findings = lib.scanCode('const a = 1;\nconst b = 2;\nos.system("rm -rf /tmp/x")');
  assert.ok(findings.length > 0);
  assert.ok(findings.every((f) => f.line === 3));
});

test('scoreQuiz：及格線 70 分', () => {
  const qs = Array.from({ length: 10 }, () => ({ answer: 0 }));
  assert.equal(lib.scoreQuiz(qs, [0, 0, 0, 0, 0, 0, 0, 1, 1, 1]).passed, true);
  assert.equal(lib.scoreQuiz(qs, [0, 0, 0, 0, 0, 0, 1, 1, 1, 1]).passed, false);
  assert.equal(lib.scoreQuiz([], []).percent, 0);
});

test('scoreGate：放走一個危險請求的代價，要比誤擋安全請求重', () => {
  const reqs = [{ safe: true }, { safe: false }];
  const leak = lib.scoreGate(reqs, ['allow', 'allow']);
  const overBlock = lib.scoreGate(reqs, ['block', 'block']);
  assert.ok(leak.score < overBlock.score, '放行危險應該比過度謹慎分數低');
  assert.equal(leak.leaks, 1);
  assert.equal(overBlock.overBlocks, 1);
  assert.equal(lib.scoreGate(reqs, ['allow', 'block']).score, 20);
});

test('pick：抽題不重複、不超過題庫', () => {
  const picked = lib.pick([1, 2, 3, 4, 5], 3);
  assert.equal(new Set(picked).size, 3);
  assert.equal(lib.pick([1, 2], 5).length, 2);
});

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

test('checkPrompt：模糊的指令要被指出缺少零件，這是單元 3 的教學重點', () => {
  const r = lib.checkPrompt('幫我做一個網站');
  assert.ok(r.score <= 1, `模糊指令不該拿高分，得到 ${r.score}`);
  assert.equal(r.parts.find((p) => p.id === 'done').ok, false);
});

test('checkPrompt：五個零件齊全的指令要拿滿分，否則學員照範例寫也過不了', () => {
  const good = '請先列出步驟給我看，我同意再開始。幫我做一個部門聚餐報名表，給同事用手機填，只要一個 html 檔就好，不要用框架。做完自己測一次，並告訴我怎麼打開。';
  assert.equal(lib.checkPrompt(good).score, 5);
});

test('checkPrompt：空白或太短不算分', () => {
  assert.equal(lib.checkPrompt('').score, 0);
  assert.equal(lib.checkPrompt('幫我做').score, 0);
});

test('scanCode：單元 6「找鑰匙」遊戲的答案靠這個判斷，寫死的密碼一定要抓到', () => {
  const lines = (code) => lib.scanCode(code).filter((f) => f.rule === 'secret').map((f) => f.line);
  assert.deepEqual(lines("const pool = new Pool({\n  host: 'db.example.com',\n  password: 'MyCompany2026!',\n});"), [3]);
  assert.deepEqual(lines('const c = new OpenAI({\n  apiKey: process.env.OPENAI_API_KEY,\n});'), [], '讀 process.env 的是正確寫法，不能被誤判');
});

test('scoreQuiz：可以指定較高的及格線（總測驗 80 分）', () => {
  const qs = Array.from({ length: 10 }, () => ({ answer: 0 }));
  const sevenFive = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1];
  assert.equal(lib.scoreQuiz(qs, sevenFive).passed, true);
  assert.equal(lib.scoreQuiz(qs, sevenFive, 80).passed, false);
});

test('classifyNote：有時間詞一定是待辦，不能被當成筆記（講師小秘書的核心規則）', () => {
  const today = new Date(2026, 8, 18);
  const r = lib.classifyNote('明天下午去阿秦家', today);
  assert.equal(r.type, 'task');
  assert.equal(r.due_date, '2026-09-19');
  assert.equal(lib.classifyNote('提醒我明天繳電話費', today).type, 'reminder');
  assert.equal(lib.classifyNote('報名系統的推播功能完成了', today).type, 'project_update');
  assert.equal(lib.classifyNote('會議重點：下一季要多辦親子活動', today).type, 'note');
});

test('utcToTaiwan：排程 UTC 0 點就是台灣早上 8 點，跨日也要正確', () => {
  assert.equal(lib.utcToTaiwan(0), 8);
  assert.equal(lib.utcToTaiwan(16), 0);
  assert.equal(lib.utcToTaiwan(20), 4);
});

test('simulatePushWeek：四個原則都做到，一週只發一次、白天發、點進來看得到', () => {
  const r = lib.simulatePushWeek({ window: true, dedupe: true, askOnClick: true, siteFirst: true });
  assert.equal(r.total, 1);
  assert.equal(r.firstTime, '09:00');
  assert.equal(r.emptyOnClick, false);
});

test('simulatePushWeek：沒去重又沒時段，一天轟炸 96 次，而且半夜 00:07 開始（講師真實事故的數字）', () => {
  const r = lib.simulatePushWeek({ window: false, dedupe: false, askOnClick: true, siteFirst: true });
  assert.equal(r.perDay[0], 96);
  assert.equal(r.firstTime, '00:07');
});

test('simulatePushWeek：一進站就問權限，被拒絕後整週一則都收不到', () => {
  const r = lib.simulatePushWeek({ window: true, dedupe: true, askOnClick: false, siteFirst: true });
  assert.equal(r.total, 0);
  assert.equal(r.subscribed, false);
});

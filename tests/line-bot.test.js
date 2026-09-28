// LINE AI 小秘書範本的兩支 Edge Function：用假的 LINE／資料庫／AI 測試流程與防護
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { stripTypeScriptTypes } = require('node:module');

const load = (name) => import('data:text/javascript,' + encodeURIComponent(stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '..', 'bot-starter', 'functions', name, 'index.ts'), 'utf8'))));
const ENV = { LINE_CHANNEL_SECRET: 'sec', LINE_CHANNEL_ACCESS_TOKEN: 'tok', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srv', CRON_SECRET: 'cron' };
const ME = 'U' + 'a'.repeat(32);
const YOU = 'U' + 'b'.repeat(32);
const NOW = new Date('2026-09-28T06:30:00Z'); // 台灣 9/28（一）14:30
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

function fakeFetch(routes = {}) {
  const calls = [];
  const f = async (url, opts = {}) => {
    calls.push({ url, opts, body: opts.body ? JSON.parse(opts.body) : null });
    const hit = Object.keys(routes).find((k) => url.includes(k));
    return hit ? routes[hit](url, opts) : json({});
  };
  f.calls = calls;
  f.replies = () => calls.filter((c) => c.url.includes('/message/reply')).map((c) => c.body.messages[0].text);
  return f;
}
function lineRequest(text, user = ME, secret = 'sec') {
  const body = JSON.stringify({ events: [{ type: 'message', replyToken: 'r1', source: { userId: user }, message: { type: 'text', text } }] });
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64');
  return new Request('https://fn/line-bot', { method: 'POST', headers: { 'x-line-signature': sig }, body });
}
const noAI = async () => { throw new Error('不該呼叫 AI'); };

test('簽章不對的訊息一律拒絕，也不會呼叫 AI 或資料庫', async () => {
  const { handle } = await load('line-bot');
  const f = fakeFetch();
  const res = await handle(lineRequest('明天開會', ME, 'guess'), ENV, { fetch: f, classify: noAI, now: () => NOW });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(f.calls.length, 0);
});

test('「說明」「清單」「完成 N」由程式處理，不花 AI 的錢', async () => {
  const { handle } = await load('line-bot');
  const items = [{ id: 7, kind: '提醒', title: '開會', date: '2026-09-29', time: '15:00' }, { id: 9, kind: '待辦', title: '交報告', date: '2026-10-02', time: null }];
  const f = fakeFetch({ 'bot_items?line_user_id': () => json(items) });
  for (const t of ['說明', '清單', '完成 2', '完成 9']) await handle(lineRequest(t), ENV, { fetch: f, classify: noAI, now: () => NOW });
  const [help, list, done, missing] = f.replies();
  assert.match(help, /清單/);
  assert.strictEqual(list.split('\n').slice(1, 3).join('|'), '1. 開會（9/29 15:00）|2. 交報告（10/2）');
  assert.strictEqual(done, '✅ 已完成：交報告');
  assert.match(missing, /找不到這個編號/);
  const patch = f.calls.find((c) => c.opts.method === 'PATCH');
  assert.match(patch.url, /bot_items\?id=eq\.9&line_user_id=eq\.U/, '只能改自己的那一筆');
  assert.deepStrictEqual(patch.body, { done: true });
});

test('一般的話交給 AI 分類；提醒的時間由程式換算成國際時間', async () => {
  const { handle } = await load('line-bot');
  const f = fakeFetch();
  let seen;
  const classify = async (text, now) => { seen = { text, now }; return { kind: '提醒', title: '跟阿秦開會', date: '2026-09-29', time: '15:00', reply: '好的，記下來了！' }; };
  await handle(lineRequest('明天下午三點跟阿秦開會'), ENV, { fetch: f, classify, now: () => NOW });
  assert.strictEqual(seen.text, '明天下午三點跟阿秦開會');
  const insert = f.calls.find((c) => c.opts.method === 'POST' && c.url.endsWith('/rest/v1/bot_items'));
  assert.strictEqual(insert.body.remind_at, '2026-09-29T07:00:00.000Z', '台灣 15:00 = UTC 07:00');
  assert.strictEqual(insert.body.line_user_id, ME);
  assert.match(f.replies()[0], /好的，記下來了！\n【提醒】跟阿秦開會\n⏰ 9\/29 15:00 會提醒你/);
});

test('待辦只有日期：不設提醒時間，改列在當天早上的清單', async () => {
  const { handle } = await load('line-bot');
  const f = fakeFetch();
  await handle(lineRequest('週五前交報告'), ENV, { fetch: f, classify: async () => ({ kind: '待辦', title: '交報告', date: '2026-10-02', time: null, reply: '' }), now: () => NOW });
  const insert = f.calls.find((c) => c.opts.method === 'POST' && c.url.endsWith('/rest/v1/bot_items'));
  assert.strictEqual(insert.body.remind_at, null);
  assert.match(f.replies()[0], /📅 10\/2 早上會列在今日清單/);
});

test('AI 看不懂、訊息太長、不在白名單：都不存資料', async () => {
  const { handle } = await load('line-bot');
  const f = fakeFetch();
  await handle(lineRequest('asdf'), ENV, { fetch: f, classify: async () => null, now: () => NOW });
  await handle(lineRequest('灌'.repeat(201)), ENV, { fetch: f, classify: noAI, now: () => NOW });
  await handle(lineRequest('明天開會', YOU), { ...ENV, ALLOWED_LINE_USERS: ME }, { fetch: f, classify: noAI, now: () => NOW });
  const [unknown, long, blocked] = f.replies();
  assert.match(unknown, /沒看懂/);
  assert.match(long, /200 字以內/);
  assert.match(blocked, new RegExp(`只開放給指定的人.*${YOU}`));
  assert.ok(!f.calls.some((c) => c.opts.method === 'POST' && c.url.endsWith('/rest/v1/bot_items')));
});

test('檢查 AI 的回答：分類不在設計裡、格式不對就不收', async () => {
  const { validate } = await load('line-bot');
  assert.strictEqual(validate({ kind: '駭客', title: 'x', date: null, time: null, reply: '' }), null);
  assert.strictEqual(validate({ kind: '筆記', title: '', date: null, time: null, reply: '' }), null);
  assert.strictEqual(validate('not json'), null);
  assert.deepStrictEqual(validate({ kind: '提醒', title: '喝水', date: '明天', time: '25:99', reply: '好' }), { kind: '提醒', title: '喝水', date: null, time: null, reply: '好' });
  assert.strictEqual(validate({ kind: '提醒', title: '喝水', date: null, time: '15:00', reply: '' }).time, null, '沒有日期的時間不收');
});

test('台灣時間換算：UTC 17:00 已經是台灣隔天凌晨 1 點', async () => {
  const { taipeiParts, toUtc } = await load('line-bot');
  assert.deepStrictEqual(taipeiParts(new Date('2026-09-28T17:00:00Z')), { date: '2026-09-29', time: '01:00', weekday: '二' });
  assert.strictEqual(toUtc('2026-09-29', '08:00'), '2026-09-29T00:00:00.000Z');
});

const cron = (body, secret = 'cron') => new Request('https://fn/line-remind', { method: 'POST', headers: { 'x-cron-secret': secret }, body: JSON.stringify(body) });

test('鬧鐘：沒有暗號、暗號錯、沒設暗號都拒絕', async () => {
  const { handle } = await load('line-remind');
  const f = fakeFetch();
  assert.strictEqual((await handle(cron({ mode: 'due' }, 'guess'), ENV, { fetch: f })).status, 401);
  assert.strictEqual((await handle(cron({ mode: 'due' }, ''), { ...ENV, CRON_SECRET: '' }, { fetch: f })).status, 401);
  assert.strictEqual(f.calls.length, 0);
});

test('鬧鐘 due：推時間到了的提醒，並標記已提醒', async () => {
  const { handle } = await load('line-remind');
  const f = fakeFetch({ 'remind_at=lte.': () => json([{ id: 3, line_user_id: ME, title: '喝水', time: '14:30' }, { id: 4, line_user_id: YOU, title: '開會', time: '14:25' }]) });
  const res = await handle(cron({ mode: 'due' }), ENV, { fetch: f, now: () => NOW });
  assert.deepStrictEqual(await res.json(), { mode: 'due', sent: 2 });
  assert.match(f.calls[0].url, /remind_at=lte\.2026-09-28T06:30:00\.000Z&reminded=is\.false&done=is\.false/);
  const pushes = f.calls.filter((c) => c.url.includes('/message/push'));
  assert.deepStrictEqual(pushes.map((p) => [p.body.to, p.body.messages[0].text]), [[ME, '⏰ 提醒：喝水（14:30）'], [YOU, '⏰ 提醒：開會（14:25）']]);
  const patch = f.calls.find((c) => c.opts.method === 'PATCH');
  assert.match(patch.url, /id=in\.\(3,4\)/);
});

test('鬧鐘 morning：每個人一則今日清單，標出已過期的', async () => {
  const { handle } = await load('line-remind');
  const f = fakeFetch({ 'date=lte.': () => json([
    { id: 1, line_user_id: ME, title: '交報告', date: '2026-09-27', time: null },
    { id: 2, line_user_id: ME, title: '開會', date: '2026-09-28', time: '15:00' },
    { id: 5, line_user_id: YOU, title: '買菜', date: '2026-09-28', time: null },
  ]) });
  const res = await handle(cron({ mode: 'morning' }), ENV, { fetch: f, now: () => new Date('2026-09-28T00:00:00Z') });
  assert.deepStrictEqual(await res.json(), { mode: 'morning', users: 2, items: 3 });
  assert.match(f.calls[0].url, /date=lte\.2026-09-28/, 'UTC 0 點＝台灣 9/28 早上 8 點');
  const mine = f.calls.find((c) => c.url.includes('/message/push') && c.body.to === ME).body.messages[0].text;
  assert.match(mine, /1\. 交報告（已過期）\n2\. 開會（15:00）/);
});

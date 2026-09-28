// LINE 加裝包的兩支 Edge Function：用假的 LINE／Supabase 回應測試流程與防護
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { stripTypeScriptTypes } = require('node:module');
// Edge Function 是 TypeScript：拿掉型別標註後，用 Node 直接執行同一份程式
const load = (name) => import('data:text/javascript,' + encodeURIComponent(stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '..', 'starter', 'functions', name, 'index.ts'), 'utf8'))));
const ENV = { LINE_CHANNEL_ID: '123', LINE_CHANNEL_SECRET: 's', SITE_URL: 'https://amy.github.io/app/', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srv', WEBHOOK_SECRET: 'w', LINE_CHANNEL_ACCESS_TOKEN: 't', APP_NAME: '設備借用' };
const LINE_ID = 'U' + 'a'.repeat(32);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

// 依網址回應的假 fetch，並記下每一次呼叫
function fakeFetch(routes) {
  const calls = [];
  const f = async (url, opts = {}) => {
    calls.push({ url, opts });
    const hit = Object.keys(routes).find((k) => url.includes(k));
    return hit ? routes[hit](url, opts) : json({}, 404);
  };
  f.calls = calls;
  return f;
}
const post = (body) => new Request('https://fn/line-login', { method: 'POST', body: JSON.stringify(body) });

test('line-login：換 token → 驗證 → 建帳號 → 回傳一次性憑證', async () => {
  const { handle } = await load('line-login');
  const f = fakeFetch({
    '/oauth2/v2.1/token': () => json({ id_token: 'idt' }),
    '/oauth2/v2.1/verify': () => json({ sub: LINE_ID, name: '王小明' }),
    '/admin/users': () => json({ id: 'u1' }),
    '/admin/generate_link': () => json({ hashed_token: 'hash123' }),
  });
  const res = await handle(post({ code: 'c', redirectUri: 'https://amy.github.io/app/' }), ENV, f);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { token_hash: 'hash123' });
  assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), 'https://amy.github.io');
  const create = JSON.parse(f.calls.find((c) => c.url.endsWith('/admin/users')).opts.body);
  assert.strictEqual(create.app_metadata.line_user_id, LINE_ID, 'LINE 代號放在使用者改不了的 app_metadata');
  assert.match(create.email, /@line\.invalid$/);
  assert.match(f.calls[0].opts.body.toString(), /client_secret=s/, '秘密金鑰只在後端送出');
});

test('line-login：帳號已存在（422）也能登入', async () => {
  const { handle } = await load('line-login');
  const f = fakeFetch({
    '/oauth2/v2.1/token': () => json({ id_token: 'idt' }),
    '/oauth2/v2.1/verify': () => json({ sub: LINE_ID }),
    '/admin/users': () => json({ msg: 'exists' }, 422),
    '/admin/generate_link': () => json({ properties: { hashed_token: 'h2' } }),
  });
  const res = await handle(post({ code: 'c', redirectUri: 'x' }), ENV, f);
  assert.deepStrictEqual(await res.json(), { token_hash: 'h2' });
});

test('line-login：代碼無效、驗證失敗、格式錯誤都擋下', async () => {
  const { handle } = await load('line-login');
  const bad = fakeFetch({ '/oauth2/v2.1/token': () => json({ error: 'invalid_grant' }, 400) });
  assert.strictEqual((await handle(post({ code: 'c', redirectUri: 'x' }), ENV, bad)).status, 401);
  const badVerify = fakeFetch({ '/oauth2/v2.1/token': () => json({ id_token: 'idt' }), '/oauth2/v2.1/verify': () => json({ error: 'invalid' }, 400) });
  assert.strictEqual((await handle(post({ code: 'c', redirectUri: 'x' }), ENV, badVerify)).status, 401);
  const weird = fakeFetch({ '/oauth2/v2.1/token': () => json({ id_token: 'idt' }), '/oauth2/v2.1/verify': () => json({ sub: '../../admin' }) });
  assert.strictEqual((await handle(post({ code: 'c', redirectUri: 'x' }), ENV, weird)).status, 401);
  assert.strictEqual((await handle(post({}), ENV, fakeFetch({}))).status, 400);
  assert.strictEqual((await handle(new Request('https://fn', { method: 'GET' }), ENV, fakeFetch({}))).status, 405);
  assert.strictEqual((await handle(new Request('https://fn', { method: 'OPTIONS' }), ENV, fakeFetch({}))).status, 200);
});

const hook = (body, secret = 'w') => new Request('https://fn/line-notify', { method: 'POST', headers: { 'x-webhook-secret': secret }, body: JSON.stringify(body) });
const change = (status, old = '待處理') => ({ type: 'UPDATE', record: { user_id: 'u1', status, data: { name: '王小明', item: '投影機' } }, old_record: { status: old } });

test('line-notify：狀態改成已確認 → 推訊息給本人', async () => {
  const { handle } = await load('line-notify');
  const f = fakeFetch({ '/admin/users/u1': () => json({ app_metadata: { line_user_id: LINE_ID } }), '/v2/bot/message/push': () => json({}) });
  const res = await handle(hook(change('已確認')), ENV, f);
  assert.deepStrictEqual(await res.json(), { sent: true, status: 200 });
  const push = f.calls.find((c) => c.url.includes('/message/push'));
  const body = JSON.parse(push.opts.body);
  assert.strictEqual(body.to, LINE_ID);
  assert.match(body.messages[0].text, /【設備借用】你的登記狀態更新為「已確認」\n王小明／投影機/);
  assert.strictEqual(push.opts.headers.Authorization, 'Bearer t');
});

test('line-notify：沒有暗號、暗號錯誤一律拒絕', async () => {
  const { handle } = await load('line-notify');
  const f = fakeFetch({});
  assert.strictEqual((await handle(hook(change('已確認'), 'guess'), ENV, f)).status, 401);
  assert.strictEqual((await handle(hook(change('已確認'), ''), { ...ENV, WEBHOOK_SECRET: '' }, f)).status, 401, '沒設 WEBHOOK_SECRET 也不能放行');
  assert.strictEqual(f.calls.length, 0);
});

test('line-notify：新增、狀態沒變、改回待處理、不是 LINE 使用者都不發', async () => {
  const { handle } = await load('line-notify');
  const f = fakeFetch({ '/admin/users/u1': () => json({ app_metadata: {} }) });
  for (const body of [{ type: 'INSERT', record: change('待處理').record }, change('已確認', '已確認'), change('待處理', '已確認'), change('已取消')]) {
    const r = await (await handle(hook(body), ENV, f)).json();
    assert.ok(r.skipped, JSON.stringify(body));
  }
  assert.ok(!f.calls.some((c) => c.url.includes('/message/push')));
});

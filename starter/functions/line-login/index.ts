// line-login：LINE 登入的後端小程式（Supabase Edge Function）
//
// 網頁拿到 LINE 給的一次性代碼（code）後交給這裡：
//   1. 用 Channel secret 向 LINE 換 id_token（秘密金鑰只放在這裡，不進網頁）
//   2. 請 LINE 驗證 id_token，確認是這個 channel 發的、沒被竄改
//   3. 用 LINE 使用者代號建立（或找到）Supabase 帳號，代號存在 app_metadata（使用者自己改不了）
//   4. 產生一次性登入憑證交回網頁，網頁用它換成正式的登入狀態
//
// 需要的 Secrets（Supabase → Edge Functions → Secrets）：LINE_CHANNEL_ID、LINE_CHANNEL_SECRET、SITE_URL
// SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 由 Supabase 自動提供，不用自己設。
// 設定時要把「Verify JWT」關掉：使用者還沒登入，拿不到 JWT。

export async function handle(req: Request, env: Record<string, string>, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const cors = {
    'Access-Control-Allow-Origin': env.SITE_URL ? new URL(env.SITE_URL).origin : '*',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: '只接受 POST' });

  let code: string, redirectUri: string;
  try { ({ code, redirectUri } = await req.json()); } catch { return reply(400, { error: '格式不對' }); }
  if (!code || !redirectUri) return reply(400, { error: '缺少 code 或 redirectUri' });

  // 1) 一次性代碼 → id_token
  const tokenRes = await fetchImpl('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: env.LINE_CHANNEL_ID, client_secret: env.LINE_CHANNEL_SECRET }),
  });
  if (!tokenRes.ok) return reply(401, { error: 'LINE 登入代碼無效或已經用過，請重新按一次「用 LINE 登入」' });
  const { id_token: idToken } = await tokenRes.json();

  // 2) 請 LINE 驗證 id_token（確認是發給我們這個 channel 的）
  const verifyRes = await fetchImpl('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: env.LINE_CHANNEL_ID }),
  });
  if (!verifyRes.ok) return reply(401, { error: 'LINE 身分驗證失敗' });
  const profile = await verifyRes.json();
  const lineId = String(profile.sub || '');
  if (!/^U[0-9a-f]{32}$/.test(lineId)) return reply(401, { error: 'LINE 身分驗證失敗' });

  // 3) 建立或找到 Supabase 帳號。LINE 不一定給 Email，所以用 LINE 代號組一個專用的登入名稱
  const email = `${lineId.toLowerCase()}@line.invalid`;
  const admin = (path: string, body: unknown) => fetchImpl(`${env.SUPABASE_URL}/auth/v1/admin/${path}`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const created = await admin('users', { email, email_confirm: true, app_metadata: { line_user_id: lineId }, user_metadata: { name: profile.name || 'LINE 使用者' } });
  if (!created.ok && created.status !== 422) return reply(500, { error: '建立帳號失敗，請通知管理者' }); // 422 = 帳號已經存在，直接登入

  // 4) 一次性登入憑證（不會寄信）
  const linkRes = await admin('generate_link', { type: 'magiclink', email });
  if (!linkRes.ok) return reply(500, { error: '產生登入憑證失敗，請通知管理者' });
  const link = await linkRes.json();
  const tokenHash = link.hashed_token || link.properties?.hashed_token;
  if (!tokenHash) return reply(500, { error: '產生登入憑證失敗，請通知管理者' });
  return reply(200, { token_hash: tokenHash });
}

if (typeof Deno !== 'undefined') Deno.serve((req) => handle(req, Deno.env.toObject()));

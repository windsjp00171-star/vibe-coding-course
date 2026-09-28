// line-notify：登記狀態被管理者改掉時，推 LINE 訊息給本人（Supabase Edge Function）
//
// 由資料庫觸發：Supabase → Database → Webhooks，資料表 entries、事件 Update，
// 送到這支函式，並加一個 header「x-webhook-secret」，值和 Secrets 裡的 WEBHOOK_SECRET 一樣。
// 沒有這個暗號的請求一律拒絕，免得有人拿網址亂發訊息。
//
// 需要的 Secrets：LINE_CHANNEL_ACCESS_TOKEN（Messaging API 的長期存取權杖）、WEBHOOK_SECRET、APP_NAME（選填，訊息開頭的系統名稱）
// 只有用 LINE 登入、而且加了官方帳號好友的人收得到。

export async function handle(req: Request, env: Record<string, string>, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const ok = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  const secret = req.headers.get('x-webhook-secret') || '';
  if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 401 });

  let payload: any;
  try { payload = await req.json(); } catch { return new Response('bad request', { status: 400 }); }
  const { type, record, old_record: old } = payload || {};
  if (type !== 'UPDATE' || !record || record.status === old?.status || record.status === '待處理') return ok({ skipped: '狀態沒有改變' });

  // 找出這筆登記的主人的 LINE 代號（存在 app_metadata，使用者自己改不了）
  const userRes = await fetchImpl(`${env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(record.user_id)}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!userRes.ok) return ok({ skipped: '找不到使用者' });
  const user = await userRes.json();
  const lineId = user.app_metadata?.line_user_id;
  if (!lineId) return ok({ skipped: '這個人不是用 LINE 登入的' });

  const summary = Object.values(record.data || {}).filter(Boolean).slice(0, 3).join('／');
  const text = `${env.APP_NAME ? `【${env.APP_NAME}】` : ''}你的登記狀態更新為「${record.status}」${summary ? `\n${summary}` : ''}`;
  const push = await fetchImpl('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: lineId, messages: [{ type: 'text', text: text.slice(0, 1000) }] }),
  });
  // 對方封鎖或沒加好友時 LINE 會回錯誤；不讓資料庫重送，記下來就好
  return ok({ sent: push.ok, status: push.status });
}

if (typeof Deno !== 'undefined') Deno.serve((req) => handle(req, Deno.env.toObject()));

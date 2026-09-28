// line-remind：小秘書的「鬧鐘」（Supabase Edge Function）
//
// 由資料庫的排程（pg_cron，setup.sql 第 3 段）定時叫醒：
//   mode = "due"      每 5 分鐘：時間到了的提醒，推給本人
//   mode = "morning"  每天 UTC 0 點（＝台灣早上 8 點）：推「今天要做的事」
// 這就是單元 12 說的「AI 做判斷，程式做排程」：什麼時候提醒，完全由程式決定。
//
// 需要的 Secrets：LINE_CHANNEL_ACCESS_TOKEN、CRON_SECRET（自己亂打的暗號，要和 setup.sql 裡的一樣）
// 沒帶暗號的請求一律拒絕，免得有人拿網址亂發訊息。

type Item = { id: number; line_user_id: string; title: string; date: string | null; time: string | null };

const TW_OFFSET = 8 * 60 * 60 * 1000;
const taipeiDate = (now: Date) => new Date(now.getTime() + TW_OFFSET).toISOString().slice(0, 10);

export async function handle(req: Request, env: Record<string, string>, deps: { fetch?: typeof fetch; now?: () => Date } = {}): Promise<Response> {
  const f = deps.fetch || fetch;
  const now = (deps.now || (() => new Date()))();
  const ok = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  if (!env.CRON_SECRET || req.headers.get('x-cron-secret') !== env.CRON_SECRET) return new Response('forbidden', { status: 401 });

  let mode = 'due';
  try { mode = (await req.json()).mode || 'due'; } catch { /* 沒有 body 就當作 due */ }

  const db = (path: string, init: RequestInit = {}) => f(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const push = (to: string, text: string) => f('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, messages: [{ type: 'text', text: text.slice(0, 2000) }] }),
  });

  if (mode === 'morning') {
    // 今天（含過期還沒做完）的待辦與提醒，每個人一則
    const today = taipeiDate(now);
    const res = await db(`bot_items?done=is.false&date=lte.${today}&kind=neq.${encodeURIComponent('筆記')}&order=date.asc,time.asc.nullslast&select=id,line_user_id,title,date,time`);
    const items: Item[] = res.ok ? await res.json() : [];
    const byUser = new Map<string, Item[]>();
    for (const i of items) byUser.set(i.line_user_id, [...(byUser.get(i.line_user_id) || []), i]);
    for (const [user, list] of byUser) {
      const lines = list.map((i, n) => `${n + 1}. ${i.title}${i.time ? `（${i.time}）` : ''}${i.date && i.date < today ? '（已過期）' : ''}`);
      // 這裡只列今天的，編號和「清單」不同，所以請使用者看「清單」的編號再打勾
      await push(user, `☀️ 早安！今天要做的事：\n${lines.join('\n')}\n\n做完了先傳「清單」看編號，再回我「完成 編號」`);
    }
    return ok({ mode, users: byUser.size, items: items.length });
  }

  // due：時間到了、還沒提醒過、還沒做完的
  const res = await db(`bot_items?remind_at=lte.${now.toISOString()}&reminded=is.false&done=is.false&select=id,line_user_id,title,date,time`);
  const due: Item[] = res.ok ? await res.json() : [];
  for (const i of due) await push(i.line_user_id, `⏰ 提醒：${i.title}${i.time ? `（${i.time}）` : ''}`);
  if (due.length) await db(`bot_items?id=in.(${due.map((i) => i.id).join(',')})`, { method: 'PATCH', body: JSON.stringify({ reminded: true }) });
  return ok({ mode, sent: due.length });
}

if (typeof Deno !== 'undefined') Deno.serve((req) => handle(req, Deno.env.toObject()));

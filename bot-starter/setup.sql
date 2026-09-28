-- setup.sql — LINE AI 小秘書的資料表、權限與排程
-- 到 Supabase → SQL Editor，照順序貼上執行。
-- ⚠️ 請確認左上角選的是「小秘書」這個 Supabase 專案，不要選到別的專案。

-- ===== 第 1 段：資料表（貼上、Run，只要做一次）=====
create table if not exists public.bot_items (
  id bigint generated always as identity primary key,
  line_user_id text not null check (line_user_id ~ '^U[0-9a-f]{32}$'),
  kind text not null check (char_length(kind) between 1 and 10),
  title text not null check (char_length(title) between 1 and 60),
  date date,               -- 台灣時間的日期
  time text check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'), -- 台灣時間 HH:MM
  remind_at timestamptz,   -- 要提醒的時間（國際時間，程式換算好的）
  reminded boolean not null default false,
  done boolean not null default false,
  raw_text text check (char_length(raw_text) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists bot_items_due on public.bot_items (remind_at) where reminded = false and done = false;

-- ===== 第 2 段：權限 =====
-- 只有後端小程式（用萬能鑰匙）能讀寫；網頁、訪客、登入的人一律不行。
-- 開啟 RLS 但不寫任何規則 ＝ 全部擋下（萬能鑰匙本來就會跳過 RLS）。
alter table public.bot_items enable row level security;
revoke all on public.bot_items from anon, authenticated;

-- ===== 第 3 段：排程（鬧鐘）=====
-- 先到 Database → Extensions，把 pg_cron 和 pg_net 打開。
-- 再把下面的「你的專案代號」和「你的暗號」換掉（暗號要和 Edge Functions Secrets 的 CRON_SECRET 一樣），然後 Run。
--   專案代號：Project Settings → General → Reference ID（網址 https://這一串.supabase.co）

-- 每 5 分鐘：時間到了的提醒
select cron.schedule('bot-due', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://你的專案代號.supabase.co/functions/v1/line-remind',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '你的暗號'),
    body := '{"mode":"due"}'::jsonb
  );
$$);

-- 每天 UTC 0 點 ＝ 台灣早上 8 點：今天要做的事（排程用的是國際時間，台灣要減 8 小時，單元 12 的時區陷阱）
select cron.schedule('bot-morning', '0 0 * * *', $$
  select net.http_post(
    url := 'https://你的專案代號.supabase.co/functions/v1/line-remind',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '你的暗號'),
    body := '{"mode":"morning"}'::jsonb
  );
$$);

-- 想看排程有沒有在跑：select * from cron.job_run_details order by start_time desc limit 10;
-- 想停掉排程：select cron.unschedule('bot-due'); select cron.unschedule('bot-morning');

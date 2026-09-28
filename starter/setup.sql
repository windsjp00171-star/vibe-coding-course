-- setup.sql — 範本的資料表與權限。到 Supabase → SQL Editor，整段貼上、按 Run，只要做一次。
-- ⚠️ 請確認左上角選的是「你這個作品」的 Supabase 專案，不要選到別的專案。
--
-- 權限規則（由資料庫把關，網頁被改也繞不過）：
--   ・沒登入的人：什麼都看不到、什麼都不能寫
--   ・登入的人：可以新增自己的登記、看自己的、刪自己的
--   ・管理者：看得到全部、可以改狀態（管理者名單在最下面設定）

-- 1) 登記資料：表單欄位都放在 data 這一格，所以改表單不用改資料庫
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 8000),
  status text not null default '待處理' check (status in ('待處理', '已確認', '已取消')),
  created_at timestamptz not null default now()
);

-- 2) 管理者名單：用 Email 判斷誰是管理者
create table if not exists public.admins (
  email text primary key
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- 3) 開啟列層級安全（RLS）：沒有寫在下面的動作，一律不准
alter table public.entries enable row level security;
alter table public.admins enable row level security;

drop policy if exists "新增自己的登記" on public.entries;
create policy "新增自己的登記" on public.entries for insert to authenticated
  with check (user_id = auth.uid() and status = '待處理');

drop policy if exists "看自己的，管理者看全部" on public.entries;
create policy "看自己的，管理者看全部" on public.entries for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "管理者可以改狀態" on public.entries;
create policy "管理者可以改狀態" on public.entries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "刪自己的，管理者都能刪" on public.entries;
create policy "刪自己的，管理者都能刪" on public.entries for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 4) 權限只開給登入的人；管理者名單網頁完全讀不到
revoke all on public.entries from anon;
revoke all on public.admins from anon, authenticated;
grant select, insert, update, delete on public.entries to authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 5) 設定管理者：把下面的 Email 換成你自己的，再按一次 Run（可以加好幾行）
insert into public.admins (email) values ('換成你的Email@example.com') on conflict do nothing;

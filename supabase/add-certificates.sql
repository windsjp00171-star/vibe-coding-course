-- 結業證書與公開驗證連結。
-- 想解決的問題：證書如果只是一張印出來的紙，別人沒辦法確認真假；
-- 學員拿去求職或報名時，希望對方能自己查得到。
-- 在 Supabase → SQL Editor 貼上整段執行一次即可（重複執行也不會出錯）。

-- 1) 證書紀錄
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  display_name text not null,
  score int not null,
  issued_at timestamptz not null default now()
);

-- 一個人只發一張；重考更高分時更新同一張，而不是再發一張
create unique index if not exists certificates_user_idx on public.certificates (user_id);

alter table public.certificates enable row level security;

-- 2) 學員只能操作自己的證書；講師可以看全部（後台要查）
drop policy if exists "自己發自己的證書" on public.certificates;
create policy "自己發自己的證書" on public.certificates for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "自己看自己的證書" on public.certificates;
create policy "自己看自己的證書" on public.certificates for select to authenticated
  using (auth.uid() = user_id or public.is_teacher());

drop policy if exists "自己更新自己的證書" on public.certificates;
create policy "自己更新自己的證書" on public.certificates for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) 公開驗證：只能用「完整的證書編號」查，而且只回傳姓名、分數、日期。
--    不開放列表查詢，避免有人把所有學員名單抓下來。
create or replace function public.verify_certificate(cert_code text)
returns table (display_name text, score int, issued_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select c.display_name, c.score, c.issued_at
  from public.certificates c
  where c.code = upper(trim(cert_code))
  limit 1;
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- 4) 表權限（同上：RLS 之外還要 GRANT）
grant usage on schema public to authenticated;
grant select, insert, update on public.certificates to authenticated;

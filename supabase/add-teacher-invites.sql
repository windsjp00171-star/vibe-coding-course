-- ============================================================
-- 追加功能：用 Email 邀請講師（2026-09-19）
-- 用法：Supabase → SQL Editor → 整份貼上 → Run。可以重複執行。
-- 之後在管理後台輸入 Email 就能設定講師，不用再寫 SQL。
-- ============================================================

-- 還沒登入過的人，先把 Email 記在這裡；他第一次登入時自動變成講師
create table if not exists public.teacher_invites (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.teacher_invites enable row level security;
revoke all on public.teacher_invites from anon, authenticated;
grant select, delete on public.teacher_invites to authenticated;

drop policy if exists "講師看得到邀請名單" on public.teacher_invites;
create policy "講師看得到邀請名單" on public.teacher_invites for select to authenticated
  using (public.is_teacher());
drop policy if exists "講師可以取消邀請" on public.teacher_invites;
create policy "講師可以取消邀請" on public.teacher_invites for delete to authenticated
  using (public.is_teacher());

-- 新帳號第一次登入：建立會員資料；如果在邀請名單上，直接設成講師並開通
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invited boolean;
begin
  select exists (select 1 from public.teacher_invites where email = lower(coalesce(new.email, ''))) into invited;
  insert into public.profiles (id, display_name, email, role, enrolled)
  values (
    new.id,
    coalesce(left(new.raw_user_meta_data ->> 'full_name', 40), ''),
    coalesce(new.email, ''),
    case when invited then 'teacher' else 'student' end,
    invited
  )
  on conflict (id) do nothing;
  if invited then
    delete from public.teacher_invites where email = lower(new.email);
  end if;
  return new;
end;
$$;

-- 講師在後台輸入 Email：已經登入過的人立刻變講師；還沒登入過的人加進邀請名單
create or replace function public.admin_invite_teacher(invite_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_email text := lower(trim(invite_email));
  updated int;
begin
  if not public.is_teacher() then
    raise exception '只有講師可以邀請講師';
  end if;
  if position('@' in target_email) < 2 then
    raise exception 'Email 格式不對';
  end if;
  update public.profiles set role = 'teacher', enrolled = true where lower(email) = target_email;
  get diagnostics updated = row_count;
  if updated > 0 then
    return 'promoted';
  end if;
  insert into public.teacher_invites (email, invited_by) values (target_email, auth.uid())
  on conflict (email) do nothing;
  return 'invited';
end;
$$;

revoke execute on function public.admin_invite_teacher(text) from anon, public;
grant execute on function public.admin_invite_teacher(text) to authenticated;

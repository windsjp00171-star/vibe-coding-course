-- ============================================================
-- Vibe Coding 實戰課．會員功能資料表
-- 用法：Supabase 專案 → SQL Editor → 整份貼上 → Run。可以重複執行。
-- 原則：所有權限由資料庫的 RLS 把關，網頁程式碼是公開的，不能靠它擋人。
-- ============================================================

-- ---------- 1. 會員資料 ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);
-- 管理後台需要：Email（auth.users 網頁讀不到，所以複製一份）、是否已開通完整課程
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists enrolled boolean not null default false;

-- 新帳號第一次登入時自動建立會員資料（一律是學員）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'full_name', 40), ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 判斷目前登入者是不是講師（給 RLS 用；security definer 避免 profiles 規則互相遞迴）
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;

-- ---------- 2. 班級 ----------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

-- 這位學員是不是「我」的班上的人
create or replace function public.teaches(student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.user_id = student and c.teacher_id = auth.uid()
  );
$$;

-- 下面兩個檢查包成 security definer 函式：若直接在規則裡互查 classes 與 class_members，
-- 兩張表的 RLS 會互相觸發，Postgres 會報「infinite recursion」錯誤
create or replace function public.owns_class(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.classes where id = target and teacher_id = auth.uid());
$$;

create or replace function public.in_class(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.class_members where class_id = target and user_id = auth.uid());
$$;

-- 學員用 6 碼加入班級（學員無法列出所有班級，只能用加入碼加入）
create or replace function public.join_class(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.classes;
begin
  if auth.uid() is null then
    raise exception '請先登入';
  end if;
  select * into target from public.classes where join_code = upper(trim(code));
  if target.id is null then
    raise exception '找不到這個加入碼';
  end if;
  insert into public.class_members (class_id, user_id) values (target.id, auth.uid())
  on conflict do nothing;
  update public.profiles set enrolled = true where id = auth.uid();  -- 用加入碼加入班級就自動開通
  return target.name;
end;
$$;

-- 管理員（講師）開通會員或調整身分。不能把自己降級，避免把自己鎖在後台外面
create or replace function public.admin_set_member(target uuid, new_enrolled boolean, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_teacher() then
    raise exception '只有講師可以設定會員';
  end if;
  if new_role not in ('student', 'teacher') then
    raise exception '身分只能是 student 或 teacher';
  end if;
  if target = auth.uid() and new_role <> 'teacher' then
    raise exception '不能取消自己的講師身分';
  end if;
  update public.profiles set enrolled = new_enrolled, role = new_role where id = target;
end;
$$;

-- ---------- 3. 學習進度 ----------
create table if not exists public.progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_id text not null check (module_id ~ '^m[0-9]{1,2}$'),
  best int not null default 0 check (best between 0 and 100),
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

-- ---------- 4. 講師內容（只有講師讀得到） ----------
create table if not exists public.teacher_notes (
  slot text primary key,
  cls text not null default 'teacher teacher-note',
  html text not null,
  updated_at timestamptz not null default now()
);

-- ---------- 5. 權限規則（RLS） ----------
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.progress enable row level security;
alter table public.teacher_notes enable row level security;

-- 資料表權限：建立專案時建議取消「Automatically expose new tables」，這裡逐一明確開放。
-- 未登入的訪客（anon）什麼都碰不到；登入的人只拿到需要的動作，實際能看哪幾列再由下面的 RLS 決定。
revoke all on public.profiles, public.classes, public.class_members, public.progress, public.teacher_notes from anon;
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select on public.class_members to authenticated;
grant select, insert, update on public.progress to authenticated;
grant select on public.teacher_notes to authenticated;

drop policy if exists "看自己的資料；講師看全部會員" on public.profiles;
create policy "看自己的資料；講師看全部會員" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_teacher());

drop policy if exists "只能改自己的名字" on public.profiles;
create policy "只能改自己的名字" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- 身分（role）欄位不開放給網頁修改：只允許更新 display_name
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "講師管理自己的班級" on public.classes;
create policy "講師管理自己的班級" on public.classes for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher());

drop policy if exists "學員看得到自己加入的班級" on public.classes;
create policy "學員看得到自己加入的班級" on public.classes for select to authenticated
  using (public.in_class(id));

drop policy if exists "看得到自己加入的、或自己開的班級成員" on public.class_members;
create policy "看得到自己加入的、或自己開的班級成員" on public.class_members for select to authenticated
  using (user_id = auth.uid() or public.owns_class(class_id));

drop policy if exists "學員讀寫自己的進度" on public.progress;
create policy "學員讀寫自己的進度" on public.progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "講師看全部進度" on public.progress;
create policy "講師看全部進度" on public.progress for select to authenticated
  using (public.is_teacher());

drop policy if exists "只有講師讀得到講師內容" on public.teacher_notes;
create policy "只有講師讀得到講師內容" on public.teacher_notes for select to authenticated
  using (public.is_teacher());

-- 函式只給登入的人呼叫（RLS 規則裡用到的檢查函式也要能執行，規則才不會失敗）
revoke execute on function public.join_class(text), public.is_teacher(), public.teaches(uuid),
  public.owns_class(uuid), public.in_class(uuid), public.admin_set_member(uuid, boolean, text) from anon, public;
grant execute on function public.join_class(text), public.is_teacher(), public.teaches(uuid),
  public.owns_class(uuid), public.in_class(uuid), public.admin_set_member(uuid, boolean, text) to authenticated;

-- ============================================================
-- 設定講師：你用 Google 登入網站一次之後，把下面的 Email 換成你的，單獨執行這一行
-- update public.profiles set role = 'teacher', enrolled = true
--   where id = (select id from auth.users where email = '你的Email@gmail.com');
-- ============================================================

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

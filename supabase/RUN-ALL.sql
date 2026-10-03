-- ============================================================
-- Vibe Coding 實戰課．資料庫一次到位
-- （這份是合併出來的，不要直接改；改各支 SQL 後執行 python3 scripts/build_run_all.py）
--
-- ★ 貼之前先確認一件事：
--   Supabase 左上角的專案，要選「課程」那一個，不要選到教會的專案。
--   這份會建立資料表與權限規則，貼錯專案會在教會的資料庫裡長出不該有的東西。
--
-- 用法：Supabase → SQL Editor → New query → 整份貼上 → Run。
--       可以重複執行，已經跑過的不會出錯、也不會覆蓋資料；資安修正都已經包在裡面，
--       重跑不會把修好的漏洞打開。
--
-- 這份由下面 11 支依序合併：
--   schema.sql、add-teacher-invites.sql、add-class-open-until.sql、add-class-admin.sql、add-teacher-files.sql、add-certificates.sql、add-signups.sql、fix-grants.sql、add-contact.sql、fix-security.sql、add-community.sql
--
-- 跑完之後還要做兩件事：
--   1. （只有第一次）到 schema.sql 最下面那行「設定講師」，把你的 Email 填進去單獨執行一次，
--      否則後台會說「這個帳號不是講師」。
--   2. 執行 check-deploy.sql（只會讀、不會改），每一列都是 ✅ 才算裝好。
-- ============================================================


-- ============================================================
-- 【1／11】schema.sql
-- 會員系統的底：profiles、classes、進度、is_teacher() 等（其他每一支都依賴它）
-- ============================================================

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
  open_until smallint check (open_until is null or open_until between 1 and 15), -- 開放到單元幾；null = 全部開放
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


-- ============================================================
-- 【2／11】add-teacher-invites.sql
-- 用 Email 邀請講師
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


-- ============================================================
-- 【3／11】add-class-open-until.sql
-- 班級開放進度：這班開放到第幾單元
-- ============================================================

-- 班級開放進度：講師決定這班「開放到單元幾」。
-- 在 Supabase → SQL Editor 貼上整段執行一次即可（重複執行也不會出錯）。
-- 空值（null）= 全部開放，所以既有班級不會被鎖住。
alter table public.classes
  add column if not exists open_until smallint
  check (open_until is null or open_until between 1 and 15);

comment on column public.classes.open_until is '這班開放到單元幾；null 代表全部開放';


-- ============================================================
-- 【4／11】add-class-admin.sql
-- 講師可以把學員移出自己的班級
-- ============================================================

-- 講師可以把學員移出自己的班級。
-- 在 Supabase → SQL Editor 貼上整段執行一次（重複執行也不會出錯）。
-- 只影響「誰在這個班級」，不會動到學員的開通狀態、進度或帳號。

grant delete on public.class_members to authenticated;

drop policy if exists "講師可以把學員移出自己的班級" on public.class_members;
create policy "講師可以把學員移出自己的班級" on public.class_members for delete to authenticated
  using (public.owns_class(class_id));

-- 學員也可以自己退出班級（之後若要做「退出班級」按鈕就會用到）
drop policy if exists "學員可以自己退出班級" on public.class_members;
create policy "學員可以自己退出班級" on public.class_members for delete to authenticated
  using (user_id = auth.uid());


-- ============================================================
-- 【5／11】add-teacher-files.sql
-- 講師教材的私人儲存空間（簡報、題庫、手冊）
-- ============================================================

-- 講師教材（簡報、Kahoot 題庫、學習手冊）放在 Supabase 的私人儲存空間，
-- 只有 role = 'teacher' 的帳號可以上傳、列出、下載；公開網站與 GitHub 上都不會有這些檔案。
-- 在 Supabase → SQL Editor 貼上整段執行一次即可（重複執行也不會出錯）。

-- 1) 建立私人 bucket（public = false：沒有簽章網址就打不開）
insert into storage.buckets (id, name, public)
values ('teacher-files', 'teacher-files', false)
on conflict (id) do nothing;

-- 2) 只有講師能操作這個 bucket 裡的檔案
drop policy if exists "講師可以看教材" on storage.objects;
create policy "講師可以看教材" on storage.objects for select to authenticated
  using (bucket_id = 'teacher-files' and public.is_teacher());

drop policy if exists "講師可以上傳教材" on storage.objects;
create policy "講師可以上傳教材" on storage.objects for insert to authenticated
  with check (bucket_id = 'teacher-files' and public.is_teacher());

drop policy if exists "講師可以覆蓋教材" on storage.objects;
create policy "講師可以覆蓋教材" on storage.objects for update to authenticated
  using (bucket_id = 'teacher-files' and public.is_teacher())
  with check (bucket_id = 'teacher-files' and public.is_teacher());

drop policy if exists "講師可以刪除教材" on storage.objects;
create policy "講師可以刪除教材" on storage.objects for delete to authenticated
  using (bucket_id = 'teacher-files' and public.is_teacher());


-- ============================================================
-- 【6／11】add-certificates.sql
-- 結業證書與公開查證連結
-- ============================================================

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

-- 2) 學員只看得到自己的證書；講師可以看全部（後台要查）
--    發證書、改名字只能透過 fix-security.sql 的 issue_certificate()（資料庫自己檢查開通與成績）。
--    這裡不能再開「自己寫入證書」的規則，否則重跑這支就會把資安修正蓋掉。
drop policy if exists "自己發自己的證書" on public.certificates;

drop policy if exists "自己看自己的證書" on public.certificates;
create policy "自己看自己的證書" on public.certificates for select to authenticated
  using (auth.uid() = user_id or public.is_teacher());

drop policy if exists "自己更新自己的證書" on public.certificates;

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
grant select on public.certificates to authenticated;
revoke insert, update, delete on public.certificates from anon, authenticated;


-- ============================================================
-- 【7／11】add-signups.sql
-- 課程報名：梯次與報名名單
-- ============================================================

-- 課程報名（梯次 + 報名單）。
-- 資料模型移植自教會活動報名系統，但只留這門課真的用得到的部分：
-- 那邊有動態欄位、簽到、餐點、付款狀態，這裡用不到，留著只會變成沒人維護的欄位。
--
-- 個資原則（就是單元 21 教的那一套，自己也要做到）：
--   * 報名表會收到姓名、Email、電話 → 只有講師讀得到，前台只能寫入。
--   * 要讓陌生人看到「還剩幾位」，但不能讓他看到報名者是誰 → 用一個只回數字的函式。
-- 在 Supabase → SQL Editor 貼上整段執行一次即可（重複執行也不會出錯）。

-- 1) 梯次
create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- 例如：2026 秋季班（週六班）
  kind text not null default 'core'
    check (kind in ('core', 'security', 'custom')),
  schedule_text text,                       -- 例如：11/14、11/21、11/28 每週六 13:30–17:00
  place text,                               -- 例如：台南場（地點開課前通知）
  price int,                                -- 未稅；null = 尚未公布
  capacity int,                             -- null = 不限人數
  waitlist_enabled boolean not null default true,
  waitlist_deadline timestamptz,
  reg_start timestamptz,
  reg_end timestamptz,
  is_open boolean not null default false,   -- 預設關閉：資料填齊了才手動打開
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2) 報名單
create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  org text,                                 -- 單位／公司，選填
  role text,                                -- 職務或身分，選填
  goal text,                                -- 想解決的問題（課程要用來準備案例）
  source text,                              -- 從哪裡得知
  status text not null default 'registered'
    check (status in ('registered', 'waitlisted', 'cancelled', 'confirmed')),
  note text,                                -- 講師自己寫的備註
  user_id uuid references auth.users(id) on delete set null,  -- 之後開通成學員時回填
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists signups_cohort_idx on public.signups (cohort_id, created_at);

alter table public.cohorts enable row level security;
alter table public.signups enable row level security;

-- 3) 梯次：所有人都看得到「已開放」的梯次（這是公開資訊）
-- 拆成兩條：訪客沒有 is_teacher() 的執行權限，規則裡一呼叫就會被擋（42501）
drop policy if exists "公開的梯次大家都看得到" on public.cohorts;
drop policy if exists "訪客看得到已開放的梯次" on public.cohorts;
create policy "訪客看得到已開放的梯次" on public.cohorts for select to anon
  using (is_open);
drop policy if exists "登入者看得到已開放的梯次，講師看得到全部" on public.cohorts;
create policy "登入者看得到已開放的梯次，講師看得到全部" on public.cohorts for select to authenticated
  using (is_open or public.is_teacher());

drop policy if exists "只有講師能開梯次" on public.cohorts;
create policy "只有講師能開梯次" on public.cohorts for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

-- 4) 報名單：任何人都能報名（寫入），但只有講師讀得到名單
drop policy if exists "任何人都能報名" on public.signups;
create policy "任何人都能報名" on public.signups for insert to anon, authenticated
  with check (
    exists (select 1 from public.cohorts c where c.id = cohort_id and c.is_open)
    and char_length(name) between 1 and 40
    and char_length(email) between 5 and 120
    and coalesce(char_length(phone), 0) <= 30
    and coalesce(char_length(org), 0) <= 80
    and coalesce(char_length(role), 0) <= 80
    and coalesce(char_length(goal), 0) <= 1000
    and coalesce(char_length(source), 0) <= 80
    and note is null
    and user_id is null
    and status in ('registered', 'waitlisted')
  );

drop policy if exists "只有講師看得到報名名單" on public.signups;
create policy "只有講師看得到報名名單" on public.signups for select to authenticated
  using (public.is_teacher());

drop policy if exists "只有講師能改報名狀態" on public.signups;
create policy "只有講師能改報名狀態" on public.signups for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "只有講師能刪報名" on public.signups;
create policy "只有講師能刪報名" on public.signups for delete to authenticated
  using (public.is_teacher());

-- 5) 「還剩幾位」：只回數字，不回任何一個報名者的資料。
--    取消的不算佔位；候補不佔正取名額。
create or replace function public.cohort_taken()
returns table (cohort_id uuid, taken bigint, waiting bigint)
language sql
security definer
set search_path = public
as $$
  select c.id,
         count(s.id) filter (where s.status in ('registered', 'confirmed')),
         count(s.id) filter (where s.status = 'waitlisted')
  from public.cohorts c
  left join public.signups s on s.cohort_id = c.id
  where c.is_open
  group by c.id;
$$;

revoke all on function public.cohort_taken() from public;
grant execute on function public.cohort_taken() to anon, authenticated;

-- 6) 表權限：這個資料庫是「預設全部拒絕、逐表授權」（見 schema.sql）。
--    RLS 決定看得到哪幾列，GRANT 決定有沒有資格碰這張表——兩個都要寫。
grant usage on schema public to anon, authenticated;
grant select on public.cohorts to anon, authenticated;
grant insert, update, delete on public.cohorts to authenticated;
grant insert on public.signups to anon, authenticated;
grant select, update, delete on public.signups to authenticated;


-- ============================================================
-- 【8／11】fix-grants.sql
-- 訪客讀得到梯次（權限修正）
-- ============================================================

-- 修正：報名與證書的權限（2026-09-26 第二版，可重複執行）
--
-- 第一版補了 GRANT 之後，訪客讀梯次換成另一個錯誤：
--   42501 permission denied for function is_teacher
-- 原因：梯次的讀取規則是「已開放 或 是講師」，判斷「是講師」要呼叫 is_teacher()，
--       但這個函式只開放給登入的人執行（schema.sql 第 220 行起）。訪客一碰到這條規則就被擋。
-- 做法：把規則拆成兩條——訪客只看「已開放」，登入的人才多判斷「是不是講師」。
--       這樣不用把 is_teacher() 開放給訪客。
--
-- 用法：Supabase（課程專案，不是教會專案）→ SQL Editor → 整份貼上 → Run。

grant usage on schema public to anon, authenticated;

-- ---------- 梯次 ----------
grant select on public.cohorts to anon, authenticated;
grant insert, update, delete on public.cohorts to authenticated;

drop policy if exists "公開的梯次大家都看得到" on public.cohorts;
drop policy if exists "訪客看得到已開放的梯次" on public.cohorts;
create policy "訪客看得到已開放的梯次" on public.cohorts for select to anon
  using (is_open);

drop policy if exists "登入者看得到已開放的梯次，講師看得到全部" on public.cohorts;
create policy "登入者看得到已開放的梯次，講師看得到全部" on public.cohorts for select to authenticated
  using (is_open or public.is_teacher());

-- ---------- 報名 ----------
grant insert on public.signups to anon, authenticated;
grant select, update, delete on public.signups to authenticated;

-- ---------- 結業證書 ----------
-- 只給讀取；發證書走 issue_certificate()（fix-security.sql），不能讓網頁直接寫入
grant select on public.certificates to authenticated;

-- ---------- 檢查（可以單獨執行這段，把結果截圖給我）----------
-- 預期：anon 對 cohorts 有 SELECT、對 signups 有 INSERT；authenticated 對 certificates 只有 SELECT
-- select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
--   from information_schema.role_table_grants
--  where table_schema = 'public' and table_name in ('cohorts', 'signups', 'certificates')
--    and grantee in ('anon', 'authenticated')
--  group by grantee, table_name
--  order by table_name, grantee;


-- ============================================================
-- 【9／11】add-contact.sql
-- 聯絡表單
-- ============================================================

-- 聯絡表單（2026-09-27）：取代網頁上直接公開的講師 Email。
-- 想解決的問題：Email 寫在公開網頁上會被爬蟲收去寄垃圾信；改成表單，留言只有講師在後台看得到。
--
-- 個資原則（和報名表一樣）：前台只能寫入，讀不到任何一筆；只有講師讀得到、能標記已處理。
--
-- ★ 用法：Supabase 左上角選「課程」專案（不要選到教會的專案）→ SQL Editor → 整份貼上 → Run。
--   可以重複執行，已經跑過的不會出錯、也不會覆蓋資料。

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,                    -- 對方留的 Email、電話或 LINE ID，講師用來回覆
  topic text not null default 'other'
    check (topic in ('course', 'corporate', 'security', 'other')),
  message text not null,
  page text,                                -- 從哪一頁送出（enroll／security）
  handled boolean not null default false,   -- 講師回覆過就打勾
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- 任何人都能留言（寫入），長度有上限，避免被灌爆
-- 訪客沒有 is_teacher() 的執行權限，所以寫入規則裡不呼叫它
drop policy if exists "任何人都能留言" on public.contact_messages;
create policy "任何人都能留言" on public.contact_messages for insert to anon, authenticated
  with check (
    char_length(name) between 1 and 40
    and char_length(contact) between 3 and 120
    and char_length(message) between 5 and 2000
    and handled = false
  );

-- 只有講師讀得到、能標記已處理、能刪除
drop policy if exists "只有講師看得到留言" on public.contact_messages;
create policy "只有講師看得到留言" on public.contact_messages for select to authenticated
  using (public.is_teacher());
drop policy if exists "只有講師能改留言" on public.contact_messages;
create policy "只有講師能改留言" on public.contact_messages for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "只有講師能刪留言" on public.contact_messages;
create policy "只有講師能刪留言" on public.contact_messages for delete to authenticated
  using (public.is_teacher());

-- 權限：少了這段，訪客送出會出現 42501 permission denied
grant usage on schema public to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;


-- ============================================================
-- 【10／11】fix-security.sql
-- 證書由資料庫核發、報名名額由資料庫判斷
-- ============================================================

-- ============================================================
-- 資安修正（2026-09-27，開放報名前的檢查）
--
-- ★ 用法：Supabase 左上角選「課程」專案（不要選到教會的專案）→ SQL Editor → 整份貼上 → Run。
--   可以重複執行。要先跑過 add-certificates.sql 和 add-signups.sql。
--
-- 修了兩件事：
--
-- 1) 結業證書可以自己印
--    原本規則是「登入的人可以寫入自己的證書」，分數和名字都由網頁決定。
--    任何人用 Google 登入後，在瀏覽器主控台打一行指令就能替自己發一張 100 分的證書，
--    證書查證頁還會說「這張是真的」。
--    改成：網頁不能直接寫證書，只能呼叫 issue_certificate()，由資料庫檢查
--      ・是講師開通過的學員（enrolled）
--      ・雲端的總測驗成績（單元 9）80 分以上
--    分數一律用資料庫裡的成績，不接受網頁傳來的數字。
--    （仍然存在的風險：學員的測驗成績是網頁寫進去的，懂技術的「已開通學員」還是能偽造成績。
--      要完全杜絕需要講師人工核發，目前先把範圍縮小到講師認識的學員。）
--
-- 2) 報名表可以被灌爆
--    原本「正取還是候補」由網頁決定，名額也只在網頁上檢查；電話、單位、想解決的問題等欄位沒有長度上限。
--    有人可以直接送出大量「正取」報名把梯次塞滿，或塞入超長文字。
--    改成：資料庫在寫入前自己判斷正取／候補／額滿（規則和網頁的 seatVerdict 一樣），並限制每個欄位的長度。
-- ============================================================

-- ---------- 1) 結業證書 ----------
drop policy if exists "自己發自己的證書" on public.certificates;
drop policy if exists "自己更新自己的證書" on public.certificates;
revoke insert, update, delete on public.certificates from anon, authenticated;

create or replace function public.issue_certificate(p_name text, p_code text)
returns table (code text, display_name text, score int, issued_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  name_clean text := trim(coalesce(p_name, ''));
  best_score int;
begin
  if me is null then
    raise exception '請先登入';
  end if;
  if not exists (select 1 from public.profiles p where p.id = me and p.enrolled) then
    raise exception '帳號還沒開通，請先用講師給的加入碼加入班級';
  end if;
  select pr.best into best_score from public.progress pr
    where pr.user_id = me and pr.module_id = 'm9' and pr.done;
  if best_score is null or best_score < 80 then
    raise exception '總測驗 80 分以上才能產生證書';
  end if;
  if char_length(name_clean) not between 1 and 20 then
    raise exception '證書上的名字請填 1～20 個字';
  end if;

  if exists (select 1 from public.certificates c where c.user_id = me) then
    -- 改名字或重考更高分：更新同一張，編號不變
    update public.certificates c set display_name = name_clean, score = greatest(c.score, best_score)
      where c.user_id = me;
  else
    -- 編號由網頁隨機產生（VC ＋ 10 碼，不含容易看錯的 I、O、0、1），這裡檢查格式
    if coalesce(p_code, '') !~ '^VC[A-HJ-NP-Z2-9]{10}$' then
      raise exception '證書編號格式不對';
    end if;
    insert into public.certificates (user_id, code, display_name, score)
      values (me, p_code, name_clean, best_score);
  end if;

  return query select c.code, c.display_name, c.score, c.issued_at from public.certificates c where c.user_id = me;
end;
$$;

revoke all on function public.issue_certificate(text, text) from public, anon;
grant execute on function public.issue_certificate(text, text) to authenticated;

-- ---------- 2) 報名 ----------
-- 每個欄位都有長度上限
drop policy if exists "任何人都能報名" on public.signups;
create policy "任何人都能報名" on public.signups for insert to anon, authenticated
  with check (
    exists (select 1 from public.cohorts c where c.id = cohort_id and c.is_open)
    and char_length(name) between 1 and 40
    and char_length(email) between 5 and 120
    and coalesce(char_length(phone), 0) <= 30
    and coalesce(char_length(org), 0) <= 80
    and coalesce(char_length(role), 0) <= 80
    and coalesce(char_length(goal), 0) <= 1000
    and coalesce(char_length(source), 0) <= 80
    and note is null
    and user_id is null
    and status in ('registered', 'waitlisted')
  );

-- 寫入前由資料庫決定正取／候補，網頁送什麼都不算數。規則和網頁的 seatVerdict 一樣
create or replace function public.signup_decide_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.cohorts;
  taken bigint;
begin
  select * into c from public.cohorts where id = new.cohort_id;
  if c.id is null or not c.is_open then
    raise exception '這個梯次尚未開放報名';
  end if;
  if c.reg_start is not null and now() < c.reg_start then
    raise exception '報名還沒開始';
  end if;
  if c.reg_end is not null and now() > c.reg_end then
    raise exception '報名已截止';
  end if;
  -- 同一個梯次同時有人報名時一個一個來，避免兩個人同時搶到最後一個名額
  perform pg_advisory_xact_lock(hashtext(new.cohort_id::text));
  select count(*) into taken from public.signups s
    where s.cohort_id = new.cohort_id and s.status in ('registered', 'confirmed');
  if coalesce(c.capacity, 0) = 0 or taken < c.capacity then
    new.status := 'registered';
  elsif not c.waitlist_enabled then
    raise exception '報名人數已達上限';
  elsif c.waitlist_deadline is not null and now() > c.waitlist_deadline then
    raise exception '候補名單已截止';
  else
    new.status := 'waitlisted';
  end if;
  return new;
end;
$$;

drop trigger if exists signup_decide_status on public.signups;
create trigger signup_decide_status before insert on public.signups
  for each row execute function public.signup_decide_status();


-- ============================================================
-- 【11／11】add-community.sql
-- 後台編班、意見回饋與作品投稿、交流留言板
-- ============================================================

-- ============================================================
-- 社群功能（2026-10-02）：後台把會員編進班級、意見回饋與作品投稿、交流留言板
--
-- ★ 用法：Supabase 左上角選「課程」專案（不要選到教會的專案）→ SQL Editor → 整份貼上 → Run。
--   可以重複執行，已經跑過的不會出錯、也不會覆蓋資料。要先跑過 RUN-ALL.sql 和 add-contact.sql。
-- ============================================================

-- ---------- 1) 聯絡表單多兩種主題：課程意見回饋、作品投稿 ----------
alter table public.contact_messages drop constraint if exists contact_messages_topic_check;
alter table public.contact_messages add constraint contact_messages_topic_check
  check (topic in ('course', 'corporate', 'security', 'other', 'feedback', 'works'));

-- ---------- 2) 講師在後台把會員編進自己的班級 ----------
-- 原本只有學員自己輸入加入碼才能進班。社群連結發出去後，有人登入了卻沒加入班級，講師要能手動編班。
-- 只能編進「自己開的」班級；編進去就等於開通（和用加入碼加入一樣）。
create or replace function public.admin_add_to_class(target_class uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_teacher() or not public.owns_class(target_class) then
    raise exception '只能把會員編進你自己開的班級';
  end if;
  if not exists (select 1 from public.profiles where id = member) then
    raise exception '找不到這位會員';
  end if;
  insert into public.class_members (class_id, user_id) values (target_class, member)
  on conflict do nothing;
  update public.profiles set enrolled = true where id = member;
end;
$$;
revoke execute on function public.admin_add_to_class(uuid, uuid) from anon, public;
grant execute on function public.admin_add_to_class(uuid, uuid) to authenticated;

-- ---------- 3) 交流留言板 ----------
-- 誰看得到：已開通的學員和講師（訪客、還沒開通的人看不到）。
-- 名字由資料庫填（用會員資料的顯示名稱），網頁沒辦法冒用別人的名字。
create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  author_name text not null default '',
  is_teacher boolean not null default false,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists board_posts_created_idx on public.board_posts (created_at desc);

create or replace function public.board_fill_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  select coalesce(nullif(display_name, ''), '學員'), role = 'teacher'
    into new.author_name, new.is_teacher
    from public.profiles where id = auth.uid();
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists board_fill_author on public.board_posts;
create trigger board_fill_author before insert on public.board_posts
  for each row execute function public.board_fill_author();

-- 是不是「看得到留言板的人」：已開通或講師
create or replace function public.can_use_board()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (enrolled or role = 'teacher'));
$$;
revoke execute on function public.can_use_board() from anon, public;
grant execute on function public.can_use_board() to authenticated;

alter table public.board_posts enable row level security;
revoke all on public.board_posts from anon, authenticated;
grant select, insert, delete on public.board_posts to authenticated;

drop policy if exists "開通的學員和講師看得到留言板" on public.board_posts;
create policy "開通的學員和講師看得到留言板" on public.board_posts for select to authenticated
  using (public.can_use_board());

drop policy if exists "開通的學員和講師可以留言" on public.board_posts;
create policy "開通的學員和講師可以留言" on public.board_posts for insert to authenticated
  with check (public.can_use_board());

drop policy if exists "刪自己的留言；講師可以刪任何一則" on public.board_posts;
create policy "刪自己的留言；講師可以刪任何一則" on public.board_posts for delete to authenticated
  using (user_id = auth.uid() or public.is_teacher());

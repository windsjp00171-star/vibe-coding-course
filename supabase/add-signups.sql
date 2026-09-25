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
drop policy if exists "公開的梯次大家都看得到" on public.cohorts;
create policy "公開的梯次大家都看得到" on public.cohorts for select to anon, authenticated
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

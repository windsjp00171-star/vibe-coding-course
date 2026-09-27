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

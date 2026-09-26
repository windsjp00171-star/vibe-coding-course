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
grant select, insert, update on public.certificates to authenticated;

-- ---------- 檢查（可以單獨執行這段，把結果截圖給我）----------
-- 預期：anon 對 cohorts 有 SELECT、對 signups 有 INSERT；authenticated 對 certificates 有 INSERT/SELECT/UPDATE
-- select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
--   from information_schema.role_table_grants
--  where table_schema = 'public' and table_name in ('cohorts', 'signups', 'certificates')
--    and grantee in ('anon', 'authenticated')
--  group by grantee, table_name
--  order by table_name, grantee;

-- 修正：報名與證書的資料表少了 GRANT（2026-09-25）
--
-- 症狀：招生頁一直顯示「目前沒有開放報名的梯次」，即使 cohorts 裡已經有 is_open = true 的梯次。
-- 原因：這個資料庫是「預設全部拒絕、逐表授權」的寫法（schema.sql 第 175 行 revoke 之後逐一 grant）。
--       add-signups.sql 與 add-certificates.sql 只寫了 RLS 政策，沒有寫 GRANT。
--       RLS 決定「看得到哪幾列」，GRANT 決定「有沒有資格碰這張表」——少了後者，前者再怎麼開都沒用。
--       實際錯誤：42501 permission denied for table cohorts。
--
-- 用法：Supabase（課程專案，不是教會專案）→ SQL Editor → 整份貼上 → Run。可以重複執行。

grant usage on schema public to anon, authenticated;

-- 梯次：任何人都要看得到「已開放」的梯次（RLS 仍然只讓 is_open 的列出現）
grant select on public.cohorts to anon, authenticated;
-- 開關梯次、改名額由後台做；RLS 限定只有講師能寫
grant insert, update, delete on public.cohorts to authenticated;

-- 報名：沒登入的人也要能送出報名；名單的讀取與修改由 RLS 限定講師
grant insert on public.signups to anon, authenticated;
grant select, update, delete on public.signups to authenticated;

-- 結業證書：學員發給自己、講師看得到；公開查證走 verify_certificate()，不需要表權限
grant select, insert, update on public.certificates to authenticated;

-- 檢查用（跑完可以單獨執行這段，應該看到 anon 對 cohorts 有 SELECT、對 signups 有 INSERT）
-- select grantee, table_name, privilege_type
--   from information_schema.role_table_grants
--  where table_schema = 'public' and table_name in ('cohorts', 'signups', 'certificates')
--  order by table_name, grantee, privilege_type;

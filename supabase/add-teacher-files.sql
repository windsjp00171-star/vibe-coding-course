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

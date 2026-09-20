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

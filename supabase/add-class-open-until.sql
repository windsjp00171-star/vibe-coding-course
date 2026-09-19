-- 班級開放進度：講師決定這班「開放到單元幾」。
-- 在 Supabase → SQL Editor 貼上整段執行一次即可（重複執行也不會出錯）。
-- 空值（null）= 全部開放，所以既有班級不會被鎖住。
alter table public.classes
  add column if not exists open_until smallint
  check (open_until is null or open_until between 1 and 15);

comment on column public.classes.open_until is '這班開放到單元幾；null 代表全部開放';

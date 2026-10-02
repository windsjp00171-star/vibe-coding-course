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

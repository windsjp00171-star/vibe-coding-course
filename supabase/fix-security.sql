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

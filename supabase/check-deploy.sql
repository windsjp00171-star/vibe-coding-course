-- ============================================================
-- 正式資料庫健檢（2026-10-03）：只會「讀」，不會改任何東西，隨時可以跑
--
-- ★ 用法：Supabase 左上角選「課程」專案（不要選到教會的專案）→ SQL Editor → 整份貼上 → Run。
--   下面會出現一張表，每一列是一項檢查：
--     ✅ 通過
--     ❌ 沒過：看「沒過怎麼辦」那一欄，照做之後再跑一次這份
--   全部 ✅ 才算資料庫裝好、資安修正都有生效。
--   出現紅色錯誤「relation ... does not exist」：資料庫還沒裝，先整份執行 RUN-ALL.sql。
--
-- 為什麼需要：SQL 檔寫好不代表正式資料庫真的跑過；重跑舊版的 SQL 也可能把修好的漏洞打開。
-- 這份直接看資料庫現在的設定，不看檔案。
--
-- 什麼時候跑：第一次裝好、每次跑完任何一支 SQL、開新梯次招生前。
-- 這份不會顯示任何學員的個資，只會顯示表名、函式名和講師人數。
-- ============================================================

with
-- 網站用到的每一張表
tbl(name) as (values
  ('profiles'), ('classes'), ('class_members'), ('progress'), ('teacher_notes'), ('teacher_invites'),
  ('certificates'), ('cohorts'), ('signups'), ('contact_messages'), ('board_posts')
),
-- 訪客（沒登入的人）不該讀得到的表；cohorts 是公開梯次，不在這裡
private_tbl(name) as (
  select name from tbl where name <> 'cohorts'
),
-- 網站會呼叫的資料庫函式
fn(sig) as (values
  ('public.is_teacher()'), ('public.owns_class(uuid)'), ('public.join_class(text)'),
  ('public.admin_set_member(uuid, boolean, text)'), ('public.admin_invite_teacher(text)'),
  ('public.admin_add_to_class(uuid, uuid)'), ('public.can_use_board()'),
  ('public.issue_certificate(text, text)'), ('public.verify_certificate(text)'), ('public.cohort_taken()')
),
-- 只有登入的人（或講師）能用的函式：訪客不能執行
fn_no_anon(sig) as (values
  ('public.is_teacher()'), ('public.join_class(text)'), ('public.admin_set_member(uuid, boolean, text)'),
  ('public.admin_invite_teacher(text)'), ('public.admin_add_to_class(uuid, uuid)'),
  ('public.issue_certificate(text, text)'), ('public.can_use_board()')
),
checks(n, item, ok, detail, fix) as (
  -- 1) 表都在
  select 1, '網站需要的 11 張資料表都在',
    count(*) filter (where to_regclass('public.' || name) is null) = 0,
    coalesce('少了：' || string_agg(name, '、') filter (where to_regclass('public.' || name) is null), ''),
    '整份執行 RUN-ALL.sql'
  from tbl

  -- 2) 每張表都開了 RLS（沒開的話，權限規則全部不算數）
  union all
  select 2, '每張表都開了 RLS（資料列門禁）',
    count(*) filter (where not c.relrowsecurity) = 0,
    coalesce('沒開：' || string_agg(t.name, '、') filter (where not c.relrowsecurity), ''),
    '整份執行 RUN-ALL.sql'
  from tbl t join pg_class c on c.oid = to_regclass('public.' || t.name)

  -- 3) 訪客讀不到會員、進度、報名、留言、證書（只有梯次是公開的）
  union all
  select 3, '沒登入的訪客讀不到任何私人資料',
    count(*) = 0,
    coalesce('有開給訪客讀的規則：' || string_agg(distinct p.tablename, '、'), ''),
    '整份執行 RUN-ALL.sql；還是 ❌ 的話把這一列截圖給 Claude Code'
  from pg_policies p
  where p.schemaname = 'public' and p.tablename in (select name from private_tbl)
    and p.cmd in ('SELECT', 'ALL') and (p.roles && array['anon', 'public']::name[])

  -- 4) 梯次的訪客規則不能呼叫 is_teacher()（訪客沒權限執行，會讓報名頁讀不到梯次）
  union all
  select 4, '訪客看得到開放中的梯次（報名頁不會壞）',
    count(*) = 0,
    coalesce('舊規則還在：' || string_agg(p.policyname, '、'), ''),
    '執行 fix-grants.sql'
  from pg_policies p
  where p.schemaname = 'public' and p.tablename = 'cohorts'
    and (p.roles && array['anon', 'public']::name[]) and p.qual ilike '%is_teacher%'

  -- 5) 學員不能把自己改成講師、也不能自己開通
  union all
  select 5, '學員不能自己改身分（講師／開通）',
    not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
      and not has_column_privilege('authenticated', 'public.profiles', 'enrolled', 'UPDATE'),
    '',
    '整份執行 RUN-ALL.sql'
  where to_regclass('public.profiles') is not null

  -- 6) 證書只能由資料庫核發（fix-security.sql 修的漏洞）
  union all
  select 6, '學員不能自己寫證書（只能由資料庫檢查成績後核發）',
    count(*) = 0,
    coalesce('還有讓網頁直接寫證書的規則：' || string_agg(p.policyname, '、'), ''),
    '執行 fix-security.sql'
  from pg_policies p
  where p.schemaname = 'public' and p.tablename = 'certificates' and p.cmd in ('INSERT', 'UPDATE', 'ALL')

  -- 7) 報名的正取／候補由資料庫判斷，欄位有長度上限（fix-security.sql 修的漏洞）
  union all
  select 7, '報名表灌不爆（資料庫判斷名額、欄位有長度上限）',
    exists (select 1 from pg_trigger tg where tg.tgname = 'signup_decide_status'
              and tg.tgrelid = to_regclass('public.signups'))
      and exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'signups'
              and p.cmd = 'INSERT' and p.with_check ilike '%phone%'),
    '',
    '執行 fix-security.sql'

  -- 8) 留言板的名字由資料庫填，不能冒名
  union all
  select 8, '留言板不能冒用別人的名字',
    exists (select 1 from pg_trigger tg where tg.tgname = 'board_fill_author'
              and tg.tgrelid = to_regclass('public.board_posts')),
    '',
    '執行 add-community.sql'

  -- 9) 聯絡表單收得到意見回饋和作品投稿
  union all
  select 9, '聯絡表單收得到「意見回饋」和「作品投稿」',
    exists (select 1 from pg_constraint k where k.conname = 'contact_messages_topic_check'
              and pg_get_constraintdef(k.oid) ilike '%feedback%'
              and pg_get_constraintdef(k.oid) ilike '%works%'),
    '',
    '執行 add-community.sql'

  -- 10) 網站會呼叫的函式都在
  union all
  select 10, '網站需要的資料庫函式都在',
    count(*) filter (where to_regprocedure(sig) is null) = 0,
    coalesce('少了：' || string_agg(sig, '、') filter (where to_regprocedure(sig) is null), ''),
    '整份執行 RUN-ALL.sql'
  from fn

  -- 11) 管理用的函式，訪客不能執行
  union all
  select 11, '訪客不能執行管理用的函式',
    count(*) filter (where has_function_privilege('anon', to_regprocedure(sig), 'EXECUTE')) = 0,
    coalesce('訪客可以執行：' || string_agg(sig, '、')
      filter (where has_function_privilege('anon', to_regprocedure(sig), 'EXECUTE')), ''),
    '整份執行 RUN-ALL.sql'
  from fn_no_anon where to_regprocedure(sig) is not null

  -- 12) 證書查證頁是公開的：沒登入也要能查
  union all
  select 12, '沒登入的人也能查證書真假',
    coalesce(has_function_privilege('anon', to_regprocedure('public.verify_certificate(text)'), 'EXECUTE'), false),
    '',
    '執行 add-certificates.sql'

  -- 13) 用「資料庫身分」執行的函式都固定了 search_path（避免被換掉同名的表）
  union all
  select 13, '特權函式都有固定 search_path',
    count(*) = 0,
    coalesce('沒固定：' || string_agg(f.proname, '、'), ''),
    '整份執行 RUN-ALL.sql'
  from pg_proc f
  where f.pronamespace = 'public'::regnamespace and f.prosecdef
    and not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%')

  -- 14) 講師教材的儲存空間是私人的
  union all
  select 14, '講師教材（teacher-files）不是公開的',
    exists (select 1 from storage.buckets b where b.id = 'teacher-files' and not b.public),
    '',
    '執行 add-teacher-files.sql；已經存在的話到 Storage → teacher-files → 編輯，關掉 Public'

  -- 15) 至少有一位講師，不然後台進不去
  union all
  select 15, '至少有一位講師',
    count(*) > 0,
    '目前講師人數：' || count(*),
    '照 schema.sql 最下面「設定講師」那行，填你的 Email 單獨執行'
  from public.profiles where role = 'teacher'
)
select n as "#",
       case when ok then '✅' else '❌' end as "結果",
       item as "檢查項目",
       detail as "細節",
       case when ok then '' else fix end as "沒過怎麼辦"
from checks
order by n;

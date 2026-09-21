-- 新增一個報名梯次。每要開一班就改一次貼一次。
-- 用法：Supabase → SQL Editor → 貼上 → 把下面的值改成你的 → Run。
-- 存好之後，招生頁的報名表就會出現這個梯次。

insert into public.cohorts
  (name,                kind,     schedule_text,                              place,                     price,  capacity, waitlist_enabled, reg_end,                     is_open, note, sort_order)
values
  ('2026 秋季班（週六）', 'core',   '11/14、11/21、11/28 每週六 13:30–17:00',   '台南（地點開課前通知）',   12000,  12,       true,             '2026-11-07 23:59:00+08',    true,    '前三位報名享早鳥價', 1);

-- 欄位說明：
--   kind          'core'（實戰課）／'security'（半日資安）／'custom'（客製場次）
--   price         未稅金額；填 null 會顯示「費用另行公布」
--   capacity      名額；填 null = 不限人數
--   reg_end       報名截止；過了時間招生頁會自動顯示「報名已截止」
--   is_open       false = 先建好但不公開；之後在後台「報名管理」按「開放報名」即可
--   sort_order    數字小的排前面

-- ------------------------------------------------------------
-- 之後常用的兩句（改梯次名稱即可）
-- ------------------------------------------------------------
-- 先關掉報名（例如要改資料時）：
-- update public.cohorts set is_open = false where name = '2026 秋季班（週六）';

-- 改名額或價格：
-- update public.cohorts set capacity = 16, price = 13000 where name = '2026 秋季班（週六）';

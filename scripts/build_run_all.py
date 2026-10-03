"""把 supabase/ 裡的各支 SQL 依序合併成 RUN-ALL.sql，讓新的課程專案貼一次就好。

改了任何一支 SQL（或新增一支）之後執行：python3 scripts/build_run_all.py
順序有意義：資安修正（fix-security.sql）要排在建表的檔案後面，重跑時才不會被蓋掉。
"""
import pathlib

SQL = pathlib.Path(__file__).resolve().parent.parent / "supabase"
PARTS = [
    ("schema.sql", "會員系統的底：profiles、classes、進度、is_teacher() 等（其他每一支都依賴它）"),
    ("add-teacher-invites.sql", "用 Email 邀請講師"),
    ("add-class-open-until.sql", "班級開放進度：這班開放到第幾單元"),
    ("add-class-admin.sql", "講師可以把學員移出自己的班級"),
    ("add-teacher-files.sql", "講師教材的私人儲存空間（簡報、題庫、手冊）"),
    ("add-certificates.sql", "結業證書與公開查證連結"),
    ("add-signups.sql", "課程報名：梯次與報名名單"),
    ("fix-grants.sql", "訪客讀得到梯次（權限修正）"),
    ("add-contact.sql", "聯絡表單"),
    ("fix-security.sql", "證書由資料庫核發、報名名額由資料庫判斷"),
    ("add-community.sql", "後台編班、意見回饋與作品投稿、交流留言板"),
]

n = len(PARTS)
out = [f"""-- ============================================================
-- Vibe Coding 實戰課．資料庫一次到位
-- （這份是合併出來的，不要直接改；改各支 SQL 後執行 python3 scripts/build_run_all.py）
--
-- ★ 貼之前先確認一件事：
--   Supabase 左上角的專案，要選「課程」那一個，不要選到教會的專案。
--   這份會建立資料表與權限規則，貼錯專案會在教會的資料庫裡長出不該有的東西。
--
-- 用法：Supabase → SQL Editor → New query → 整份貼上 → Run。
--       可以重複執行，已經跑過的不會出錯、也不會覆蓋資料；資安修正都已經包在裡面，
--       重跑不會把修好的漏洞打開。
--
-- 這份由下面 {n} 支依序合併：
--   {"、".join(f for f, _ in PARTS)}
--
-- 跑完之後還要做兩件事：
--   1. （只有第一次）到 schema.sql 最下面那行「設定講師」，把你的 Email 填進去單獨執行一次，
--      否則後台會說「這個帳號不是講師」。
--   2. 執行 check-deploy.sql（只會讀、不會改），每一列都是 ✅ 才算裝好。
-- ============================================================
"""]
for i, (name, desc) in enumerate(PARTS, 1):
    body = (SQL / name).read_text(encoding="utf-8").rstrip("\n")
    out.append(f"""

-- ============================================================
-- 【{i}／{n}】{name}
-- {desc}
-- ============================================================

{body}
""")
(SQL / "RUN-ALL.sql").write_text("".join(out), encoding="utf-8")
print(f"RUN-ALL.sql：合併了 {n} 支")

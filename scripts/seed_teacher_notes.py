"""把私人的 teacher/notes.js 轉成 SQL，貼到 Supabase SQL Editor 執行，講師登入後就能在任何電腦看到講師內容。

執行：python scripts/seed_teacher_notes.py
輸出：teacher/seed-notes.sql（在私人 repo 裡，不會進公開網站）
"""
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
NOTES = ROOT / "teacher" / "notes.js"
OUT = ROOT / "teacher" / "seed-notes.sql"

if not NOTES.exists():
    raise SystemExit("找不到 teacher/notes.js：請先把私人講師 repo clone 到 teacher/ 資料夾")

# notes.js 是給瀏覽器用的，借 Node 讀出來，避免自己解析 JavaScript
dump = subprocess.run(
    ["node", "-e", "global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify(window.TEACHER_NOTES))", str(NOTES)],
    capture_output=True, text=True, encoding="utf-8", check=True,
).stdout
notes = json.loads(dump)


def quote(text: str) -> str:
    """用 Postgres 的 $tag$ 字串，內容裡的引號不用跳脫。"""
    tag = "$note$"
    if tag in text:
        raise ValueError("講師內容裡出現了 $note$，請換一個標記")
    return f"{tag}{text}{tag}"


lines = ["-- 由 scripts/seed_teacher_notes.py 產生，請勿手動修改。", "begin;"]
for slot, note in notes.items():
    lines.append(
        f"insert into public.teacher_notes (slot, cls, html) values ({quote(slot)}, {quote(note['cls'])}, {quote(note['html'])})\n"
        f"  on conflict (slot) do update set cls = excluded.cls, html = excluded.html, updated_at = now();"
    )
lines.append("commit;")
OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"已產生 {OUT.relative_to(ROOT)}：{len(notes)} 段講師內容")

"""替所有 HTML 裡的本地 .js/.css 網址加上版本號，避免學員的瀏覽器用到舊檔案。

每次發佈前執行：python scripts/bump_assets.py
"""
import pathlib
import re
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
VERSION = time.strftime("%Y%m%d%H%M")
# 只處理相對路徑（assets/...、../assets/...），不動 CDN 或 Google Fonts
PATTERN = re.compile(r'((?:src|href)="(?:\.\./)?assets/[^"?]+\.(?:js|css))(?:\?v=[\w]+)?"')

for page in list(ROOT.glob("*.html")) + list(ROOT.glob("modules/*.html")):
    text = page.read_text(encoding="utf-8")
    updated = PATTERN.sub(rf'\1?v={VERSION}"', text)
    if updated != text:
        page.write_text(updated, encoding="utf-8")
        print(f"updated {page.relative_to(ROOT)}")
print(f"version {VERSION}")

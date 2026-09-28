#!/usr/bin/env python3
"""把 starter/ 打包成 downloads/vibe-starter.zip，給學員在單元 10 下載。

改了 starter/ 裡的任何檔案後執行一次：python3 scripts/build_starter.py
"""
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'starter'
OUT = ROOT / 'downloads' / 'vibe-starter.zip'

OUT.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(SRC.iterdir()):
        if f.is_file():
            # 解壓縮後是一個 vibe-starter 資料夾；固定時間戳記，內容沒變時檔案就不會變
            info = zipfile.ZipInfo(f'vibe-starter/{f.name}', date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, f.read_bytes())
print(f'wrote {OUT.relative_to(ROOT)}')

#!/usr/bin/env python3
"""把範本資料夾打包成 downloads/ 裡的 zip，給學員下載。

  starter/      → downloads/vibe-starter.zip   （單元 10 登記系統）

LINE 場的 AI 小秘書不在這裡：學員直接 Fork 講師的開源專案 line-secretary-。

改了範本裡的任何檔案後執行一次：python3 scripts/build_starter.py
"""
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PACKS = [('starter', 'vibe-starter')]

for src_name, name in PACKS:
    src = ROOT / src_name
    out = ROOT / 'downloads' / f'{name}.zip'
    out.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in sorted(src.rglob('*')):
            if f.is_file():
                # 解壓縮後是一個同名資料夾；固定時間戳記，內容沒變時檔案就不會變
                info = zipfile.ZipInfo(f'{name}/{f.relative_to(src).as_posix()}', date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, f.read_bytes())
    print(f'wrote {out.relative_to(ROOT)}')

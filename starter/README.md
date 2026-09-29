# 登記系統（Vibe Coding 實戰課範本）

一個「登入後填表、自己看得到自己的、管理者看得到全部」的小系統。
報名、請假、設備借用、訂便當、場地預約，都可以用它改。

- 使用者用 Email 登入（點信裡的連結，不用記密碼）
- 資料存在 Supabase（雲端資料庫），誰能看什麼由資料庫把關
- 管理者可以改狀態、下載 Excel 用的 CSV 和 JSON 備份
- 備份檔可以用 `reader.html` 離線打開，不用網路、不用帳號

---

## 第一次設定（約 20 分鐘，只要做一次）

第一次用 Supabase？每一步按哪裡，看圖解：https://windsjp00171-star.github.io/vibe-coding-course/guide-supabase.html

1. **建立 Supabase 專案**
   到 supabase.com 註冊 → New project。名稱取你的作品名，密碼存進密碼管理器（之後幾乎用不到，但不要弄丟）。
2. **建資料表和權限**
   左邊選 SQL Editor → 把 `setup.sql` 整段貼上。
   先把最後一行的 `換成你的Email@example.com` 改成你自己的 Email（你就是管理者），再按 Run。
3. **把網址告訴 Supabase**（不然登入信的連結會連錯地方）
   Authentication → URL Configuration：
   - Site URL：填你的網站網址，例如 `https://你的帳號.github.io/作品名/`
   - Redirect URLs：加上同一個網址；在自己電腦上測試的話，再加一個 `http://localhost:*/**`
4. **把鑰匙填進 config.js**
   Project Settings → API：複製 Project URL 和 **anon／publishable** key，貼到 `config.js` 的 `supabaseUrl`、`supabaseKey`。
   ⚠️ 不要貼 service_role／secret 那一把。那把鑰匙可以繞過所有權限。
5. **上線**：push 到 GitHub，開 GitHub Pages（課程單元 05）。

## 想改成用 LINE 登入、狀態改變時 LINE 通知本人？

照 `LINE.md` 做（課程的 LINE 場）。會多兩支放在 Supabase 的後端小程式（`functions/` 資料夾）。

## 改成你的題目：用說的，讓 Claude Code 動手

不用自己打開檔案改。跟 Claude Code 說：

> 照 CLAUDE.md 的規則，把這個登記系統改成「＿＿（你的題目）」：欄位有＿＿、＿＿（下拉選單：＿／＿）、＿＿（日期）。先用規劃模式告訴我要改哪些檔案，等我說好再改；改完告訴我怎麼測試。

（它會改 `config.js` 的 `title`、`intro`、`fields`。欄位都存在資料庫的同一格，所以**改欄位不用改資料庫**。）

**AI 說做好了不算數，你測過才算**：手機填一筆、第二個帳號看不到別人的資料、下載的 CSV 欄位是對的。

## 延伸挑戰：加一個範本沒有的功能

範本只是起點。挑一個你的題目真的需要的，用五個零件（要做什麼、給誰用、限制、怎樣算完成、先規劃）講給 Claude Code 聽：

- 額滿就不能再登記（同一天超過 5 筆擋下來；要改資料庫規則，Claude Code 會先跟你解釋權限怎麼變）
- 管理者可以搜尋、篩選
- 「我的登記」照日期排序、過期變灰色

驗收三件事：新功能真的做到、原本的功能沒壞、第二個帳號還是看不到別人的資料。

## 上線前一定要測的一件事

用**另一個 Email** 登入，確認：
- 看不到你用第一個 Email 登記的資料
- 看不到「全部登記（管理者）」那一區

兩個都對，權限才是真的有效。

---

## 給接手的人（不會寫程式也看得懂）

**這是什麼**：一個網頁登記系統。網頁放在 GitHub，資料放在 Supabase。

**你需要拿到的權限**
- GitHub：這個專案的管理權限（改網頁用）
- Supabase：這個專案的成員權限（看資料、改設定用）
- 管理者：請原本的管理者在 Supabase → SQL Editor 執行
  `insert into public.admins (email) values ('你的Email');`

**日常要做的事**
- 看登記、改狀態：用管理者的 Email 登入網站
- **每個月備份一次**：按「下載備份（JSON）」，存到雲端硬碟或隨身碟（不要只存在同一台電腦）
- 看舊備份：雙擊 `reader.html`，選備份檔

**出事了怎麼辦**
- 登入信收不到：看垃圾郵件；免費方案每小時能寄的信有限，等一下再試
- 網站打不開：看 GitHub → Settings → Pages 是否還開著
- 資料不見了：用最近一次的 JSON 備份，請懂的人幫忙匯回 Supabase

**要停掉這個系統**
1. 先下載一次 JSON 備份
2. GitHub → Settings → Pages → 關閉
3. Supabase → Project Settings → 暫停或刪除專案（刪除後資料無法復原）

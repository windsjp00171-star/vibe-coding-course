# 會員功能設定教學（Supabase ＋ Google 登入）

沒做這些設定時，網站照常運作，只是沒有登入按鈕，進度只存在學員自己的瀏覽器。

完成後：學員可以用 Google 登入保存進度、輸入加入碼加入班級；講師登入後在任何電腦都看得到講師內容，並能在 `teacher.html` 看全班進度。

---

## 1. 建立 Supabase 專案

1. 到 https://supabase.com/dashboard → **New project**
2. 設定：
   - **Project name**：`vibe-coding-course`
   - **Database password**：按 Generate，存進你的密碼管理器（網站用不到它，也不要給任何人）
   - **Region**：Northeast Asia (Tokyo)
   - **GitHub**：不用選
   - **Enable Data API**：✅
   - **Automatically expose new tables**：❌（權限由 `schema.sql` 逐一開放）
   - **Enable automatic RLS**：✅
3. 等專案建立完成（約 1～2 分鐘）

## 2. 建立資料表

1. 左側選單 **SQL Editor** → **New query**
2. 打開這個 repo 的 `supabase/schema.sql`，**整份**複製貼上 → **Run**
3. 看到 `Success. No rows returned` 就完成了（這份 SQL 可以重複執行）

## 3. 設定 Google 登入

### 3-1. 先拿到 Supabase 的「回呼網址」

Supabase → **Authentication** → **Sign In / Providers** → **Google**，畫面上有一個 **Callback URL**，長得像：

```
https://你的專案代號.supabase.co/auth/v1/callback
```

先複製起來，下一步要用。

### 3-2. 到 Google 申請登入憑證

1. 到 https://console.cloud.google.com/ ，建立一個新專案（名稱例如 `vibe-coding-course`）
2. 進入 **Google Auth Platform**（或「API 和服務 → OAuth 同意畫面」），依指示設定：
   - 應用程式名稱：`Vibe Coding 實戰課`
   - 使用者類型：**外部（External）**
   - 支援電子郵件：你的 Email
3. **Clients（用戶端）** → **Create client** → 應用程式類型選 **Web application**
4. **Authorized JavaScript origins（已授權的 JavaScript 來源）** 加入：
   - `https://windsjp00171-star.github.io`
   - `http://localhost:5173`（在自己電腦上課用）
5. **Authorized redirect URIs（已授權的重新導向 URI）** 貼上 3-1 複製的 Callback URL
6. 按建立，複製畫面上的 **Client ID** 和 **Client Secret**
7. 同意畫面若是「測試中」狀態，只有你加入的測試使用者能登入。開課前記得按 **發布（Publish app）**

### 3-3. 回到 Supabase 填入

Supabase → **Authentication** → **Sign In / Providers** → **Google**：打開，貼上 Client ID 和 Client Secret → Save。

> Client Secret 只填在 Supabase 後台，**不要**放進網站程式、不要貼到對話裡。

### 3-4. 設定允許登入後回到哪些網址

Supabase → **Authentication** → **URL Configuration**：

- **Site URL**：`https://windsjp00171-star.github.io/vibe-coding-course/`
- **Redirect URLs** 加入：
  - `https://windsjp00171-star.github.io/vibe-coding-course/**`
  - `http://localhost:5173/**`

## 4. 把網址填進網站

Supabase → **Project Settings** → **API**（或 **API Keys**），複製：

- **Project URL**
- **Publishable key**（`sb_publishable_` 開頭；舊介面叫 `anon` key）

填進 `assets/js/config.js`：

```js
window.COURSE_CONFIG = {
  supabaseUrl: 'https://你的專案代號.supabase.co',
  supabaseKey: 'sb_publishable_……',
};
```

> 這兩個值本來就是公開給網頁用的，放在公開 repo 沒問題。
> **絕對不要**放 `service_role` 或 `secret` key。

存檔、commit、push，等 GitHub Pages 更新（約 1～2 分鐘）。

## 5. 把自己設成講師

1. 打開課程網站，右上角 **☁️ 登入保存進度**，用你的 Google 帳號登入一次
2. 回到 Supabase **SQL Editor**，執行（把 Email 換成你的）：

```sql
update public.profiles set role = 'teacher', enrolled = true
  where id = (select id from auth.users where email = '你的Email@gmail.com');
```

3. 匯入講師內容：在課程資料夾執行

```bash
python scripts/seed_teacher_notes.py
```

   把產生的 `teacher/seed-notes.sql` 內容貼到 SQL Editor → Run。

4. 重新整理課程網站：右上角出現「學員／講師」切換，就代表成功了。打開 `teacher.html` 可以開班級、看全班進度。

## 6. 新增其他講師（不用寫 SQL）

先在 SQL Editor 執行一次 `supabase/add-teacher-invites.sql`（只需要做一次）。之後：

1. 打開管理後台 `teacher.html` →「👥 會員管理」
2. 在「✉️ 邀請講師」輸入對方的 Google Email → 設為講師
   - 對方已經登入過：立刻變成講師
   - 對方還沒登入過：他第一次用 Google 登入時，自動變成講師
3. 也可以在會員列表直接按「設為講師」

## 7. 讓學員也能登入（發布 Google 登入）

Google 登入預設是「測試中」，只有你自己和「測試使用者」登得進去。
Google Cloud → Google Auth Platform →「目標對象」→ 發布應用程式。
（上傳應用程式標誌會觸發品牌驗證，需要先在 Search Console 驗證網址擁有權；不需要標誌的話就不要上傳。）

## 8. 控制每個班級開放到哪個單元

1. 到 Supabase → **SQL Editor**，貼上 `supabase/add-class-open-until.sql` 的內容，按 **Run**（只要做一次）。
2. 打開課程網站的「🛠️ 管理後台」→「🏫 班級」，每個班級卡片上有「🔓 學員可以看到」下拉選單。
3. 選「到單元 N」就只開放 1～N；選「全部單元」就全開。選了立刻存檔，學員重新整理頁面就生效。

規則：
- 加入班級的學員一律照開課進度，試用單元（1、4、7）也一樣；試用單元只對還沒加入班級的訪客開放。
- 講師永遠看得到全部單元。
- 同一位學員在兩個班，以開得比較多的那班為準。
- 沒設定過的班級＝全部開放，所以舊班級不會突然被鎖住。

## 9. 讓講師可以把學員移出班級

到 Supabase → **SQL Editor**，貼上 `supabase/add-class-admin.sql` 執行一次（只要做一次）。
執行後，後台「🏫 班級」的每位學員旁邊會出現「移出」按鈕。

移出只會把人從這個班級名單拿掉，**不會動到**他的開通狀態、學習進度或帳號。
沒執行這段 SQL 也不影響其他功能，只是按「移出」會顯示提示。

## 10. 把教材放進後台（簡報、Kahoot、手冊）

檔案放在 Supabase 的私人儲存空間，只有講師下載得到；公開網站和 GitHub 上都不會有。

1. Supabase → **SQL Editor**，貼上 `supabase/add-teacher-files.sql` 執行一次。
2. 打開「🛠️ 管理後台 → 📁 教材下載」。
3. 每個區塊右上角按「⬆️ 上傳／更新」，選電腦上 `course/teacher/` 裡的檔案：
   - `slides/`（每單元一份 .pptx）→ 上傳到「課程簡報」
   - `kahoot/`（每單元一份 .xlsx）→ 上傳到「Kahoot 題庫」
   - `handbook/`（4 份 PDF）→ 上傳到「學習手冊」
4. 之後在任何電腦登入講師帳號，都能從這裡下載。

注意事項：
- 下載連結是臨時產生的，**5 分鐘後失效**，不要轉貼給學員。
- 網頁內容改過後要重新產生簡報（`python scripts/extract_slides.py` 再 `node scripts/build_slides.js`），然後重新上傳覆蓋。
- 免費方案的儲存空間有上限；目前這些檔案約 21 MB。

## 常見問題

| 狀況 | 原因與解法 |
|---|---|
| 按登入後跳回來，但還是沒登入 | 3-4 的 Redirect URLs 沒加到目前的網址 |
| Google 畫面顯示「存取遭拒」或 redirect_uri_mismatch | 3-2 第 5 步的 redirect URI 跟 Supabase 的 Callback URL 不一樣（多一個斜線也不行） |
| 只有我能登入，學員不行 | Google 同意畫面還在「測試中」，要按發布 |
| 登入了但看不到講師切換 | 第 5 步的 SQL 還沒執行，或 Email 打錯 |
| 講師後台顯示「讀取班級失敗」 | `schema.sql` 沒有整份執行成功，重新執行一次 |

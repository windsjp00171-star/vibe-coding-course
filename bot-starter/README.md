# LINE AI 小秘書（Vibe Coding 實戰課．LINE 場範本）

在 LINE 上跟它說一句話，它就幫你記下來、時間到了提醒你。

- 「明天下午三點跟阿秦開會」→ 分成**提醒**，明天 15:00 用 LINE 叫你
- 「週五前交報告」→ 分成**待辦**，週五早上 8 點列在今日清單
- 「會議室密碼 4321」→ 分成**筆記**，記下來就好
- 傳「清單」看還沒做完的事，「完成 2」把第 2 件打勾，「說明」看用法

**分工（單元 12）**：看懂一句話是什麼、日期是哪天，交給 AI（Claude）；什麼時候提醒、清單怎麼排、打勾，全部由程式決定，不花 AI 的錢。

**零件**
| 檔案 | 做什麼 |
|---|---|
| `functions/line-bot/index.ts` | 收 LINE 訊息、檢查簽章、指令、請 Claude 分類、存資料、回覆。最上面的 `DESIGN` 就是你的小秘書設計 |
| `functions/line-remind/index.ts` | 鬧鐘：時間到了推提醒、每天早上 8 點推今日清單 |
| `setup.sql` | 資料表、權限、排程 |
| `reader.html` | 離線看備份（CSV） |
| `CLAUDE.md` | 給 Claude Code 的規則 |

---

## 第一次設定（約 60 分鐘，只要做一次）

### 1. LINE Developers：建一個 Messaging API channel（約 15 分鐘）
1. developers.line.biz → 用你的 LINE 登入 → Console → Create a new provider（例如你的名字）。
2. Create a new channel → **Messaging API**（會引導你建一個 LINE 官方帳號）。
3. 抄下兩個**秘密**（只抄在自己的筆記，不要貼到任何檔案或 GitHub）：
   - Basic settings → **Channel secret**
   - Messaging API → **Channel access token (long-lived)** → Issue
4. 用手機掃 Messaging API 分頁的 QR code，**加好友**。
5. 到 LINE Official Account Manager → 設定 → 回應設定：**關掉「自動回應訊息」**、打開 **Webhook**（不然官方帳號會搶著回罐頭訊息）。

### 2. Claude API 金鑰（約 5 分鐘）
1. 到 console.anthropic.com 註冊、儲值（小秘書一則訊息的費用很低，先儲最少的金額就好）。
2. **設定每月花費上限**（Settings → Limits），免得意外爆帳單（單元 22）。
3. API Keys → Create Key，抄下來（秘密）。

### 3. Supabase：資料表與權限（約 10 分鐘）
1. supabase.com → **New project**（小秘書用一個新的專案，不要和別的系統混在一起）。
2. SQL Editor → 貼上 `setup.sql` 的**第 1、2 段** → Run。

### 4. Supabase：放兩支後端小程式（約 15 分鐘）
1. Edge Functions → Secrets，新增：
   | 名稱 | 值 |
   |---|---|
   | `LINE_CHANNEL_SECRET` | 第 1 步的 Channel secret |
   | `LINE_CHANNEL_ACCESS_TOKEN` | 第 1 步的 long-lived token |
   | `ANTHROPIC_API_KEY` | 第 2 步的 API 金鑰 |
   | `CRON_SECRET` | 自己亂打 20 個以上的英數字（當鬧鐘的暗號） |
   | `ALLOWED_LINE_USERS` | 選填：只讓這些人用，逗號分隔（見第 7 步） |
2. Edge Functions → Deploy a new function → **Via Editor**：
   - 名稱 `line-bot`，貼上 `functions/line-bot/index.ts` → Deploy
   - 部署後到設定，把 **Verify JWT**（或 Enforce JWT Verification）**關掉**：LINE 不會帶 Supabase 的登入憑證
3. 同樣方式建立 `line-remind`，貼上 `functions/line-remind/index.ts`。**這支也要關掉 Verify JWT**（它用自己的暗號 `CRON_SECRET` 把關）。
4. 抄下 `line-bot` 的網址：`https://你的專案代號.supabase.co/functions/v1/line-bot`

### 5. 把網址告訴 LINE（約 3 分鐘）
LINE Developers → 你的 Messaging API channel → Messaging API 分頁：
- **Webhook URL** 填第 4 步的 `line-bot` 網址 → Update → **Verify**（顯示 Success 就對了）
- **Use webhook** 打開

### 6. 排程（鬧鐘）（約 5 分鐘）
1. Database → **Extensions**：打開 `pg_cron` 和 `pg_net`。
2. 把 `setup.sql` **第 3 段**的「你的專案代號」「你的暗號」換掉 → SQL Editor 貼上 → Run。

### 7. 測試
在 LINE 對小秘書說：
- 「說明」→ 應該回用法
- 「5 分鐘後提醒我喝水」→ 應該回【提醒】，5～10 分鐘內收到 ⏰
- 「清單」→ 看得到剛剛那件
- 「完成 1」→ 打勾

**只讓自己（或家人）用**：傳任何一句話之前，先把 `ALLOWED_LINE_USERS` 設成一個不存在的值（例如 `x`），再傳一句話，小秘書會回你的代號（`U` 開頭那串）。把代號填進 `ALLOWED_LINE_USERS`，多個人用逗號隔開。

## 改成你的小秘書
打開 `functions/line-bot/index.ts`，只改最上面的 `DESIGN`（分類、規則、口氣）。改完**整份重新貼到 Supabase 的編輯器、再 Deploy 一次**。

跟 Claude Code 說：「照 CLAUDE.md 的規則，把 DESIGN 改成：分類有 ＿＿，最重要的規則是 ＿＿，口氣像 ＿＿」。

---

## 給接手的人（不會寫程式也看得懂）

**這是什麼**：一個 LINE 官方帳號，背後的程式放在 Supabase，用 Claude 判斷訊息的意思。

**你需要拿到的權限**
- LINE Developers：這個 Provider 的管理權限
- Supabase：這個專案的成員權限
- Anthropic Console：帳號的管理權限（付費、金鑰）

**日常要做的事**
- **每個月備份一次**：Supabase → Table Editor → `bot_items` → Export → **CSV**，存到雲端硬碟或隨身碟。看舊備份：雙擊 `reader.html`，選那個 CSV（Excel 也打得開）。
- **每個月看一次帳單**：Anthropic Console → Billing。

**出事了怎麼辦**
| 狀況 | 先檢查 |
|---|---|
| 小秘書完全不回 | LINE Developers 的 Webhook 有沒有打開、Verify 是否 Success；`line-bot` 的 Verify JWT 是否關掉 |
| 回「我沒看懂」 | `ANTHROPIC_API_KEY` 是否正確、帳戶有沒有餘額 |
| 沒收到提醒 | Extensions 的 pg_cron、pg_net 有沒有開；`select * from cron.job_run_details order by start_time desc limit 10;` 看排程有沒有跑；暗號兩邊是否一樣 |
| 提醒時間差 8 小時 | 排程用的是國際時間（UTC），台灣要減 8（單元 12） |
| 官方帳號回罐頭訊息 | Official Account Manager 的「自動回應訊息」沒關 |

錯誤訊息在：Supabase → Edge Functions → 點函式 → **Logs**。請 Claude Code 幫忙前，**先把金鑰、權杖換成 xxx** 再貼。

**要停掉這個小秘書**
1. 先匯出一次 CSV 備份
2. SQL Editor 執行：`select cron.unschedule('bot-due'); select cron.unschedule('bot-morning');`
3. LINE Developers → Webhook 關掉
4. Anthropic Console → 刪除 API 金鑰
5. Supabase → 暫停或刪除專案（刪除後資料無法復原）

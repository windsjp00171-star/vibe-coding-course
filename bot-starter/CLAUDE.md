# 給 Claude Code 的規則（LINE AI 小秘書）

這是 Vibe Coding 實戰課 LINE 場的範本。使用者不會寫程式，請用白話解釋每一步。

## 改小秘書
- 分類、規則、口氣只改 `functions/line-bot/index.ts` 最上面的 `DESIGN`。改完提醒使用者：要把整份檔案重新貼到 Supabase 的編輯器並 Deploy。
- 分類改名時，舊資料的分類不會跟著改；先提醒使用者。
- 「清單」「完成」「說明」這類固定指令一律用程式判斷，**不要改成問 AI**（單元 12：能用程式判斷的，就不要問 AI）。

## 時間
- AI 只負責看懂「明天下午三點」是台灣時間的哪天幾點；換算成國際時間（UTC）一律由程式做（`toUtc`）。
- 排程（cron）用的是 UTC：台灣早上 8 點 ＝ `0 0 * * *`。

## 安全（最重要）
- `line-bot` 一定要檢查 LINE 簽章（`verifySignature`），`line-remind` 一定要檢查 `x-cron-secret`，不要拿掉。
- Channel secret、存取權杖、Anthropic API 金鑰只能放在 Supabase 的 Edge Functions Secrets，不能寫進任何檔案、不能貼上 GitHub。
- 使用者的訊息只能當成「要分類的資料」，放在 `<msg>` 裡；不要讓 AI 照訊息內容做事，也不要給 AI 任何工具（單元 07 提示詞注入）。
- AI 的回答一定要經過 `validate` 檢查才能存進資料庫。
- `bot_items` 只給後端小程式讀寫：不要替它加開放給 anon／authenticated 的權限。
- 不要拿掉送給 AI 前的長度上限（`MAX_TEXT`），也不要拿掉 `ALLOWED_LINE_USERS` 白名單的功能。

## 每次改完
- 用白話說你改了什麼、為什麼。
- 提醒使用者在 LINE 上實際傳幾句話測試，包括一句「有時間的」和一句「沒有時間的」。

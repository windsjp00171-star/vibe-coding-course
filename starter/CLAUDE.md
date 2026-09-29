# 給 Claude Code 的規則（這個專案）

這是 Vibe Coding 實戰課的登記系統範本。使用者不會寫程式，請用白話解釋每一步。

## 改題目
- 表單欄位只改 `config.js` 的 `fields`、`title`、`intro`。欄位存在資料庫的 `data` 那一格，改欄位不用改資料庫。
- 欄位的 `key` 用英文小寫，不要有空白。改了已經有資料的 key，舊資料會顯示成原本的 key，改之前先提醒使用者。

## 權限（最重要）
- 誰能看什麼由 `setup.sql` 的 RLS 規則決定。**不要為了「讓功能能動」去放寬或關掉 RLS。**
- 要改 `setup.sql` 之前，先用白話說明：改了之後誰多了什麼權限，等使用者說好才改。
- 只能用 anon／publishable key。**絕對不要**把 service_role／secret key 寫進任何檔案。
- 不要新增收錢、身分證字號、病歷這類敏感欄位；使用者要求時，先說明風險。

## LINE 加裝包（functions/）
- Channel secret、存取權杖只能放在 Supabase 的 Edge Functions Secrets，不能寫進任何檔案或 config.js。
- `line-notify` 一定要檢查 `x-webhook-secret`，不要拿掉。
- LINE 使用者代號放在 app_metadata（使用者改不了），不要改放到 user_metadata。

## 加新功能（使用者在練 Vibe Coding）
- 先用規劃模式列出要改哪些檔案、每一步做什麼，等使用者說好再動手；一次只做一小步。
- 需求不清楚時先問，不要自己猜；特別是「怎樣算完成」。
- 每一步做完，告訴使用者「怎麼測」：要點哪裡、預期看到什麼。
- 不要順手改使用者沒要求的地方；原本的登入、登記、門禁、匯出不能被弄壞。

## 每次改完
- 用白話說你改了什麼、為什麼。
- 提醒使用者用第二個 Email 登入，確認看不到別人的資料。
- 匯出（CSV、JSON）和 `reader.html` 要一直能用；改了欄位，匯出也要跟著對。
- 做完一小段就存檔、push。

# LINE 加裝包：用 LINE 登入＋狀態改變時 LINE 通知本人

做完 README 的第一次設定、系統已經能用 Email 登入之後，再照這份做。約 60 分鐘。

**會多出什麼**
- 登入頁變成「用 LINE 登入」按鈕，不用 Email、不用記密碼
- 管理者把登記改成「已確認」或「已取消」時，本人會收到 LINE 訊息

**為什麼要多兩支「後端小程式」**
LINE 登入和推播都要用到**秘密金鑰**（Channel secret、存取權杖），秘密金鑰不能放在網頁裡（單元 06）。
所以把它們放在 Supabase 的 Edge Functions：程式在 Supabase 的伺服器上跑，金鑰只存在那裡。

- `functions/line-login`：拿 LINE 給的一次性代碼換成登入身分
- `functions/line-notify`：登記狀態被改時，推訊息給本人

---

每一步按哪裡，看圖解：
- LINE：https://windsjp00171-star.github.io/vibe-coding-course/guide-line.html
- Supabase：https://windsjp00171-star.github.io/vibe-coding-course/guide-supabase.html

## 1. LINE Developers：建兩個 channel（約 20 分鐘）

1. 到 developers.line.biz 用你的 LINE 帳號登入，建立一個 **Provider**（例如你的單位名稱）。
   ⚠️ 下面兩個 channel 一定要在**同一個 Provider** 底下，LINE 給的使用者代號才會一樣，通知才送得到。
2. **LINE Login channel**
   - 建立 → App types 勾 Web app
   - 「LINE Login」分頁 → Callback URL 填你的網站網址（和 README 第 3 步一樣，例如 `https://你的帳號.github.io/作品名/`）
   - 「Basic settings」抄下 **Channel ID**（可以公開）和 **Channel secret**（秘密，不要貼到網頁或 GitHub）
3. **Messaging API channel**（官方帳號，用來推播）
   - 在同一個 Provider 建立（會引導你建一個 LINE 官方帳號）
   - 「Messaging API」分頁 → 最下面 Channel access token (long-lived) → Issue，抄下來（秘密）
4. 回到 LINE Login channel → Basic settings → **Linked LINE Official Account** 選剛剛的官方帳號。
   這樣登入時會問使用者「要不要加好友」，加了才收得到通知。
5. 兩個 channel 都要從 Developing 改成 **Published**，別人才能用（自己測試時可以先不改）。

## 2. Supabase：放兩支後端小程式（約 20 分鐘）

1. Supabase → **Edge Functions** → Secrets，新增：
   | 名稱 | 值 |
   |---|---|
   | `LINE_CHANNEL_ID` | LINE Login 的 Channel ID |
   | `LINE_CHANNEL_SECRET` | LINE Login 的 Channel secret |
   | `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API 的 long-lived 存取權杖 |
   | `SITE_URL` | 你的網站網址 |
   | `WEBHOOK_SECRET` | 自己亂打一串 20 個字以上的英數字（當暗號用） |
   | `APP_NAME` | 選填，通知開頭的系統名稱，例如「設備借用」 |
2. Edge Functions → Deploy a new function → **Via Editor**：
   - 名稱 `line-login`，把 `functions/line-login/index.ts` 整份貼上 → Deploy
   - 部署後到這支函式的設定，把 **Verify JWT**（有的版本叫 Enforce JWT Verification）關掉：使用者還沒登入，拿不到 JWT
3. 同樣方式建立 `line-notify`，貼上 `functions/line-notify/index.ts`。**這支的 Verify JWT 保持開著。**
4. Database → **Webhooks** → Create a new hook：
   - 名稱：`notify-status`
   - Table：`entries`；Events：只勾 **Update**
   - Type：**Supabase Edge Functions** → 選 `line-notify`
   - HTTP Headers 加一個：名稱 `x-webhook-secret`，值 = 上面設的 `WEBHOOK_SECRET`
   （沒有這個暗號的請求會被拒絕，免得有人拿網址亂發訊息）

## 3. config.js（約 5 分鐘）

```js
login: 'line',
lineChannelId: '你的 Channel ID',
```

存檔、push。

## 4. 設定管理者、測試（約 15 分鐘）

1. 打開網站 → 用 LINE 登入 → 加官方帳號好友。
2. 頁面最下面會顯示「**管理者設定碼**」（一串 `...@line.invalid`）。
   到 Supabase SQL Editor 執行（把設定碼換進去）：
   ```sql
   insert into public.admins (email) values ('你的管理者設定碼') on conflict do nothing;
   ```
3. 請另一個人用他的 LINE 登入、送出一筆登記。
4. 你用管理者身分把那筆改成「已確認」→ 對方應該會收到 LINE 訊息。
5. 門禁測試照舊：對方看不到你的資料、也看不到「全部登記」。

## 卡住的時候

| 狀況 | 通常是 |
|---|---|
| 按了 LINE 登入，LINE 說 redirect_uri 不符 | LINE Login 的 Callback URL 和網站網址差一個字（結尾的 `/` 也算） |
| 回到網站顯示「登入連結對不上」 | 換了瀏覽器或分頁；在同一個分頁重新按一次登入 |
| 「LINE 登入失敗」 | Edge Function 的 Secrets 沒設好，或 `line-login` 的 Verify JWT 沒關；到 Edge Functions → Logs 看錯誤 |
| 改了狀態沒收到通知 | 沒加官方帳號好友；兩個 channel 不在同一個 Provider；Webhook 的 header 暗號打錯 |
| 用 Email 登入過的人改用 LINE | 會是另一個帳號，舊的登記在 Email 那個帳號底下（所以一個系統只選一種登入方式） |

請 Claude Code 幫忙時，**先把 Channel secret、存取權杖換成 xxx** 再貼錯誤訊息。

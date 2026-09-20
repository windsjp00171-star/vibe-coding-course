# Vibe Coding 實戰課

給**非軟體背景上班族**的 AI 寫程式課。用 Claude Code 當 AI 工程師，從在自己電腦上做出第一個網頁，到用 Git／GitHub 管理版本、部署上線，再到避開 AI 時代的資安陷阱。

採**翻轉教室**設計：網站是課前自學教材，講師模式是課中工作坊流程，列印樣式是紙本學習單。

## 課程單元

| 段落 | 單元 | 狀態 |
|---|---|---|
| A 起步 | 1 什麼是 Vibe Coding｜2 安裝你的 AI 工程師｜3 怎麼跟 Claude Code 合作 | ✅ |
| B 上線 | 4 Git 與 GitHub 白話講｜5 把作品放上網路 | ✅ |
| C 資安 | 6 鑰匙與機密別外流｜7 AI 會被騙：你是門神｜8 上線前的 Vibe Check | ✅ |
| 結業 | 9 總測驗與結業證書 | ✅ |
| D 進階選修 | 10 Supabase｜11 會員系統｜12 LINE Bot｜13 LINE 登入｜14 PWA｜15 推播 | ✅ |

## 使用方式

- **學員**：打開網站照單元順序讀、玩互動練習、做小測驗。進度只存在自己的瀏覽器。
- **講師**：右上角切到「講師」，會出現紫色的教學提示、工作坊流程、討論題和計時器。按 `P` 進入投影模式，用方向鍵逐段講解。
- **紙本講義**：每個單元右上角「🖨️ 講義」，印出來是含填空與練習的學習單（也可存成 PDF）。
- **不懂怎麼用**：每頁右上角「？ 教學」會一步步帶你認識畫面。

## 本機預覽

純靜態網站，沒有建置步驟：

```bash
python -m http.server 5173
```

發佈前執行 `python scripts/bump_assets.py`，替 JS/CSS 加上版本號，避免學員瀏覽器用到舊檔。

打開 http://localhost:5173

## 測試

判斷對錯的邏輯（個資遮罩、程式碼體檢、Git 模擬器、計分）都有單元測試：

```bash
node --test tests/*.test.js
```

## 檔案結構

```
index.html              對外首頁（分流：想學做東西／要辦資安宣導／已是學員）
learn.html              學員的課程首頁與課程地圖
works.html              學員作品牆（開課前為講師示範＋保留席次）
verify.html             結業證書公開查證（需先執行 supabase/add-certificates.sql）
modules/                各單元頁面
assets/css/course.css   共用樣式（設計 token、講師模式、投影、列印）
assets/js/core.js       共用骨架：頁首、模式、進度、測驗引擎、計時器
assets/js/tour.js       聚焦式教學導覽（只用 data-tour 定位）
assets/js/lib.js        純邏輯：個資遮罩、程式碼體檢、指令健檢、計分、組卷
assets/js/quiz-bank.js  全課程題庫（單一來源）
assets/js/git-sim.js    Git 教學模型（單元 4）
assets/js/modules/      各單元專屬互動
tests/                  單元測試
```

## 關於案例

教材中的案例來自講師用 Vibe Coding 做過的真實專案。為保護使用單位，私人專案一律匿名化，不含程式碼、網址或組織名稱。

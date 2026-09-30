---
name: Vibe Coding 實戰課
description: 給非軟體背景上班族的 AI 課程網站——學員上課的工作手冊，也是對外招生的門面。
colors:
  pen-indigo: "#4f46e5"
  pen-indigo-deep: "#3730a3"
  indigo-wash: "#eceefe"
  key-rim: "#a59fdc"
  key-edge: "#aba5db"
  key-face: "#f4f5fe"
  night-ink-band: "#17143d"
  paper: "#faf8f4"
  paper-fold: "#f2eee6"
  card-white: "#ffffff"
  ink: "#1c1b29"
  pencil-gray: "#5d5b6e"
  rule-line: "#e4dfd5"
  terminal-ink: "#1b1a26"
  ok-green: "#13724e"
  ok-green-fill: "#17835a"
  ok-wash: "#e3f4ec"
  warn-amber: "#92560a"
  warn-wash: "#fcf1de"
  danger-red: "#b8322c"
  danger-red-fill: "#cc3b35"
  danger-wash: "#fbe7e5"
  teacher-violet: "#7c3aed"
  teacher-wash: "#f3ecff"
  highlighter-gold: "#fbbf24"
typography:
  display:
    fontFamily: "Inter, Noto Sans TC, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 1.3rem + 3.6vw, 3.9rem)"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Inter, Noto Sans TC, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.1rem + 1.6vw, 2.25rem)"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, Noto Sans TC, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 800
    lineHeight: 1.25
  body:
    fontFamily: "Inter, Noto Sans TC, system-ui, sans-serif"
    fontSize: "clamp(1rem, 0.95rem + 0.25vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.75
  lead:
    fontFamily: "Inter, Noto Sans TC, system-ui, sans-serif"
    fontSize: "clamp(1.05rem, 1rem + .4vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Inter, Noto Sans TC, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 800
    letterSpacing: "0.08em"
  section-number:
    fontFamily: "Inter, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 900
    lineHeight: 1
  mono:
    fontFamily: "ui-monospace, Cascadia Code, Consolas, monospace"
    fontSize: "0.88rem"
    lineHeight: 1.7
rounded:
  s: "8px"
  m: "14px"
  l: "22px"
  pill: "999px"
spacing:
  gutter: "16px"
  card: "clamp(18px, 3vw, 28px)"
  section: "clamp(3rem, 2rem + 4vw, 6rem)"
  container: "1120px"
components:
  button:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-primary:
    backgroundColor: "{colors.pen-indigo}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.pen-indigo-deep}"
  button-small:
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  option:
    backgroundColor: "{colors.key-face}"
    textColor: "{colors.ink}"
    rounded: "{rounded.m}"
    padding: "12px 16px"
  option-right:
    backgroundColor: "{colors.ok-wash}"
  option-wrong:
    backgroundColor: "{colors.danger-wash}"
  chip:
    backgroundColor: "{colors.key-face}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  chip-selected:
    backgroundColor: "{colors.pen-indigo}"
    textColor: "{colors.card-white}"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.l}"
    padding: "{spacing.card}"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.m}"
    padding: "10px 14px"
  analogy:
    backgroundColor: "{colors.indigo-wash}"
    rounded: "{rounded.m}"
    padding: "16px 20px"
  code-block:
    backgroundColor: "{colors.terminal-ink}"
    textColor: "#e9e7f5"
    rounded: "{rounded.m}"
    typography: "{typography.mono}"
  landing-hero:
    backgroundColor: "{colors.night-ink-band}"
    textColor: "{colors.card-white}"
---

# Design System: Vibe Coding 實戰課

> 這份文件記錄的是 **2026-09-30 的現況**，是 Rule 18 改版前的基準。之後 Impeccable 重新決定視覺方向時，這裡是對照組，不是規範。

## Overview

**Creative North Star: "上班族的工作手冊"**

整個網站像一本攤開在辦公桌上的實戰手冊：米白紙面帶細點格線，粗黑的大標題，章節用空心描邊的大數字編號，重點用鋼筆靛藍劃線、用淡靛藍底色框出「打個比方」。它是給沒有技術背景的上班族看的，所以氛圍是**可靠、清楚、有一點玩心**：閱讀的部分要穩、要好讀；互動的部分（測驗、翻牌卡、拉桿、分類遊戲）才允許有一點遊戲感和獎勵回饋。

系統分成兩個場景，共用同一套 token：**學員頁**（單元、圖解、講義、小辭典）走淺色紙面、層次輕、段落之間用虛線分隔；**對外頁**（首頁、報名、資安內訓，`body.mk`）加上一條滿版的深夜靛藍主視覺帶、光暈和細顆粒，段落間距拉大，數字用編輯式的大字與細線。講師模式另有一條紫色支線（講師筆記、計時器、橫幅），只在 `data-mode="teacher"` 下出現。

最近一次重點改版把「可以按」和「只能看」徹底分開：可以按的東西都有一顆實體按鍵的厚度（底下 3px 的色邊），按下會真的壓下去；只能看的東西一律是平的，沒有膠囊外框、滑過不動。

**Key Characteristics:**
- 米白紙面 + 22px 點格背景，卡片是純白、帶極淡陰影
- 單一主色（鋼筆靛藍）撐起所有強調、連結、焦點框
- Inter + Noto Sans TC，標題 900 粗、內文行高 1.75
- 大圓角（卡片 22px、元件 14px、按鈕膠囊形）
- 可按元件有「按鍵厚度」，只能看的元件是平的
- 完整深色模式，每個語意色都有 `-fill`（實心底色專用）與文字用兩組

## Colors

一個主色、一組紙墨中性色，加上三個語意色（成功、警告、危險）和一個講師專用紫；每個語意色都有「文字用」「淡底」「實心底色」三種深淺。

### Primary
- **鋼筆靛藍** (`pen-indigo`)：連結、強調字、章節編號描邊、焦點框、主要按鈕、選中狀態。深色模式下文字用版本調亮成 `#8b85ff`，當實心底色時改用 `#5b52e0`，白字才看得清楚。
- **深鋼筆靛藍** (`pen-indigo-deep`)：主要按鈕滑過、「打個比方」框內的粗體字。
- **靛藍淡洗** (`indigo-wash`)：「打個比方」的底色、頁首目前頁面、滑過時的底色、小辭典名詞展開。
- **按鍵三色** (`key-rim`、`key-edge`、`key-face`)：由主色和紙墨色混出來的可按元件外框、底邊厚度與面色（原始碼為 `color-mix()`，這裡的 hex 是換算後的近似值）。

### Secondary
- **深夜靛藍帶** (`night-ink-band`)：只用在對外頁的滿版主視覺，疊兩層靛藍光暈和細顆粒。
- **螢光筆金** (`highlighter-gold`)：只在深色主視覺裡當 eyebrow 和打勾的顏色，以及拉桿滿格、全部完成時的獎勵光。

### Tertiary
- **講師紫** (`teacher-violet`、`teacher-wash`)：只屬於講師模式。講師筆記的虛線框、講師橫幅、計時器、課中階段標籤。學員看不到它。

### Neutral
- **紙面** (`paper`)：頁面底色，加 `rgb(28 27 41 / 3.5%)` 的 22px 點格。
- **摺頁** (`paper-fold`)：次層底色，統計小格、選項字母鍵、軌道底。
- **卡片白** (`card-white`)：卡片、輸入框、一般按鈕。
- **墨** (`ink`)：內文與標題，也是反色區塊（翻牌卡背面）的底色。
- **鉛筆灰** (`pencil-gray`)：次要說明、引言、頁尾。
- **格線** (`rule-line`)：所有邊框與分隔線，段落之間用它畫虛線。
- **終端機墨** (`terminal-ink`)：程式碼區、產生器輸出、指令列，淺色與深色模式都一樣深。

### 語意色
- **成功綠** / **警告琥珀** / **危險紅**：文字用版本都特別調深過，在各自的淡底上對比達 5 以上；按鈕、答對答錯的實心圓點則用 `-fill` 版本。

### Named Rules
**The One Ink Rule.** 強調只用鋼筆靛藍。不引入第二個品牌色；琥珀、綠、紅只代表語意（警告、對、錯），紫只代表講師。

**The Fill vs. Text Rule.** 每個有色的 token 都有兩組：放字的（對比優先）和當實心底放白字的（`-fill`）。深色模式下絕不直接把文字色拿來當底色。

## Typography

**Display Font:** Inter（中文由 Noto Sans TC 接手）
**Body Font:** 同上，system-ui 為後備
**Label/Mono Font:** ui-monospace, Cascadia Code, Consolas

**Character:** 一套字撐全場，靠粗細落差建立層次：標題用 900 的黑體、帶一點負字距，像手冊的章名；內文 400、行高 1.75，給中文足夠的呼吸空間。

### Hierarchy
- **Display**（900，`clamp(2.1rem → 3.9rem)`，1.25）：單元主標，最多約 16 字寬；`<em>` 改成靛藍字加一條淡靛藍螢光筆底線。對外首頁的深色主視覺縮小為 `clamp(1.95rem → 2.9rem)`、行高 1.22。
- **Headline**（900，`clamp(1.5rem → 2.25rem)`）：每一段的 h2。
- **Title**（800，1.2rem）：卡片小標 h3，也可用 `.h3` 讓 h2 長得像 h3。
- **Body**（400，`clamp(1rem → 1.125rem)`，1.75）：內文。引言（lead）放大到 1.3rem、鉛筆灰、最寬約 40em。
- **Label**（800，0.8rem，字距 0.08em，大寫）：kicker、eyebrow、名詞分類。對外頁字距加大到 0.16em。
- **Section Number**（Inter 900，2.6rem，手機 2rem）：空心描邊的章節數字，只有 1.5px 的靛藍描邊、沒有填色。

### Named Rules
**The Heavy Heading Rule.** 標題一律 800 以上。層次靠粗細與大小，不靠顏色或斜體。

## Layout

- **容器**：`.wrap` 為 `min(1120px, 100% - 32px)`，左右各 16px 邊距；頁首放寬到 1440px。
- **垂直節奏**：段落間距 `clamp(3rem, 2rem + 4vw, 6rem)`，學員頁每段用 0.55 倍再加一條虛線分隔；對外頁拉大到 `clamp(48px, 6vw, 92px)`，一段只講一件事。
- **格線**：`grid-2`（每欄至少 300px）、`grid-3`（至少 240px），都用 `auto-fit` 自動換行，間距 16px；`split` 是 1.1 : 1 的左右兩欄，860px 以下疊成一欄。
- **對外首頁**：主視覺 980px 以上分成 1.2 : 0.8 左文右圖，以下隱藏右側示意圖；兩條路的卡片 900px 以上刻意不等寬（1.15 : 1），主要那條比較重。
- **頁首**：sticky、永遠一排、高度 58px，放不下的工具按鈕可左右滑、右緣淡出；「？ 教學」固定在最右。720px 以下頁首不跟著捲，只留細的區段目錄貼頂。
- **投影模式**：根字級放大到 125%，一段一頁、垂直置中。
- **斷點**：560 / 640 / 720 / 760 / 860 / 900 / 980px（依元件各自決定，沒有統一斷點表）。

## Elevation & Depth

以**淡陰影 + 紙面層次**為主的混合系統。卡片浮在紙面上一點點；陰影偏冷、帶一點墨色，不用純黑。可按元件另有一種「實體按鍵」的深度：不是模糊陰影，而是底下一條 3px 的實心色邊。

### Shadow Vocabulary
- **Resting** (`box-shadow: 0 1px 2px rgb(28 27 41 / 6%), 0 8px 24px -12px rgb(28 27 41 / 18%)`)：卡片、安裝步驟、作品牆。
- **Lift** (`box-shadow: 0 2px 4px rgb(28 27 41 / 8%), 0 18px 40px -16px rgb(79 70 229 / 35%)`)：滑過的連結卡、提示訊息、教學彈窗、小辭典彈窗；帶一點靛藍色光。
- **Key Edge** (`box-shadow: 0 3px 0 <key-edge>`)：可按元件的按鍵厚度；滑過變 4px，按下變 1px 並位移 2px。
- **Header Rule** (`box-shadow: 0 8px 18px -16px rgb(28 27 41 / 45%)`)：頁首下緣。

### Named Rules
**The Pressable-Has-Depth Rule.** 有按鍵厚度 = 可以按。只能看的東西（標籤、學習目標、題目卡、作品卡）一律平的，滑過不浮起、不發光。

## Shapes

大圓角、友善的形狀語言。三級圓角：小（8px）給程式碼小框、字母鍵；中（14px）給選項、輸入框、提示框；大（22px）給卡片與翻牌卡。按鈕、篩選標籤、分頁、提示訊息是膠囊形（999px）。

例外的邊框語言：「打個比方」是左側 5px 靛藍粗線加右側圓角；講師筆記是 1.5px 虛線框；段落之間是虛線。標籤（`.pill`）和課前／課中／課後不再是膠囊，而是「● 文字」，刻意和可以按的標籤區分。

## Components

### Buttons
- **Shape:** 膠囊形 (999px)，1.5px 邊框，字重 700。
- **Default:** 卡片白底、按鍵色外框、底下 3px 按鍵厚度，內距 10px 20px。
- **Primary:** 鋼筆靛藍實心、白字，按鍵厚度為主色加 45% 黑。成功綠、危險紅兩個變體同樣做法。
- **Hover / Active:** 滑過往上 1px、外框變主色；按下往下 2px、厚度剩 1px。停用時 45% 透明、沒有厚度。
- **頁首按鈕:** 例外，沒有厚度、沒有外框，滑過只有淡靛藍底；「？ 教學」保留靛藍外框。

### Chips / Tabs
- **Style:** 膠囊形，按鍵面色、按鍵色外框、按鍵厚度。
- **Selected:** 靛藍實心、白字、沒有厚度、往下 2px，像按下去沒彈起來。

### Cards / Containers
- **Corner Style:** 22px。
- **Background:** 卡片白。
- **Shadow Strategy:** Resting 陰影；可點的卡片滑過改 Lift 並往上 2–3px。
- **Border:** 1px 格線。
- **Internal Padding:** `clamp(18px, 3vw, 28px)`。

### Inputs / Fields
- **Style:** 卡片白底、1.5px 格線邊框、14px 圓角、內距 10px 14px，字體繼承內文。
- **Focus:** 全站統一 3px 靛藍實線焦點框、外距 2px。
- **程式碼輸入框:** 終端機墨底、淺色等寬字。

### Navigation
- 頁首：品牌方塊（34px、10px 圓角、靛藍實心）+ 課名；右側工具列一排、可左右滑；目前所在頁用淡靛藍底 + 靛藍字標示。頂端 3px 的閱讀進度條。
- 長頁面有 sticky 的區段目錄（`.page-nav`），毛玻璃背景。
- 頁尾：鉛筆灰小字，連結加上下留白讓手機好點。

### Quiz Option（招牌元件）
按鍵面色的橫條，左側 28px 的字母鍵（摺頁底、8px 圓角）。答對變成功淡綠、字母鍵實心綠；答錯變危險淡紅。答完之後整組變平、不能再按。

### Flip Card（招牌元件）
正面是一顆大按鈕（按鍵外框與 4px 厚度），右下角永遠有一顆靛藍實心的「點我翻面」小標籤；背面是墨色反色面。翻轉 300ms。

### Analogy Callout
「打個比方」：左側 5px 靛藍粗線、淡靛藍底、右側 14px 圓角，粗體字用深鋼筆靛藍。進場時從左滑入。

### Terminal / Code
終端機墨底、淺紫白字。可點的程式碼每行左側有淡紫線，上方寫明「每一行都可以點」；產生器輸出左上角有三顆視窗燈。

### Teacher Note
講師紫 1.5px 虛線框、講師淡紫底，只在講師模式出現。

## Do's and Don'ts

### Do:
- **Do** 所有強調、連結、焦點都用鋼筆靛藍；語意色只用在對、錯、警告。
- **Do** 可以按的元件加按鍵厚度（`0 3px 0` 的實心底邊），按下時往下 2px。
- **Do** 有色文字用文字用的 token，放白字的實心底用 `-fill` 的 token。
- **Do** 每一種動畫都附 `prefers-reduced-motion: reduce` 的關閉版本（全站已有一條總開關）。
- **Do** 教學綁定用 `data-tour` 屬性；改版時保留 `data-tour`、表單 `name`、JS 依賴的 `id`。
- **Do** 手機上點得到：連結加上下留白，拉桿至少 32px 高。

### Don't:
- **Don't** 讓只能看的東西看起來能按：不用膠囊外框、不加按鍵厚度、滑過不浮起不發光。
- **Don't** 在深色模式直接拿文字色當底色（會變成一塊亮白）。
- **Don't** 用 `calc(50% - 50vw)` 負邊距做滿版區塊（會多出捲軸寬度、被 `main` 裁掉）；要滿版就讓外層 `main` 滿版、內層再套 `.wrap`。
- **Don't** 讓頁首折成兩排或在手機上一直蓋住內容。

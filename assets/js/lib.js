/*
 * lib.js — 純邏輯函式（不碰 DOM），瀏覽器與 Node 測試共用。
 * 所有「判斷對錯」的規則集中在這裡，才能用 tests/lib.test.js 驗證。
 */
(function (root) {
  'use strict';

  // ---- 個資戴口罩 ----
  // 順序有意義：較長、較特定的格式先比對，避免被較寬鬆的規則吃掉。
  const PII_RULES = [
    { type: 'API 金鑰', label: '[金鑰已遮蔽]', re: /\bsk-[A-Za-z0-9_-]{8,}\b/g },
    { type: 'Email', label: '[Email]', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
    { type: '信用卡號', label: '[信用卡號]', re: /\b(?:\d{4}[- ]?){3}\d{4}\b/g },
    { type: '身分證字號', label: '[身分證字號]', re: /\b[A-Z][12]\d{8}\b/g },
    { type: '手機號碼', label: '[手機號碼]', re: /\b09\d{2}[- ]?\d{3}[- ]?\d{3}\b/g },
    { type: '員工編號', label: '[員工編號]', re: /\bEMP-\d{3,}\b/gi },
  ];

  function maskPII(text) {
    const found = [];
    let masked = String(text ?? '');
    for (const rule of PII_RULES) {
      masked = masked.replace(rule.re, (value) => {
        found.push({ type: rule.type, value });
        return rule.label;
      });
    }
    return { masked, found };
  }

  // ---- Vibe Check 程式碼體檢 ----
  // 大家熟悉、確定存在的套件。不在清單上的不代表有毒，而是「要先查證」。
  const KNOWN_PACKAGES = new Set([
    'express', 'react', 'react-dom', 'vue', 'axios', 'lodash', 'dotenv', 'openai',
    'next', 'jsonwebtoken', 'bcrypt', 'cors', 'helmet', 'zod', 'pg', 'mysql2',
    'requests', 'flask', 'django', 'fastapi', 'pydantic', 'numpy', 'pandas',
  ]);

  const SCAN_RULES = [
    {
      id: 'secret',
      level: 'danger',
      title: '密碼／金鑰直接寫在程式裡',
      plain: '就像把家裡鑰匙貼在大門上。程式一上傳到網路，幾分鐘內就可能被盜用。',
      test: (line) => /\bsk-[A-Za-z0-9_-]{8,}/.test(line) ||
        /(api[_-]?key|password|secret|token)\s*[:=]\s*["'][^"']{6,}["']/i.test(line),
    },
    {
      id: 'shell',
      level: 'danger',
      title: '直接叫電腦執行指令',
      plain: '等於讓陌生人拿你的電腦下命令，壞人可以趁機刪檔或裝病毒。',
      test: (line) => /\b(os\.system|subprocess\.(call|run|Popen)|child_process|exec\s*\(|eval\s*\()/.test(line) ||
        /rm\s+-rf/.test(line),
    },
    {
      id: 'sql',
      level: 'danger',
      title: '把使用者輸入的字直接拼進資料庫查詢',
      plain: '壞人可以在輸入框打一段特殊文字，把整個資料庫翻出來或刪掉（SQL 注入）。',
      test: (line) => /(select|insert|update|delete)\b.*["'`]\s*\+/i.test(line) ||
        /(select|insert|update|delete)\b.*\$\{/i.test(line) ||
        /f["'].*(select|insert|update|delete)\b.*\{/i.test(line),
    },
  ];

  function extractPackages(line) {
    const names = [];
    const patterns = [
      /require\(\s*["']([^"'./][^"']*)["']\s*\)/g,
      /from\s+["']([^"'./][^"']*)["']/g,
      /^\s*import\s+["']([^"'./][^"']*)["']/g,
      /^\s*"([a-z0-9@][a-z0-9@/._-]*)"\s*:\s*"[\^~]?\d/gi,
      /^\s*(?:pip install|npm install|npm i)\s+([a-z0-9@][a-z0-9@/._-]*)/gi,
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(line)) !== null) names.push(m[1]);
    }
    return names;
  }

  function scanCode(code) {
    const findings = [];
    const lines = String(code ?? '').split('\n');
    lines.forEach((line, i) => {
      for (const rule of SCAN_RULES) {
        if (rule.test(line)) {
          findings.push({ rule: rule.id, level: rule.level, line: i + 1, title: rule.title, plain: rule.plain });
        }
      }
      for (const name of extractPackages(line)) {
        const base = name.startsWith('@') ? name : name.split('/')[0];
        if (!KNOWN_PACKAGES.has(base)) {
          findings.push({
            rule: 'package',
            level: 'warn',
            line: i + 1,
            title: `沒看過的套件「${base}」`,
            plain: 'AI 有時會編出不存在的套件名稱，壞人會搶先註冊同名的有毒套件。安裝前請先到官方網站查證。',
          });
        }
      }
    });
    return findings;
  }

  // ---- 指令健檢：好指令的五個零件 ----
  // 用關鍵字判斷是刻意的簡化：目的是提醒學員「有沒有想到這件事」，不是評分作文。
  const PROMPT_PARTS = [
    { id: 'goal', label: '要做什麼', tip: '一開頭就說清楚要做出什麼東西。', re: /(做|建立|新增|修改|改成|加上|寫|製作|幫我)/ },
    { id: 'who', label: '給誰用', tip: '說明誰會用、在什麼情境用，AI 才知道要做多簡單。', re: /(給|讓|使用者|同事|學生|客人|會員|長輩|主管|大家|誰)/ },
    { id: 'limit', label: '限制條件', tip: '說出「不要」和「只要」：不要用框架、只改這個檔案、手機要能用。', re: /(不要|只要|只能|不能|必須|限制|不超過|就好|一定要)/ },
    { id: 'done', label: '怎樣算完成', tip: '告訴它做完要怎麼確認：自己測一次、列出改了什麼、告訴我怎麼打開。', re: /(完成後|做完|確認|測試|驗收|檢查|告訴我|怎麼打開|怎麼知道)/ },
    { id: 'plan', label: '先規劃再動手', tip: '請它先列步驟給你看，你同意再開始，大的需求尤其需要。', re: /(先.{0,6}(列|說|規劃|計畫|討論|問)|步驟|計畫|規劃|一步一步|分階段)/ },
  ];
  const PROMPT_MIN_LENGTH = 8;

  function checkPrompt(text) {
    const value = String(text ?? '').trim();
    const long = value.length >= PROMPT_MIN_LENGTH;
    const parts = PROMPT_PARTS.map((p) => ({ id: p.id, label: p.label, tip: p.tip, ok: long && p.re.test(value) }));
    return { parts, score: parts.filter((p) => p.ok).length, max: parts.length };
  }

  // ---- LINE 小秘書分類（教學簡化版）----
  // 真實系統交給 Claude 判斷；這裡用固定規則模擬同一套分類，讓學員看懂輸入與輸出的格式。
  const TIME_WORDS = [['今天', 0], ['明天', 1], ['後天', 2], ['下週', 7], ['下星期', 7]];
  const PROJECT_WORDS = ['進度', '完成了', '做好了', '上線', '修好'];

  function classifyNote(text, today = new Date()) {
    const value = String(text ?? '').trim();
    const hit = TIME_WORDS.find(([word]) => value.includes(word));
    const due = hit ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + hit[1]) : null;
    const dueIso = due ? `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}` : null;
    let type = 'note';
    if (/提醒我|記得提醒/.test(value)) type = 'reminder';
    else if (hit) type = 'task';
    else if (PROJECT_WORDS.some((w) => value.includes(w))) type = 'project_update';
    const replies = {
      reminder: '好，時間到會提醒你。',
      task: `記下了${dueIso ? `，排在 ${dueIso}` : ''}。`,
      project_update: '專案進度記錄好了。',
      note: '筆記存好了。',
    };
    return { type, content: value, due_date: type === 'task' || type === 'reminder' ? dueIso : null, reply: replies[type] };
  }

  // 國際標準時間（UTC）換算台灣時間（UTC+8）
  const TAIWAN_OFFSET = 8;
  function utcToTaiwan(hour) { return (((hour + TAIWAN_OFFSET) % 24) + 24) % 24; }

  // ---- 推播設計模擬（單元 15）----
  // 情境：排程每 15 分鐘跑一次；小明週一到週三沒交回報，週四交了。
  const RUNS_PER_DAY = 96;          // 24 小時 × 每小時 4 次
  const RUNS_IN_WINDOW = 44;        // 09:00–20:00 共 11 小時 × 4 次
  const PENDING_DAYS = 3;           // 週一～週三還沒交
  const FIRST_RUN_TIME = '00:07';   // 沒設時段時，第一次發送的時間

  function simulatePushWeek({ window: timeWindow, dedupe, askOnClick, siteFirst }) {
    const subscribed = askOnClick; // 一進站就問，這個情境假設小明直覺按了「不允許」
    const perRun = timeWindow ? RUNS_IN_WINDOW : RUNS_PER_DAY;
    const perDay = Array.from({ length: 7 }, (_, day) => {
      if (!subscribed || day >= PENDING_DAYS) return 0;
      if (dedupe) return day === 0 ? 1 : 0; // 同一週同一件事只發一次
      return perRun;
    });
    return {
      perDay,
      total: perDay.reduce((a, b) => a + b, 0),
      subscribed,
      firstTime: subscribed ? (timeWindow ? '09:00' : FIRST_RUN_TIME) : null,
      emptyOnClick: subscribed && !siteFirst,
    };
  }

  // ---- 測驗計分 ----
  const PASS_PERCENT = 70;

  function scoreQuiz(questions, answers, passPercent = PASS_PERCENT) {
    const total = questions.length;
    const correct = questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
    const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
    return { correct, total, percent, passed: percent >= passPercent };
  }

  // ---- 門神遊戲計分 ----
  // 放走危險請求比誤擋安全請求嚴重得多，所以扣分不對稱。
  const GATE_POINTS = { rightCall: 10, blockedSafe: -3, allowedDanger: -15 };

  function scoreGate(requests, decisions) {
    let score = 0;
    let leaks = 0;
    let overBlocks = 0;
    requests.forEach((req, i) => {
      const allowed = decisions[i] === 'allow';
      if (allowed === req.safe) score += GATE_POINTS.rightCall;
      else if (allowed) { score += GATE_POINTS.allowedDanger; leaks += 1; }
      else { score += GATE_POINTS.blockedSafe; overBlocks += 1; }
    });
    const max = requests.length * GATE_POINTS.rightCall;
    return { score: Math.max(0, score), max, leaks, overBlocks };
  }

  // ---- 洗牌與抽題 ----
  function shuffle(list, rng = Math.random) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function pick(list, n, rng = Math.random) {
    return shuffle(list, rng).slice(0, Math.min(n, list.length));
  }

  // ---- 總測驗組卷：每個單元至少一題，其餘隨機補滿；選項順序打亂，避免背位置 ----
  function shuffleOptions(q, rng) {
    const order = shuffle(q.options.map((_, i) => i), rng);
    return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
  }

  function buildExam(bank, units, total, rng = Math.random) {
    const firsts = units.map((u) => ({ unit: u, q: pick(bank[u], 1, rng)[0] }));
    const used = new Set(firsts.map((x) => x.q));
    const rest = units.flatMap((u) => bank[u].filter((q) => !used.has(q)).map((q) => ({ unit: u, q })));
    const extra = pick(rest, Math.max(0, total - firsts.length), rng);
    return shuffle([...firsts, ...extra], rng).map(({ unit, q }) => ({ ...shuffleOptions(q, rng), unit }));
  }

  // ---- 名詞小辭典：找出一段文字裡「還沒標過」的專業名詞 ----
  // 英文詞要前後不是英數字（GitHub 裡的 Git 不算）；同位置取最長；每個名詞只標第一次。
  const WORDISH = /[A-Za-z0-9_]/;
  function findWord(text, w, from) {
    const ascii = WORDISH.test(w[0]) || WORDISH.test(w[w.length - 1]);
    for (let at = text.indexOf(w, from); at >= 0; at = text.indexOf(w, at + 1)) {
      if (!ascii || (!WORDISH.test(text[at - 1] || '') && !WORDISH.test(text[at + w.length] || ''))) return at;
    }
    return -1;
  }

  function matchTerms(text, patterns, used = new Set()) {
    const taken = new Set(used);
    const hits = [];
    let pos = 0;
    while (pos < text.length) {
      let best = null;
      for (const p of patterns) {
        if (taken.has(p.id)) continue;
        for (const w of p.words) {
          const at = findWord(text, w, pos);
          if (at < 0) continue;
          if (!best || at < best.start || (at === best.start && w.length > best.end - best.start)) {
            best = { start: at, end: at + w.length, id: p.id };
          }
        }
      }
      if (!best) break;
      hits.push(best);
      taken.add(best.id);
      pos = best.end;
    }
    return hits;
  }

  // ---- 匯出 CSV（講師後台）----
  // 逗號、引號、換行都要跳脫，Excel 打開才不會整份錯位
  function toCSV(rows) {
    return rows.map((row) => row.map((cell) => {
      const value = cell === null || cell === undefined ? '' : String(cell);
      return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(',')).join('\r\n');
  }

  // ---- 資料整理（單元 17）----
  // 只做「格式」的整理：去空白、全形轉半形、日期統一。金額一律不動，算錢交給試算表公式。
  const FULLWIDTH_OFFSET = 0xfee0;

  function toHalfWidth(text) {
    return String(text).replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - FULLWIDTH_OFFSET)).replace(/　/g, ' ');
  }

  function normalizeDate(text, thisYear) {
    const value = toHalfWidth(String(text)).trim().replace(/[/.]/g, '-');
    const full = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const short = value.match(/^(\d{1,2})-(\d{1,2})$/);
    const pad = (n) => String(n).padStart(2, '0');
    if (full) return { date: `${full[1]}-${pad(full[2])}-${pad(full[3])}`, guessed: false };
    if (short) return { date: `${thisYear}-${pad(short[1])}-${pad(short[2])}`, guessed: true };
    return { date: String(text), guessed: false };
  }

  function cleanRows(rows, options = {}, thisYear = new Date().getFullYear()) {
    return rows.map((row) => {
      const out = { ...row };
      if (options.trim) Object.keys(out).forEach((k) => { if (typeof out[k] === 'string') out[k] = out[k].trim(); });
      if (options.halfwidth && typeof out.phone === 'string') out.phone = toHalfWidth(out.phone).replace(/[-\s]/g, '');
      if (options.dates && out.date) {
        const r = normalizeDate(out.date, thisYear);
        out.date = r.date;
        if (r.guessed) out.guessed = true;
      }
      return out;
    });
  }

  // ---- 指令升級零件（單元 18）----
  const PROMPT_UPGRADES = [
    { id: 'who', label: '說清楚給誰看', line: '讀的人是完全不懂這件事的同事，請用白話寫。' },
    { id: 'format', label: '限制輸出格式', line: '只輸出最後結果，不要說明你的想法，長度控制在 200 字以內。' },
    { id: 'example', label: '給一個例子', line: '風格請參考這個例子：「因應系統維護，週五 18:00 起暫停使用，預計 21:00 恢復。」' },
    { id: 'ask', label: '請它先問問題', line: '動手前，先問我 3 個你需要知道的問題，我回答完你再開始。' },
    { id: 'unsure', label: '請它標出不確定的地方', line: '你不確定或我沒交代清楚的地方，請標成「待確認」，不要自己編。' },
  ];

  function upgradePrompt(base, ids) {
    const picked = PROMPT_UPGRADES.filter((u) => ids.includes(u.id));
    if (!picked.length) return String(base);
    return [String(base), ...picked.map((u) => u.line)].join('\n');
  }

  // ---- 沉浸式工作台：學員打的需求有沒有講到重點 ----
  // needs：[{ id, re }]；回傳講到的 met 與沒講到的 missing（都依 needs 的順序）
  function matchNeeds(text, needs) {
    const value = String(text || '');
    const met = needs.filter((n) => n.re.test(value)).map((n) => n.id);
    return { met, missing: needs.map((n) => n.id).filter((id) => !met.includes(id)) };
  }

  // ---- 單元開放規則（會員閘門、課程地圖、講義共用）----
  // viewer：null 表示訪客；limits 是學員所在各班級「開放到單元幾」，null 代表那班全部開放
  // 回傳 'open' 可以看／'login' 要登入／'enroll' 要輸入加入碼／'class' 講師還沒開放
  // 已加入班級的學員一律照講師的開課進度（試用單元也一樣）；試用單元只對還沒加入班級的人開放
  // order：課程實際的上課順序（單元 id 陣列）。單元編號不等於順序——
  // 19、20 是後來加進必修的，排在 8 之後、9 之前。沒給 order 時才退回用編號比較。
  function unitAccess(unit, viewer, order) {
    if (viewer?.role === 'teacher') return 'open';
    const limits = viewer?.enrolled ? viewer.limits || [] : [];
    const paced = limits.length > 0 && !limits.includes(null);
    if (paced) {
      const pos = (id) => (order && order.includes(id) ? order.indexOf(id) : Number(id.slice(1)));
      const until = Math.max(...limits.map((n) => pos(`m${n}`)));
      return pos(unit.id) <= until ? 'open' : 'class';
    }
    if (unit.trial) return 'open';
    if (!viewer) return 'login';
    return viewer.enrolled ? 'open' : 'enroll';
  }

  // ---- 紙本講義：重點句與名詞速查 ----
  function firstSentence(text, max = 60) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const end = clean.search(/[。？！?!]/);
    const sentence = end < 0 ? clean : clean.slice(0, end + 1);
    if (sentence.length <= max) return sentence;
    const comma = sentence.indexOf('，');
    const cut = comma > 0 && comma < max ? sentence.slice(0, comma) : sentence.slice(0, max - 1);
    return `${cut}…`;
  }

  function unitTerms(text, glossary) {
    return matchTerms(String(text || ''), glossary).map((h) => h.id);
  }

  // ---- 五種能力自評：單元 1 拉一次當起點，結業單元再拉一次比較 ----
  // m 是真正在教這項能力的單元，拉完推薦學員先去看
  const SELF_SKILLS = [
    { name: '把需求講清楚', m: 'm3' },
    { name: '把大事拆成小步驟', m: 'm3' },
    { name: '看得出哪裡怪怪的', m: 'm8' },
    { name: '管好密碼和資料', m: 'm6' },
    { name: '遇到錯誤不慌張', m: 'm4' },
  ];
  const DEFAULT_RATING = 2;

  // 自評拉桿的五個等級。用「長大」的比喻，讓每一格都有看得懂的意思，
  // 不然每個人心中的 3 分都不一樣，上課前後也沒辦法比。
  const RATING_LEVELS = [
    { value: 1, emoji: '🥚', label: '完全沒概念' },
    { value: 2, emoji: '🐣', label: '聽過，不會做' },
    { value: 3, emoji: '🐥', label: '跟著做可以' },
    { value: 4, emoji: '🦅', label: '自己做得出來' },
    { value: 5, emoji: '🚀', label: '可以教別人' },
  ];

  function ratingLevel(n) {
    const num = Number(n);
    const v = Number.isFinite(num) && n !== undefined && n !== null && n !== ''
      ? Math.min(5, Math.max(1, Math.round(num)))
      : DEFAULT_RATING;
    return RATING_LEVELS[v - 1];
  }

  function weakestSkill(ratings) {
    const score = (s) => ratings[s.name] ?? DEFAULT_RATING;
    return SELF_SKILLS.reduce((low, s) => (score(s) < score(low) ? s : low));
  }

  function compareRatings(before, after) {
    const rows = SELF_SKILLS.map((s) => {
      const b = before[s.name] ?? null;
      const a = after[s.name] ?? DEFAULT_RATING;
      return { ...s, before: b, after: a, delta: b === null ? null : a - b };
    });
    return { rows, hasBefore: rows.some((r) => r.before !== null) };
  }

  // Supabase Storage 的檔名只收 ASCII，中文檔名會被擋下來（Invalid key）。
  // 作法：中文檔名編碼成 u_xxx 當儲存用的名字，畫面上再還原成原本的中文。
  const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

  function b64url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function unb64url(text) {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
    const binary = atob(padded);
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  }

  function storageKey(name) {
    if (SAFE_NAME.test(name)) return name;
    const dot = name.lastIndexOf('.');
    const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
    const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? `.${ext}` : '';
    return `u_${b64url(dot > 0 ? name.slice(0, dot) : name)}${safeExt}`;
  }

  function storageLabel(key) {
    const name = String(key).split('/').pop();
    if (!name.startsWith('u_')) return name;
    const dot = name.lastIndexOf('.');
    const body = name.slice(2, dot > 2 ? dot : undefined);
    const ext = dot > 2 ? name.slice(dot) : '';
    try { return unb64url(body) + ext; } catch { return name; }
  }

  // 結業證書編號。別人要驗證真假，只能用完整編號查，所以編號要夠長、
  // 而且不能有 0/O、1/I 這種抄錯的字。顯示時每 4 碼加一個連字號比較好念。
  const CERT_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CERT_LENGTH = 10;

  function certCode(bytes) {
    let out = 'VC';
    for (let i = 0; i < CERT_LENGTH; i += 1) out += CERT_CHARS[bytes[i] % CERT_CHARS.length];
    return out;
  }

  function normalizeCertCode(input) {
    return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function formatCertCode(code) {
    return normalizeCertCode(code).replace(/(.{4})(?=.)/g, '$1-');
  }

  function isCertCode(input) {
    const code = normalizeCertCode(input);
    if (!code.startsWith('VC') || code.length !== CERT_LENGTH + 2) return false;
    return [...code.slice(2)].every((ch) => CERT_CHARS.includes(ch));
  }

  // 備份體檢：把「我有備份」拆成看得見的幾層，再對照各種災難。
  // 重點不是層數多，而是「還原演練」做過沒有——沒演練過的備份不算數。
  const BACKUP_LAYERS = [
    { id: 'github', name: '程式碼放在 GitHub', hint: '不是只存在自己電腦的資料夾' },
    { id: 'dbexport', name: '資料有定期匯出', hint: '資料庫或名單每個月匯出一份' },
    { id: 'offsite', name: '匯出檔不在同一台電腦', hint: '雲端硬碟、外接硬碟都算' },
    { id: 'secrets', name: '金鑰與環境變數另外記錄', hint: '記在密碼管理器或紙上，不是只在腦裡' },
    { id: 'drill', name: '做過一次還原演練', hint: '從零把它救回來，而且真的跑得動' },
  ];

  const DISASTERS = [
    { name: '電腦壞掉或被偷', need: ['github', 'secrets'] },
    { name: '不小心刪掉整個資料夾', need: ['github'] },
    { name: '資料被誤刪或改壞', need: ['dbexport', 'offsite'] },
    { name: '服務下架、帳號被停用', need: ['github', 'dbexport', 'offsite'] },
    { name: '「以為有備份，其實沒有」', need: ['drill'] },
  ];

  function backupCoverage(selected) {
    const has = new Set(selected || []);
    const rows = DISASTERS.map((d) => ({
      name: d.name,
      ok: d.need.every((id) => has.has(id)),
      missing: d.need.filter((id) => !has.has(id)),
    }));
    const covered = rows.filter((r) => r.ok).length;
    // 沒演練過，其他層都只能算「大概可以」，不能算數
    const level = !has.has('drill') ? (covered ? 1 : 0) : covered === rows.length ? 2 : 1;
    return { rows, covered, total: rows.length, level };
  }

  // 部門 AI 使用守則產生器：勾選條款 → 產出可以直接公告的文字。
  // 每一條都寫「為什麼」，因為沒有理由的規定，同事只會偷偷繞過去。
  const POLICY_CLAUSES = [
    { id: 'secret', group: '資料', text: '不得將客戶名單、合約、報價、員工個資、病歷或學生資料貼進任何 AI 服務。',
      why: '貼進去等於交給一家外部公司保管。' },
    { id: 'mask', group: '資料', text: '確實需要 AI 協助處理含個資的檔案時，須先將姓名、電話、Email、身分證字號等欄位遮罩或代號化。',
      why: '遮罩後 AI 一樣做得了格式整理與分類。' },
    { id: 'code', group: '資料', text: '不得貼上含有金鑰、密碼、連線字串的程式碼或設定檔。',
      why: '這類字串一旦外流，等於把門打開。' },
    { id: 'verify', group: '產出', text: 'AI 產出的數字、法規、報價與對外文字，須由承辦人查證後才可使用。',
      why: 'AI 會用流暢的語氣講出不存在的東西。' },
    { id: 'license', group: '產出', text: '對外發布或商業使用的圖片、文案、程式碼，須先確認來源與授權。',
      why: '像不像由權利人主張，跟「是 AI 做的」無關。' },
    { id: 'decide', group: '產出', text: '涉及人事、金額、醫療與法律判斷的決定，不得由 AI 單獨決定。',
      why: '責任在人身上，工具不會替你扛。' },
    { id: 'tools', group: '流程', text: '僅使用單位核准的 AI 服務；要導入新服務前須先報備。',
      why: '不同服務的資料保存政策差很多。' },
    { id: 'exception', group: '流程', text: '確有例外需求時，向主管說明用途與資料範圍後，可個案核准並留紀錄。',
      why: '留一條正大光明的路，才不會有人偷偷繞過去。' },
    { id: 'report', group: '流程', text: '發現資料誤貼或疑似外流時，應於當日回報，不追究通報者。',
      why: '罰通報的人，下次就沒有人敢講。' },
  ];

  function buildPolicy(ids, unit) {
    const picked = POLICY_CLAUSES.filter((c) => ids.includes(c.id));
    if (!picked.length) return '（請先勾選至少一項條款）';
    const name = (unit || '本單位').trim() || '本單位';
    const groups = [...new Set(picked.map((c) => c.group))];
    const lines = [`${name} AI 使用守則`, ''];
    groups.forEach((g) => {
      lines.push(`【${g}】`);
      picked.filter((c) => c.group === g).forEach((c, i) => {
        lines.push(`  ${i + 1}. ${c.text}`);
        lines.push(`     （原因：${c.why}）`);
      });
      lines.push('');
    });
    lines.push('本守則為內部作業規範，如有個案疑義請洽法務單位。');
    return lines.join('\n');
  }

  // 小工具的每月成本估算。目的是回答「要不要擔心」，不是報價，
  // 所以只算量級：呼叫次數、AI 用量、通知則數各落在哪一個區間。
  const FREE_LIMITS = { aiCalls: 1000, notices: 200 };

  function estimateCost({ users = 0, uses = 0, ai = 0, notify = 0 } = {}) {
    const calls = Math.max(0, Math.round(users * uses));
    const aiCalls = ai > 0 ? calls : 0;
    const aiWeight = ai === 2 ? 4 : ai === 1 ? 1 : 0; // 長文件大約是短問答的數倍
    const aiLoad = aiCalls * aiWeight;
    const notices = notify > 0 ? calls : 0;
    const rows = [
      { name: '放網站（GitHub Pages）', note: '小工具不會超過', over: false },
      { name: '資料庫（Supabase）', note: calls > 20000 ? '資料量偏大，要注意' : '免費範圍內', over: calls > 20000 },
      { name: 'AI 呼叫', note: aiLoad === 0 ? '沒有用到 AI' : aiLoad > FREE_LIMITS.aiCalls ? '很可能要付費' : '用量不大', over: aiLoad > FREE_LIMITS.aiCalls },
      { name: '通知訊息', note: notices === 0 ? '沒有發通知' : notices > FREE_LIMITS.notices ? '可能超過免費則數' : '免費則數內', over: notices > FREE_LIMITS.notices },
    ];
    const overs = rows.filter((r) => r.over);
    const level = overs.length === 0 ? 'free' : overs.length === 1 ? 'watch' : 'paid';
    return { calls, aiLoad, notices, rows, level };
  }

  // 「這個人現在按下送出會怎樣」——整站只有這一份實作。
  // 這套規則移植自教會活動報名系統，那裡學到的教訓是：
  // 判斷寫在送出的路由裡、頁面自己另外判斷一次，結果就是
  // 「頁面說可以報、填完按下去才說額滿」——那比一開始就說額滿更糟，因為他已經填完了。
  const SEAT = { OK: 'ok', WAITLIST: 'waitlist', FULL: 'full', WAITLIST_CLOSED: 'waitlist_closed', CLOSED: 'closed', NOT_YET: 'not_yet', ENDED: 'ended' };

  const SEAT_MESSAGE = {
    [SEAT.OK]: '還有名額，填完就完成報名',
    [SEAT.WAITLIST]: '正取已額滿，可以排候補；有人取消會依報名順序遞補',
    [SEAT.FULL]: '報名人數已達上限',
    [SEAT.WAITLIST_CLOSED]: '候補名單已截止',
    [SEAT.CLOSED]: '這個梯次尚未開放報名',
    [SEAT.NOT_YET]: '報名還沒開始',
    [SEAT.ENDED]: '報名已截止',
  };

  function toTime(value) {
    if (!value) return null;
    const t = Date.parse(String(value).replace(' ', 'T'));
    return Number.isNaN(t) ? null : t; // 時間格式壞掉時回 null＝不擋人：設定錯不該變成擋人
  }

  function seatVerdict(cohort, taken = 0, now = Date.now()) {
    if (!cohort || cohort.is_open === false) return SEAT.CLOSED;
    const start = toTime(cohort.reg_start);
    const end = toTime(cohort.reg_end);
    if (start !== null && now < start) return SEAT.NOT_YET;
    if (end !== null && now > end) return SEAT.ENDED;
    const cap = Number(cohort.capacity) || 0;
    if (!cap || taken < cap) return SEAT.OK;
    if (!cohort.waitlist_enabled) return SEAT.FULL;
    const deadline = toTime(cohort.waitlist_deadline);
    if (deadline !== null && now > deadline) return SEAT.WAITLIST_CLOSED;
    return SEAT.WAITLIST;
  }

  // 還剩幾位。沒設名額就回 null（不顯示數字，而不是顯示 0）
  function seatsLeft(cohort, taken = 0) {
    const cap = Number(cohort?.capacity) || 0;
    return cap ? Math.max(0, cap - taken) : null;
  }

  const api = { RATING_LEVELS, ratingLevel, SEAT, SEAT_MESSAGE, seatVerdict, seatsLeft, estimateCost, FREE_LIMITS, POLICY_CLAUSES, buildPolicy, BACKUP_LAYERS, DISASTERS, backupCoverage, certCode, normalizeCertCode, formatCertCode, isCertCode, CERT_LENGTH, storageKey, storageLabel, toCSV, cleanRows, toHalfWidth, upgradePrompt, PROMPT_UPGRADES, matchNeeds, unitAccess, SELF_SKILLS, DEFAULT_RATING, weakestSkill, compareRatings, firstSentence, unitTerms, maskPII, scanCode, checkPrompt, classifyNote, utcToTaiwan, simulatePushWeek, scoreQuiz, scoreGate, shuffle, pick, buildExam, matchTerms, PASS_PERCENT, GATE_POINTS };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CourseLib = api;
})(typeof self !== 'undefined' ? self : this);

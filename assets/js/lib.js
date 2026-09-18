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

  // ---- 測驗計分 ----
  const PASS_PERCENT = 70;

  function scoreQuiz(questions, answers) {
    const total = questions.length;
    const correct = questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
    const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
    return { correct, total, percent, passed: percent >= PASS_PERCENT };
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

  const api = { maskPII, scanCode, checkPrompt, scoreQuiz, scoreGate, shuffle, pick, PASS_PERCENT, GATE_POINTS };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CourseLib = api;
})(typeof self !== 'undefined' ? self : this);

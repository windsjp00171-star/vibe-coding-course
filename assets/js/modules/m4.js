/* m4.js — 單元 04：Git 與 GitHub（術語卡、存檔點模擬器、測驗） */
(function () {
  'use strict';
  const { $, $$, esc, toast, mountQuiz, renderPrintQuiz, initFlips } = window.Course;

  // ---------- 術語卡 ----------
  const TERMS = [
    { level: 'core', en: 'Repository', zh: '倉庫（repo）', icon: '📁', plain: '一個專案的資料夾，加上它所有的存檔紀錄。', like: '像一本專案筆記本，每一頁的修改歷史都留著。', say: '「我幫你建了一個新的 repo」' },
    { level: 'core', en: 'Commit', zh: '存檔點', icon: '💾', plain: '把目前的修改存成一個存檔，附上一句說明。', like: '遊戲的存檔點。壞了可以讀檔重來。', say: '「我把這次修改 commit 了：修正報名表的日期格式」' },
    { level: 'core', en: 'Push', zh: '上傳', icon: '⬆️', plain: '把你電腦裡的存檔，上傳到 GitHub。', like: '手機照片同步到雲端相簿。', say: '「已經 push 到 GitHub」' },
    { level: 'core', en: 'Pull', zh: '下載更新', icon: '⬇️', plain: '把 GitHub 上別人（或你在別台電腦）的新存檔，抓回你的電腦。', like: '打開共用相簿，看到家人剛上傳的新照片。', say: '「我先 pull 一下，確認是最新版本」' },
    { level: 'core', en: 'Clone', zh: '整包複製下來', icon: '📥', plain: '第一次把 GitHub 上的專案整個下載到電腦（含全部歷史）。', like: '把整本雲端相簿下載到新手機。', say: '「我把專案 clone 到這個資料夾了」' },
    { level: 'core', en: '.gitignore', zh: '不上傳清單', icon: '🙈', plain: '列出「永遠不要上傳」的檔案，例如密碼檔 .env。', like: '行李箱的禁帶物品清單。', say: '「我把 .env 加進 .gitignore 了，密碼不會被上傳」' },
    { level: 'team', en: 'Branch', zh: '分支（平行世界）', icon: '🌿', plain: '從主線複製一條支線出來做實驗，不影響主線。', like: '把企劃書「另存新檔」去試一個大膽的版本。', say: '「我開了一個 branch 叫 dark-mode 來試做」' },
    { level: 'team', en: 'main', zh: '主線', icon: '🛤️', plain: '正式、穩定的那一條分支，通常就是上線的版本。', like: '已經送印的正式版企劃書。', say: '「這個功能已經合併進 main 了」' },
    { level: 'team', en: 'Merge', zh: '合併', icon: '🤝', plain: '把分支上做好的成果，併回主線。', like: '實驗版企劃書老闆說 OK，把內容併回正式版。', say: '「我把 feature 分支 merge 進 main」' },
    { level: 'team', en: 'Pull Request（PR）', zh: '請求合併（審稿單）', icon: '📝', plain: '「我在分支做好了，請幫我看看，沒問題就合併」的申請單。', like: '把改好的稿子交給主管簽核。', say: '「我開了一個 PR，請你看過再按 Merge」' },
    { level: 'team', en: 'Conflict', zh: '衝突', icon: '⚡', plain: '兩個人改了同一個地方，Git 不知道要留哪一個，要人來決定。', like: '兩個同事同時改了同一句標語，只能二選一或合寫。', say: '「合併時有 conflict，我幫你保留了兩邊的修改，請確認」' },
    { level: 'team', en: 'Fork', zh: '複製別人的專案', icon: '🍴', plain: '把別人的公開 repo 整包複製到自己帳號，想怎麼改都不影響原作者。', like: '借朋友的食譜影印一份，在自己那份上亂畫。', say: '「你可以先 fork 這個專案，改好再發 PR 給原作者」' },
  ];

  function renderGlossary(level = 'all') {
    const host = $('[data-glossary]');
    host.innerHTML = TERMS.filter((t) => level === 'all' || t.level === level).map((t) => `
      <div class="flip glossary-card"><div class="flip-inner">
        <div class="flip-face flip-front">
          <div class="emoji">${t.icon}</div>
          <h3>${esc(t.en)}</h3>
          <div class="zh">${esc(t.zh)}</div>
          <span class="pill ${t.level === 'core' ? 'pill-brand' : 'pill-warn'}" style="margin-top:8px">${t.level === 'core' ? '一定要會' : '多人合作'}</span>
          <span class="flip-hint">點我翻面 ↻</span>
        </div>
        <div class="flip-face flip-back">
          <p><b>白話：</b>${esc(t.plain)}</p>
          <p><b>比喻：</b>${esc(t.like)}</p>
          <p class="say">🤖 Claude Code 會說：${esc(t.say)}</p>
        </div>
      </div></div>`).join('');
    initFlips(host);
  }

  $('[data-glossary-filter]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-level]');
    if (!chip) return;
    $$('[data-level]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderGlossary(chip.dataset.level);
  });
  renderGlossary();

  // ---------- 存檔點模擬器 ----------
  const G = window.GitSim;
  const COMMIT_CHOICES = [
    { msg: '修正報名表的手機號碼檢查', good: true },
    { msg: 'update', good: false },
    { msg: '首頁加上活動海報', good: true },
    { msg: '改東西', good: false },
  ];
  let sim = G.create();
  let lastNewId = null;

  const X0 = 64; const DX = 46; const LANES = { main: 50, feature: 110 };

  function drawGraph(svg, side) {
    const commits = G.visible(sim, side);
    const refs = sim[side].refs;
    const order = Object.values(sim.commits).sort((a, b) => a.seq - b.seq).map((c) => c.id);
    const pos = (c) => ({ x: X0 + order.indexOf(c.id) * DX, y: LANES[c.branch === 'feature' ? 'feature' : 'main'] });
    const width = Math.max(320, X0 + order.length * DX + 40);
    svg.setAttribute('viewBox', `0 0 ${width} 150`);

    const lanes = Object.entries(LANES).map(([name, y]) =>
      `<line class="lane" x1="56" x2="${width}" y1="${y}" y2="${y}"/><text class="lane-label" x="0" y="${y + 4}">${name}</text>`).join('');
    const edges = commits.flatMap((c) => c.parents.filter((p) => commits.some((x) => x.id === p)).map((p) => {
      const a = pos(sim.commits[p]); const b = pos(c);
      const midX = (a.x + b.x) / 2;
      return `<path class="edge" d="M${a.x},${a.y} C${midX},${a.y} ${midX},${b.y} ${b.x},${b.y}"/>`;
    })).join('');
    const nodes = commits.map((c) => {
      const p = pos(c);
      let kind = c.branch === 'feature' ? 'feature' : 'main';
      if (c.by === 'mate') kind = 'mate';
      if (c.parents.length > 1) kind = 'merge';
      return `<circle class="node ${kind} ${c.id === lastNewId ? 'is-new' : ''}" cx="${p.x}" cy="${p.y}" r="10"><title>${esc(c.msg)}</title></circle>`;
    }).join('');
    const tips = Object.entries(refs).map(([name, id]) => {
      const p = pos(sim.commits[id]);
      const kind = name === 'main' ? 'main' : 'feature';
      const y = name === 'main' ? p.y - 30 : p.y + 20;
      const you = side === 'local' && sim.local.head === name ? `<text class="you" x="${p.x}" y="${name === 'main' ? y - 6 : y + 26}" text-anchor="middle">▼ 你在這</text>` : '';
      return `${you}<rect class="tip-bg ${kind}" x="${p.x - 26}" y="${y}" width="52" height="16"/>
        <text class="tip tip-text ${kind}" x="${p.x}" y="${y + 12}" text-anchor="middle">${name}</text>`;
    }).join('');
    svg.innerHTML = lanes + edges + nodes + tips;
  }

  function renderSim(message, tone) {
    drawGraph($('[data-graph="local"]'), 'local');
    drawGraph($('[data-graph="remote"]'), 'remote');
    $('[data-head]').textContent = `目前在：${sim.local.head}`;
    $('[data-dirty]').hidden = !sim.local.dirty;
    const log = $('[data-log]');
    if (message) { log.textContent = message; log.className = `sim-log ${tone ? `is-${tone}` : ''}`; }
    const done = G.MISSIONS.map((m) => m.check(sim));
    const next = done.indexOf(false);
    $('[data-missions]').innerHTML = G.MISSIONS.map((m, i) =>
      `<li class="${done[i] ? 'is-done' : ''} ${i === next ? 'is-next' : ''}">${esc(m.text)}</li>`).join('');
    return done.every(Boolean);
  }

  function act(result) {
    const beforeIds = new Set(Object.keys(sim.commits));
    const wasComplete = G.MISSIONS.every((m) => m.check(sim));
    if (result.ok) sim = result.sim;
    lastNewId = Object.keys(sim.commits).find((id) => !beforeIds.has(id)) || null;
    const nowComplete = renderSim(result.message, result.ok ? '' : 'bad');
    if (nowComplete && !wasComplete) {
      $('[data-log]').className = 'sim-log is-ok';
      $('[data-log]').textContent = '🎉 五個任務全部完成！你剛剛親手做了一次完整的 Git 流程。';
    }
  }

  function openCommitBox() {
    const box = $('[data-commit-box]');
    if (!sim.local.dirty) { act(G.commit(sim, '')); return; }
    $('[data-commit-options]').innerHTML = COMMIT_CHOICES.map((c, k) =>
      `<button type="button" class="option" data-choice="${k}"><span class="key">${'ABCD'[k]}</span><span>${esc(c.msg)}</span></button>`).join('');
    box.hidden = false;
    $('[data-choice]', box).focus();
  }

  $('[data-commit-options]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-choice]');
    if (!btn) return;
    const choice = COMMIT_CHOICES[Number(btn.dataset.choice)];
    $('[data-commit-box]').hidden = true;
    act(G.commit(sim, choice.msg));
    if (!choice.good) toast('💡 存檔成功，但「' + choice.msg + '」三個月後你看得懂嗎？說明要寫「做了什麼」');
  });

  $('[data-sim]').addEventListener('click', (e) => {
    const action = e.target.closest('[data-do]')?.dataset.do;
    if (!action) return;
    if (action !== 'commit') $('[data-commit-box]').hidden = true;
    const handlers = {
      edit: () => act(G.edit(sim)),
      commit: openCommitBox,
      branch: () => act(G.branch(sim, 'feature')),
      checkout: () => act(G.checkout(sim, sim.local.head === 'main' ? 'feature' : 'main')),
      merge: () => act(G.merge(sim, 'feature', 'main')),
      push: () => act(G.push(sim)),
      pull: () => act(G.pull(sim)),
      teammate: () => act(G.teammate(sim)),
    };
    handlers[action]();
  });

  $('[data-sim-reset]').addEventListener('click', () => {
    sim = G.create(); lastNewId = null;
    $('[data-commit-box]').hidden = true;
    renderSim('重新開始！先按「修改檔案」，再按「存檔」。');
  });

  renderSim();

  // ---------- 測驗 ----------
  const QUIZ = window.QuizBank.m4;
  mountQuiz($('[data-quiz]'), QUIZ, { moduleId: 'm4' });
  renderPrintQuiz($('[data-quiz-print]'), QUIZ);

  // ---------- 導覽 ----------
  window.Tour.register([
    { tour: 'glossary', title: '術語翻牌卡', text: '12 個 Git 術語做成卡片，點一下翻面看白話解釋。上方可以先篩出「一定要會的 6 個」。' },
    { tour: 'sim', title: '存檔點模擬器', text: '照左邊的任務清單按按鈕。完成的任務會自動打勾，左右兩邊會顯示你的電腦和 GitHub 發生了什麼變化。' },
    { tour: 'translate', title: '說人話就好', text: '這張表告訴你，對 Claude Code 說哪句話，它就會幫你做哪個 Git 動作。' },
    { tour: 'workshop', title: '課中工作坊', text: '上課時全班一起做的活動。講師模式下會多顯示收尾討論題。' },
    { tour: 'quiz', title: '隨堂小測驗', text: '5 題選擇題，答對 70% 就算過關，進度會顯示在頁面最上方的進度條。' },
    { tour: 'homework', title: '課後任務', text: '回家要做的事，打勾之後會記住，下次打開還在。' },
  ]);
})();

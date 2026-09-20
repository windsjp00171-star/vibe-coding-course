/*
 * quizshow.js — 課堂搶答投影頁。題目來自 quiz-bank.js（和單元小測驗同一份）。
 * 不需登入、不需外部服務：投影出來，學員舉手或用答案卡回答，講師按空白鍵揭曉。
 */
(function () {
  'use strict';
  const { MODULES, esc, $, $$ } = window.Course;
  const { shuffle } = window.CourseLib;
  const bank = window.QuizBank;

  const units = MODULES.filter((m) => m.ready && (bank[m.id] || []).length);
  const picked = new Set();
  let deck = [];
  let at = 0;
  let revealed = false;
  let teams = [];
  let timer = null;
  let left = 0;

  // ---------- 設定畫面 ----------
  $('[data-qs-units]').innerHTML = units.map((m) => `
    <button type="button" class="chip" data-unit="${m.id}" aria-pressed="false">${m.emoji} ${m.id.slice(1)} ${esc(m.title)}</button>`).join('')
    + '<button type="button" class="chip" data-unit="all" aria-pressed="false">🎲 全部單元混合</button>';

  function refreshCount() {
    const total = deckFrom().length;
    $('[data-qs-count]').textContent = picked.size
      ? `已選 ${picked.has('all') ? '全部單元' : `${picked.size} 個單元`}，共 ${total} 題。`
      : '先選至少一個單元。';
    $('[data-qs-start]').disabled = total === 0;
  }

  function deckFrom() {
    const ids = picked.has('all') ? units.map((m) => m.id) : [...picked];
    return ids.flatMap((id) => (bank[id] || []).map((q) => ({ ...q, unit: id })));
  }

  $('[data-qs-units]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-unit]');
    if (!b) return;
    const id = b.dataset.unit;
    if (id === 'all') {
      picked.clear();
      picked.add('all');
    } else {
      picked.delete('all');
      if (picked.has(id)) picked.delete(id); else picked.add(id);
    }
    $$('[data-unit]').forEach((x) => x.setAttribute('aria-pressed', String(picked.has(x.dataset.unit))));
    refreshCount();
  });
  refreshCount();

  // 從單元頁帶過來：?units=m4 先幫你選好，?go=1 直接開始
  const params = new URLSearchParams(location.search);
  const wanted = (params.get('units') || '').split(',').filter(Boolean);
  if (wanted.length) {
    wanted.forEach((id) => { if (units.some((m) => m.id === id) || id === 'all') picked.add(id); });
    $$('[data-unit]').forEach((x) => x.setAttribute('aria-pressed', String(picked.has(x.dataset.unit))));
    refreshCount();
  }

  // ---------- 開始 ----------
  $('[data-qs-start]').addEventListener('click', () => {
    deck = deckFrom();
    if ($('[data-qs-shuffle]').checked) deck = shuffle(deck);
    const n = Number($('[data-qs-teams]').value);
    teams = Array.from({ length: n }, (_, i) => ({ name: `第 ${i + 1} 組`, score: 0 }));
    at = 0;
    $('[data-qs-setup]').hidden = true;
    document.querySelector('[data-course-header]').hidden = true;
    $('[data-qs-stage]').hidden = false;
    renderScores();
    show();
  });

  function quit() {
    stopTimer();
    $('[data-qs-stage]').hidden = true;
    $('[data-qs-setup]').hidden = false;
    document.querySelector('[data-course-header]').hidden = false;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  // ---------- 出題 ----------
  function show() {
    const q = deck[at];
    revealed = false;
    const mod = MODULES.find((m) => m.id === q.unit);
    $('[data-qs-progress]').textContent = `第 ${at + 1} ／ ${deck.length} 題`;
    $('[data-qs-title]').textContent = mod ? `${mod.emoji} 單元 ${mod.id.slice(1)} ${mod.title}` : '';
    $('[data-qs-q]').textContent = q.q;
    $('[data-qs-options]').innerHTML = q.options.map((o, i) => `
      <li class="qs-opt" data-opt="${i}"><span class="qs-letter">${'ABCD'[i]}</span><span>${esc(o)}</span></li>`).join('');
    const why = $('[data-qs-why]');
    why.textContent = q.why || '';
    why.hidden = true;
    $('[data-qs-hint]').innerHTML = '按 <kbd>空白鍵</kbd> 揭曉答案';
    startTimer();
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    stopTimer();
    const q = deck[at];
    $$('[data-opt]').forEach((el, i) => {
      el.classList.add(i === q.answer ? 'is-right' : 'is-wrong');
    });
    $('[data-qs-why]').hidden = !q.why;
    $('[data-qs-hint]').innerHTML = at + 1 < deck.length
      ? '答對的組別按右邊 <kbd>+1</kbd>　再按 <kbd>空白鍵</kbd> 下一題'
      : '這是最後一題。按 <kbd>空白鍵</kbd> 看結算';
  }

  function next() {
    if (at + 1 < deck.length) { at += 1; show(); return; }
    finish();
  }

  function finish() {
    stopTimer();
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    $('[data-qs-progress]').textContent = '結算';
    $('[data-qs-title]').textContent = '';
    $('[data-qs-q]').textContent = teams.length ? '🏆 本回合成績' : '🎉 全部答完了';
    $('[data-qs-options]').innerHTML = teams.length
      ? ranked.map((t, i) => `<li class="qs-opt is-final"><span class="qs-letter">${['🥇', '🥈', '🥉', '4'][i] || i + 1}</span><span>${esc(t.name)}　${t.score} 分</span></li>`).join('')
      : '<li class="qs-opt is-final"><span>辛苦了！可以回上一頁換一組題目。</span></li>';
    $('[data-qs-why]').hidden = true;
    $('[data-qs-hint]').innerHTML = '按 <kbd>Esc</kbd> 回到設定畫面';
  }

  // ---------- 計分 ----------
  function renderScores() {
    const box = $('[data-qs-scores]');
    box.hidden = teams.length === 0;
    if (!teams.length) return;
    box.innerHTML = `<h3>計分</h3>${teams.map((t, i) => `
      <div class="qs-team">
        <input type="text" value="${esc(t.name)}" data-team-name="${i}" aria-label="組名">
        <b data-team-score="${i}">${t.score}</b>
        <button type="button" class="btn btn-sm btn-ok" data-team-add="${i}">+1</button>
        <button type="button" class="btn btn-sm btn-ghost" data-team-sub="${i}">−</button>
      </div>`).join('')}`;
  }

  $('[data-qs-scores]').addEventListener('click', (e) => {
    const add = e.target.closest('[data-team-add]');
    const sub = e.target.closest('[data-team-sub]');
    if (!add && !sub) return;
    const i = Number((add || sub).dataset.teamAdd ?? (add || sub).dataset.teamSub);
    teams[i].score = Math.max(0, teams[i].score + (add ? 1 : -1));
    $(`[data-team-score="${i}"]`).textContent = String(teams[i].score);
  });
  $('[data-qs-scores]').addEventListener('input', (e) => {
    const box = e.target.closest('[data-team-name]');
    if (box) teams[Number(box.dataset.teamName)].name = box.value.trim() || `第 ${Number(box.dataset.teamName) + 1} 組`;
  });

  // ---------- 倒數 ----------
  function startTimer() {
    stopTimer();
    const secs = Number($('[data-qs-timer]').value);
    const box = $('[data-qs-timer-box]');
    box.hidden = secs === 0;
    if (!secs) return;
    left = secs;
    $('[data-qs-seconds]').textContent = String(left);
    box.classList.remove('is-up');
    timer = setInterval(() => {
      left -= 1;
      $('[data-qs-seconds]').textContent = String(Math.max(0, left));
      if (left <= 5) box.classList.add('is-up');
      if (left <= 0) { stopTimer(); reveal(); }
    }, 1000);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  // ---------- 操作 ----------
  $('[data-qs-quit]').addEventListener('click', quit);
  $('[data-qs-full]').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  });

  document.addEventListener('keydown', (e) => {
    if ($('[data-qs-stage]').hidden) return;
    if (e.target instanceof Element && e.target.matches('input, textarea, select')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (revealed) next(); else reveal(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft' && at > 0) { e.preventDefault(); at -= 1; show(); }
    if (e.key.toLowerCase() === 'f') $('[data-qs-full]').click();
    if (e.key === 'Escape' && !document.fullscreenElement) quit();
  });

  $('[data-qs-stage]').addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('button, input')) return;
    if (revealed) next(); else reveal();
  });

  if (picked.size && params.get('go') === '1') $('[data-qs-start]').click();

  window.Tour.register([]);
})();

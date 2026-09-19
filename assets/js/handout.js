/*
 * handout.js — 紙本講義：讀取單元網頁，自動整理成 2～4 張 A4 的學習單。
 * 網頁是唯一來源：改了單元內容，講義就跟著變，不用另外維護一份 Word 檔。
 * 網址：handout.html?m=m4
 */
(function () {
  'use strict';
  const { MODULES, esc, $, renderPrintQuiz } = window.Course;
  const { firstSentence, unitTerms } = window.CourseLib;
  const GLOSSARY = window.Glossary || [];
  // QR Code 一律指向正式網站：在本機預覽時印出來的講義，學員掃了也打得開
  const SITE = 'https://windsjp00171-star.github.io/vibe-coding-course/';
  const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
  const MAX_TABLE_ROWS = 8;

  const units = MODULES.filter((m) => m.ready);
  const paper = $('[data-ho-paper]');
  const status = $('[data-ho-status]');
  let mod = units.find((m) => m.id === new URLSearchParams(location.search).get('m')) || units[0];

  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  // ---------- 從單元網頁擷取各區塊 ----------
  function extract(doc) {
    const hero = doc.querySelector('.module-hero');
    const all = [...doc.querySelectorAll('main > section.slide')].filter((s) => s !== hero);
    const content = all.filter((s) => !['quiz', 'homework'].includes(s.id));
    const workshopSec = content.find((s) => s.querySelector('.workshop'));
    const homework = all.find((s) => s.id === 'homework');
    doc.querySelectorAll('[data-teacher-slot], .teacher').forEach((el) => el.remove());

    const points = content.filter((s) => s !== workshopSec).map((s) => {
      const intro = s.querySelector('.section-head p');
      const table = [...s.querySelectorAll('table.talk-table, table.compare')]
        .find((t) => !t.closest('.screen-only, .print-only') && t.querySelectorAll('tbody tr').length <= MAX_TABLE_ROWS);
      return {
        title: text(s.querySelector('h2')),
        point: firstSentence(text(intro) || text(s.querySelector('.analogy')) || text(s.querySelector('.callout'))),
        table: table ? table.outerHTML : '',
      };
    });

    const practice = [...doc.querySelectorAll('.print-only')]
      .filter((el) => !el.matches('[data-quiz-print]') && !el.closest('#homework') && text(el))
      .map((el) => el.innerHTML);

    const steps = workshopSec ? [...workshopSec.querySelectorAll('.workshop ol > li')].map((li) => {
      const time = text(li.querySelector('.time'));
      const title = text(li.querySelector('.step-title'));
      li.querySelectorAll('.time, .step-title').forEach((el) => el.remove());
      return { time, title, body: text(li) };
    }) : [];

    return {
      eyebrow: text(hero?.querySelector('.eyebrow')),
      title: text(hero?.querySelector('h1')),
      lead: firstSentence(text(hero?.querySelector('.lead')), 90),
      goals: [...(hero?.querySelectorAll('.goals li') || [])].map(text),
      phases: [...(hero?.querySelectorAll('.phase') || [])].map(text),
      points,
      terms: unitTerms(content.map(text).join(' '), GLOSSARY).map((id) => GLOSSARY.find((g) => g.id === id)),
      practice,
      workshopTitle: text(workshopSec?.querySelector('h2')),
      steps,
      homework: [...(homework?.querySelectorAll('.checklist li') || [])].map(text),
      reflect: [...(homework?.querySelectorAll('.print-only') || [])].map((el) => el.innerHTML),
    };
  }

  // ---------- 排版 ----------
  function qrSvg(url) {
    if (typeof window.qrcode !== 'function') return '';
    const qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  }

  function render(d) {
    let n = 0;
    const sec = (title, body) => `<section class="ho-sec"><h2 class="ho-h"><span class="ho-num">${CIRCLED[n++]}</span>${esc(title)}</h2>${body}</section>`;
    const url = SITE + mod.file;
    const parts = [
      `<header class="ho-head">
        <div>
          <p class="ho-eyebrow">Vibe Coding 實戰課．${esc(d.eyebrow)}</p>
          <h1>${esc(d.title)}</h1>
          <p class="ho-lead">${esc(d.lead)}</p>
          <p class="ho-fields"><span>姓名 <i></i></span><span>班級 <i></i></span><span>日期 <i></i></span></p>
        </div>
        <figure class="ho-qr">${qrSvg(url)}<figcaption>掃描打開網頁版<br>互動練習都在這裡</figcaption></figure>
      </header>`,
      d.goals.length ? sec('這個單元結束後，我會……', `<ul class="ho-check">${d.goals.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
        ${d.phases.length ? `<p class="ho-phases">${d.phases.map(esc).join('　｜　')}</p>` : ''}`) : '',
      sec('重點整理', `<ol class="ho-points">${d.points.map((p) => `<li><b>${esc(p.title)}</b>${p.point ? `<span>${esc(p.point)}</span>` : ''}${p.table}</li>`).join('')}</ol>`),
      d.terms.length ? sec('名詞速查', `<dl class="ho-terms">${d.terms.map((g) => `<div><dt>${esc(g.term)}</dt><dd>${esc(g.plain)}</dd></div>`).join('')}</dl>`) : '',
      d.practice.length ? sec('課前練習', d.practice.map((h) => `<div class="ho-block">${h}</div>`).join('')) : '',
      d.steps.length ? sec(`課中工作坊：${d.workshopTitle}`, `<table class="ho-steps"><thead><tr><th>時間</th><th>要做的事</th><th>我的筆記</th></tr></thead><tbody>${d.steps.map((s) => `
        <tr><td>${esc(s.time)}</td><td>${s.title ? `<b>${esc(s.title)}</b><br>` : ''}${esc(s.body)}</td><td class="ho-note"></td></tr>`).join('')}</tbody></table>`) : '',
      (window.QuizBank[mod.id] || []).length ? sec('小測驗', `<div class="ho-quiz" data-ho-quiz></div>`) : '',
      d.homework.length || d.reflect.length ? sec('課後任務', `${d.homework.length ? `<ul class="ho-check">${d.homework.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        ${d.reflect.map((h) => `<div class="ho-block">${h}</div>`).join('')}`) : '',
    ];
    paper.innerHTML = parts.join('');
    const quizHost = $('[data-ho-quiz]');
    if (!quizHost) return;
    renderPrintQuiz(quizHost, window.QuizBank[mod.id]);
    quizHost.querySelector('h3')?.remove();
  }

  // ---------- 會員閘門：和網頁版同一套規則 ----------
  function locked() {
    const M = window.Members;
    if (!M?.enabled || mod.trial) return false;
    const p = M.profile;
    return !(p && (p.enrolled || p.role === 'teacher'));
  }

  async function load() {
    $('[data-ho-back]').href = mod.file;
    document.title = `單元 ${mod.id.slice(1)} 講義｜Vibe Coding 實戰課`;
    if (locked()) {
      paper.innerHTML = `<section class="ho-gate"><h2>🔒 這個單元的講義需要開通</h2><p>登入並輸入講師給你的加入碼後就能列印。單元 ${units.filter((m) => m.trial).map((m) => m.id.slice(1)).join('、')} 可以免費試用。</p></section>`;
      status.textContent = '';
      return;
    }
    status.textContent = '整理講義中…';
    try {
      const res = await fetch(mod.file);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      render(extract(doc));
      status.textContent = '';
    } catch (err) {
      paper.innerHTML = '<section class="ho-gate"><h2>講義載入失敗</h2><p>請重新整理頁面再試一次。</p></section>';
      status.textContent = `（${err.message}）`;
    }
  }

  const select = $('[data-ho-unit]');
  select.innerHTML = units.map((m) => `<option value="${m.id}" ${m === mod ? 'selected' : ''}>${m.id.slice(1)}．${esc(m.title)}</option>`).join('');
  select.addEventListener('change', () => {
    mod = units.find((m) => m.id === select.value);
    history.replaceState(null, '', `?m=${mod.id}`);
    load();
  });
  $('[data-ho-print]').addEventListener('click', () => window.print());
  document.addEventListener('course:auth', load);
  load();

  window.Tour.register([
    { tour: 'ho-tools', title: '紙本講義', text: '選單元，按「列印」就能印出這個單元的學習單（大約 2～4 張 A4），也可以存成 PDF。互動練習請掃講義上的 QR Code 回網頁版做。' },
  ]);
})();

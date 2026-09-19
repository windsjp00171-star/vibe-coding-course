/*
 * handout.js — 紙本講義：讀取單元網頁，自動整理成 2～4 張 A4 的學習單。
 * 網頁是唯一來源：改了單元內容，講義就跟著變，不用另外維護一份 Word 檔。
 * 網址：handout.html?m=m4（單一單元）、handout.html?m=book（整本必修手冊：封面、目錄、單元 1～9）
 */
(function () {
  'use strict';
  const { MODULES, esc, $, isTeacher } = window.Course;
  const { firstSentence, unitTerms } = window.CourseLib;
  const GLOSSARY = window.Glossary || [];
  // QR Code 一律指向正式網站：在本機預覽時印出來的講義，學員掃了也打得開
  const SITE = 'https://windsjp00171-star.github.io/vibe-coding-course/';
  const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
  const MAX_TABLE_ROWS = 8;

  const units = MODULES.filter((m) => m.ready);
  const CORE = units.filter((m) => /^[ABC]|結業/.test(m.part));
  const BOOK = { id: 'book', title: '整本手冊（必修 1～9）' };
  const paper = $('[data-ho-paper]');
  const status = $('[data-ho-status]');
  let withAnswers = false;
  const wanted = new URLSearchParams(location.search).get('m');
  let mod = wanted === 'book' ? BOOK : units.find((m) => m.id === wanted) || units[0];

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

  // 小測驗：學員版只有題目；講師版標出正確答案並附解說
  function quizHtml(questions) {
    return questions.map((q, i) => `
      <div class="print-q"><b>${i + 1}. ${esc(q.q)}</b>
        <ol>${q.options.map((o, j) => `<li class="${withAnswers && j === q.answer ? 'ho-correct' : ''}">${esc(o)}</li>`).join('')}</ol>
        ${withAnswers ? `<p class="ho-why">解說：${esc(q.why)}</p>` : ''}</div>`).join('');
  }

  function unitHtml(unit, d) {
    const questions = window.QuizBank[unit.id] || [];
    let n = 0;
    const sec = (title, body) => `<section class="ho-sec"><h2 class="ho-h"><span class="ho-num">${CIRCLED[n++]}</span>${esc(title)}</h2>${body}</section>`;
    const url = SITE + unit.file;
    const parts = [
      `<header class="ho-head">
        <div>
          <p class="ho-eyebrow">Vibe Coding 實戰課．${esc(d.eyebrow)}${withAnswers ? '<span class="ho-teacher-badge">講師版．附答案</span>' : ''}</p>
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
      questions.length ? sec('小測驗', `<div class="ho-quiz">${quizHtml(questions)}</div>`) : '',
      d.homework.length || d.reflect.length ? sec('課後任務', `${d.homework.length ? `<ul class="ho-check">${d.homework.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        ${d.reflect.map((h) => `<div class="ho-block">${h}</div>`).join('')}`) : '',
    ];
    return `<article class="ho-unit">${parts.join('')}</article>`;
  }

  async function fetchUnit(unit) {
    const res = await fetch(unit.file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return extract(new DOMParser().parseFromString(await res.text(), 'text/html'));
  }

  // 整本手冊：封面＋目錄＋各單元（每單元從新的一頁開始）。只放這位使用者目前看得到的單元。
  function coverHtml(list) {
    return `<section class="ho-cover">
      <p class="ho-eyebrow">給非工程師的 AI 寫程式課${withAnswers ? '<span class="ho-teacher-badge">講師版．附答案</span>' : ''}</p>
      <h1>Vibe Coding 實戰課<br><small>學習手冊</small></h1>
      <p class="ho-lead">從在自己電腦上做出第一個網頁，到放上網路、再到避開 AI 時代的資安陷阱。</p>
      <p class="ho-fields"><span>姓名 <i></i></span><span>班級 <i></i></span></p>
      <h2 class="ho-h">目錄</h2>
      <ol class="ho-toc">${list.map((m) => `<li><span>${esc(m.part)}</span><b>單元 ${m.id.slice(1)}　${esc(m.title)}</b></li>`).join('')}</ol>
      <figure class="ho-qr ho-qr-cover">${qrSvg(SITE)}<figcaption>課程網站</figcaption></figure>
    </section>`;
  }


  // 會員閘門：和網頁版同一套規則（登入、開通、班級開放進度）
  const accessOf = (unit) => window.Members?.access(unit) || 'open';

  async function load() {
    const isBook = mod === BOOK;
    $('[data-ho-back]').href = isBook ? 'index.html' : mod.file;
    document.title = `${isBook ? 'Vibe Coding 實戰課 學習手冊' : `單元 ${mod.id.slice(1)} 講義`}${withAnswers ? '（講師版）' : ''}｜Vibe Coding 實戰課`;
    const list = isBook ? CORE.filter((m) => accessOf(m) === 'open') : [mod];
    const blocked = isBook ? (list.length ? null : accessOf(CORE.find((m) => !m.trial))) : (accessOf(mod) !== 'open' ? accessOf(mod) : null);
    if (blocked) {
      paper.innerHTML = `<section class="ho-gate">${window.Members.gateMessage(blocked)}</section>`;
      status.textContent = '';
      return;
    }
    status.textContent = isBook ? `整理 ${list.length} 個單元中…` : '整理講義中…';
    try {
      const data = await Promise.all(list.map(fetchUnit));
      const body = list.map((m, i) => unitHtml(m, data[i])).join('');
      paper.innerHTML = isBook ? coverHtml(list) + body : body;
      status.textContent = isBook && list.length < CORE.length ? `目前開放 ${list.length} 個單元，其他單元開放後再印` : '';
    } catch (err) {
      paper.innerHTML = '<section class="ho-gate"><h2>講義載入失敗</h2><p>請重新整理頁面再試一次。</p></section>';
      status.textContent = `（${err.message}）`;
    }
  }

  const select = $('[data-ho-unit]');
  select.innerHTML = `<option value="book" ${mod === BOOK ? 'selected' : ''}>📘 ${BOOK.title}</option>`
    + units.map((m) => `<option value="${m.id}" ${m === mod ? 'selected' : ''}>${m.id.slice(1)}．${esc(m.title)}</option>`).join('');
  select.addEventListener('change', () => {
    mod = select.value === 'book' ? BOOK : units.find((m) => m.id === select.value);
    history.replaceState(null, '', `?m=${mod.id}`);
    load();
  });
  $('[data-ho-print]').addEventListener('click', () => window.print());
  // 講師版開關：只有講師看得到（登入的講師，或本機有講師筆記）
  const teacherToggle = $('[data-ho-teacher]');
  const showToggle = () => { teacherToggle.hidden = !isTeacher(); };
  document.addEventListener('course:teacher', showToggle);
  showToggle();
  $('[data-ho-answers]').addEventListener('change', (e) => {
    withAnswers = e.target.checked && isTeacher();
    load();
  });
  // 講師也可以用網址直接開講師版（?answers=1），方便一次存成 PDF；不是講師就忽略
  document.addEventListener('course:teacher', () => {
    if (new URLSearchParams(location.search).get('answers') !== '1' || withAnswers) return;
    withAnswers = true;
    $('[data-ho-answers]').checked = true;
    load();
  });
  document.addEventListener('course:auth', load);
  load();

  window.Tour.register([
    { tour: 'ho-tools', title: '紙本講義', text: '選單元，按「列印」就能印出這個單元的學習單（大約 2～4 張 A4），也可以存成 PDF。選單第一項是整本必修手冊，有封面和目錄。互動練習請掃講義上的 QR Code 回網頁版做。' },
  ]);
})();

/* m9.js — 單元 09：總測驗與結業證書 */
(function () {
  'use strict';
  const { $, esc, MODULES, getState, update, mountQuiz, mountMeters } = window.Course;
  const { buildExam } = window.CourseLib;

  const CORE_UNITS = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm19'];
  const EXAM_SIZE = 12;
  const FINAL_PASS_PERCENT = 80;

  // ---------- 學習紀錄 ----------
  function renderReview() {
    const { progress } = getState();
    $('[data-review]').innerHTML = MODULES.filter((m) => CORE_UNITS.includes(m.id)).map((m) => {
      const p = progress[m.id];
      return `<a class="review-item ${p?.done ? 'is-done' : ''}" href="../${m.file}">
        <span>${m.emoji} <b>${esc(m.title)}</b></span>
        <span class="pill ${p?.done ? 'pill-ok' : 'pill-warn'}">${p?.done ? `✅ ${p.best} 分` : p ? `${p.best} 分` : '未作答'}</span></a>`;
    }).join('');
  }

  // ---------- 總測驗（每次重新抽題、打亂選項） ----------
  function startExam() {
    const exam = buildExam(window.QuizBank, CORE_UNITS, EXAM_SIZE);
    mountQuiz($('[data-exam]'), exam, {
      moduleId: 'm9',
      title: '總測驗',
      passPercent: FINAL_PASS_PERCENT,
      onFinish: (result) => {
        if (result.passed) update({ finalScore: Math.max(getState().finalScore || 0, result.percent) });
        renderCert();
      },
      onRetry: startExam, // 重做時重新抽一份新考卷
    });
  }

  // ---------- 證書 ----------
  function renderCert() {
    const state = getState();
    const earned = Boolean(state.finalScore);
    const name = state.name || '';
    $('[data-cert-name]').value = name;
    $('[data-cert-out-name]').textContent = name || '＿＿＿＿＿＿';
    $('[data-cert-date]').textContent = `結業日期　${new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    $('[data-cert-score]').textContent = earned ? `總測驗　${state.finalScore} 分` : '';
    $('[data-cert]').classList.toggle('is-earned', earned);
    $('[data-cert-print]').disabled = !(earned && name);
    $('[data-cert-status]').innerHTML = earned
      ? (name ? '<div class="feedback ok">🎉 恭喜結業！可以列印證書了。</div>' : '<div class="feedback ok">🎉 已通過總測驗！輸入名字就能列印證書。</div>')
      : `<div class="callout callout-warn">總測驗 ${FINAL_PASS_PERCENT} 分以上才能列印證書。</div>`;
  }

  // ---------- 可驗證的證書編號 ----------
  // 紙本證書沒辦法自證真假，所以另外在雲端留一筆，證書上印編號給對方查。
  const VERIFY_BASE = `${location.origin}${location.pathname.replace(/modules\/[^/]+$/, '')}verify.html`;

  function showCode(cert) {
    const code = window.CourseLib.formatCertCode(cert.code);
    const link = `${VERIFY_BASE}?c=${cert.code}`;
    $('[data-cert-verify]').hidden = false;
    $('[data-cert-verify]').innerHTML = `證書編號 ${esc(code)}　｜　查證網址 ${esc(VERIFY_BASE.replace(/^https?:\/\//, ''))}`;
    $('[data-cert-issue-out]').innerHTML = `<div class="feedback ok" style="margin-top:12px">
      <b>證書編號：${esc(code)}</b><br>
      把這個連結給對方，他就能查到你的姓名、分數與結業日期（不會看到其他資料）：<br>
      <a href="${esc(link)}" target="_blank" rel="noopener">${esc(link)}</a></div>`;
    $('[data-cert-issue]').textContent = '🔄 更新證書上的名字或分數';
  }

  async function loadCode() {
    const btn = $('[data-cert-issue]');
    if (!window.Members?.enabled) { btn.hidden = true; return; }
    btn.hidden = false;
    const cert = await window.Members.myCertificate();
    if (cert) showCode(cert);
  }

  $('[data-cert-issue]').addEventListener('click', async () => {
    const btn = $('[data-cert-issue]');
    const state = getState();
    if (!state.finalScore || !state.name) { $('[data-cert-issue-out]').innerHTML = '<div class="feedback bad" style="margin-top:12px">要先通過總測驗並填上名字。</div>'; return; }
    btn.disabled = true;
    try {
      const cert = await window.Members.issueCertificate(state.name, state.finalScore);
      showCode(cert);
    } catch (err) {
      const needSql = /relation|does not exist|function|schema cache/i.test(err.message);
      $('[data-cert-issue-out]').innerHTML = `<div class="feedback bad" style="margin-top:12px">${needSql
        ? '還沒建立證書資料表：請講師到 Supabase 執行一次 supabase/add-certificates.sql。'
        : err.message === '請先登入' ? '請先按右上角「登入保存進度」，才能產生可驗證的編號。' : esc(err.message)}</div>`;
    } finally {
      btn.disabled = false;
    }
  });

  loadCode();
  document.addEventListener('course:auth', loadCode);

  $('[data-cert-name]').addEventListener('input', (e) => { update({ name: e.target.value.trim().slice(0, 20) }); renderCert(); });
  $('[data-cert-print]').addEventListener('click', () => {
    document.documentElement.classList.add('print-cert');
    window.print();
  });
  window.addEventListener('afterprint', () => document.documentElement.classList.remove('print-cert'));

  renderReview();
  startExam();
  renderCert();

  // ---------- 上課前 vs 現在 ----------
  function renderGrowth(after) {
    const { rows, hasBefore } = window.CourseLib.compareRatings(getState().selfRating || {}, after);
    const sign = (d) => (d > 0 ? `<b style="color:var(--ok)">▲ ${d}</b>` : d < 0 ? `<b style="color:var(--warn)">▼ ${-d}</b>` : '<span class="muted">持平</span>');
    $('[data-growth]').innerHTML = hasBefore
      ? `<h3>你的變化</h3><table class="compare"><thead><tr><th>能力</th><th>上課前</th><th>現在</th><th></th></tr></thead><tbody>${rows.map((r) => `
          <tr><td>${esc(r.name)}</td><td>${r.before ?? '—'}</td><td>${r.after}</td><td>${r.delta === null ? '<span class="muted">單元 1 沒拉</span>' : sign(r.delta)}</td></tr>`).join('')}</tbody></table>
        <p class="muted" style="margin-top:10px">分數變低也很正常：知道得越多，越清楚自己還不會什麼。</p>`
      : '<h3>還沒有起點</h3><p>你在單元 1 沒有拉過這五項，所以這次拉的分數就是你的紀錄。可以回單元 1 補拉「上課前」的感覺，再回來比較。</p>';
  }
  mountMeters($('[data-meters-after]'), 'selfRatingAfter', renderGrowth);

  window.Tour.register([
    { tour: 'review', title: '學習紀錄', text: '十個必修單元的小測驗成績。沒過的可以點進去重做。' },
    { tour: 'exam', title: '總測驗', text: '12 題、80 分過關。每次都會重新抽題、打亂選項。' },
    { tour: 'cert', title: '結業證書', text: '通過總測驗並輸入名字後，就能列印證書或存成 PDF。' },
    { tour: 'growth', title: '上課前 vs 現在', text: '把單元 1 拉過的五種能力再拉一次，右邊會顯示每一項進步了幾分。' },
    { tour: 'next', title: '結業之後', text: '明天就能做的五件事，做完打勾。' },
  ]);
})();

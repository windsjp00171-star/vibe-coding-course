/*
 * workbench.js — 沉浸式「Claude Code 工作台」模擬器。
 * 左邊是仿 Claude Code 的對話，右邊是網頁預覽和檔案；劇本（sims/*.js）用 async 函式一步一步寫，
 * 這裡提供劇本能用的動作：claude／coach／notify／choose／prompt／permission／tool／setSite／waitSite……
 * 用法：Workbench.mount(host, { id: 'm2', missions: ['選資料夾', …], run: SimM2.run })
 */
(function () {
  'use strict';
  const { esc, getState, update } = window.Course;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CANCEL = Symbol('cancel');
  const TYPING_MS = calm ? 0 : 650;
  const MAX_STARS = 3;

  function mount(host, config) {
    let alive = true;
    let mistakes = 0;
    host.classList.add('wb');
    host.classList.remove('is-thinking', 'is-hit'); // 重來一次時，上一局的狀態要清掉
    host.style.setProperty('--wb-progress', '0%');
    host.innerHTML = `
      <div class="wb-top">
        <ol class="wb-missions">${config.missions.map((m, i) => `<li data-m="${i}"><span>${i + 1}</span>${esc(m)}</li>`).join('')}</ol>
        <button type="button" class="btn btn-sm" data-wb-reset title="回到第一關重新玩一次">↺ 重來一次</button>
      </div>
      <div class="wb-main">
        <section class="wb-chat" aria-label="Claude Code 對話（模擬）">
          <div class="wb-bar"><b>✻ Claude Code</b><span data-wb-folder>📁 尚未選資料夾</span><em>模擬</em></div>
          <div class="wb-log" aria-live="polite"></div>
          <form class="wb-input" data-wb-form>
            <div class="wb-hints" data-wb-hints></div>
            <div class="wb-row">
              <textarea rows="2" disabled placeholder="等 Claude Code 說完……" aria-label="對 Claude Code 說"></textarea>
              <button type="submit" class="btn btn-primary" disabled>送出</button>
            </div>
          </form>
        </section>
        <section class="wb-side" aria-label="網頁預覽與檔案">
          <div class="wb-side-head">🌐 預覽<span data-wb-sitehint></span></div>
          <div class="wb-preview"><p class="wb-empty">還沒有網頁。<br>跟 Claude Code 說你要做什麼，這裡就會長出來。</p></div>
          <div class="wb-side-head">📁 檔案</div>
          <ul class="wb-files" data-wb-files><li class="muted">（空的）</li></ul>
        </section>
      </div>
      <div class="wb-toast" data-wb-toast hidden></div>`;

    const $ = (sel) => host.querySelector(sel);
    const log = $('.wb-log');
    const form = $('[data-wb-form]');
    const input = form.querySelector('textarea');
    const send = form.querySelector('button');
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const check = () => { if (!alive) throw CANCEL; };

    function add(cls, html) {
      check();
      const el = document.createElement('div');
      el.className = `wb-msg ${cls}`;
      el.innerHTML = html;
      log.append(el);
      log.scrollTop = log.scrollHeight;
      return el;
    }

    async function typing() {
      if (!TYPING_MS) return;
      host.classList.add('is-thinking'); // 標題列的 Claude 圖示會發亮，讓人感覺它「正在想」
      const dots = add('msg-claude msg-typing', '<span class="wb-av">✻</span><span class="wb-dots"><i></i><i></i><i></i></span>');
      await wait(TYPING_MS);
      dots.remove();
      host.classList.remove('is-thinking');
      check();
    }

    // 完成時的彩帶：純裝飾，設定「減少動態」時不放
    function confetti() {
      if (calm) return;
      const colors = ['#818cf8', '#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#f97316'];
      const layer = document.createElement('div');
      layer.className = 'wb-confetti';
      layer.innerHTML = Array.from({ length: 42 }, (_, i) => {
        const x = Math.round(Math.random() * 100);
        const d = (0.6 + Math.random() * 0.9).toFixed(2);
        const r = Math.round(Math.random() * 360);
        return `<i style="left:${x}%;background:${colors[i % colors.length]};animation-duration:${d}s;animation-delay:${(Math.random() * 0.25).toFixed(2)}s;--r:${r}deg"></i>`;
      }).join('');
      host.append(layer);
      setTimeout(() => layer.remove(), 2200);
    }

    // 等使用者點其中一顆按鈕，回傳它的 value
    function buttons(el, selector) {
      return new Promise((resolve) => {
        el.addEventListener('click', function onClick(e) {
          const b = e.target.closest(selector);
          if (!b || !alive) return;
          el.removeEventListener('click', onClick);
          el.querySelectorAll('button').forEach((x) => { x.disabled = true; });
          b.classList.add('is-picked');
          resolve(b.dataset.value);
        });
      });
    }

    const wb = {
      async story(from, text, cta) {
        const el = add('msg-story', `<div class="wb-phone"><b>${esc(from)}</b><p>${esc(text)}</p></div>
          <button type="button" class="btn btn-primary" data-value="go">${esc(cta)} 開始任務 →</button>`);
        await buttons(el, '[data-value]');
      },
      async claude(text) {
        await typing();
        add('msg-claude', `<span class="wb-av">✻</span><p>${esc(text)}</p>`);
      },
      async coach(text, tone = 'info') {
        await wait(calm ? 0 : 250);
        add(`msg-coach tone-${tone}`, `<span class="wb-av">📣</span><p><b>教練</b>${esc(text)}</p>`);
      },
      async notify(from, text) {
        await wait(calm ? 0 : 500);
        add('msg-notify', `<b>💬 ${esc(from)}</b><p>${esc(text)}</p>`);
        const toast = $('[data-wb-toast]');
        toast.innerHTML = `<b>${esc(from)}</b>${esc(text)}`;
        toast.hidden = false;
        setTimeout(() => { toast.hidden = true; }, 4200);
      },
      async boom(text) {
        await wait(calm ? 0 : 300);
        add('msg-boom', `<p>💥 ${esc(text)}</p>`);
        host.classList.remove('is-hit'); void host.offsetWidth; host.classList.add('is-hit');
        setTimeout(() => host.classList.remove('is-hit'), 700);
      },
      choose(options) {
        const el = add('msg-choose', options.map((o) => `<button type="button" class="btn" data-value="${esc(o.value)}">${esc(o.label)}</button>`).join(''));
        return buttons(el, '[data-value]');
      },
      async permission(action, detail, note) {
        const el = add('msg-perm', `<p class="wb-perm-q">Claude 想要<b>${esc(action)}</b></p><code>${esc(detail)}</code>
          ${note ? `<p class="muted">${esc(note)}</p>` : ''}
          <div class="wb-perm-btns"><button type="button" class="btn btn-ok" data-value="allow">允許</button><button type="button" class="btn" data-value="deny">拒絕</button></div>`);
        return (await buttons(el, '[data-value]')) === 'allow';
      },
      prompt({ placeholder, hints = [] }) {
        check();
        input.disabled = false;
        send.disabled = false;
        form.classList.add('is-your-turn'); // 輸入框亮起來：現在輪到你說話
        input.placeholder = placeholder;
        input.focus({ preventScroll: true });
        $('[data-wb-hints]').innerHTML = hints.length ? `<button type="button" class="wb-hint-btn" data-hint="${esc(hints[0])}">💡 不知道怎麼說？看看範例</button>` : '';
        return new Promise((resolve) => {
          form.onsubmit = (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text || !alive) return;
            input.value = '';
            input.disabled = true;
            send.disabled = true;
            form.classList.remove('is-your-turn');
            input.placeholder = '等 Claude Code 回應……';
            $('[data-wb-hints]').innerHTML = '';
            form.onsubmit = null;
            add('msg-you', `<p>${esc(text)}</p>`);
            resolve(text);
          };
        });
      },
      tool(label, lines) {
        add('msg-tool', `<b>${esc(label)}</b><pre>${lines.map(esc).join('\n')}</pre>`);
      },
      setFolder(name) { $('[data-wb-folder]').textContent = `📁 ${name}`; },
      addFile(name) {
        const list = $('[data-wb-files]');
        list.querySelector('.muted')?.remove();
        if ([...list.children].some((li) => li.textContent === name)) return;
        list.insertAdjacentHTML('beforeend', `<li>${esc(name)}</li>`);
      },
      setSite(html) {
        const box = $('.wb-preview');
        let frame = box.querySelector('iframe');
        if (!frame) {
          box.innerHTML = '<iframe sandbox="allow-scripts" title="你做的網頁（預覽）"></iframe>';
          frame = box.querySelector('iframe');
        }
        frame.srcdoc = html;
        box.classList.remove('is-new');
        void box.offsetWidth; // 重新觸發「剛更新」的閃光動畫
        box.classList.add('is-new');
      },
      // 等學員在預覽裡做某件事（例如按下送出），預覽用 postMessage 通知
      waitSite(type, hint) {
        check();
        const tip = $('[data-wb-sitehint]');
        tip.textContent = hint;
        $('.wb-preview').classList.add('is-waiting');
        return new Promise((resolve) => {
          const onMsg = (e) => {
            const frame = $('.wb-preview iframe');
            if (!alive || !frame || e.source !== frame.contentWindow || e.data?.sim !== type) return;
            window.removeEventListener('message', onMsg);
            tip.textContent = '';
            $('.wb-preview').classList.remove('is-waiting');
            resolve();
          };
          window.addEventListener('message', onMsg);
        });
      },
      mission(i) {
        const items = host.querySelectorAll('.wb-missions li');
        items.forEach((li, j) => {
          li.classList.toggle('is-done', j < i);
          li.classList.toggle('is-now', j === i);
        });
        // 任務列下面的進度條
        host.style.setProperty('--wb-progress', `${Math.round((i / Math.max(1, items.length)) * 100)}%`);
      },
      mistake() { mistakes += 1; },
      finish(lessons) {
        const stars = Math.max(1, MAX_STARS - mistakes);
        host.querySelectorAll('.wb-missions li').forEach((li) => { li.classList.add('is-done'); li.classList.remove('is-now'); });
        host.style.setProperty('--wb-progress', '100%');
        confetti();
        const sims = getState().sims || {};
        update({ sims: { ...sims, [config.id]: Math.max(sims[config.id] || 0, stars) } });
        add('msg-finish', `<p class="wb-stars">${'★'.repeat(stars)}${'☆'.repeat(MAX_STARS - stars)}</p>
          <h3>任務完成！</h3>
          <p>${mistakes ? `過程中踩了 ${mistakes} 個坑，沒關係，在模擬裡踩總比在真的電腦上踩好。` : '一個坑都沒踩，太強了！'}</p>
          <p><b>你剛剛做的，就是 Vibe Coding：</b></p>
          <ul>${lessons.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
          ${config.after ? `<p class="muted">${esc(config.after)}</p>` : ''}`);
      },
    };

    $('[data-wb-hints]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-hint]');
      if (!b) return;
      input.value = b.dataset.hint;
      input.focus({ preventScroll: true });
    });

    $('[data-wb-reset]').addEventListener('click', () => {
      alive = false;
      mount(host, config);
    });

    config.run(wb).catch((err) => {
      if (err === CANCEL) return;
      console.error('[工作台] 劇本中斷', err);
      add('msg-boom', '<p>模擬器出了一點問題，請按「↺ 重來一次」。</p>');
    });
  }

  window.Workbench = { mount };
})();

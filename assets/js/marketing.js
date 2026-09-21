/*
 * marketing.js — 對外三頁的進場效果。
 * 只做一件事：段落捲到畫面裡才浮上來，讓視線跟著往下走。
 * 使用者設定「減少動態」時整個不啟動——動畫是加分項，不能變成障礙。
 */
(function () {
  'use strict';
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('.slide > .section-head, .lp-paths, .lp-back, .lp-proof, .en-facts, .grid, .split, .card, .en-packs, .wk-grid');
  if (calm || !('IntersectionObserver' in window)) return;

  targets.forEach((el) => {
    // 主視覺不要淡入：第一眼就該看到，不該等
    if (el.closest('.lp-hero, .en-hero, .module-hero')) return;
    el.setAttribute('data-reveal', '');
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  // 動態產生的內容（報名表、套裝方案）也要跟著顯示，不然會永遠停在透明
  document.addEventListener('course:rendered', () => {
    document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
  });

  // 保險：3 秒後還沒被觸發的一律顯示，寧可沒動畫也不要看不到內容
  setTimeout(() => {
    document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
    });
  }, 3000);
})();

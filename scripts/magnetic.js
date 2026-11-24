// ============================================================================
// Tactile Motion: Dynamic Ambient Spotlight + Spring Magnetic Physics
// ============================================================================
(function () {
  'use strict';

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  // 1. Dynamic Cursor-Following Ambient Illumination across Cards & Docks
  const spotlightSelector = [
    '.home-project-card',
    '.case-study-next'
  ].join(', ');

  const cards = document.querySelectorAll(spotlightSelector);
  if (cards.length && !prefersReduced && hasFinePointer) {
    cards.forEach((card) => {
      let isHovered = false;
      let rafId = null;

      card.addEventListener('pointerenter', () => {
        isHovered = true;
      });

      card.addEventListener('pointermove', (e) => {
        if (!isHovered) return;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          card.style.setProperty('--mouse-x', `${x.toFixed(0)}px`);
          card.style.setProperty('--mouse-y', `${y.toFixed(0)}px`);
        });
      });

      card.addEventListener('pointerleave', () => {
        isHovered = false;
        if (rafId) cancelAnimationFrame(rafId);
      });
    });
  }

  // 2. Spring Magnetic Micro-Pull for Primary Controls
  if (hasFinePointer && !prefersReduced) {
    const magneticTargets = document.querySelectorAll('#ai-mini-send, .home-omnibar-send');
    magneticTargets.forEach((el) => {
      let rafId = null;

      el.addEventListener('pointerenter', () => {
        el.classList.add('is-magnetic-active');
      });

      el.addEventListener('pointermove', (e) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const deltaX = e.clientX - centerX;
          const deltaY = e.clientY - centerY;

          const maxPull = 3.5;
          const pullX = Math.max(-maxPull, Math.min(maxPull, deltaX * 0.22));
          const pullY = Math.max(-maxPull, Math.min(maxPull, deltaY * 0.22));

          el.style.setProperty('--mag-x', `${pullX.toFixed(2)}px`);
          el.style.setProperty('--mag-y', `${pullY.toFixed(2)}px`);
        });
      });

      el.addEventListener('pointerleave', () => {
        if (rafId) cancelAnimationFrame(rafId);
        el.classList.remove('is-magnetic-active');
        el.style.setProperty('--mag-x', '0px');
        el.style.setProperty('--mag-y', '0px');
      });
    });
  }
})();

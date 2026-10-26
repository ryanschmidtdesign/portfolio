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
    '.evidence-card',
    '.leadership-metric',
    '.about-connection',
    '.sa-step',
    '.home-omnibar-shell',
    '.subpage-omnibar-shell',
    '.case-study-next'
  ].join(', ');

  const cards = document.querySelectorAll(spotlightSelector);
  if (cards.length && !prefersReduced && hasFinePointer) {
    cards.forEach((card) => {
      let isHovered = false;
      let rafId = null;
      const isEvidenceCard = card.classList.contains('evidence-card');

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
          card.style.setProperty('--x', `${x.toFixed(0)}px`);
          card.style.setProperty('--y', `${y.toFixed(0)}px`);

          if (isEvidenceCard) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const tiltX = ((y - centerY) / centerY) * -1.2;
            const tiltY = ((x - centerX) / centerX) * 1.2;
            card.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-2px)`;
          }
        });
      });

      card.addEventListener('pointerleave', () => {
        isHovered = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (isEvidenceCard) {
          card.style.transform = '';
        }
      });
    });
  }

  // 2. Spring Magnetic Micro-Pull for Primary Controls
  if (hasFinePointer && !prefersReduced) {
    const magneticTargets = document.querySelectorAll('.magnetic, .ai-mini-send, .home-omnibar-send, .subpage-omnibar-send');
    magneticTargets.forEach((el) => {
      let rafId = null;

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

          el.style.transform = `translate3d(${pullX.toFixed(1)}px, ${pullY.toFixed(1)}px, 0)`;
        });
      });

      el.addEventListener('pointerleave', () => {
        if (rafId) cancelAnimationFrame(rafId);
        el.style.transform = '';
        el.style.transition = 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => {
          el.style.transition = '';
        }, 280);
      });
    });
  }
})();

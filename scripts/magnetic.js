// ============================================================================
// Tactile Motion: High-Performance Spotlight + Spring Magnetic Physics
// ============================================================================
(function () {
  'use strict';

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  // 1. High-Performance Evidence Card Spotlight & Micro-Tilt
  const cards = document.querySelectorAll('.evidence-card');
  if (cards.length && !prefersReduced) {
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

          card.style.setProperty('--x', `${x}px`);
          card.style.setProperty('--y', `${y}px`);

          // Gentle 3D micro-tilt (max ±1.5deg) on desktop fine pointers
          if (hasFinePointer) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const tiltX = ((y - centerY) / centerY) * -1.5;
            const tiltY = ((x - centerX) / centerX) * 1.5;
            card.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-2px)`;
          }
        });
      });

      card.addEventListener('pointerleave', () => {
        isHovered = false;
        if (rafId) cancelAnimationFrame(rafId);
        card.style.transform = '';
      });
    });
  }

  // 2. Spring Magnetic Micro-Pull for .magnetic Elements
  if (hasFinePointer && !prefersReduced) {
    const magneticTargets = document.querySelectorAll('.magnetic, .ai-mini-send');
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

          // Subtle spring pull: damped to max 4px
          const maxPull = 4;
          const pullX = Math.max(-maxPull, Math.min(maxPull, deltaX * 0.25));
          const pullY = Math.max(-maxPull, Math.min(maxPull, deltaY * 0.25));

          el.style.transform = `translate3d(${pullX.toFixed(1)}px, ${pullY.toFixed(1)}px, 0)`;
        });
      });

      el.addEventListener('pointerleave', () => {
        if (rafId) cancelAnimationFrame(rafId);
        el.style.transform = '';
        el.style.transition = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => {
          el.style.transition = '';
        }, 300);
      });
    });
  }
})();

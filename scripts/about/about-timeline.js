// Timeline Rail: Fluid Thread
// SPEC: about-interactive-enhancements.md

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const firstList = document.querySelector('.timeline-list');
  if (firstList) {
    const dir = getComputedStyle(firstList).flexDirection;
    if (dir === 'row' || dir === 'row-reverse') return;
  }

  // ─── Minimal Perlin noise (no external dep) ───────────────────────────────────
  // Fix: all array accesses masked with & 255 to prevent out-of-bounds
  const perm = new Uint8Array(512);
  const p256 = [...Array(256)].map((_, i) => i).sort(() => Math.random() - 0.5);
  for (let i = 0; i < 512; i++) perm[i] = p256[i & 255];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(t, a, b) { return a + t * (b - a); }
  function grad(h, x, y) { return ((h & 1) ? x : -x) + ((h & 2) ? y : -y); }

  function noise(x, y) {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x),   yf = y - Math.floor(y);
    const u  = fade(xf), v = fade(yf);
    const a  = perm[xi]   + yi, b  = perm[xi + 1] + yi;
    return lerp(v,
      lerp(u, grad(perm[a],     xf,     yf    ), grad(perm[b],     xf - 1, yf    )),
      lerp(u, grad(perm[a + 1], xf,     yf - 1), grad(perm[b + 1], xf - 1, yf - 1))
    );
  }

  // ─── Inject CSS: hide the pseudo-element rail + dot pulse ────────────────────
  // We use a class rather than a CSS variable (the variable doesn't exist in styles.css)
  const style = document.createElement('style');
  style.textContent = `
    .timeline-list.has-canvas-rail::before {
      opacity: 0 !important;
      transition: opacity 0.4s ease;
    }

    @keyframes _dot-pulse {
      0%, 100% { box-shadow: 0 0 0 0px rgba(0, 51, 255, 0.45); }
      50%       { box-shadow: 0 0 0 5px rgba(0, 51, 255, 0); }
    }
    @keyframes _dot-pulse-current {
      0%, 100% { box-shadow: 0 0 0 0px rgba(0, 51, 255, 0.6); }
      50%       { box-shadow: 0 0 0 7px rgba(0, 51, 255, 0); }
    }

    .timeline-list.has-canvas-rail .timeline-item::before {
      animation: _dot-pulse 3s ease-in-out infinite;
    }
    .timeline-list.has-canvas-rail .timeline-item--current::before {
      animation: _dot-pulse-current 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);

  // ─── Per-list init ────────────────────────────────────────────────────────────
  function initTimelineRail(listEl) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const cvs = document.createElement('canvas');
    cvs.setAttribute('aria-hidden', 'true');
    cvs.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    listEl.style.position = 'relative';
    listEl.insertBefore(cvs, listEl.firstChild);

    // Get accent color once — re-read only when ResizeObserver fires (theme unlikely to change)
    let accentColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-cool').trim() || '#0033FF';

    // ── Cached layout values — recomputed on resize only ──────────────────────
    // dot center x = left:0 on ::before + translateX(dotSize/-2 + lineThickness/2)
    // With --dot-size:14px and --line-thickness:2px → translateX(-6px) → effective left = -6 + 0 = -6
    // But the list itself doesn't clip, so the dot center relative to the list padding edge
    // is actually 0 + dotSize/2 = 7px. We derive it from the real first item's ::before.
    // Since we can't query pseudo-elements, we read the first item's offsetLeft (always 0)
    // and use the known dot center = dotSize/2 = 7px from computed styles.
    let railX = 7, railTop = 0, railBottom = 0, cvsW = 0, cvsH = 0;

    function measure() {
      const items = listEl.querySelectorAll('.timeline-item');
      if (items.length < 1) return;

      const listRect  = listEl.getBoundingClientRect();
      const firstRect = items[0].getBoundingClientRect();
      const lastRect  = items[items.length - 1].getBoundingClientRect();

      // Derive dot-size from computed style; fall back to 14
      const dotSize = parseFloat(
        getComputedStyle(listEl).getPropertyValue('--dot-size')
      ) || 14;

      accentColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-cool').trim() || '#0033FF';

      railX      = dotSize / 2; // dot center x within the list
      railTop    = firstRect.top  - listRect.top  + dotSize / 2;
      railBottom = lastRect.top   - listRect.top  + dotSize / 2;

      cvsW = listRect.width;
      cvsH = listRect.height;
      cvs.width  = Math.round(cvsW * dpr);
      cvs.height = Math.round(cvsH * dpr);
    }

    measure();
    listEl.classList.add('has-canvas-rail');

    // ── ResizeObserver replaces per-frame getBoundingClientRect ───────────────
    const ro = new ResizeObserver(measure);
    ro.observe(listEl);

    // ── Visibility pause ──────────────────────────────────────────────────────
    let visible = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 })
      .observe(listEl);

    // ── Render loop ───────────────────────────────────────────────────────────
    let t = 0;
    const ctx = cvs.getContext('2d');

    function loop() {
      requestAnimationFrame(loop);
      if (!visible || cvsH === 0) return;

      t += 0.005;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cvsW, cvsH);

      const amp  = 3.5;
      const h    = railBottom - railTop;
      const cp1y = railTop + h * 0.33;
      const cp2y = railTop + h * 0.66;
      const cp1x = railX + noise(t * 0.4,       0) * amp;
      const cp2x = railX + noise(t * 0.4 + 100, 0) * amp;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(railX, railTop);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, railX, railBottom);
      ctx.strokeStyle  = accentColor;
      ctx.lineWidth    = 2;
      ctx.globalAlpha  = 0.6;
      ctx.lineCap      = 'round';
      ctx.stroke();
      ctx.restore();
    }
    loop();
  }

  document.querySelectorAll('.timeline-list').forEach(initTimelineRail);

})();

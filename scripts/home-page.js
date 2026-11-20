/**
 * Ryan Schmidt Portfolio: Homepage "Desk Scene" Controller
 * Manages the above-the-fold desk scene, multi-mode live monitor workspace,
 * head-tracking delegation, search bar interaction, parallax, and lazy 3D runtime loading.
 */

(function () {
  'use strict';

  const SESSION_INTRO_KEY = 'rs_desk_intro_seen_v1';

  const deskSceneEl = document.getElementById('desk-scene');
  const connectorsSvgEl = document.getElementById('desk-connectors-svg');
  const monitorScreenEl = document.getElementById('desk-monitor-screen');
  const monitorUiCanvasEl = document.querySelector('.desk-monitor__ui-canvas');
  const codeTabs = Array.from(document.querySelectorAll('.desk-code-tab'));
  const codeLines = Array.from(document.querySelectorAll('.desk-code-line'));
  const workGridEl = document.querySelector('.home-work-grid');
  const cards = Array.from(document.querySelectorAll('.home-project-card'));
  const omnibarInput = document.getElementById('home-omnibar-input');
  const omnibarForm = document.getElementById('home-omnibar-form');
  const poseFallbackEl = document.getElementById('desk-pose-fallback');
  const poseHeads = Array.from(document.querySelectorAll('.desk-pose-fallback__head'));

  const motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  const finePointerQuery = window.matchMedia
    ? window.matchMedia('(pointer: fine)')
    : { matches: false };

  let prefersReducedMotion = Boolean(motionQuery.matches);
  let isTabHidden = Boolean(document.hidden);
  let isHeroOutOfView = false;
  let scene3DController = null;
  let activeCardIndex = null;
  let headTurnDelayTimeout = null;
  let headResetTimeout = null;

  // Distinct abstract workspace configurations for the 4 projects / 4 idle modes (zero text)
  const WORKSPACE_MODES = [
    {
      codeProfile: [
        { w: 64, w2: 22, indent: 0, c: 'var(--code-accent)', c2: 'var(--code-sand)' },
        { w: 78, w2: 16, indent: 1, c: 'var(--code-sand)', c2: 'var(--code-sage)' },
        { w: 52, w2: 28, indent: 2, c: 'var(--code-sage)', c2: 'var(--code-accent)' },
        { w: 86, w2: 12, indent: 2, c: 'var(--code-sand)', c2: 'var(--code-muted)' },
        { w: 60, w2: 24, indent: 1, c: 'var(--code-accent)', c2: 'var(--code-sand)' },
        { w: 42, w2: 18, indent: 0, c: 'var(--code-muted)', c2: 'var(--code-sage)' },
        { w: 74, w2: 20, indent: 1, c: 'var(--code-sage)', c2: 'var(--code-sand)' },
        { w: 82, w2: 14, indent: 2, c: 'var(--code-sand)', c2: 'var(--code-accent)' }
      ]
    },
    {
      codeProfile: [
        { w: 48, w2: 32, indent: 0, c: 'var(--code-accent)', c2: 'var(--code-sage)' },
        { w: 84, w2: 14, indent: 1, c: 'var(--code-sage)', c2: 'var(--code-sand)' },
        { w: 68, w2: 22, indent: 2, c: 'var(--code-sand)', c2: 'var(--code-accent)' },
        { w: 54, w2: 30, indent: 3, c: 'var(--code-accent)', c2: 'var(--code-sand)' },
        { w: 76, w2: 18, indent: 2, c: 'var(--code-sand)', c2: 'var(--code-sage)' },
        { w: 62, w2: 24, indent: 1, c: 'var(--code-sage)', c2: 'var(--code-muted)' },
        { w: 40, w2: 28, indent: 0, c: 'var(--code-muted)', c2: 'var(--code-accent)' },
        { w: 72, w2: 20, indent: 1, c: 'var(--code-accent)', c2: 'var(--code-sand)' }
      ]
    },
    {
      codeProfile: [
        { w: 72, w2: 18, indent: 0, c: 'var(--code-sage)', c2: 'var(--code-sand)' },
        { w: 56, w2: 26, indent: 1, c: 'var(--code-sand)', c2: 'var(--code-accent)' },
        { w: 82, w2: 14, indent: 1, c: 'var(--code-accent)', c2: 'var(--code-sage)' },
        { w: 64, w2: 24, indent: 2, c: 'var(--code-sage)', c2: 'var(--code-sand)' },
        { w: 88, w2: 10, indent: 2, c: 'var(--code-sand)', c2: 'var(--code-muted)' },
        { w: 50, w2: 28, indent: 1, c: 'var(--code-muted)', c2: 'var(--code-sage)' },
        { w: 66, w2: 22, indent: 0, c: 'var(--code-sage)', c2: 'var(--code-accent)' },
        { w: 76, w2: 16, indent: 1, c: 'var(--code-sand)', c2: 'var(--code-sage)' }
      ]
    },
    {
      codeProfile: [
        { w: 44, w2: 34, indent: 0, c: 'var(--code-accent)', c2: 'var(--code-sand)' },
        { w: 62, w2: 26, indent: 1, c: 'var(--code-sand)', c2: 'var(--code-accent)' },
        { w: 58, w2: 28, indent: 1, c: 'var(--code-sage)', c2: 'var(--code-sand)' },
        { w: 66, w2: 24, indent: 1, c: 'var(--code-sand)', c2: 'var(--code-sage)' },
        { w: 52, w2: 30, indent: 1, c: 'var(--code-accent)', c2: 'var(--code-sand)' },
        { w: 36, w2: 18, indent: 0, c: 'var(--code-muted)', c2: 'var(--code-muted)' },
        { w: 70, w2: 22, indent: 1, c: 'var(--code-sage)', c2: 'var(--code-accent)' },
        { w: 60, w2: 26, indent: 1, c: 'var(--code-sand)', c2: 'var(--code-sage)' }
      ]
    }
  ];

  function isScenePaused() {
    return isTabHidden || isHeroOutOfView || prefersReducedMotion;
  }

  // =========================================================================
  // 1. Card Origin Offsets & Hover-Only Terracotta SVG Connectors
  //    Left cards (0, 1) start on visible left half of monitor (0.14, 0.29);
  //    Right cards (2, 3) start on visible right half of monitor (0.80, 0.87).
  //    Card 3 routes cleanly upward above the lamp before curving right.
  // =========================================================================
  const MONITOR_ANCHOR_PCTS = [0.14, 0.29, 0.80, 0.87];
  let connectorItems = [];

  function ensureConnectors() {
    if (!connectorsSvgEl || connectorItems.length === cards.length) return;
    connectorsSvgEl.innerHTML = '';
    connectorItems = cards.map((_, idx) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('class', 'desk-connector__line');
      line.setAttribute('data-card', String(idx));
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'desk-connector__dot');
      dot.setAttribute('data-card', String(idx));
      dot.setAttribute('r', '2.5');
      connectorsSvgEl.appendChild(line);
      connectorsSvgEl.appendChild(dot);
      return { line, dot };
    });
  }

  function syncConnectorHighlight() {
    connectorItems.forEach(({ line, dot }, idx) => {
      const active = activeCardIndex === idx;
      line.classList.toggle('is-active', active);
      dot.classList.toggle('is-active', active);
    });
  }

  function updateCardOrigins() {
    if (!monitorScreenEl || !cards.length) return;
    const vw = window.innerWidth;
    if (vw < 1024) return;

    ensureConnectors();

    // Prevent wrapped card tag lines from ever starting with a leading middot separator
    document.querySelectorAll('.home-project-card__tags').forEach((list) => {
      const items = Array.from(list.querySelectorAll('li'));
      items.forEach((li) => li.classList.remove('is-wrapped'));
      items.forEach((li, i) => {
        if (i === 0) return;
        const prevRect = items[i - 1].getBoundingClientRect();
        const currRect = li.getBoundingClientRect();
        if (currRect.top > prevRect.top + 2) {
          li.classList.add('is-wrapped');
        }
      });
    });

    const monRect = monitorScreenEl.getBoundingClientRect();
    const monViewportCenterX = monRect.left + monRect.width * 0.5;
    const monViewportCenterY = monRect.top + monRect.height * 0.5;
    const gridRect = workGridEl ? workGridEl.getBoundingClientRect() : null;
    const svgRect = connectorsSvgEl ? connectorsSvgEl.getBoundingClientRect() : null;

    if (connectorsSvgEl && svgRect && svgRect.width > 0 && svgRect.height > 0) {
      connectorsSvgEl.setAttribute('viewBox', `0 0 ${svgRect.width.toFixed(1)} ${svgRect.height.toFixed(1)}`);
    }

    const anyCardActive = activeCardIndex !== null || cards.some((c) => c.matches(':hover') || c.matches(':focus-within'));
    if (gridRect && workGridEl && !anyCardActive) {
      workGridEl.style.removeProperty('--work-grid-rest-h');
      const maxRestH = Math.max(
        ...cards.map((c) => c.offsetHeight || 120)
      );
      if (maxRestH > 0) {
        workGridEl.style.setProperty('--work-grid-rest-h', `${maxRestH}px`);
      }
    }

    const updatedGridRect = workGridEl ? workGridEl.getBoundingClientRect() : gridRect;
    const monRectUpdated = monitorScreenEl.getBoundingClientRect();

    cards.forEach((card, idx) => {
      let restCenterX;
      let restCenterY;
      let restBottomY;

      if (updatedGridRect && card.offsetWidth > 0) {
        const comp = window.getComputedStyle(card);
        const arcY = parseFloat(comp.getPropertyValue('--card-arc-y')) || 0;
        const summaryEl = card.querySelector('.home-project-card__summary');
        let summaryExtraH = 0;
        if (card.matches(':hover') || card.matches(':focus-within')) {
          if (summaryEl && summaryEl.offsetHeight > 0) {
            const sumComp = window.getComputedStyle(summaryEl);
            summaryExtraH = summaryEl.offsetHeight + (parseFloat(sumComp.marginTop) || 0);
          }
        }
        const restW = card.offsetWidth;
        const restH = Math.max(120, card.offsetHeight - summaryExtraH);
        const restLeft = updatedGridRect.left + card.offsetLeft;
        const alignedBottom = updatedGridRect.top + updatedGridRect.height + arcY;
        const restTop = alignedBottom - restH;

        restCenterX = restLeft + restW * 0.5;
        restCenterY = restTop + restH * 0.5;
        // Connect cleanly to the pinned bottom-center border edge (hovered card grows upward, bottom stays aligned)
        restBottomY = alignedBottom - 1;
      } else {
        const rect = card.getBoundingClientRect();
        restCenterX = rect.left + rect.width * 0.5;
        restCenterY = rect.top + rect.height * 0.5;
        restBottomY = rect.bottom - 4;
      }

      const dx = Math.round(monViewportCenterX - restCenterX);
      const dy = Math.round(monViewportCenterY - restCenterY);
      card.style.setProperty('--from-mon-x', `${dx}px`);
      card.style.setProperty('--from-mon-y', `${dy}px`);

      // Compute single smooth upward curve from visible monitor screen point to card bottom-center
      // For outer right Card 3 (idx === 3), rise steeply first to stay completely clear of the lamp shade
      const item = connectorItems[idx];
      if (item && svgRect && monRectUpdated.width > 0) {
        const anchorPct = MONITOR_ANCHOR_PCTS[idx] ?? 0.5;
        const startX = monRectUpdated.left + monRectUpdated.width * anchorPct - svgRect.left;
        const startY = monRectUpdated.top + monRectUpdated.height * 0.24 - svgRect.top;
        const endX = restCenterX - svgRect.left;
        const endY = restBottomY - svgRect.top;
        const vSpan = Math.max(40, startY - endY);
        const hSpan = endX - startX;

        const cp1X = idx === 3 ? startX + 8 : startX + hSpan * 0.24;
        const cp1Y = idx === 3 ? startY - vSpan * 0.78 : startY - vSpan * 0.56;
        const cp2X = idx === 3 ? endX - hSpan * 0.30 : endX - hSpan * 0.12;
        const cp2Y = idx === 3 ? endY + vSpan * 0.26 : endY + vSpan * 0.42;

        item.line.setAttribute(
          'd',
          `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`
        );
        item.dot.setAttribute('cx', startX.toFixed(1));
        item.dot.setAttribute('cy', startY.toFixed(1));

        const pathLen = Math.ceil(item.line.getTotalLength() || 360);
        item.line.style.setProperty('--path-len', `${pathLen}px`);
      }
    });
  }

  // =========================================================================
  // 2. Once-Per-Session Load Sequence (<= 1.5s total)
  // =========================================================================
  function runSessionLoadSequence() {
    updateCardOrigins();
    if (prefersReducedMotion) return;

    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SESSION_INTRO_KEY) === '1';
      if (!alreadySeen) {
        sessionStorage.setItem(SESSION_INTRO_KEY, '1');
      }
    } catch (_) {}

    if (alreadySeen) return;

    document.body.classList.add('is-desk-intro');
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.body.classList.remove('is-desk-intro');
        updateCardOrigins();
      }, 1360);
    });
  }

  // =========================================================================
  // 3. Fallback 5-Pose Crossfade Mode (if rigged 3D is disabled or WebGL fails)
  // =========================================================================
  function activatePoseFallback() {
    if (deskSceneEl) deskSceneEl.classList.add('is-fallback');
    if (!poseFallbackEl) return;
    poseFallbackEl.hidden = false;
    poseFallbackEl.querySelectorAll('img[data-src]').forEach((img) => {
      const src = img.getAttribute('data-src');
      if (src && img.getAttribute('src') !== src) {
        img.setAttribute('src', src);
      }
    });
  }

  function setFallbackPose(poseKey) {
    if (!poseHeads.length) return;
    const key = String(poseKey);
    poseHeads.forEach((img) => {
      img.classList.toggle('is-active', img.getAttribute('data-pose') === key);
    });
  }

  // =========================================================================
  // 4. Monitor Workspace Renderer (Shared by Idle Loop & Card Hover/Focus)
  // =========================================================================
  function applyMonitorWorkspace(modeIndex, isCardActive) {
    const idx = ((modeIndex % 4) + 4) % 4;
    const cfg = WORKSPACE_MODES[idx];

    if (monitorScreenEl) {
      monitorScreenEl.setAttribute('data-layout', String(idx));
      if (isCardActive) {
        monitorScreenEl.setAttribute('data-active-card', String(idx));
      } else {
        monitorScreenEl.removeAttribute('data-active-card');
      }
    }

    if (monitorUiCanvasEl) {
      monitorUiCanvasEl.setAttribute('data-layout', String(idx));
    }

    // Switch active file tab bar in the code pane (abstract color only)
    codeTabs.forEach((tab, i) => {
      tab.classList.toggle('is-active', i === idx);
    });

    // Update syntax line structure in the code pane
    codeLines.forEach((line, i) => {
      const token = cfg.codeProfile[i % cfg.codeProfile.length];
      line.style.setProperty('--w', `${token.w}%`);
      line.style.setProperty('--w2', `${token.w2}%`);
      line.style.setProperty('--indent', String(token.indent));
      line.style.setProperty('--c', token.c);
      line.style.setProperty('--c2', token.c2);
    });
  }

  // =========================================================================
  // 5. Card Hover & Keyboard Focus -> Monitor & Head Tracking
  //    Head turn begins 70ms (60-80ms window) after hover starts,
  //    switches directly when moving between cards, and returns to rest
  //    only after 400ms with no card hovered.
  // =========================================================================
  function activateCard(index) {
    const switchingCards = headResetTimeout !== null;
    if (headResetTimeout) {
      clearTimeout(headResetTimeout);
      headResetTimeout = null;
    }
    if (headTurnDelayTimeout) {
      clearTimeout(headTurnDelayTimeout);
      headTurnDelayTimeout = null;
    }
    activeCardIndex = index;

    syncConnectorHighlight();
    applyMonitorWorkspace(index, true);

    // Zero lag when sweeping smoothly from card to card; minimal 25ms settle from rest
    const delayMs = prefersReducedMotion || switchingCards ? 0 : 25;
    if (delayMs === 0) {
      if (scene3DController) {
        scene3DController.setCardTarget(index);
      }
      setFallbackPose(index);
      return;
    }
    headTurnDelayTimeout = setTimeout(() => {
      headTurnDelayTimeout = null;
      if (activeCardIndex !== index) return;
      if (scene3DController) {
        scene3DController.setCardTarget(index);
      }
      setFallbackPose(index);
    }, delayMs);
  }

  function deactivateCard() {
    if (headTurnDelayTimeout) {
      clearTimeout(headTurnDelayTimeout);
      headTurnDelayTimeout = null;
    }
    activeCardIndex = null;

    syncConnectorHighlight();
    if (monitorScreenEl) {
      monitorScreenEl.removeAttribute('data-active-card');
    }
    applyMonitorWorkspace(uiStep % 4, false);

    // Return to rest only after 220ms with no card hovered
    if (headResetTimeout) clearTimeout(headResetTimeout);
    headResetTimeout = setTimeout(() => {
      headResetTimeout = null;
      if (activeCardIndex === null) {
        if (scene3DController) {
          scene3DController.setCardTarget('rest');
        }
        setFallbackPose('rest');
      }
    }, 220);
  }

  cards.forEach((card, idx) => {
    card.addEventListener('pointerenter', () => activateCard(idx));
    card.addEventListener('pointerleave', () => deactivateCard());
    card.addEventListener('focusin', () => activateCard(idx));
    card.addEventListener('focusout', (e) => {
      if (!card.contains(e.relatedTarget)) {
        deactivateCard();
      }
    });
  });

  // =========================================================================
  // 6. Monitor Idle Loop (Cycles 4 Distinct Workspaces Every 2.4s)
  // =========================================================================
  let uiStep = 0;
  let monitorIntervalId = null;

  function stepMonitorWorkLoop() {
    if (isScenePaused() || activeCardIndex !== null) return;
    uiStep = (uiStep + 1) % 4;
    applyMonitorWorkspace(uiStep, false);
  }

  function startMonitorLoop() {
    if (monitorIntervalId) clearInterval(monitorIntervalId);
    if (!isScenePaused()) {
      monitorIntervalId = setInterval(stepMonitorWorkLoop, 2400);
    }
  }

  // =========================================================================
  // 7. Search Bar Focus Interaction (Monitor Thinking Pulse)
  // =========================================================================
  function handleOmnibarFocus(focused) {
    document.body.classList.toggle('is-omnibar-focused', focused);
    if (focused) {
      if (headResetTimeout) {
        clearTimeout(headResetTimeout);
        headResetTimeout = null;
      }
      if (headTurnDelayTimeout) {
        clearTimeout(headTurnDelayTimeout);
        headTurnDelayTimeout = null;
      }
      activeCardIndex = null;
      syncConnectorHighlight();
      if (monitorScreenEl) {
        monitorScreenEl.removeAttribute('data-active-card');
      }
      if (scene3DController && typeof scene3DController.setAmbientGaze === 'function') {
        scene3DController.setAmbientGaze(0);
      }
      if (scene3DController && typeof scene3DController.setCardTarget === 'function') {
        scene3DController.setCardTarget('rest');
      }
      setFallbackPose('rest');
    }
  }

  if (omnibarForm) {
    omnibarForm.addEventListener('pointerenter', () => {
      if (activeCardIndex === null) {
        if (headResetTimeout) {
          clearTimeout(headResetTimeout);
          headResetTimeout = null;
        }
        if (scene3DController && typeof scene3DController.setAmbientGaze === 'function') {
          scene3DController.setAmbientGaze(0);
        }
        if (scene3DController && typeof scene3DController.setCardTarget === 'function') {
          scene3DController.setCardTarget('rest');
        }
        setFallbackPose('rest');
      }
    });
    omnibarForm.addEventListener('focusin', () => handleOmnibarFocus(true));
    omnibarForm.addEventListener('focusout', (e) => {
      if (!omnibarForm.contains(e.relatedTarget)) {
        handleOmnibarFocus(false);
      }
    });
  } else if (omnibarInput) {
    omnibarInput.addEventListener('focus', () => handleOmnibarFocus(true));
    omnibarInput.addEventListener('blur', () => handleOmnibarFocus(false));
  }

  // =========================================================================
  // 8. Subtle Horizontal Mouse-Move Parallax on Cards
  // =========================================================================
  let targetMouseX = 0;
  let currentMouseX = 0;
  let parallaxRafId = null;

  function updateParallaxFrame() {
    if (isScenePaused() || window.innerWidth < 1024 || !finePointerQuery.matches) {
      parallaxRafId = null;
      return;
    }

    currentMouseX += (targetMouseX - currentMouseX) * 0.08;
    const cardPx = (currentMouseX * 2.5).toFixed(2);

    cards.forEach((card) => {
      card.style.setProperty('--card-px', `${cardPx}px`);
    });

    if (Math.abs(targetMouseX - currentMouseX) > 0.002) {
      parallaxRafId = requestAnimationFrame(updateParallaxFrame);
    } else {
      parallaxRafId = null;
    }
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      if (isScenePaused() || window.innerWidth < 1024 || !finePointerQuery.matches) return;
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      if (activeCardIndex === null && scene3DController && typeof scene3DController.setAmbientGaze === 'function') {
        scene3DController.setAmbientGaze(targetMouseX);
      }
      if (!parallaxRafId) {
        parallaxRafId = requestAnimationFrame(updateParallaxFrame);
      }
    },
    { passive: true }
  );

  document.addEventListener('pointerleave', () => {
    if (scene3DController && typeof scene3DController.setAmbientGaze === 'function') {
      scene3DController.setAmbientGaze(0);
    }
  });

  // =========================================================================
  // 9. Reduced Motion, Tab Visibility & Viewport Pause Management
  // =========================================================================
  function syncPauseState() {
    const paused = isScenePaused();
    document.body.classList.toggle('is-scene-paused', paused);

    if (paused) {
      if (monitorIntervalId) {
        clearInterval(monitorIntervalId);
        monitorIntervalId = null;
      }
      if (parallaxRafId) {
        cancelAnimationFrame(parallaxRafId);
        parallaxRafId = null;
      }
    } else {
      startMonitorLoop();
    }

    if (scene3DController) {
      scene3DController.setPaused(isTabHidden || isHeroOutOfView);
      scene3DController.setReducedMotion(prefersReducedMotion);
    }

    if (prefersReducedMotion) {
      cards.forEach((card) => {
        card.style.setProperty('--card-px', '0px');
      });
    }
  }

  document.addEventListener('visibilitychange', () => {
    isTabHidden = Boolean(document.hidden);
    syncPauseState();
  });

  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', (e) => {
      prefersReducedMotion = Boolean(e.matches);
      syncPauseState();
    });
  }

  const mainEl = document.getElementById('main');
  if ('IntersectionObserver' in window && mainEl) {
    const heroObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isHeroOutOfView = !entry.isIntersecting && entry.intersectionRatio <= 0;
          syncPauseState();
        });
      },
      { threshold: [0, 0.05] }
    );
    heroObserver.observe(mainEl);
  }

  // =========================================================================
  // 10. Header Active Nav & Resize Listeners
  // =========================================================================
  function updateActiveNav() {
    const headerNavLinks = document.querySelectorAll('.site-header__link');
    headerNavLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === '#work' || href === '#top') {
        link.classList.add('is-current');
        link.setAttribute('aria-current', 'page');
      } else if (href && href.startsWith('#')) {
        link.classList.remove('is-current');
        link.removeAttribute('aria-current');
      }
    });
  }

  window.addEventListener('hashchange', updateActiveNav);
  window.addEventListener('resize', () => {
    requestAnimationFrame(updateCardOrigins);
  });

  // =========================================================================
  // 11. Lazy-Load 3D Runtime After Text and Cards Render
  // =========================================================================
  function lazyLoad3DScene() {
    if (!deskSceneEl) return;
    const mode = deskSceneEl.getAttribute('data-scene-mode') || 'three';
    if (mode === 'poses') {
      activatePoseFallback();
      return;
    }

    import('./desk-scene.js?v=156')
      .then((mod) => {
        if (mod && typeof mod.initDeskScene3D === 'function') {
          scene3DController = mod.initDeskScene3D({
            onMonitorSync: updateCardOrigins,
            onFallback: activatePoseFallback
          });
          syncPauseState();
          if (scene3DController && activeCardIndex !== null) {
            scene3DController.setCardTarget(activeCardIndex);
          }
          const resyncSceneAndCards = () => {
            updateCardOrigins();
            if (scene3DController && typeof scene3DController.syncOverlaysAndResize === 'function') {
              scene3DController.syncOverlaysAndResize();
            }
          };
          if (document.fonts) {
            if (document.fonts.ready) {
              document.fonts.ready.then(resyncSceneAndCards);
            }
            if (typeof document.fonts.addEventListener === 'function') {
              document.fonts.addEventListener('loadingdone', resyncSceneAndCards);
            }
          }
          if (document.readyState !== 'complete') {
            window.addEventListener('load', resyncSceneAndCards, { once: true });
          } else {
            requestAnimationFrame(resyncSceneAndCards);
          }
          if (typeof ResizeObserver === 'function' && workGridEl) {
            let tagResyncRaf = null;
            const ro = new ResizeObserver(() => {
              if (activeCardIndex !== null) return;
              if (tagResyncRaf) return;
              tagResyncRaf = requestAnimationFrame(() => {
                tagResyncRaf = null;
                if (activeCardIndex === null) {
                  resyncSceneAndCards();
                }
              });
            });
            document.querySelectorAll('.home-project-card__tags').forEach((t) => ro.observe(t));
          }
        }
      })
      .catch(() => {
        activatePoseFallback();
      });
  }

  // Initialize immediately for HTML layout and start desk scene in parallel (preloaded in <head>)
  runSessionLoadSequence();
  updateActiveNav();
  syncPauseState();
  lazyLoad3DScene();
})();

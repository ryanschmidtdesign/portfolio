// ============================================================================
// Native Fast Scrolling & Hash Link Handling (Zero Scroll Hijacking)
// ============================================================================
(function () {
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (href === "#") return;

    let target = null;
    try {
      target = document.querySelector(href);
    } catch (_) {
      try {
        const id = href.replace(/^#/, '');
        target = document.getElementById(id);
      } catch (_) {}
    }

    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
})();

// ============================================================================
// Parallax functionality
// ============================================================================
(function () {
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")].filter((el) => {
    // Avoid shifting large layout containers; keep parallax to small elements only.
    return !["SECTION", "ARTICLE", "MAIN"].includes(el.tagName);
  });

  if (parallaxEls.length === 0) return;

  function onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const maxOffset = 16; // px clamp to prevent overlap/jank on long pages
    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.05;
      const rawOffset = scrollTop * speed * -1;
      const offset = Math.max(-maxOffset, Math.min(maxOffset, rawOffset));
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

// ============================================================================
// Section reveal functionality
// ============================================================================
(function () {
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const revealSelector = '[data-reveal]';
  const els = document.querySelectorAll(revealSelector);
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const intersecting = entries.filter((entry) => entry.isIntersecting || entry.intersectionRatio > 0);
      intersecting.forEach((entry, idx) => {
        const el = entry.target;
        el.style.transitionDelay = `${Math.min(idx * 40, 120)}ms`;
        el.classList.add('is-revealed');
        observer.unobserve(el);
        setTimeout(() => {
          el.style.transitionDelay = '';
        }, 500);
      });
    },
    { threshold: [0, 0.15], rootMargin: '0px 0px -20px 0px' }
  );

  const observeElement = (el) => {
    if (el.classList.contains('is-revealed')) return;
    observer.observe(el);
  };

  const observeAll = (scope = document) => {
    scope.querySelectorAll(revealSelector).forEach(observeElement);
  };

  observeAll();

  // Safety fallback: ensure nothing stays permanently hidden if observer stalls on tall elements
  setTimeout(() => {
    document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach((el) => {
      el.classList.add('is-revealed');
    });
  }, 1200);

  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches(revealSelector)) {
          observeElement(node);
        }
        node.querySelectorAll?.(revealSelector).forEach(observeElement);
      });
    });
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();

// ============================================================================
// Metric count-up animation using IntersectionObserver
// ============================================================================
(function () {
  const metrics = document.querySelectorAll(".metric[data-animate]");
  if (!metrics.length) return;

  function parseMetric(text) {
    const match = text.replace(/,/g, "").match(/(-?\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  function formatMetric(original, value) {
    const trimmed = original.trim();
    const match = trimmed.match(/^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/);
    if (!match) return original;
    const prefix = match[1];
    const numPart = match[2];
    const suffix = match[3];

    let v = value.toFixed(numPart.includes(".") ? 1 : 0);
    if (!numPart.includes(".")) {
      v = v.replace(/\.0$/, "");
    }

    return prefix + v + suffix;
  }

  function animateMetric(el) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add("metric--animated");
      return;
    }
    const targetNode = el.querySelector('.metric-highlight') || el;
    const original = targetNode.textContent.trim();
    const target = parseMetric(original);
    if (target === null) {
      el.classList.add("metric--animated");
      return;
    }

    const duration = 700;
    const start = performance.now();

    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const current = target * eased;
      targetNode.textContent = formatMetric(original, current);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.classList.add("metric--animated");
      }
    }

    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          observer.unobserve(el);
          animateMetric(el);
        }
      });
    },
    { threshold: 0.4 }
  );

  metrics.forEach((el) => observer.observe(el));
})();


// Native standard browser navigation (zero interception, zero scroll-lock)

// (Feature 2 removed - Image Lightbox was removed)
// (Feature 3 removed - Read Time Estimator Badge was removed)
// (Feature 8 removed - "Ask About This Section" chips no longer used)

// ============================================================================
// Feature 9: Subtle Grain / Noise Overlay (Phase 2)
// ============================================================================
// (Feature 11 removed - Progressive clip-path image wipe caused slow-loading appearance)

// (Feature removed - Sticky Section Navigation Rail was removed)

// ============================================================================
// Shared interactive modules
// ============================================================================
(function () {
  const progressWrappers = [...document.querySelectorAll("[data-progress-story]")];
  if (progressWrappers.length) {
    const wrappers = progressWrappers.map((wrapper) => {
      const steps = [...wrapper.querySelectorAll("[data-story-step]")];
      if (!steps.length) return null;
      const indicator = document.createElement("div");
      indicator.className = "progress-story-indicator";
      wrapper.appendChild(indicator);
      return { wrapper, steps, indicator };
    }).filter(Boolean);

    function refreshProgress() {
      wrappers.forEach(({ wrapper, steps, indicator }) => {
        const activeIndex = steps.reduce((active, step, index) => {
          const rect = step.getBoundingClientRect();
          return rect.top < window.innerHeight * 0.75 ? index : active;
        }, 0);
        const pct = steps.length > 1 ? (activeIndex / (steps.length - 1)) * 100 : 100;
        indicator.style.width = `${pct}%`;
        steps.forEach((step, index) => step.classList.toggle("is-active", index === activeIndex));
      });
    }

    window.addEventListener("scroll", () => requestAnimationFrame(refreshProgress), { passive: true });
    window.addEventListener("resize", () => requestAnimationFrame(refreshProgress));
    refreshProgress();
  }

  [...document.querySelectorAll("[data-compare]")].forEach((wrapper) => {
    const buttons = [...wrapper.querySelectorAll("[data-compare-button]")];
    const panels = [...wrapper.querySelectorAll("[data-compare-state]")];
    if (!panels.length) return;

    // Auto-generate buttons from panels when .compare-tabs is empty
    if (!buttons.length) {
      const tabs = wrapper.querySelector(".compare-tabs");
      if (tabs) {
        panels.forEach((panel) => {
          const state = panel.dataset.compareState;
          const heading = panel.querySelector("h3");
          const label = heading ? heading.textContent.trim() : state.charAt(0).toUpperCase() + state.slice(1);
          const btn = document.createElement("button");
          btn.setAttribute("data-compare-button", state);
          btn.setAttribute("aria-pressed", "false");
          btn.textContent = label;
          tabs.appendChild(btn);
        });
        // Re-collect buttons now that they exist
        buttons.push(...tabs.querySelectorAll("[data-compare-button]"));
      }
    }

    if (!buttons.length) return;

    const initial = wrapper.dataset.compareDefault || buttons[0].dataset.compareButton;
    const stateButtons = buttons;

    function updateState(state) {
      const current = state || initial;
      wrapper.dataset.compareActive = current;
      stateButtons.forEach((button) => {
        const pressed = button.dataset.compareButton === current;
        button.setAttribute("aria-pressed", pressed ? "true" : "false");
        if (button.getAttribute("role") === "tab") {
          button.setAttribute("aria-selected", pressed ? "true" : "false");
          button.tabIndex = pressed ? 0 : -1;
        }
      });
      panels.forEach((panel) => {
        const active = panel.dataset.compareState === current;
        panel.classList.toggle("is-active", active);
      });
    }

    function activateButton(index) {
      if (index < 0 || index >= buttons.length) return;
      updateState(buttons[index].dataset.compareButton);
      buttons[index].focus();
    }

    buttons.forEach((button, i) => {
      button.addEventListener("click", () => updateState(button.dataset.compareButton));
      button.addEventListener("keydown", (e) => {
        let newIndex = -1;
        if (e.key === "ArrowRight") {
          newIndex = i + 1 < buttons.length ? i + 1 : 0;
        } else if (e.key === "ArrowLeft") {
          newIndex = i - 1 >= 0 ? i - 1 : buttons.length - 1;
        }
        if (newIndex >= 0) {
          e.preventDefault();
          activateButton(newIndex);
        }
      });
    });
    updateState(initial);
  });

  // Resume download tracking
  window.trackResumeDownload = function() {
    let sessionToken = null;
    try {
      sessionToken = sessionStorage.getItem('rs_chat_session_token');
    } catch (_) {}
    fetch("/api/track-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageUrl: location.pathname,
        sessionToken
      }),
      keepalive: true
    }).catch(() => {});
  };

  document.addEventListener("click", (e) => {
    const originEl = (typeof e.composedPath === "function" ? e.composedPath()[0] : null) || e.target;
    const link = originEl && typeof originEl.closest === "function" ? originEl.closest('a[href*="resume"]') : null;
    if (link) {
      window.trackResumeDownload();
    }
  });

  // ==========================================================================
  // Interactive Decision Bridges (pages/dashboard.html)
  // ==========================================================================
  const bridgesContainer = document.querySelector('.decision-bridges');
  if (bridgesContainer) {
    const bridgeItems = bridgesContainer.querySelectorAll('.bridge-item[data-bridge]');
    bridgeItems.forEach((item) => {
      const bridgeKey = item.dataset.bridge;
      const highlight = (activate) => {
        bridgesContainer.classList.toggle('has-hover', activate);
        bridgeItems.forEach((other) => {
          other.classList.toggle('is-linked', activate && other.dataset.bridge === bridgeKey);
        });
      };
      item.addEventListener('mouseenter', () => highlight(true));
      item.addEventListener('mouseleave', () => highlight(false));
      item.addEventListener('focus', () => highlight(true));
      item.addEventListener('blur', () => highlight(false));
    });
  }

  // ==========================================================================
  // WAI-ARIA Tablist Keyboard Navigation & Roving Focus Helper
  // ==========================================================================
  function setupAriaTabs({ tablist, tabs, panels }) {
    if (!tablist || !tabs || !tabs.length) return;

    tablist.setAttribute('role', 'tablist');

    tabs.forEach((tab, index) => {
      const panel = panels ? (panels[index] || (panels.length === 1 ? panels[0] : null)) : null;

      tab.setAttribute('role', 'tab');
      if (panel && panel.id) {
        tab.setAttribute('aria-controls', panel.id);
      }
      if (panel && tab.id && panels.length > 1) {
        panel.setAttribute('aria-labelledby', tab.id);
      }
      if (panel) {
        panel.setAttribute('role', 'tabpanel');
        if (!panel.hasAttribute('tabindex')) {
          panel.setAttribute('tabindex', '0');
        }
      }

      tab.addEventListener('keydown', (e) => {
        let targetIndex = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          targetIndex = (index + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          targetIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (e.key === 'Home') {
          targetIndex = 0;
        } else if (e.key === 'End') {
          targetIndex = tabs.length - 1;
        }

        if (targetIndex !== null) {
          e.preventDefault();
          tabs[targetIndex].focus();
          tabs[targetIndex].click();
        }
      });
    });
  }

  // ==========================================================================
  // Inventory State Machine Stepper (pages/inventory.html)
  // ==========================================================================
  const inventoryStepper = document.querySelector('[data-inventory-stepper]');
  if (inventoryStepper) {
    const tablist = inventoryStepper.querySelector('.stepper-track');
    const nodes = Array.from(inventoryStepper.querySelectorAll('.stepper-node'));
    const simCard = inventoryStepper.querySelector('.stepper-sim-card');
    const statusBadge = document.getElementById('simStatusBadge');
    const locationEl = document.getElementById('simLocation');
    const availableEl = document.getElementById('simAvailableCount');
    const scheduleEl = document.getElementById('simSchedule');
    const ruleTextEl = document.getElementById('simRuleText');

    const stateData = {
      order: {
        badgeClass: 'badge--order',
        badgeText: '● Inbound: PO #4892',
        location: 'En Route (FedEx Freight · ETA Tomorrow)',
        available: '0 units (6 expected)',
        schedule: 'Visible on calendar for install staging',
        rule: '<strong>The Rule:</strong> Incoming POs display on project planning boards before physical arrival so PMs don\'t re-order hardware already on trucks.'
      },
      available: {
        badgeClass: 'badge--success',
        badgeText: '● Verified: Shelf A-12',
        location: 'Main Warehouse (Bay 1 · Shelf A-12)',
        available: '6 units in stock',
        schedule: 'Ready for immediate staging & checkout',
        rule: '<strong>The Rule:</strong> Checking items in against a PO updates central warehouse stock immediately in the database.'
      },
      allocated: {
        badgeClass: 'badge--warning',
        badgeText: '● Locked: Job #309',
        location: 'Staged: Warehouse Bay 2 (Apex Corporate HQ)',
        available: '2 units (4 locked for Job #309)',
        schedule: 'Locked against duplicate reservations by other PMs',
        rule: '<strong>The Rule:</strong> Staging equipment for an active project immediately deducts it from the available pool while preserving physical count.'
      },
      lowstock: {
        badgeClass: 'badge--alert',
        badgeText: '● Low Stock: Threshold Warning',
        location: 'Main Warehouse Shelf A-12 (1 unit left)',
        available: '1 unit (< 3 safety minimum)',
        schedule: 'Triggers purchasing alert while allocations stay active',
        rule: '<strong>The Rule:</strong> Low stock is a threshold warning that coexists with active allocations, alerting purchasing before field crews arrive empty-handed.'
      }
    };

    const activateStep = (node) => {
      const step = node.dataset.step;
      if (!stateData[step]) return;

      nodes.forEach((n) => {
        const active = n === node;
        n.classList.toggle('is-active', active);
        n.setAttribute('aria-selected', active ? 'true' : 'false');
        n.setAttribute('tabindex', active ? '0' : '-1');
      });

      const data = stateData[step];
      if (statusBadge) {
        statusBadge.className = 'sim-status-badge ' + data.badgeClass;
        statusBadge.textContent = data.badgeText;
      }
      if (locationEl) locationEl.textContent = data.location;
      if (availableEl) availableEl.textContent = data.available;
      if (scheduleEl) scheduleEl.textContent = data.schedule;
      if (ruleTextEl) ruleTextEl.innerHTML = data.rule;
    };

    nodes.forEach((node) => {
      node.addEventListener('click', () => activateStep(node));
    });

    setupAriaTabs({ tablist, tabs: nodes, panels: [simCard] });
  }

  // ==========================================================================
  // Dual-Track Receiving Switcher (pages/inventory.html)
  // ==========================================================================
  const dualTrackDemo = document.querySelector('[data-dual-track]');
  if (dualTrackDemo) {
    const tablist = dualTrackDemo.querySelector('.dual-track-tabs');
    const tabs = Array.from(dualTrackDemo.querySelectorAll('.dual-tab-btn'));
    const panels = Array.from(dualTrackDemo.querySelectorAll('.dual-panel'));

    const activateTrack = (tab) => {
      const track = tab.dataset.track;
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
        t.setAttribute('tabindex', active ? '0' : '-1');
      });
      panels.forEach((p) => {
        p.classList.toggle('is-active', p.dataset.panel === track);
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activateTrack(tab));
    });

    setupAriaTabs({ tablist, tabs, panels });
  }

  // ==========================================================================
  // IA Cascading Drilldown Explorer (pages/member-portal-overhaul.html)
  // ==========================================================================
  const iaExplorer = document.querySelector('[data-ia-explorer]');
  if (iaExplorer) {
    const tablist = iaExplorer.querySelector('.ia-breadcrumb-trail');
    const crumbs = Array.from(iaExplorer.querySelectorAll('.crumb-segment'));
    const compareWrapper = iaExplorer.querySelector('[data-compare]');
    const panels = Array.from(iaExplorer.querySelectorAll('.compare-panel'));

    const activateCrumb = (targetCrumb) => {
      const targetState = targetCrumb.dataset.crumb;
      crumbs.forEach((c) => {
        const active = c === targetCrumb;
        c.classList.toggle('is-active', active);
        c.setAttribute('aria-selected', active ? 'true' : 'false');
        c.setAttribute('tabindex', active ? '0' : '-1');
      });

      if (compareWrapper) {
        compareWrapper.dataset.compareActive = targetState;
      }
      panels.forEach((p) => {
        p.classList.toggle('is-active', p.dataset.compareState === targetState);
      });
    };

    crumbs.forEach((crumb) => {
      crumb.addEventListener('click', () => activateCrumb(crumb));
    });

    // Also allow clicking an ia-card inside an active panel to advance to the next crumb
    panels.forEach((panel, pIdx) => {
      const cards = panel.querySelectorAll('.ia-card');
      cards.forEach((card) => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          const nextCrumb = crumbs[pIdx + 1] || crumbs[0];
          activateCrumb(nextCrumb);
        });
      });
    });

    setupAriaTabs({ tablist, tabs: crumbs, panels });
    const initialCrumb = crumbs.find(c => c.classList.contains('is-active')) || crumbs[0];
    if (initialCrumb) {
      activateCrumb(initialCrumb);
    }
  }

  // ==========================================================================
  // Looping Video Accessibility Controls (prefers-reduced-motion & click-to-pause)
  // ==========================================================================
  const loopingVideos = document.querySelectorAll('.case-study-media video');
  if (loopingVideos.length) {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotion = (mq) => {
      if (mq.matches) {
        loopingVideos.forEach((v) => {
          v.pause();
          v.removeAttribute('autoplay');
        });
      }
    };
    handleMotion(motionQuery);
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', handleMotion);
    }

    loopingVideos.forEach((video) => {
      video.style.cursor = 'pointer';
      video.setAttribute('title', 'Click to play or pause video');
      video.setAttribute('tabindex', '0');
      video.setAttribute('aria-label', video.paused ? 'Video demonstration (paused): click to play' : 'Video demonstration (playing): click to pause');

      const togglePlay = () => {
        if (video.paused) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
          video.setAttribute('aria-label', 'Video demonstration (playing): click to pause');
        } else {
          video.pause();
          video.setAttribute('aria-label', 'Video demonstration (paused): click to play');
        }
      };

      video.addEventListener('click', togglePlay);
      video.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          togglePlay();
        }
      });
    });
  }
})();

// --- EASTER EGG: Console Message for Tech Recruiters / EMs ---
setTimeout(() => {
  console.log("%c👋 Ah, an Engineering Manager or DevTools snooper!", "font-size: 18px; font-weight: bold; color: #fff; background: #111; padding: 8px 12px; border-radius: 6px;");
  console.log("%cSince you're looking under the hood: I built this entire site custom without a CMS, using semantic HTML, vanilla CSS/JS, and AI tooling. I don't just design systems: I can help your team ship them. Let's talk: ryanschmidt1989@gmail.com", "font-size: 14px; color: #444; padding-top: 8px; line-height: 1.5;");
}, 1000);

// ============================================================================
// Interactive Case Study Microinteractions (Stepper, Spotlight)
// ============================================================================
(function () {
  // 1. Inventory Receiving Quantity Stepper (pages/inventory.html)
  const stepperBtns = document.querySelectorAll('.stepper-btn[data-step-delta]');
  const stepperVal = document.getElementById('simStepperVal');
  const stepperDone = document.getElementById('simStepperDone');
  if (stepperBtns.length && stepperVal) {
    let currentQty = 8;
    const maxQty = 8;
    stepperBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.getAttribute('data-step-delta'), 10) || 0;
        currentQty = Math.max(0, Math.min(maxQty, currentQty + delta));
        stepperVal.textContent = `${currentQty} / ${maxQty}`;
        stepperVal.classList.remove('is-pulsing');
        void stepperVal.offsetWidth;
        stepperVal.classList.add('is-pulsing');
        setTimeout(() => stepperVal.classList.remove('is-pulsing'), 220);

        if (stepperDone) {
          if (currentQty === maxQty) {
            stepperDone.textContent = '✓ All 8 Received';
            stepperDone.style.opacity = '1';
          } else if (currentQty === 0) {
            stepperDone.textContent = 'Pending Receipt (0/8)';
            stepperDone.style.opacity = '0.75';
          } else {
            stepperDone.textContent = `Partial Receipt (${currentQty}/${maxQty} logged)`;
            stepperDone.style.opacity = '0.9';
          }
        }
      });
    });
  }
})();

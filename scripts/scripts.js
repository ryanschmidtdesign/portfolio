// ============================================================================
// Smooth, elegant page scrolling (Lenis)
// ============================================================================
(function () {
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  // Dynamically load Lenis from CDN
  const lenisScript = document.createElement("script");
  lenisScript.src = "https://unpkg.com/lenis@1.1.18/dist/lenis.min.js";
  lenisScript.async = true;

  lenisScript.onload = () => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease-out
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      smoothTouch: false, // Keep native touch control on mobile devices
      touchMultiplier: 1.5,
      infinite: false,
    });

    // Custom animation frame loop
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Bind to window for global access
    window.lenis = lenis;

    // REMOVED: No longer needed - carousel now auto-scrolls and is not a manual scroll container

    // Handle hash links / scroll-to actions through Lenis
    document.addEventListener("click", (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (href === "#") return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();

        // Find scroll-margin-top or offset (navbar is 72px)
        const offset = -72; // scroll margin offset to account for sticky/floating headers
        lenis.scrollTo(target, { offset });
      }
    });
  };

  document.head.appendChild(lenisScript);
})();

// ============================================================================
// Floating hamburger + AI mini behaviors (shared across pages)
// ============================================================================
(function(){
  window.addEventListener('DOMContentLoaded', () => {
    try {
      // Safety: ensure Lenis (if loaded) is running so page scroll works
      try { if (window.lenis && typeof window.lenis.start === 'function') { window.lenis.start(); document.documentElement.classList.remove('lenis-stopped'); } } catch(e){}
      // Consolidated nav submenu toggle
      document.querySelectorAll('.menu-trigger').forEach(trigger => {
        const group = trigger.closest('.menu-item-group');
        if (!group) return;
        
        const toggleSubmenu = (open) => {
          const shouldOpen = open !== undefined ? open : !group.classList.contains('is-open');
          group.classList.toggle('is-open', shouldOpen);
          trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        };

        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleSubmenu();
        });

        trigger.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            toggleSubmenu(false);
          }
        });
      });

      // Close submenu on click outside or Escape
      document.addEventListener('click', (e) => {
        document.querySelectorAll('.menu-item-group.is-open').forEach(group => {
          if (!group.contains(e.target)) {
            group.classList.remove('is-open');
            const trigger = group.querySelector('.menu-trigger');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
          }
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.menu-item-group.is-open').forEach(group => {
            group.classList.remove('is-open');
            const trigger = group.querySelector('.menu-trigger');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
          });
        }
      });

      const aiSend = document.getElementById('ai-mini-send');
      const aiInput = document.getElementById('ai-mini-input');
      if (aiInput) {
        const handleSend = function() {
          const q = aiInput.value.trim();
          if (!q) return;
          const isCaseStudy = document.body.classList.contains('case-study');
          const pageTitle = document.title || 'Page';
          document.dispatchEvent(new CustomEvent('rs:ask-section', {
            detail: {
              prompt: q,
              sectionContext: { heading: isCaseStudy ? pageTitle : 'Mini AI' }
            }
          }));
          aiInput.value = '';
        };

        if (aiSend) {
          aiSend.addEventListener('click', handleSend);
        }

        aiInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (aiSend) aiSend.click();
            else handleSend();
          }
        });
      }
    } catch (e) { console.error('Floating nav init error', e); }
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

    if (scrollTop > 20) {
      document.body.classList.add("scrolled");
    } else {
      document.body.classList.remove("scrolled");
    }

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
  if (prefersReduced) return;

  const revealSelector = '[data-reveal]';
  const els = document.querySelectorAll(revealSelector);
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  // Stagger reveal timing for visual rhythm
  els.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i * 30, 90)}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  const observeElement = (el) => {
    if (el.classList.contains('is-revealed')) return;
    observer.observe(el);
  };

  const observeAll = (scope = document) => {
    scope.querySelectorAll(revealSelector).forEach(observeElement);
  };

  observeAll();

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

    const prefixPlus = trimmed.startsWith("+");
    const suffixPlus = trimmed.endsWith("+");
    const hasPercent = trimmed.includes("%");

    let v = value.toFixed(trimmed.includes(".") ? 1 : 0);
    if (!trimmed.includes(".")) {
      v = v.replace(/\.0$/, "");
    }

    // Keep + where it originally was (prefix vs suffix)
    return (prefixPlus ? "+" : "") + v + (hasPercent ? "%" : "") + (suffixPlus ? "+" : "");
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

// ============================================================================
// Upgraded Circular Scroll Progress Indicator
// ============================================================================
(function () {
  const path = window.location.pathname;
  if (path.endsWith('/about.html') || path.endsWith('/about')) return;
  if (document.body.scrollHeight <= window.innerHeight * 1.5) return;

  const wrapper = document.createElement("div");
  wrapper.className = "circular-progress-wrapper";
  
  wrapper.innerHTML = `
    <svg class="circular-progress-svg" viewBox="0 0 48 48">
      <circle class="circular-progress-bg" cx="24" cy="24" r="20"></circle>
      <circle class="circular-progress-value" cx="24" cy="24" r="20"></circle>
    </svg>
  `;
  document.body.appendChild(wrapper);

  const circle = wrapper.querySelector('.circular-progress-value');
  const radius = circle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;

  function updateProgress() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    if (scrollTop > 100) {
      wrapper.classList.add('is-visible');
    } else {
      wrapper.classList.remove('is-visible');
    }

    if (height <= 0) return;
    const scrollPercentage = scrollTop / height;
    const offset = circumference - scrollPercentage * circumference;
    circle.style.strokeDashoffset = offset;
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();
})();

// ============================================================================
// Smooth Page Transitions
// ============================================================================
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    // Let cmd/ctrl+click pass through to browser default (open in new tab)
    if (e.metaKey || e.ctrlKey) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || link.target === "_blank") return;

    const url = new URL(link.href, window.location.origin);
    if (url.origin === window.location.origin) {
      e.preventDefault();
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          window.location.href = link.href;
        });
      } else {
        document.body.classList.add("page-transitioning");
        setTimeout(() => {
          window.location.href = link.href;
        }, 200);
      }
    }
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted || document.body.classList.contains("page-transitioning")) {
      document.body.classList.remove("page-transitioning");
    }
  });
})();

// (Feature 2 removed — Image Lightbox was removed)
// (Feature 3 removed — Read Time Estimator Badge was removed)
// (Feature 8 removed — "Ask About This Section" chips no longer used)

// ============================================================================
// Feature 9: Subtle Grain / Noise Overlay (Phase 2)
// ============================================================================
// (Feature 11 removed — Progressive clip-path image wipe caused slow-loading appearance)

// (Feature removed — Sticky Section Navigation Rail was removed)

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
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href*="ryan-schmidt-resume"][href$=".pdf"]');
    if (!link) return;
    const sessionToken = sessionStorage.getItem('rs_chat_session_token') || null;
    fetch("/api/track-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageUrl: location.pathname,
        sessionToken
      })
    }).catch(() => {});
  });

  const systemInput = document.querySelector('.asd-fake-input');
  if (systemInput) {
    const originalPlaceholder = systemInput.getAttribute('placeholder');
    systemInput.addEventListener('focus', () => {
      systemInput.setAttribute('placeholder', '');
    });
    systemInput.addEventListener('blur', () => {
      if (!systemInput.value.trim()) {
        systemInput.setAttribute('placeholder', originalPlaceholder);
      }
    });
  }
})();

// --- EASTER EGG: Console Message for Tech Recruiters / EMs ---
setTimeout(() => {
  console.log("%c👋 Ah, an Engineering Manager or DevTools snooper!", "font-size: 18px; font-weight: bold; color: #fff; background: #111; padding: 8px 12px; border-radius: 6px;");
  console.log("%cSince you're looking under the hood: I built this entire site custom without a CMS, using semantic HTML, vanilla CSS/JS, and AI tooling. I don't just design systems—I can help your team ship them. Let's talk: ryanschmidt1989@gmail.com", "font-size: 14px; color: #444; padding-top: 8px; line-height: 1.5;");
}, 1000);

// --- URL PARAMETER ROUTING (Mobile Evidence Cards) ---
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetRole = urlParams.get('role');
  const grid = document.querySelector('.evidence-grid');
  if (!grid || !targetRole) return;
  
  const cards = Array.from(grid.querySelectorAll('.evidence-card'));
  let targetHref = '';
  
  if (targetRole === 'growth') targetHref = 'member-portal-overhaul.html';
  if (targetRole === 'eng') targetHref = 'ai-coding-portfolio.html';
  
  if (targetHref) {
    const targetCard = cards.find(c => c.getAttribute('href').includes(targetHref));
    if (targetCard) {
      grid.prepend(targetCard);
    }
  }
})();

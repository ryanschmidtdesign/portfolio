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
      const hamburger = document.getElementById('hamburger');
      const menu = document.getElementById('hamburgerMenu');

      if (hamburger && menu) {
        const toggleMenu = (event) => {
          if (event) event.stopPropagation();
          // Prevent duplicate handlers from immediately toggling state twice
          if (window.__hamburgerToggleLocked) return;
          window.__hamburgerToggleLocked = true;
          setTimeout(() => { window.__hamburgerToggleLocked = false; }, 40);

          const open = !menu.classList.contains('show');
          if (open) menu.classList.add('show');
          else {
            menu.classList.remove('show');
            menu.querySelectorAll('.menu-item-group.is-open').forEach(g => {
              Array.from(g.querySelectorAll('.menu-submenu a')).forEach(l => l.style.transitionDelay = '0ms');
              g.classList.remove('is-open');
            });
          }
          hamburger.classList.toggle('open', open);
          hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
          menu.setAttribute('aria-hidden', open ? 'false' : 'true');
          document.body.classList.toggle('menu-open', open);

          const links = Array.from(menu.querySelectorAll('a'));
          if (open) {
            const onMenuKey = (e) => {
              if (e.key === 'Escape') {
                toggleMenu();
                hamburger.focus();
                document.removeEventListener('keydown', onMenuKey);
                return;
              }
              if (e.key === 'Tab') {
                const first = links[0];
                const last = links[links.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            };
            document.addEventListener('keydown', onMenuKey);
          }
        };

        hamburger.addEventListener('click', toggleMenu);
        hamburger.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleMenu();
          }
        });

        document.addEventListener('click', function(event){
          if (!menu.classList.contains('show')) return;
          if (hamburger.contains(event.target) || menu.contains(event.target)) return;
          menu.classList.remove('show');
          menu.querySelectorAll('.menu-item-group.is-open').forEach(g => {
            Array.from(g.querySelectorAll('.menu-submenu a')).forEach(l => l.style.transitionDelay = '0ms');
            g.classList.remove('is-open');
          });
          hamburger.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
          menu.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('menu-open');
          hamburger.focus();
        });

        menu.querySelectorAll('a').forEach((link, index) => {
          link.style.transitionDelay = `${index * 20}ms`;
        });

        // Submenu click toggle with staggered drop
        menu.querySelectorAll('.menu-trigger').forEach(trigger => {
          trigger.addEventListener('click', () => {
            const group = trigger.closest('.menu-item-group');
            if (!group) return;
            const isOpen = group.classList.contains('is-open');
            const links = Array.from(group.querySelectorAll('.menu-submenu a'));

            if (isOpen) {
              links.forEach(link => link.style.transitionDelay = '0ms');
              group.classList.remove('is-open');
            } else {
              group.classList.add('is-open');
              links.forEach((link, i) => { link.style.transitionDelay = `${i * 30}ms`; });
              menu.querySelectorAll('.menu-item-group.is-open').forEach(other => {
                if (other !== group) {
                  Array.from(other.querySelectorAll('.menu-submenu a')).forEach(l => l.style.transitionDelay = '0ms');
                  other.classList.remove('is-open');
                }
              });
            }
          });
        });
      }

      const aiSend = document.getElementById('ai-mini-send');
      const aiInput = document.getElementById('ai-mini-input');
      if (aiSend && aiInput) {
        aiSend.addEventListener('click', function(){
          const q = aiInput.value.trim();
          if (!q) return;
          document.dispatchEvent(new CustomEvent('rs:ask-section', { detail: { prompt: q, sectionContext: { heading: 'Mini AI' } } }));
          aiInput.value = '';
        });
        aiInput.addEventListener('keypress', function(e){ if (e.key === 'Enter') aiSend.click(); });
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
// Hero stagger on load
// ============================================================================
(function () {
  window.addEventListener("DOMContentLoaded", () => {
    const heroBlocks = document.querySelectorAll(".hero-stagger");
    heroBlocks.forEach((el) => {
      // force reflow to ensure animation runs after initial layout
      void el.offsetWidth;
      el.classList.add("hero-stagger--in");
    });
  });
})();

// ============================================================================
// Section reveal functionality
// ============================================================================
(function () {
  const revealSelector = '[data-reveal]';
  const els = document.querySelectorAll(revealSelector);
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
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
    const original = el.textContent.trim();
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
      el.textContent = formatMetric(original, current);
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
// Carousel functionality for design highlights
// ============================================================================
(function () {
  
})();

// ============================================================================
// Image Parallax (Inner Scroll)
// ============================================================================
(function () {
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const images = document.querySelectorAll(".case-study img:not(.no-parallax)");
  
  images.forEach(img => {
    const wrapper = document.createElement("span");
    wrapper.className = "parallax-image-wrapper";
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    img.style.transform = "translateY(0px)";
  });

  const parallaxImgs = document.querySelectorAll(".parallax-image-wrapper img");
  if (!parallaxImgs.length) return;

  function onScroll() {
    const windowHeight = window.innerHeight;
    parallaxImgs.forEach(img => {
      const rect = img.parentElement.getBoundingClientRect();
      if (rect.top <= windowHeight && rect.bottom >= 0) {
        const progress = 1 - (rect.bottom / (windowHeight + rect.height));
        const move = progress * 15; 
        img.style.transform = `translateY(-${move}%)`;
      }
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  if (window.lenis) {
    window.lenis.on('scroll', onScroll);
  }
  onScroll();
})();

// ============================================================================
// Magnetic Buttons
// ============================================================================
(function () {
  const supportsHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!supportsHover) return;

  const magneticEls = document.querySelectorAll(".hero-cta-primary, .btn, .btn-primary, .btn-secondary");

  magneticEls.forEach((item) => {
    const isLarge = item.classList.contains("hero-cta-primary");
    const strength = isLarge ? 12 : 6;

    function onMove(e) {
      const rect = item.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = ((x - cx) / cx) * strength;
      const dy = ((y - cy) / cy) * strength;
      item.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }

    function reset() {
      item.style.transform = "translate3d(0, 0, 0)";
    }

    item.addEventListener("mousemove", onMove);
    item.addEventListener("mouseleave", reset);
  });
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
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || link.target === "_blank") return;

    const url = new URL(link.href, window.location.origin);
    if (url.origin === window.location.origin) {
      e.preventDefault();
      document.body.classList.add("page-transitioning");
      setTimeout(() => {
        window.location.href = link.href;
      }, 200);
    }
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted || document.body.classList.contains("page-transitioning")) {
      document.body.classList.remove("page-transitioning");
    }
  });
})();

// ============================================================================
// Feature 2: Image Lightbox for Case Study Carousels
// ============================================================================
(function () {
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Build overlay (once, lazily)
  let overlay = null;
  let overlayImg = null;
  let overlayCaption = null;

  function buildOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = "rs-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Image lightbox");
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:99999",
      "display:flex", "flex-direction:column", "align-items:center", "justify-content:center",
      "gap:1rem",
      "background:rgba(0,0,0,.82)",
      "backdrop-filter:blur(12px)", "-webkit-backdrop-filter:blur(12px)",
      "opacity:0",
      "transition:" + (prefersReduced ? "none" : "opacity .22s ease"),
      "cursor:zoom-out",
      "padding:2rem",
    ].join(";");

    overlayImg = document.createElement("img");
    overlayImg.style.cssText = [
      "max-width:min(92vw, 1200px)",
      "max-height:80vh",
      "object-fit:contain",
      "border-radius:8px",
      "box-shadow:0 24px 80px rgba(0,0,0,.7)",
      "transform:" + (prefersReduced ? "none" : "scale(.92)"),
      "transition:" + (prefersReduced ? "none" : "transform .22s ease"),
      "cursor:default",
    ].join(";");

    overlayCaption = document.createElement("p");
    overlayCaption.style.cssText = [
      "max-width:min(92vw, 720px)",
      "text-align:center",
      "color:rgba(17,17,17,.65)",
      "font-size:13px",
      "line-height:1.5",
      "margin:0",
    ].join(";");

    const closeBtn = document.createElement("button");
    closeBtn.setAttribute("aria-label", "Close lightbox");
    closeBtn.style.cssText = [
      "position:fixed", "top:1.25rem", "right:1.25rem",
      "background:rgba(255,255,255,.1)", "border:1px solid rgba(255,255,255,.18)",
      "color:#111111", "border-radius:50%", "width:2.25rem", "height:2.25rem",
      "font-size:1.1rem", "cursor:pointer", "display:flex", "align-items:center", "justify-content:center",
      "line-height:1",
    ].join(";");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", closeLightbox);

    overlay.appendChild(closeBtn);
    overlay.appendChild(overlayImg);
    overlay.appendChild(overlayCaption);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeLightbox(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("lb-open")) closeLightbox(); });
  }

  function openLightbox(src, alt, caption) {
    buildOverlay();
    overlayImg.src = src;
    overlayImg.alt = alt || "";
    overlayCaption.textContent = caption || "";
    overlayCaption.style.display = caption ? "block" : "none";
    overlay.classList.add("lb-open");
    // Force reflow then animate in
    void overlay.offsetWidth;
    overlay.style.opacity = "1";
    overlayImg.style.transform = "scale(1)";
    document.body.style.overflow = "hidden";
    overlay.focus();
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.style.opacity = "0";
    overlayImg.style.transform = prefersReduced ? "scale(1)" : "scale(.92)";
    setTimeout(() => {
      overlay.classList.remove("lb-open");
      document.body.style.overflow = "";
    }, prefersReduced ? 0 : 220);
  }

  function attachLightbox() {
    // Attach to carousel slide images
    document.querySelectorAll(".dh-slide img, .case-study img:not(.no-lightbox)").forEach((img) => {
      if (img.dataset.lightboxBound) return;
      img.dataset.lightboxBound = "1";
      img.style.cursor = "zoom-in";
      img.addEventListener("click", (e) => {
        e.stopPropagation();
        const fig = img.closest("figure");
        const caption = fig ? (fig.querySelector("figcaption") || {}).textContent : "";
        openLightbox(img.src, img.alt, caption);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachLightbox);
  } else {
    attachLightbox();
  }
})();

// ============================================================================
// Feature 3: Read Time Estimator Badge
// ============================================================================
(function () {
  const article = document.querySelector(".case-study");
  if (!article) return;

  const titleEl = article.querySelector("h1");
  if (!titleEl) return;

  // Count words across all text nodes in the article (exclude nav/scripts)
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement && node.parentElement.tagName;
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(tag)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let wordCount = 0;
  let node;
  while ((node = walker.nextNode())) {
    wordCount += node.textContent.trim().split(/\s+/).filter(Boolean).length;
  }

  const minutes = Math.max(1, Math.round(wordCount / 200));
  const badge = document.createElement("span");
  badge.className = "read-time-badge";
  badge.setAttribute("aria-label", `Estimated read time: ${minutes} minutes`);
  badge.textContent = `${minutes} min read`;

  titleEl.insertAdjacentElement("afterend", badge);
})();

// ============================================================================
// (Feature 8 removed — "Ask About This Section" chips no longer used)
// ============================================================================

// ============================================================================
// Feature 9: Subtle Grain / Noise Overlay (Phase 2)
// ============================================================================
(function () {
  // Keep the grain effect subtle and scoped to the home page.
  if (!document.body.classList.contains("is-home")) return;

  const noise = document.createElement("div");
  noise.id = "rs-noise-overlay";
  noise.setAttribute("aria-hidden", "true");
  // A tiny 200x200 SVG noise pattern encoded as a data URI
  const noiseSvg = "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E";

  noise.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:999999", // Put it above almost everything except maybe modals
    "pointer-events:none",
    "opacity:0.4",
    "mix-blend-mode:overlay",
    "background-image:url(\"" + noiseSvg + "\")",
    "background-repeat:repeat",
  ].join(";");

  document.body.appendChild(noise);
})();

// ============================================================================
// Feature 11: Scroll-Linked Image Reveals (Phase 2)
// ============================================================================
(function () {
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const images = document.querySelectorAll(".case-study img:not(.no-reveal)");
  if (!images.length) return;

  // Initial CSS state
  images.forEach(img => {
    img.style.clipPath = "inset(0 100% 0 0)";
    img.style.transition = "clip-path 0.1s linear"; // Smooth out RAF steps
  });

  const revealing = new Set();
  let raf = null;

  function updateRevealsOnce() {
    if (revealing.size === 0) {
      raf = null;
      return;
    }

    const windowHeight = window.innerHeight;
    revealing.forEach((img) => {
      const rect = img.getBoundingClientRect();
      const visiblePx = windowHeight - rect.top;
      const revealStart = 50;
      const revealEnd = rect.height > windowHeight * 0.6 ? windowHeight * 0.5 : rect.height + 50;

      let progress = (visiblePx - revealStart) / (revealEnd - revealStart);
      progress = Math.max(0, Math.min(1, progress));

      const eased = 1 - Math.pow(1 - progress, 3);
      const insetRight = 100 - (eased * 100);
      img.style.clipPath = `inset(0 ${insetRight}% 0 0)`;
    });

    raf = requestAnimationFrame(updateRevealsOnce);
  }

  function startLoopIfNeeded() {
    if (raf || revealing.size === 0) return;
    raf = requestAnimationFrame(updateRevealsOnce);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.dataset.revealing = "true";
        revealing.add(entry.target);
        startLoopIfNeeded();
      } else {
        // If it scrolls out of view completely (above or below), reset or finish
        const rect = entry.boundingClientRect;
        if (rect.top > window.innerHeight) {
          // Scrolled back up, reset to hidden
          entry.target.style.clipPath = "inset(0 100% 0 0)";
          entry.target.dataset.revealing = "false";
          revealing.delete(entry.target);
        } else {
          // Scrolled past, fully reveal
          entry.target.style.clipPath = "inset(0 0 0 0)";
          entry.target.dataset.revealing = "false";
          revealing.delete(entry.target);
        }
      }
    });
  }, { rootMargin: "0px", threshold: 0 });

  images.forEach(img => observer.observe(img));
})();

// ============================================================================
// Shared interactive modules
// ============================================================================
(function () {
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const revealEls = [...document.querySelectorAll("[data-reveal]")];
  if (revealEls.length) {
    // Stagger reveal timing for visual rhythm
    revealEls.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 30, 180)}ms`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

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
    if (!buttons.length || !panels.length) return;

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
        panel.hidden = !active;
      });
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => updateState(button.dataset.compareButton));
    });
    updateState(initial);
  });

  [...document.querySelectorAll("[data-spotlight]")].forEach((wrapper) => {
    const items = [...wrapper.querySelectorAll("[data-spotlight-item]")];
    if (!items.length) return;

    items.forEach((item) => {
      item.addEventListener("mouseenter", () => {
        items.forEach((el) => el.classList.toggle("is-active", el === item));
      });
      item.addEventListener("focus", () => {
        items.forEach((el) => el.classList.toggle("is-active", el === item));
      });
      item.addEventListener("mouseleave", () => {
        items.forEach((el) => el.classList.remove("is-active"));
      });
    });
  });


  [...document.querySelectorAll("[data-section-summary]")].forEach((wrapper) => {
    const toggle = wrapper.querySelector(".summary-toggle");
    const content = wrapper.querySelector(".summary-content");
    if (!toggle || !content) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      wrapper.classList.toggle("is-open", !expanded);
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.textContent = expanded ? "View summary" : "Hide summary";
    });
  });

  // Resume download tracking
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href*="ryan-schmidt-resume"][href$=".pdf"]');
    if (!link) return;
    fetch("/api/track-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageUrl: location.pathname
      })
    }).catch(() => {});
  });
})();

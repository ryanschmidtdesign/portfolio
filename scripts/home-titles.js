(function () {
  const slidesData = [
    {
      title: "Dashboards",
      summary: "Research-backed AI workflow design that balanced executive summaries with trusted, visible KPI data.",
      url: "pages/dashboard.html"
    },
    {
      title: "Inventory",
      summary: "A real-time operational workflow that replaced spreadsheet tracking with a trusted inventory model across locations, projects, and purchasing.",
      url: "pages/inventory.html"
    },
    {
      title: "Member Portal",
      summary: "An in-progress IA overhaul aligning a validated content taxonomy with navigation patterns for enterprise HR research discovery.",
      url: "pages/member-portal-overhaul.html"
    },
    {
      title: "AI-Coding<br>Portfolio",
      summary: "A portfolio rebuilt from scratch in code with Cursor, Gemini, and Antigravity — reusable patterns, custom features, and AI woven into the workflow.",
      url: "pages/ai-coding-portfolio.html"
    }
  ];

  const container = document.querySelector('.home-titles');
  if (!container) return;

  container.innerHTML = '';

  const track = document.createElement('div');
  track.className = 'home-titles__track';

  function buildLink(s, i, isClone) {
    const link = document.createElement('a');
    link.className = 'home-title';
    link.href = s.url || '#';
    link.dataset.slideIndex = i;
    const plainTitle = s.title.replace(/<br\s*\/?>/gi, ' ');
    link.setAttribute('aria-label', plainTitle + ' — View case study');

    if (isClone) {
      link.setAttribute('aria-hidden', 'true');
      link.tabIndex = -1;
    } else {
      link.dataset.reveal = '';
      link.style.setProperty('--reveal-delay', `${Math.min(i * 80, 240)}ms`);
    }

    const eyebrow = document.createElement('span');
    eyebrow.className = 'home-title__eyebrow';
    eyebrow.setAttribute('aria-hidden', 'true');
    eyebrow.textContent = 'Case study';

    const text = document.createElement('span');
    text.className = 'home-title__text';
    text.innerHTML = s.title;

    link.append(eyebrow, text);
    return link;
  }

  function buildAboutLink(isClone) {
    const link = document.createElement('a');
    link.className = 'home-title';
    link.href = 'pages/about.html';
    link.dataset.slideIndex = '-1';
    link.setAttribute('aria-label', 'About — View case study');

    if (isClone) {
      link.setAttribute('aria-hidden', 'true');
      link.tabIndex = -1;
    } else {
      link.dataset.reveal = '';
      link.style.setProperty('--reveal-delay', `${Math.min(slidesData.length * 80, 240)}ms`);
    }

    const eyebrow = document.createElement('span');
    eyebrow.className = 'home-title__eyebrow';
    eyebrow.setAttribute('aria-hidden', 'true');
    eyebrow.textContent = 'Case study';

    const text = document.createElement('span');
    text.className = 'home-title__text';
    text.textContent = 'About';

    link.append(eyebrow, text);
    return link;
  }

  slidesData.forEach((s, i) => track.appendChild(buildLink(s, i, false)));
  track.appendChild(buildAboutLink(false));
  slidesData.forEach((s, i) => track.appendChild(buildLink(s, i, true)));
  track.appendChild(buildAboutLink(true));

  container.appendChild(track);

  if (window.marqueeRafId) cancelAnimationFrame(window.marqueeRafId);

  let hoveredLinks = new Set();
  let scrollY = 0;
  const pxPerFrame = -0.6;

  document.querySelectorAll('.home-title').forEach(link => {
    link.addEventListener('mouseenter', () => hoveredLinks.add(link));
    link.addEventListener('mouseleave', () => hoveredLinks.delete(link));
  });

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    scrollY -= e.deltaY;
  }, { passive: false });

  let touchStartY = 0;
  let isTouching = false;
  container.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    isTouching = true;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const y = e.touches[0].clientY;
    scrollY += (y - touchStartY);
    touchStartY = y;
  }, { passive: false });

  container.addEventListener('touchend', () => isTouching = false);

  function tick() {
    if (hoveredLinks.size === 0 && !isTouching) {
      scrollY += pxPerFrame;
    }

    const fullHeight = track.getBoundingClientRect().height;
    if (fullHeight > 0) {
      const setHeight = fullHeight / 2;
      if (scrollY <= -setHeight) scrollY += setHeight;
      if (scrollY > 0) scrollY -= setHeight;
    }

    track.style.transform = `translateY(${scrollY}px)`;
    window.marqueeRafId = requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();

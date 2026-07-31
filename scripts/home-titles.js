(function () {
  const slidesData = [
    {
      title: "Dashboards",
      summary: "71% engagement lift — dashboards went from ignored to the primary way teams monitor work.",
      url: "pages/dashboard.html"
    },
    {
      title: "Inventory",
      summary: "Replaced spreadsheet chaos with one source of truth — driving +18% recurring revenue and +8% adoption.",
      url: "pages/inventory.html"
    },
    {
      title: "Member Portal",
      summary: "Translated a validated taxonomy into scalable IA — MVP-ready designs now in engineering QA.",
      url: "pages/member-portal-overhaul.html"
    },
    {
      title: "Engineering<br>My Portfolio",
      summary: "Fully custom site with AI chat and semantic search — idea to shipped feature in one session.",
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
    if (s.title === "Dashboards") {
      eyebrow.innerHTML = 'FEATURED<br>CASE STUDY';
      eyebrow.classList.add('home-title__eyebrow--featured');
    } else {
      eyebrow.textContent = 'Case study';
    }

    const body = document.createElement('span');
    body.className = 'home-title__body';

    const text = document.createElement('span');
    text.className = 'home-title__text';
    text.innerHTML = s.title;

    const summary = document.createElement('span');
    summary.className = 'home-title__summary';
    summary.textContent = s.summary || '';

    body.append(text, summary);
    link.append(eyebrow, body);
    return link;
  }

  slidesData.forEach((s, i) => track.appendChild(buildLink(s, i, false)));
  slidesData.forEach((s, i) => track.appendChild(buildLink(s, i, true)));

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

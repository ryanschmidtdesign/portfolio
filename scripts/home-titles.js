(function () {
  const slidesData = [
    {
      title: "Dashboards",
      summary: "Turned dashboards into the primary way teams track work, driving a 71% engagement lift.",
      url: "pages/dashboard.html",
      image: "assets/case-studies/dashboards/rename-dashboard.webp"
    },
    {
      title: "Inventory",
      summary: "Replaced spreadsheets with a single source of truth, increasing recurring revenue 18% and adoption 8%.",
      url: "pages/inventory.html",
      image: "assets/case-studies/inventory/inventory-controls.webp"
    },
    {
      title: "Member Portal",
      summary: "Turned a research-backed taxonomy into an MVP-ready portal now moving through engineering QA.",
      url: "pages/member-portal-overhaul.html",
      image: "assets/case-studies/member-portal/design-highlights/Home_new.webp"
    },
    {
      title: "Engineering<br>My Portfolio",
      summary: "Built a custom portfolio with AI chat and semantic search, shipping from idea to production in a single session.",
      url: "pages/ai-coding-portfolio.html",
      image: "assets/case-studies/ai-coding-portfolio/interactive-component.webp"
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
    
    if (s.image) {
      const ghostWrapper = document.createElement('div');
      ghostWrapper.className = 'home-title__ghost-wrapper';
      const ghostInner = document.createElement('div');
      ghostInner.className = 'home-title__ghost-inner';
      ghostInner.style.backgroundImage = 'url(' + s.image + ')';
      ghostWrapper.append(ghostInner);
      link.append(ghostWrapper);
    }
    return link;
  }

  slidesData.forEach((s, i) => track.appendChild(buildLink(s, i, false)));
  slidesData.forEach((s, i) => track.appendChild(buildLink(s, i, true)));

  container.appendChild(track);

  if (window.marqueeRafId) cancelAnimationFrame(window.marqueeRafId);

  let scrollY = 0;
  const pxPerFrame = -0.6;

  let mouseX = -1;
  let mouseY = -1;
  let activeLink = null;
  let isHoveringContainer = false;
  let lastMouseX = -2;
  let lastMouseY = -2;
  let lastScrollY = -1;

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    scrollY -= e.deltaY;
  }, { passive: false });

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    const rect = container.getBoundingClientRect();
    isHoveringContainer = (
      mouseX >= rect.left && mouseX <= rect.right &&
      mouseY >= rect.top && mouseY <= rect.bottom
    );
  });
  
  document.addEventListener('mouseleave', () => {
    isHoveringContainer = false;
  });

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
    let newActiveLink = null;
    
    if (isHoveringContainer && mouseX > -1 && mouseY > -1) {
      if (Math.abs(mouseX - lastMouseX) > 0.5 || Math.abs(mouseY - lastMouseY) > 0.5 || Math.abs(scrollY - lastScrollY) > 0.5) {
        const elements = document.elementsFromPoint(mouseX, mouseY);
        newActiveLink = elements.find(el => el.classList.contains('home-title')) || null;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        lastScrollY = scrollY;
      } else {
        newActiveLink = activeLink;
      }
    }

    if (activeLink !== newActiveLink) {
      if (activeLink) activeLink.classList.remove('is-active');
      if (newActiveLink) newActiveLink.classList.add('is-active');
      activeLink = newActiveLink;
    }
    
    if (activeLink) {
      container.classList.add('is-hovering-link');
    } else {
      container.classList.remove('is-hovering-link');
    }

    if (!activeLink && !isTouching) {
      scrollY += pxPerFrame;
    }

    const fullHeight = track.offsetHeight;
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

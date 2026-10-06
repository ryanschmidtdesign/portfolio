(function () {
  const slidesData = [
    {
      title: "Dashboards",
      summary: "Turned an ignored dashboard feature into the main way teams track their work, driving a 71% jump in adoption.",
      url: "pages/dashboard.html",
      image: "assets/case-studies/dashboards/rename-dashboard.webp"
    },
    {
      title: "Inventory",
      summary: "Replaced messy spreadsheets with a real-time inventory system that unblocked enterprise deals and drove +18% MRR.",
      url: "pages/inventory.html",
      image: "assets/case-studies/inventory/inventory-controls.webp"
    },
    {
      title: "Member Portal",
      summary: "Untangled a confusing architecture so members could actually find what they pay for, driving a 500% jump in AI usage.",
      url: "pages/member-portal-overhaul.html",
      image: "assets/case-studies/member-portal/design-highlights/Home_new.webp"
    },
    {
      title: "Engineering<br>My Portfolio",
      summary: "Built a custom portfolio from scratch to prove I can move from design to production without waiting on a handoff.",
      url: "pages/ai-coding-portfolio.html",
      image: "assets/case-studies/ai-coding-portfolio/cursor-files.webp"
    }
  ];

  
  // --- URL PARAMETER ROUTING (Growth Hack) ---
  const urlParams = new URLSearchParams(window.location.search);
  const targetRole = urlParams.get('role');
  
  if (targetRole === 'growth') {
    const idx = slidesData.findIndex(s => s.title === "Member Portal");
    if (idx > -1) {
      const item = slidesData.splice(idx, 1)[0];
      slidesData.unshift(item);
    }
  } else if (targetRole === 'eng') {
    const idx = slidesData.findIndex(s => s.title.includes("Engineering"));
    if (idx > -1) {
      const item = slidesData.splice(idx, 1)[0];
      slidesData.unshift(item);
    }
  }

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

  // Create two separate groups for seamless looping
  const group1 = document.createElement('div');
  group1.className = 'home-titles__group';
  slidesData.forEach((s, i) => group1.appendChild(buildLink(s, i, false)));

  const group2 = document.createElement('div');
  group2.className = 'home-titles__group';
  slidesData.forEach((s, i) => group2.appendChild(buildLink(s, i, true)));

  track.appendChild(group1);
  track.appendChild(group2);
  container.appendChild(track);

  if (window.marqueeRafId) cancelAnimationFrame(window.marqueeRafId);

  let scrollY = 0;
  const pxPerFrame = -0.6;

  let mouseX = -1;
  let mouseY = -1;
  let activeLink = null;
  let isHoveringContainer = false;

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
    
    // Only check for hover if the mouse is actually inside the container to avoid freezing
    if (isHoveringContainer) {
      const elements = document.elementsFromPoint(mouseX, mouseY);
      if (elements) {
        newActiveLink = elements.find(el => el.classList.contains('home-title')) || null;
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

    // Only pause the scroll if they are hovering an ACTUAL link, not just resting in the empty space of the container
    if (!activeLink && !isTouching) {
      scrollY += pxPerFrame;
    }

    // Loop exactly based on the height of ONE group, which represents 1 full set of items + gaps
    const setHeight = group1.offsetHeight;
    if (setHeight > 0) {
      if (scrollY <= -setHeight) scrollY += setHeight;
      if (scrollY > 0) scrollY -= setHeight;
    }

    track.style.transform = `translateY(${scrollY}px)`;
    window.marqueeRafId = requestAnimationFrame(tick);
  }

  // Ensure fonts and layout calculate before starting tick so group height is accurate
  setTimeout(() => {
    requestAnimationFrame(tick);
  }, 100);

})();

/**
 * Ryan Schmidt Portfolio — Homepage Controller
 * Clean, lightweight interaction controller for the editorial homepage and CLI dock.
 */

(function () {
  'use strict';

  const omnibarForm = document.getElementById('home-omnibar-form');
  const omnibarInput = document.getElementById('home-omnibar-input');
  const slashBtn = document.getElementById('home-slash-btn');
  const slashPopover = document.getElementById('home-slash-popover');
  const navLinks = document.querySelectorAll('.home-topnav__link');

  function getDefaultPlaceholder() {
    return window.innerWidth <= 600
      ? 'Search case studies or ask...'
      : 'Search case studies, ask a question, or press ⌘K...';
  }

  function updatePlaceholder() {
    if (omnibarInput) {
      omnibarInput.placeholder = getDefaultPlaceholder();
    }
  }

  window.addEventListener('resize', updatePlaceholder);
  updatePlaceholder();

  // Scroll spy to highlight active section in the bottom dock
  function updateActiveNav() {
    const scrollPos = window.scrollY + 200;
    const sections = [
      { id: 'top', el: document.getElementById('top') },
      { id: 'work', el: document.getElementById('work') },
      { id: 'approach', el: document.getElementById('approach') }
    ];

    let currentId = 'top';
    sections.forEach(({ id, el }) => {
      if (el && el.offsetTop <= scrollPos) {
        currentId = id;
      }
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === `#${currentId}`) {
        link.classList.add('is-current');
        let dot = link.querySelector('.home-topnav__dot');
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'home-topnav__dot';
          dot.setAttribute('aria-hidden', 'true');
          link.prepend(dot);
        }
      } else if (href && href.startsWith('#')) {
        link.classList.remove('is-current');
        const dot = link.querySelector('.home-topnav__dot');
        if (dot) dot.remove();
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  // Quick Commands Popover (+)
  if (slashBtn && slashPopover) {
    slashBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = slashPopover.hidden;
      slashPopover.hidden = !isHidden;
      slashBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });

    slashPopover.querySelectorAll('[data-slash-cmd]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cmd = btn.getAttribute('data-slash-cmd');
        slashPopover.hidden = true;
        slashBtn.setAttribute('aria-expanded', 'false');

        if (cmd === 'work') {
          const workEl = document.getElementById('work');
          if (workEl) workEl.scrollIntoView({ behavior: 'smooth' });
        } else if (cmd === 'approach') {
          const approachEl = document.getElementById('approach');
          if (approachEl) approachEl.scrollIntoView({ behavior: 'smooth' });
        } else if (cmd === 'resume') {
          window.open('assets/ryan-schmidt-resume.pdf', '_blank', 'noopener');
        } else if (cmd === 'about') {
          window.location.href = 'pages/about.html';
        } else if (cmd === 'contact') {
          window.open('https://www.linkedin.com/in/ryanschmidt1989/', '_blank', 'noopener');
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!slashPopover.hidden && !slashPopover.contains(e.target) && e.target !== slashBtn) {
        slashPopover.hidden = true;
        slashBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Omnibar Form Submission -> Open Raycast-style Command Palette modal with query
  if (omnibarForm && omnibarInput) {
    omnibarForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = omnibarInput.value.trim();
      const lower = raw.toLowerCase().replace(/^\//, '');

      if (!raw) {
        if (window.rsCommandPalette) {
          window.rsCommandPalette.open('');
        }
        return;
      }

      if (lower === 'work') {
        const workEl = document.getElementById('work');
        if (workEl) workEl.scrollIntoView({ behavior: 'smooth' });
        omnibarInput.value = '';
        return;
      }

      if (lower === 'approach') {
        const approachEl = document.getElementById('approach');
        if (approachEl) approachEl.scrollIntoView({ behavior: 'smooth' });
        omnibarInput.value = '';
        return;
      }

      if (lower === 'resume') {
        window.open('assets/ryan-schmidt-resume.pdf', '_blank', 'noopener');
        omnibarInput.value = '';
        return;
      }

      if (lower === 'about') {
        window.location.href = 'pages/about.html';
        return;
      }

      if (lower === 'contact' || lower === 'linkedin') {
        window.open('https://www.linkedin.com/in/ryanschmidt1989/', '_blank', 'noopener');
        omnibarInput.value = '';
        return;
      }

      // Route general query into Command Palette
      if (window.rsCommandPalette) {
        window.rsCommandPalette.open(raw);
        omnibarInput.value = '';
      }
    });
  }
})();

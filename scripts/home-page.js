/**
 * Ryan Schmidt Portfolio — Homepage Controller
 * Clean, lightweight interaction controller for the editorial homepage and CLI dock.
 */

(function () {
  'use strict';

  const omnibarForm = document.getElementById('home-omnibar-form');
  const omnibarInput = document.getElementById('home-omnibar-input');

  function getDefaultPlaceholder() {
    return window.innerWidth <= 600
      ? 'Ask AI about Ryan’s work...'
      : 'Ask AI, execute /command, or press ⌘K...';
  }

  function updatePlaceholder() {
    if (omnibarInput) {
      omnibarInput.placeholder = getDefaultPlaceholder();
    }
  }

  window.addEventListener('resize', updatePlaceholder);
  updatePlaceholder();

  // Scroll spy to highlight active section in the top header
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

    const headerNavLinks = document.querySelectorAll('.site-header__link');
    headerNavLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === `#${currentId}`) {
        link.classList.add('is-current');
        link.setAttribute('aria-current', 'page');
      } else if (href && href.startsWith('#')) {
        link.classList.remove('is-current');
        link.removeAttribute('aria-current');
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  // Smooth scroll to #work if landing directly from an external page or subpage
  if (window.location.hash === '#work') {
    requestAnimationFrame(() => {
      const workEl = document.getElementById('work');
      if (workEl) {
        workEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Omnibar Form Submission -> Open Conversational AI Chat Panel with query
  const omnibarSend = document.getElementById('home-omnibar-send');

  function handleOmnibarSubmit(raw) {
    const trimmed = (raw || '').trim();
    const lower = trimmed.toLowerCase().replace(/^\//, '');

    if (!trimmed) {
      if (window.rsChatWidget) {
        window.rsChatWidget.open();
      } else if (window.rsCommandPalette) {
        window.rsCommandPalette.open('');
      }
      return;
    }

    if (lower === 'work') {
      const workEl = document.getElementById('work');
      if (workEl) workEl.scrollIntoView({ behavior: 'smooth' });
      if (omnibarInput) omnibarInput.value = '';
      return;
    }

    if (lower === 'resume') {
      window.open('assets/ryan-schmidt-resume.pdf', '_blank', 'noopener');
      if (omnibarInput) omnibarInput.value = '';
      return;
    }

    if (lower === 'about') {
      window.location.href = 'pages/about.html';
      return;
    }

    if (lower === 'contact' || lower === 'linkedin') {
      window.open('https://www.linkedin.com/in/ryanschmidt1989/', '_blank', 'noopener');
      if (omnibarInput) omnibarInput.value = '';
      return;
    }

    // Route query directly into the Conversational AI Chat Panel
    if (window.rsChatWidget) {
      window.rsChatWidget.send(trimmed);
      if (omnibarInput) omnibarInput.value = '';
    } else if (window.rsCommandPalette) {
      window.rsCommandPalette.open(trimmed);
      if (omnibarInput) omnibarInput.value = '';
    }
  }

  if (omnibarForm && omnibarInput) {
    omnibarForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleOmnibarSubmit(omnibarInput.value);
    });
  }

  if (omnibarSend && omnibarInput) {
    omnibarSend.addEventListener('click', (e) => {
      e.preventDefault();
      handleOmnibarSubmit(omnibarInput.value);
    });
  }
})();

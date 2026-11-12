/**
 * Ryan Schmidt Portfolio: Homepage Controller
 * Clean, lightweight interaction controller for the editorial homepage and CLI dock.
 */

(function () {
  'use strict';

  // Scroll spy to highlight active section in the top header
  function updateActiveNav() {
    const scrollPos = window.scrollY + 200;
    const sections = [
      { id: 'top', el: document.getElementById('top') },
      { id: 'work', el: document.getElementById('work') }
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
})();

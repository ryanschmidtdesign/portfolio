(function () {
  'use strict';

  function ImageSplitter(container) {
    this.container = container;
    this.viewport = container.querySelector('.splitter-viewport');
    this.after = container.querySelector('.splitter-after');
    this.handle = container.querySelector('.splitter-handle');
    if (!this.viewport || !this.after || !this.handle) return;

    this.isDragging = false;
    this.hasInteracted = false;
    this.teaserRafId = null;
    this.position = parseFloat(container.getAttribute('data-splitter-initial')) || 50;
    this.viewportRect = null;
    this.pendingClientX = null;
    this.rafId = null;
    this.keyboardTimer = null;

    this.init();
  }

  ImageSplitter.prototype.init = function () {
    var self = this;

    this.container.classList.add('splitter-initialized');

    // Inject Before / After corner badges if not already present
    if (!this.viewport.querySelector('.splitter-badge--before')) {
      this.badgeBefore = document.createElement('span');
      this.badgeBefore.className = 'splitter-badge splitter-badge--before';
      this.badgeBefore.textContent = this.container.getAttribute('data-before-label') || 'Before';
      this.viewport.appendChild(this.badgeBefore);
    } else {
      this.badgeBefore = this.viewport.querySelector('.splitter-badge--before');
    }

    if (!this.viewport.querySelector('.splitter-badge--after')) {
      this.badgeAfter = document.createElement('span');
      this.badgeAfter.className = 'splitter-badge splitter-badge--after';
      this.badgeAfter.textContent = this.container.getAttribute('data-after-label') || 'After';
      this.viewport.appendChild(this.badgeAfter);
    } else {
      this.badgeAfter = this.viewport.querySelector('.splitter-badge--after');
    }

    this.update(this.position);

    var isPointerDown = false;
    var pointerDownX = 0;

    function schedulePointerMove(clientX) {
      self.pendingClientX = clientX;
      if (self.rafId !== null) return;
      self.rafId = requestAnimationFrame(function () {
        self.rafId = null;
        if (typeof self.pendingClientX === 'number') {
          self.onPointerMove(self.pendingClientX);
        }
      });
    }

    function applyKeyboardStep(nextPos) {
      self.container.classList.add('is-keyboard');
      clearTimeout(self.keyboardTimer);
      self.update(nextPos);
      self.keyboardTimer = setTimeout(function () {
        self.container.classList.remove('is-keyboard');
      }, 140);
    }

    // Allow dragging from the handle AND clicking anywhere in the viewport
    function cancelTeaser() {
      self.hasInteracted = true;
      if (self.teaserRafId !== null) {
        cancelAnimationFrame(self.teaserRafId);
        self.teaserRafId = null;
      }
    }

    function startDrag(clientX, ev, fromHandle) {
      cancelTeaser();
      if (ev && ev.preventDefault) ev.preventDefault();
      isPointerDown = true;
      pointerDownX = clientX;
      self.viewportRect = self.viewport.getBoundingClientRect();
      self.container.classList.remove('is-keyboard');
      if (fromHandle) {
        self.isDragging = true;
        self.container.classList.add('is-dragging');
        if (typeof clientX === 'number') self.onPointerMove(clientX);
      } else {
        // Direct click on viewport: animate smoothly to the clicked location
        if (typeof clientX === 'number') self.onPointerMove(clientX);
      }
    }

    function stopDrag() {
      isPointerDown = false;
      self.viewportRect = null;
      if (self.rafId !== null) {
        cancelAnimationFrame(self.rafId);
        self.rafId = null;
      }
      self.pendingClientX = null;
      if (self.isDragging) {
        self.isDragging = false;
        self.container.classList.remove('is-dragging');
      }
    }

    window.addEventListener('resize', function () {
      self.viewportRect = null;
    }, { passive: true });

    this.handle.addEventListener('mousedown', function (e) {
      startDrag(e.clientX, e, true);
    });

    // Allow starting drag by pressing anywhere in the viewport
    this.viewport.addEventListener('mousedown', function (e) {
      if (e.target.closest('.splitter-handle')) return;
      startDrag(e.clientX, e, false);
    });

    document.addEventListener('mousemove', function (e) {
      if (!isPointerDown) return;
      if (!self.isDragging && Math.abs(e.clientX - pointerDownX) > 2) {
        self.isDragging = true;
        self.container.classList.add('is-dragging');
      }
      if (self.isDragging) {
        schedulePointerMove(e.clientX);
      }
    });

    document.addEventListener('mouseup', stopDrag);

    // Touch events: use non-passive so we can prevent the page from scrolling
    this.handle.addEventListener('touchstart', function (e) {
      startDrag(e.touches[0].clientX, e, true);
    }, { passive: false });

    this.viewport.addEventListener('touchstart', function (e) {
      if (e.target.closest('.splitter-handle')) return;
      startDrag(e.touches[0].clientX, e, false);
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
      if (!isPointerDown) return;
      if (!self.isDragging && e.touches[0] && Math.abs(e.touches[0].clientX - pointerDownX) > 4) {
        self.isDragging = true;
        self.container.classList.add('is-dragging');
      }
      if (self.isDragging) {
        if (!e.touches || !e.touches[0]) return;
        if (e.cancelable) e.preventDefault();
        schedulePointerMove(e.touches[0].clientX);
      }
    }, { passive: false });

    document.addEventListener('touchend', stopDrag);
    document.addEventListener('touchcancel', stopDrag);

    this.handle.addEventListener('keydown', function (e) {
      cancelTeaser();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        applyKeyboardStep(Math.max(0, Math.min(100, self.position - 2)));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        applyKeyboardStep(Math.max(0, Math.min(100, self.position + 2)));
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        applyKeyboardStep(Math.max(0, Math.min(100, self.position - 10)));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        applyKeyboardStep(Math.max(0, Math.min(100, self.position + 10)));
      } else if (e.key === 'Home') {
        e.preventDefault();
        applyKeyboardStep(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        applyKeyboardStep(100);
      }
    });

    // C6: One-time subtle teaser sweep (50 -> 58 -> 45 -> 50%) on first scroll into view
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced && 'IntersectionObserver' in window) {
      var initialPos = self.position;
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || self.hasInteracted) return;
          observer.disconnect();
          var duration = 900;
          var startTime = null;
          function stepTeaser(ts) {
            if (self.hasInteracted) return;
            if (!startTime) startTime = ts;
            var t = Math.min(1, (ts - startTime) / duration);
            // Smooth sinusoidal damped nudge: 0 -> +8 -> -5 -> 0
            var wave = Math.sin(t * Math.PI * 2) * (1 - t) * 9.5;
            self.update(Math.max(0, Math.min(100, initialPos + wave)));
            if (t < 1) {
              self.teaserRafId = requestAnimationFrame(stepTeaser);
            } else {
              self.teaserRafId = null;
              self.update(initialPos);
            }
          }
          self.teaserRafId = requestAnimationFrame(stepTeaser);
        });
      }, { threshold: 0.45 });
      observer.observe(this.container);
    }
  };

  ImageSplitter.prototype.onPointerMove = function (clientX) {
    var rect = this.viewportRect || this.viewport.getBoundingClientRect();
    if (!rect.width) return;
    var x = clientX - rect.left;
    var percent = (x / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));
    this.update(percent);
  };

  ImageSplitter.prototype.update = function (percent) {
    this.position = percent;
    this.after.style.clipPath = 'inset(0 0 0 ' + percent + '%)';
    this.handle.style.left = percent + '%';
    this.handle.style.transform = 'translateX(-50%)';
    this.handle.setAttribute('aria-valuenow', Math.round(percent));

    if (this.badgeBefore) {
      this.badgeBefore.classList.toggle('is-occluded', percent < 16);
    }
    if (this.badgeAfter) {
      this.badgeAfter.classList.toggle('is-occluded', percent > 84);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var splitters = document.querySelectorAll('[data-splitter]');
    splitters.forEach(function (el) {
      new ImageSplitter(el);
    });
  });
})();

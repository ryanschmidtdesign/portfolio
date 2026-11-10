(function () {
  'use strict';

  function ImageSplitter(container) {
    this.container = container;
    this.viewport = container.querySelector('.splitter-viewport');
    this.after = container.querySelector('.splitter-after');
    this.handle = container.querySelector('.splitter-handle');
    if (!this.viewport || !this.after || !this.handle) return;

    this.isDragging = false;
    this.position = parseFloat(container.getAttribute('data-splitter-initial')) || 50;

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

    // Allow dragging from the handle AND clicking anywhere in the viewport
    function startDrag(clientX, ev, fromHandle) {
      if (ev && ev.preventDefault) ev.preventDefault();
      isPointerDown = true;
      pointerDownX = clientX;
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
      if (self.isDragging) {
        self.isDragging = false;
        self.container.classList.remove('is-dragging');
      }
    }

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
        self.onPointerMove(e.clientX);
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
        if (e.cancelable) e.preventDefault();
        self.onPointerMove(e.touches[0].clientX);
      }
    }, { passive: false });

    document.addEventListener('touchend', stopDrag);
    document.addEventListener('touchcancel', stopDrag);

    this.handle.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        self.update(Math.max(0, Math.min(100, self.position - 2)));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        self.update(Math.max(0, Math.min(100, self.position + 2)));
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        self.update(Math.max(0, Math.min(100, self.position - 10)));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        self.update(Math.max(0, Math.min(100, self.position + 10)));
      } else if (e.key === 'Home') {
        e.preventDefault();
        self.update(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        self.update(100);
      }
    });
  };

  ImageSplitter.prototype.onPointerMove = function (clientX) {
    var rect = this.viewport.getBoundingClientRect();
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

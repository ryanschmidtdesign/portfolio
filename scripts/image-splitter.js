(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    this.update(this.position);

    // Allow dragging from the handle AND from the viewport area (better UX on touch)
    function startDrag(clientX, ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      self.isDragging = true;
      self.container.classList.add('is-dragging');
      if (typeof clientX === 'number') self.onPointerMove(clientX);
    }

    function stopDrag() {
      if (self.isDragging) {
        self.isDragging = false;
        self.container.classList.remove('is-dragging');
      }
    }

    this.handle.addEventListener('mousedown', function (e) {
      startDrag(e.clientX, e);
    });

    // Allow starting drag by pressing anywhere in the viewport
    this.viewport.addEventListener('mousedown', function (e) {
      startDrag(e.clientX, e);
    });

    document.addEventListener('mousemove', function (e) {
      if (!self.isDragging) return;
      self.onPointerMove(e.clientX);
    });

    document.addEventListener('mouseup', stopDrag);

    // Touch events: use non-passive so we can prevent the page from scrolling
    this.handle.addEventListener('touchstart', function (e) {
      startDrag(e.touches[0].clientX, e);
    }, { passive: false });

    this.viewport.addEventListener('touchstart', function (e) {
      startDrag(e.touches[0].clientX, e);
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
      if (!self.isDragging) return;
      // prevent page scrolling while dragging
      if (e.cancelable) e.preventDefault();
      self.onPointerMove(e.touches[0].clientX);
    }, { passive: false });

    document.addEventListener('touchend', stopDrag);

    this.handle.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        var step = e.key === 'ArrowLeft' ? -2 : 2;
        self.update(Math.max(0, Math.min(100, self.position + step)));
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
  };

  document.addEventListener('DOMContentLoaded', function () {
    var splitters = document.querySelectorAll('[data-splitter]');
    splitters.forEach(function (el) {
      new ImageSplitter(el);
    });
  });
})();

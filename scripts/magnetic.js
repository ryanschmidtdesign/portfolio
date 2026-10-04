document.addEventListener("DOMContentLoaded", () => {
  // Wait a tiny bit for shadow DOMs to inject
  setTimeout(initMagnetic, 300);
});

function initMagnetic() {
  let magneticElements = Array.from(document.querySelectorAll('.magnetic, .ai-mini-send'));
  
  // Pierce shadow DOM for chat widget
  const chatHost = document.getElementById('rs-chat-widget-root');
  if (chatHost && chatHost.shadowRoot) {
    const shadowEls = chatHost.shadowRoot.querySelectorAll('.ai-mini-send, .hire-card-btn, .send');
    magneticElements = magneticElements.concat(Array.from(shadowEls));
  }

  magneticElements.forEach((el) => {
    let isHovering = false;
    
    el.addEventListener('mousemove', (e) => {
      isHovering = true;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const pullX = x * 0.15;
      const pullY = y * 0.15;
      
      el.style.transform = `translate(${pullX}px, ${pullY}px) scale(1.02)`;
      el.style.transition = `transform 50ms linear`;
    });

    el.addEventListener('mouseleave', () => {
      isHovering = false;
      el.style.transform = ``;
      el.style.transition = `transform 400ms cubic-bezier(0.16, 1, 0.3, 1)`;
      
      setTimeout(() => {
        if (!isHovering) {
          el.style.transition = ``;
        }
      }, 400);
    });
  });
}

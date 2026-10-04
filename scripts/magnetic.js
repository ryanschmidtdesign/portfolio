// --- DYNAMIC SPOTLIGHT CARDS ---
(function() {
  const cards = document.querySelectorAll('.evidence-card');
  if (!cards.length) return;

  document.addEventListener('mousemove', (e) => {
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    }
  });
})();

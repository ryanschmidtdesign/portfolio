(function() {
  let keyBuffer = '';
  const triggerWord = '/hire';

  document.addEventListener('keydown', (e) => {
    // Check for Cmd+K or Ctrl+K (often used for search, but let's use Ctrl+Shift+K or just the trigger word)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
       e.preventDefault();
       triggerCLI();
       return;
    }

    if (e.key.length === 1 || e.key === '/') {
      keyBuffer += e.key;
      if (keyBuffer.length > triggerWord.length) {
        keyBuffer = keyBuffer.slice(-triggerWord.length);
      }
      if (keyBuffer.toLowerCase() === triggerWord) {
        triggerCLI();
        keyBuffer = '';
      }
    }
  });

  function triggerCLI() {
    if (document.getElementById('rs-cli-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'rs-cli-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0', left: '0', width: '100vw', height: '100vh',
      backgroundColor: '#0a0a0a', color: '#00ff41',
      fontFamily: 'monospace', fontSize: '16px',
      padding: '40px', zIndex: '999999',
      boxSizing: 'border-box', overflowY: 'auto'
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '[ ESC to exit ]';
    Object.assign(closeBtn.style, {
      position: 'absolute', top: '20px', right: '20px',
      background: 'none', border: 'none', color: '#00ff41',
      cursor: 'pointer', fontFamily: 'monospace'
    });
    closeBtn.onclick = () => overlay.remove();
    overlay.appendChild(closeBtn);

    document.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escListener);
      }
    });

    const output = document.createElement('div');
    overlay.appendChild(output);
    document.body.appendChild(overlay);

    const lines = [
      "> Executing ryanschmidt.exe...",
      "> Loading modules: [Design Systems] [React] [Growth] [AI Prompts]",
      "> Initialization complete.",
      "",
      "RYAN SCHMIDT - STAFF PRODUCT DESIGNER & UX ENGINEER",
      "---------------------------------------------------",
      "I don't just push pixels in Figma. I build systems,",
      "unblock enterprise revenue, and write production-grade code.",
      "",
      "Ready to deploy me to your team?",
      "> mailto:ryanschmidt1989@gmail.com"
    ];

    let lineIdx = 0;
    function typeLine() {
      if (lineIdx >= lines.length) return;
      const p = document.createElement('p');
      p.style.margin = '0 0 8px 0';
      if (lines[lineIdx].includes('mailto:')) {
         p.innerHTML = '> <a href="mailto:ryanschmidt1989@gmail.com" style="color:#00ff41;text-decoration:underline;">ryanschmidt1989@gmail.com</a>';
      } else {
         p.textContent = lines[lineIdx];
      }
      output.appendChild(p);
      lineIdx++;
      setTimeout(typeLine, Math.random() * 200 + 100);
    }
    
    typeLine();
  }
})();

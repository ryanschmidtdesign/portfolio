(function() {
  let keyBuffer = '';
  const triggerWord = '/hire';

  // Inject CRT CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
    .cli-cursor { display: inline-block; width: 8px; height: 16px; background: #00ff41; vertical-align: middle; animation: blink 1s infinite; }
    .cli-crt::before { content: " "; display: block; position: absolute; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); z-index: 2; background-size: 100% 2px, 3px 100%; pointer-events: none; }
    .cli-input { background: transparent; border: none; color: #00ff41; font-family: monospace; font-size: 16px; outline: none; width: 80%; text-shadow: 0 0 5px #00ff41; }
    .cli-prompt-line { display: flex; align-items: center; margin-top: 8px; }
    .cli-output-line { margin: 0 0 8px 0; line-height: 1.4; }
  `;
  document.head.appendChild(style);

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
       e.preventDefault();
       triggerCLI();
       return;
    }
    if (e.key.length === 1 || e.key === '/') {
      keyBuffer += e.key;
      if (keyBuffer.length > triggerWord.length) keyBuffer = keyBuffer.slice(-triggerWord.length);
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
    overlay.className = 'cli-crt';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      backgroundColor: '#050505', color: '#00ff41',
      fontFamily: 'monospace', fontSize: '16px',
      padding: '40px', zIndex: '999999',
      boxSizing: 'border-box', overflowY: 'auto',
      textShadow: '0 0 5px rgba(0, 255, 65, 0.5)'
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '[ ESC to exit ]';
    Object.assign(closeBtn.style, {
      position: 'absolute', top: '20px', right: '20px',
      background: 'none', border: 'none', color: '#00ff41',
      cursor: 'pointer', fontFamily: 'monospace', zIndex: 3
    });
    closeBtn.onclick = () => overlay.remove();
    overlay.appendChild(closeBtn);

    document.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escListener);
      }
    });

    const outputContainer = document.createElement('div');
    overlay.appendChild(outputContainer);
    document.body.appendChild(overlay);

    const bootLines = [
      "Starting RyanOS v2.0.26...",
      "Loading modules: [Design Systems] [React] [Growth] [AI Prompts]... OK",
      "Mounting portfolio data... OK",
      "Establishing connection to hiring manager... OK",
      "",
      "Welcome to the Ryan Schmidt Interactive Terminal.",
      "Type 'help' to see available commands."
    ];

    let lineIdx = 0;
    function typeBoot() {
      if (lineIdx >= bootLines.length) {
        initPrompt();
        return;
      }
      printLine(bootLines[lineIdx]);
      lineIdx++;
      setTimeout(typeBoot, Math.random() * 150 + 50);
    }
    
    function printLine(text, isHtml = false) {
      const p = document.createElement('p');
      p.className = 'cli-output-line';
      if (isHtml) p.innerHTML = text;
      else p.textContent = text;
      outputContainer.appendChild(p);
      overlay.scrollTop = overlay.scrollHeight;
    }

    function initPrompt() {
      const promptWrapper = document.createElement('div');
      promptWrapper.className = 'cli-prompt-line';
      
      const promptText = document.createElement('span');
      promptText.innerHTML = 'guest@ryanschmidt&nbsp;~$&nbsp;';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cli-input';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.autofocus = true;

      promptWrapper.appendChild(promptText);
      promptWrapper.appendChild(input);
      outputContainer.appendChild(promptWrapper);
      
      input.focus();
      overlay.addEventListener('click', () => input.focus());

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = input.value.trim().toLowerCase();
          printLine('guest@ryanschmidt ~$ ' + input.value);
          input.value = '';
          promptWrapper.remove(); // remove active prompt
          handleCommand(cmd);
        }
      });
    }

    function handleCommand(cmd) {
      const args = cmd.split(' ');
      const baseCmd = args[0];

      switch(baseCmd) {
        case 'help':
          printLine('Available commands:');
          printLine('  ls             List directory contents');
          printLine('  cat <file>     Read a file');
          printLine('  open <file>    Execute/open a file');
          printLine('  whoami         Print current user');
          printLine('  clear          Clear terminal');
          printLine('  exit           Close terminal');
          break;
        case 'ls':
          printLine('resume.pdf    skills.md    secret.txt    contact.sh', true);
          break;
        case 'whoami':
          printLine('recruiter (hopefully future employer)');
          break;
        case 'clear':
          outputContainer.innerHTML = '';
          break;
        case 'exit':
          overlay.remove();
          return;
        case 'sudo':
          printLine('Nice try. This incident will be reported.');
          break;
        case 'cat':
          if (args[1] === 'skills.md') {
            printLine('## CORE SKILLS\n- UI/UX Design\n- Design Systems (Tokens)\n- Frontend (HTML/CSS/JS/React)\n- AI Prototyping\n- Information Architecture');
          } else if (args[1] === 'secret.txt') {
            printLine('You found it! If you hire me, I promise to bring good coffee and write clean CSS.');
          } else if (args[1] === 'resume.pdf' || args[1] === 'contact.sh') {
            printLine('Cannot cat a binary/executable file. Try "open ' + args[1] + '".');
          } else if (!args[1]) {
            printLine('cat: missing operand');
          } else {
            printLine('cat: ' + args[1] + ': No such file or directory');
          }
          break;
        case 'open':
        case './contact.sh':
          let target = args[1];
          if (baseCmd === './contact.sh') target = 'contact.sh';
          
          if (target === 'resume.pdf') {
            printLine('Opening resume...');
            window.open('assets/ryan-schmidt-resume-september-2026.pdf', '_blank');
          } else if (target === 'contact.sh') {
            printLine('Initiating email protocol...');
            window.location.href = 'mailto:ryanschmidt1989@gmail.com';
          } else if (!target) {
            printLine('open: missing operand');
          } else {
            printLine('open: ' + target + ': No such file or directory');
          }
          break;
        case '':
          break;
        default:
          printLine('command not found: ' + baseCmd);
      }
      
      // Re-init prompt after command execution
      setTimeout(initPrompt, 50);
    }

    typeBoot();
  }
})();

const fs = require('fs');
const jsPath = 'scripts/rs-chat-widget.js';
let js = fs.readFileSync(jsPath, 'utf8');

js = js.replace(/ask\.addEventListener\('click', \(e\) => \{[\s\n]*e\.preventDefault\(\);[\s\n]*lastFocusedEl = ask;[\s\n]*openPanel\(\);[\s\n]*\}\);/,
`ask.addEventListener('click', (e) => {
        // If clicking a link or the case studies button, don't open the chat drawer
        if (e.target.closest('a') || e.target.closest('button:not(.ai-mini-send)')) return;
        e.preventDefault();
        lastFocusedEl = ask;
        openPanel();
      });`);

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Trigger fixed');

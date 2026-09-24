const fs = require('fs');
const jsPath = 'scripts/rs-chat-widget.js';
let js = fs.readFileSync(jsPath, 'utf8');

// The line is: wrapper.appendChild(overlay);
// We want to change it so we find the container and append it there.
js = js.replace(/wrapper\.appendChild\(overlay\);/, `
    const inputContainer = wrapper.querySelector('.ai-mini-input-container');
    if (inputContainer) {
      inputContainer.appendChild(overlay);
    } else {
      wrapper.appendChild(overlay);
    }
`);

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Typewriter append fixed');

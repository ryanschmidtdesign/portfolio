const fs = require('fs');
const jsPath = 'scripts/rs-chat-widget.js';
let js = fs.readFileSync(jsPath, 'utf8');

// We'll replace the static placeholder setting in buildFloatingCaseStudyPills
// with a native placeholder typewriter animation.

const oldLogic = `      if (pills && pills.length > 0) {
        inputEl.placeholder = "Try asking: \\"" + pills[0] + "\\"";
      } else {
        inputEl.placeholder = "Ask a question about Ryan's work...";
      }`;

const newLogic = `      const targetText = (pills && pills.length > 0) 
        ? "Try asking: \\"" + pills[0] + "\\"" 
        : "Ask a question about Ryan's work...";
      
      let charIndex = 0;
      inputEl.placeholder = "";
      
      function typeChar() {
        if (charIndex < targetText.length) {
          inputEl.placeholder += targetText.charAt(charIndex);
          charIndex++;
          setTimeout(typeChar, 30 + Math.random() * 30);
        }
      }
      
      // Delay the start of the typing animation slightly for better UX
      setTimeout(typeChar, 400);`;

js = js.replace(oldLogic, newLogic);

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Added native placeholder typewriter');

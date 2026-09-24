const fs = require('fs');
const filePath = 'scripts/rs-chat-widget.js';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Remove if (!isCaseStudyPage()) return;
code = code.replace(/if \(!isCaseStudyPage\(\)\) return;/g, '');

// 2. Remove the condition in setPagePills
code = code.replace(/if \(isCaseStudyPage\(\)\) \{\s*renderFloatingCaseStudyPills\(customPills\);\s*\}/, 'renderFloatingCaseStudyPills(customPills);');

// 3. Add dynamic placeholder logic in buildFloatingCaseStudyPills
const placeholderLogic = `
    const inputEl = miniWrapper.querySelector('.ai-mini-input');
    if (inputEl) {
      const pills = getCurrentPagePills();
      if (pills && pills.length > 0) {
        inputEl.placeholder = "Try asking about: " + pills[0];
      } else {
        inputEl.placeholder = "Ask a question about Ryan's work...";
      }
    }
`;

code = code.replace(/miniWrapper\.parentNode\.insertBefore\(floatingPillsEl, miniWrapper\);/, 'miniWrapper.parentNode.insertBefore(floatingPillsEl, miniWrapper);\n' + placeholderLogic);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Widget script updated!');

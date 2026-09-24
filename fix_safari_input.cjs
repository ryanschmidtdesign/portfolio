const fs = require('fs');
const cssPath = 'css/components.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Replace the height/line-height properties on .ai-mini-input
css = css.replace(/height: 40px;\s*line-height: 40px;/g, 'height: auto !important;\n  line-height: normal !important;\n  -webkit-appearance: none;');

// Change the padding to vertically center the text
css = css.replace(/padding: 0 44px 0 16px;/g, 'padding: 10px 44px 10px 16px;');

// Ensure placeholder is normal line height
css = css.replace(/\.ai-mini-wrapper\.consolidated-nav \.ai-mini-input::placeholder \{/g, '.ai-mini-wrapper.consolidated-nav .ai-mini-input::placeholder {\n  line-height: normal !important;');

// Add global body padding-bottom to fix overlap on all pages
css += '\n\n/* Fix global layout overlap for floating NLI widget */\nbody {\n  padding-bottom: 240px !important;\n}\n';

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Fixed Safari CSS');

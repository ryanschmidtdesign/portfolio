const fs = require('fs');
const cssPath = 'css/components.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Replace padding: 0 12px; with nothing, or just change it to padding: 12px; if it doesn't exist
css = css.replace(/width: 100%;\s*max-width: 600px;\s*padding: 0 12px;\s*gap: 0;/g, 'width: 100%;\n  max-width: 600px;\n  gap: 0;');

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Fixed wrapper padding');

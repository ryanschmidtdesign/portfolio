const fs = require('fs');
const cssPath = 'css/components.css';
let css = fs.readFileSync(cssPath, 'utf8');

css = css.replace(/width: max-content;\s*max-width: calc\(100vw - 24px\);/g, 'width: 100%;\n  max-width: 600px;\n  padding: 0 12px;');

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Fixed pills width CSS');

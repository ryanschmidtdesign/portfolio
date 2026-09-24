const fs = require('fs');
const cssPath = 'css/components.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Fix 1: Update suggestion pills bottom spacing
css = css.replace(/bottom: calc\(var\(--space-4\) \+ env\(safe-area-inset-bottom, 0px\) \+ 114px\);/g, 
                  'bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px) + 136px);');

// Mobile suggestion pills spacing
css = css.replace(/bottom: calc\(var\(--space-4\) \+ env\(safe-area-inset-bottom, 0px\) \+ 104px\);/g, 
                  'bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px) + 124px);');


// Fix 2: Add line-height explicitly to the input to prevent Safari float bug
const inputRegex = /(\.ai-mini-wrapper\.consolidated-nav \.ai-mini-input \{[\s\S]*?height: 40px;\s*\n)/;
css = css.replace(inputRegex, '$1  line-height: 40px;\n  margin: 0;\n  vertical-align: middle;\n');

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Fixed CSS');
